const handler = require('../pages/api/experiences/evaluate.js').default;

describe('/api/experiences/evaluate', () => {
  it('returns a markdown evaluation for a strong answer', async () => {
    const req = { method: 'POST', body: { question: 'Describe a time you led a migration.', answer: 'I led the migration of 100+ services to AWS, saving $2M annually. I designed the plan, executed with 5 teams, and delivered 2 months early.' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].evaluation).toMatch(/Strengths|Areas for Improvement|Overall Assessment/);
  });
  it('returns a markdown evaluation for a weak answer', async () => {
    const req = { method: 'POST', body: { question: 'Describe a time you led a migration.', answer: 'We did a migration. It went well.' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].evaluation).toMatch(/Areas for Improvement/);
  });
  it('returns a matched experience and suggested update if a similar experience exists', async () => {
    // This test assumes a similar experience exists in the DB
    const req = { method: 'POST', body: { question: 'Describe a time you led a migration.', answer: 'I led the migration of 100+ services to AWS, saving $2M annually. I designed the plan, executed with 5 teams, and delivered 2 months early.' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    if (data.matchedExperience) {
      expect(data.suggestedUpdate).toBeDefined();
      expect(data.suggestedUpdate.content).toMatch(/Improved Experience/);
    }
  });
  it('returns 400 for missing fields', async () => {
    const req = { method: 'POST', body: { question: '', answer: '' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('returns 405 for non-POST methods', async () => {
    const req = { method: 'GET', body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
}); 