import rateLimit from 'express-rate-limit';
import { getIP } from './config';

const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => getIP(req),
    handler: (_, res) => {
      res.status(429).json({
        error: 'Too many requests, please try again later.'
      });
    },
    skip: (req) => req.method === 'OPTIONS',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limit for RAG endpoint - 10 requests per minute
export const rateLimit = createRateLimiter(60 * 1000, 10); 