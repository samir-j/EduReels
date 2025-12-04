// backend/routes/ai.js
// AI RAG pipeline: transcribe -> embed -> upsert to Pinecone -> query -> summarize + quiz
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const auth = require('../middleware/auth');
const videosModel = require('../models/videos');
const db = require('../db');

require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Pinecone client in a way that supports both serverless (host) and older env style.
// If PINECONE_INDEX_HOST is set (serverless), we will pass baseUrl to the client.
let pinecone;
try {
  const pineconeOptions = {};
  if (process.env.PINECONE_API_KEY) pineconeOptions.apiKey = process.env.PINECONE_API_KEY;
  // Newer SDK supports baseUrl to target serverless host
  if (process.env.PINECONE_INDEX_HOST) pineconeOptions.baseUrl = process.env.PINECONE_INDEX_HOST;
  pinecone = new Pinecone(pineconeOptions);
} catch (err) {
  console.error('Pinecone init error', err);
  pinecone = null;
}

// utils
function getVideoFilePath(video) {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
  return path.join(UPLOAD_DIR, video.filename);
}

// naive chunker — split by characters; you can later upgrade to sentence-based chunking
function chunkText(text, maxLen = 800) {
  const parts = [];
  let start = 0;
  while (start < text.length) {
    parts.push(text.slice(start, Math.min(start + maxLen, text.length)));
    start += maxLen;
  }
  return parts;
}

// Helper to call OpenAI embeddings for arrays sequentially (keeps memory small)
async function embedTextChunks(chunks) {
  const embeddings = [];
  for (const c of chunks) {
    const resp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: c
    });
    const vector = resp.data[0].embedding;
    embeddings.push({ vector, text: c });
  }
  return embeddings;
}

// create index handle
function getPineconeIndex() {
  if (!pinecone) throw new Error('Pinecone client not initialized. Set PINECONE_API_KEY and optionally PINECONE_INDEX_HOST.');
  const idxName = process.env.PINECONE_INDEX_NAME;
  if (!idxName) throw new Error('PINECONE_INDEX_NAME is not set in env');
  return pinecone.index(idxName);
}

/**
 * GET /api/ai/video/:id/summary
 * Auth required.
 * Runs the RAG pipeline for the given video id and returns { summary, quiz }.
 */
router.get('/video/:id/summary', auth, async (req, res) => {
  try {
    const video = await videosModel.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const videoPath = getVideoFilePath(video);
    if (!fs.existsSync(videoPath)) {
      return res.status(400).json({ message: 'Video file missing on server' });
    }

    // 1) Transcribe with Whisper via OpenAI (pass file stream)
    // NOTE: openai.audio.transcriptions.create is used with the openai package structure from earlier examples.
    // If your SDK version differs, adapt accordingly.
    const readStream = fs.createReadStream(videoPath);
    const transcriptResp = await openai.audio.transcriptions.create({
      file: readStream,
      model: 'whisper-1'
    });
    const transcriptText = transcriptResp.text || (transcriptResp?.data?.text) || '';
    if (!transcriptText || transcriptText.trim().length === 0) {
      return res.status(500).json({ message: 'Transcription returned empty text' });
    }

    // 2) Chunk transcript and embed
    const chunks = chunkText(transcriptText, 800);
    const embeddings = await embedTextChunks(chunks);

    // 3) Upsert embeddings into Pinecone (namespace per video id recommended)
    // For serverless Pinecone, using the base URL is enough; upsert works as usual.
    const index = getPineconeIndex();

    // Prepare upsert vectors in batches (avoid huge requests)
    const upsertBatches = [];
    const BATCH_SIZE = 50;
    for (let i = 0; i < embeddings.length; i += BATCH_SIZE) {
      const batch = embeddings.slice(i, i + BATCH_SIZE).map((e, j) => ({
        id: `${video.id}-${i + j}`,
        values: e.vector,
        metadata: { video_id: video.id, text: e.text }
      }));
      upsertBatches.push(batch);
    }

    for (const batch of upsertBatches) {
      await index.upsert({ upsertRequest: { vectors: batch } });
    }

    // Optionally store a mapping in Postgres embeddings table (non-mandatory)
    await db.query('INSERT INTO embeddings (video_id, pinecone_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [video.id, video.id]);

    // 4) Query Pinecone using the embedding of the full transcript to get relevant contexts
    const qEmbResp = await openai.embeddings.create({ model: 'text-embedding-3-small', input: transcriptText });
    const qVec = qEmbResp.data[0].embedding;

    // Query topK contexts
    const queryResp = await index.query({ queryRequest: { topK: 5, vector: qVec, includeMetadata: true } });
    const matches = queryResp.matches || queryResp.results || [];
    const contexts = (matches || []).map(m => (m.metadata && m.metadata.text) || m.metadata?.text || '').filter(Boolean).join('\n---\n');

    // 5) Compose RAG prompt for summary + quiz
    const prompt = `You are an educational assistant. Given the transcript context below (from a short educational reel) and the video title "${video.title}", produce:
1) a concise 2-3 sentence summary (the key takeaways a learner should remember),
2) three short multiple-choice questions. For each question produce 3 options and indicate which option index (0,1,2) is the correct one.

Return a JSON object exactly with:
{
  "summary": "...",
  "quiz": [
    { "question": "...", "options": ["...","...","..."], "answerIndex": 0 },
    ...
  ]
}

CONTEXT:
${contexts}

TRANSCRIPT:
${transcriptText}
`;

    // Call chat completion
    const chatResp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.2
    });

    const raw = chatResp.choices?.[0]?.message?.content || chatResp.choices?.[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // Try to extract JSON substring if LLM wrapped it with text
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        parsed = JSON.parse(m[0]);
      } else {
        // fallback: return raw text as summary only
        return res.json({ summary: raw, quiz: [] });
      }
    }

    // Validate parsed shape
    if (!parsed.summary || !Array.isArray(parsed.quiz)) {
      return res.json({ summary: parsed.summary || 'No summary produced', quiz: parsed.quiz || [] });
    }

    // Return parsed summary + quiz
    res.json({ summary: parsed.summary, quiz: parsed.quiz });
  } catch (err) {
    console.error('AI pipeline error', err);
    // Prefer to send a readable message but not leak secrets
    res.status(500).json({ message: 'AI pipeline error', error: err.message });
  }
});

module.exports = router;
