const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');
const auth = require('../middleware/auth');
const videosModel = require('../models/videos');
const db = require('../db');

require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new PineconeClient();

(async () => {
  if (process.env.PINECONE_API_KEY && process.env.PINECONE_ENVIRONMENT) {
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT
    });
  }
})();

// helper: read local file path for video, produce audio file path (we will upload video file directly to OpenAI transcription)
// For Whisper we can pass the video file directly if supported; else extract audio locally (ffmpeg)
function getVideoFilePath(video) {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
  return path.join(UPLOAD_DIR, video.filename);
}

// chunk text into smaller pieces
function chunkText(text, maxLen = 800) {
  const parts = [];
  let start = 0;
  while (start < text.length) {
    parts.push(text.slice(start, start + maxLen));
    start += maxLen;
  }
  return parts;
}

router.get('/video/:id/summary', auth, async (req, res) => {
  try {
    const video = await videosModel.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const videoPath = getVideoFilePath(video);
    if (!fs.existsSync(videoPath)) {
      return res.status(400).json({ message: 'Video file missing on server' });
    }

    // 1) Transcribe audio using OpenAI's audio transcription (Whisper)
    // Note: openai.audio.transcriptions expects a Readable stream and model 'gpt-4o-transcribe'? Use 'whisper-1' or current audio model.
    const readStream = fs.createReadStream(videoPath);
    // If direct video not supported, extract audio to tmp file using ffmpeg before submitting to transcription.
    const transcriptResp = await openai.audio.transcriptions.create({
      file: readStream,
      model: 'whisper-1'
    });
    const transcriptText = transcriptResp.text;
    console.log('Transcript length', transcriptText?.length);

    // 2) Split transcript into chunks and embed with OpenAI embeddings
    const chunks = chunkText(transcriptText, 800);
    const embeddings = [];
    for (const chunk of chunks) {
      const e = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunk });
      embeddings.push({ vector: e.data[0].embedding, text: chunk });
    }

    // 3) Upsert to Pinecone (namespace per video id), then query back for context
    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!indexName) {
      console.warn('Pinecone index name not provided; skipping vector store steps');
    } else {
      const index = pinecone.Index(indexName);
      // upsert vectors
      const upserts = embeddings.map((emb, i) => ({
        id: `${video.id}-${i}`,
        values: emb.vector,
        metadata: { video_id: video.id, text: emb.text }
      }));
      await index.upsert({ upsertRequest: { vectors: upserts } });
      // query with full transcript embedding to get relevant contexts
      const qEmbResp = await openai.embeddings.create({ model: 'text-embedding-3-small', input: transcriptText });
      const qVec = qEmbResp.data[0].embedding;
      const queryResp = await index.query({ queryRequest: { topK: 5, vector: qVec, includeMetadata: true } });
      const contexts = (queryResp.matches || []).map(m => m.metadata.text).join('\n---\n');
      // 4) Build RAG prompt
      const prompt = `You are an educational assistant. Given the transcript context below (from a short reel) and the video title "${video.title}", produce:
1) a 2-3 sentence concise summary (what the learner should remember),
2) three short multiple-choice questions (each with 3 options and the correct answer marked).
Return JSON with keys: summary (string), quiz (array of {question, options:[], answerIndex}).

CONTEXT:
${contexts}

TRANSCRIPT:
${transcriptText}
`;
      const chatResp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400
      });
      // OpenAI returns content in different shapes; handle both
      const raw = chatResp.choices?.[0]?.message?.content || chatResp.choices?.[0]?.text;
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        // attempt to extract JSON substring
        const m = raw?.match(/\{[\s\S]*\}/);
        if (m) data = JSON.parse(m[0]);
        else throw new Error('Failed to parse model response as JSON: ' + raw);
      }
      // store embedding record mapping (optional)
      await db.query('INSERT INTO embeddings (video_id, pinecone_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [video.id, video.id]);

      res.json({ summary: data.summary, quiz: data.quiz });
    } // end pinecone
  } catch (err) {
    console.error('ai summary error', err);
    res.status(500).json({ message: 'AI pipeline error', error: err.message });
  }
});

module.exports = router;
