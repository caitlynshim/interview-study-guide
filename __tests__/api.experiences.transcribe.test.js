const handler = require('../pages/api/experiences/transcribe.js').default;
const fs = require('fs');
const path = require('path');

describe('/api/experiences/transcribe', () => {
  it('returns 405 for non-POST methods', async () => {
    const req = { method: 'GET' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
  it('returns 400 for missing audio', async () => {
    const req = { method: 'POST', headers: {}, on: jest.fn(), pipe: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    // Simulate formidable parse with no files
    handler.__setFormidableParse((req, cb) => cb(null, {}, {}));
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('returns 400 for form parse error', async () => {
    const req = { method: 'POST', headers: {}, on: jest.fn(), pipe: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    handler.__setFormidableParse((req, cb) => cb(new Error('parse error')));
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('returns 500 for OpenAI error', async () => {
    const req = { method: 'POST', headers: {}, on: jest.fn(), pipe: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    handler.__setFormidableParse((req, cb) => cb(null, {}, { audio: { filepath: '/dev/null' } }));
    handler.__setOpenAITranscribe(() => { throw new Error('OpenAI error'); });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
  it('returns transcript for valid audio', async () => {
    const req = { method: 'POST', headers: {}, on: jest.fn(), pipe: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    handler.__setFormidableParse((req, cb) => cb(null, {}, { audio: { filepath: '/dev/null' } }));
    handler.__setOpenAITranscribe(() => 'This is a test transcript.');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ transcript: 'This is a test transcript.' });
  });
}); 