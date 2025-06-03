import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../pages/index';

// Mock fetch for /api/experiences/generate
beforeAll(() => {
  global.fetch = jest.fn((url, opts) => {
    if (url.includes('/api/experiences/generate')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ answer: '# Mocked Answer\nThis is a **test** answer.' })
      });
    }
    // Default mock for other endpoints
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    });
  });
});

afterAll(() => {
  global.fetch.mockRestore && global.fetch.mockRestore();
});

test('renders generated answer after clicking Generate Answer', async () => {
  render(<Home />);
  // Enter a question
  const input = screen.getByPlaceholderText(/enter your own question/i);
  fireEvent.change(input, { target: { value: 'Test question?' } });
  // Click Generate Answer
  const button = screen.getByText(/generate answer/i);
  fireEvent.click(button);
  // Wait for the answer to appear
  await waitFor(() => {
    expect(screen.getByText('Mocked Answer')).toBeInTheDocument();
    expect(screen.getByText((content, node) => node.textContent === 'This is a test answer.')).toBeInTheDocument();
  });
}); 