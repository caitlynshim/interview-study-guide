import dbConnect from '../../../lib/mongodb';
import { openai } from '../../../lib/openai';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ message: 'Missing question or answer in body' });
  }
  try {
    await dbConnect();
    // 1. Evaluate the answer using OpenAI
    const evalPrompt = `You are a world-class technical executive interviewer (CEO, CTO, AWS Bar Raiser). Critically evaluate the following answer to the interview question as if you were a tech executive. Your goal is to assess both the content and the speaking style, as if you were deciding whether to trust and be persuaded by this candidate as a peer executive.

**Content:**
- Be specific about strengths, weaknesses, and improvement areas.
- Hold an extremely high bar: answers must be specific, result-oriented, data-driven, and use 'I' language (not 'we').
- Highlight business impact and unique contributions. If the answer is vague, generic, or lacks metrics, call it out.

**Speaking Patterns:**
- Assess the candidate's speaking style based on the transcript. Consider clarity, confidence, executive presence, use of filler words ("um", "uh", etc.), and whether the answer is persuasive and easy to follow.
- Comment on whether the candidate comes across as a confident, intelligent executive.
- Give actionable guidance for improving speaking clarity, executive communication, and style. Suggest how the candidate could better ensure the executive audience believes, understands, and is persuaded by their answer.

Format your feedback in markdown with clear sections: Strengths, Areas for Improvement, Speaking Patterns, and Overall Assessment.

Question: ${question}

Answer: ${answer}`;
    const evalResp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a world-class technical executive interviewer.' },
        { role: 'user', content: evalPrompt },
      ],
      temperature: 0.2,
    });
    const evaluation = evalResp.choices[0].message.content.trim();
    // 2. Find similar experience using the new endpoint
    let match = null;
    let similarity = 0;
    try {
      const resp = await fetch('http://localhost:3002/api/experiences/find-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: answer }),
      });
      const data = await resp.json();
      if (resp.ok && data.match) {
        match = data.match;
        similarity = data.similarity;
      }
    } catch (err) {
      // fallback: no match
      match = null;
    }
    let suggestedUpdate = null;
    if (match) {
      // Suggest an update using the new endpoint
      try {
        const resp = await fetch('http://localhost:3002/api/experiences/suggest-edits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ original: match.content, newText: answer }),
        });
        const data = await resp.json();
        if (resp.ok && data.suggested) {
          suggestedUpdate = { content: data.suggested, diff: data.diff };
        }
      } catch (err) {
        suggestedUpdate = null;
      }
    }
    res.status(200).json({ evaluation, suggestedUpdate, matchedExperience: match, similarity });
  } catch (error) {
    console.error('Evaluate error:', error, error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message, stack: error.stack });
  }
}

// TEST: Evaluate handler uses new endpoints
if (typeof describe === 'function') {
  jest.mock('node-fetch', () => jest.fn());
  const fetchMock = require('node-fetch');
  describe('POST /api/experiences/evaluate', () => {
    it('returns 400 if missing fields', async () => {
      const req = { method: 'POST', body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await module.exports(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('calls find-similar and suggest-edits endpoints', async () => {
      fetchMock.mockImplementation((url, opts) => {
        if (url.includes('find-similar')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ match: { content: 'old', title: 't', _id: '1', metadata: {} }, similarity: 0.9 }) });
        }
        if (url.includes('suggest-edits')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggested: 'improved', diff: 'diff' }) });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      });
      const req = { method: 'POST', body: { question: 'Q', answer: 'A' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await handler(req, res);
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('find-similar'), expect.any(Object));
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('suggest-edits'), expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ evaluation: expect.any(String), suggestedUpdate: expect.any(Object), matchedExperience: expect.any(Object) }));
    });
  });
} 