const handler = require('../pages/api/experiences/edit.js').default;

describe('/api/experiences/edit', () => {
  it('returns 400 if missing fields', async () => {
    const req = { method: 'PUT', query: {}, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('returns 405 for non-PUT methods', async () => {
    const req = { method: 'POST', query: {}, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
  it('returns 404 if experience not found', async () => {
    const req = { method: 'PUT', query: { id: '000000000000000000000000' }, body: { title: 't', content: 'c', metadata: {} } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('updates experience and returns 200', async () => {
    // This test assumes a valid experience exists in the DB
    // You may need to mock Experience.findByIdAndUpdate for CI
    const req = { method: 'PUT', query: { id: 'mockid' }, body: { title: 't', content: 'c', metadata: {} } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    // Mock DB
    const old = require('../models/Experience');
    old.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: 'mockid', title: 't', content: 'c', metadata: {}, embedding: [0.1,0.2] });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].experience).toBeDefined();
  });
}); 