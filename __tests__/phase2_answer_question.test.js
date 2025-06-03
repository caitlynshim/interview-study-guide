import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../pages/index';

// Mock next/router so Home renders with root path
jest.mock('next/router', () => ({
  useRouter() {
    return { pathname: '/', push: jest.fn() };
  },
}));

/**
 * Helper to create a fetch mock that returns responses based on URL pattern.
 */
function createFetchMock({ categories = ['Technical'], randomQuestion, generateAnswer, errorGenerate } = {}) {
  return jest.fn(async (url, opts) => {
    if (url.startsWith('/api/questions/categories')) {
      return {
        ok: true,
        json: async () => categories,
      };
    }
    if (url.startsWith('/api/questions/random')) {
      if (!randomQuestion) throw new Error('randomQuestion response not provided');
      return {
        ok: true,
        json: async () => randomQuestion,
      };
    }
    if (url.startsWith('/api/experiences/generate')) {
      if (errorGenerate) {
        return { ok: false, json: async () => ({ message: 'Failed to generate' }) };
      }
      return {
        ok: true,
        json: async () => ({ answer: generateAnswer }),
      };
    }
    throw new Error(`Unhandled fetch URL in mock: ${url}`);
  });
}

describe('Phase 2 – Answer a Question flow', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('loads a random question when button clicked', async () => {
    global.fetch = createFetchMock({
      randomQuestion: { question: 'What is the biggest technical trade-off you made?', category: 'Technical', difficulty: 'Medium' },
    });

    render(<Home />);

    // Click get random question
    fireEvent.click(screen.getByRole('button', { name: /get random question/i }));

    // Wait for question to appear in box
    await waitFor(() => {
      expect(screen.getByText(/What is the biggest technical trade-off/i)).toBeInTheDocument();
    });
  });

  it('does not generate answer when Generate pressed without question', async () => {
    global.fetch = createFetchMock();
    render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: /generate answer/i }));

    // Wait briefly and assert that spinner or answer not shown
    await waitFor(() => {
      expect(screen.queryByText(/Generating answer/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  it('displays spinner then markdown answer on successful generation', async () => {
    const questionObj = { question: 'Explain CAP theorem', category: 'Technical', difficulty: 'Hard' };
    global.fetch = createFetchMock({
      randomQuestion: questionObj,
      generateAnswer: '### Sample Answer\nConsistency, Availability, Partition Tolerance...'
    });

    render(<Home />);

    // Load random question
    fireEvent.click(screen.getByRole('button', { name: /get random question/i }));
    await screen.findByText(/Explain CAP theorem/);

    // Generate answer
    fireEvent.click(screen.getByRole('button', { name: /generate answer/i }));

    // Spinner appears
    expect(await screen.findByText(/Generating answer/)).toBeInTheDocument();

    // Answer appears after fetch resolves
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sample answer/i })).toBeInTheDocument();
    });

    // Reset button should now be visible
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();

    // Click reset and answer should disappear
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /sample answer/i })).not.toBeInTheDocument();
    });
  });

  it('handles API failure gracefully (no answer rendered)', async () => {
    const questionObj = { question: 'Explain CAP theorem', category: 'Technical', difficulty: 'Hard' };
    global.fetch = createFetchMock({ randomQuestion: questionObj, errorGenerate: true });

    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /get random question/i }));
    await screen.findByText(/Explain CAP theorem/);

    fireEvent.click(screen.getByRole('button', { name: /generate answer/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });
}); 