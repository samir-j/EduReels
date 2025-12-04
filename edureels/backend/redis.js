const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL || undefined);

redis.on('error', (err) => console.error('Redis error', err));

module.exports = redis;
