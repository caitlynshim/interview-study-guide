import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import fetch from 'node-fetch';

describe('Server Integration', () => {
  let server;
  let port;
  let app;

  beforeAll(async () => {
    // Create Next.js app
    app = next({
      dev: true,
      dir: process.cwd()
    });

    await app.prepare();
    const handle = app.getRequestHandler();

    // Create server
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    // Start server on random port
    port = Math.floor(Math.random() * (65535 - 3000)) + 3000;
    await new Promise((resolve) => {
      server.listen(port, (err) => {
        if (err) throw err;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await app.close();
  });

  it('should start server and respond to health check', async () => {
    const response = await fetch(`http://localhost:${port}/api/debug/db-info`);
    expect(response.status).toBe(200);
  });

  it('should handle invalid routes', async () => {
    const response = await fetch(`http://localhost:${port}/api/invalid-route`);
    expect(response.status).toBe(404);
  });

  it('should handle server errors gracefully', async () => {
    // Force a server error by passing invalid data
    const response = await fetch(`http://localhost:${port}/api/questions/random`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    expect(response.status).toBe(405);
  });
}); 