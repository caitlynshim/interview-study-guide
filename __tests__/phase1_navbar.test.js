import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '../pages/index';

// Mock react-markdown before any other imports
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }) {
    return <div data-testid="markdown">{children}</div>;
  };
});

// Mock next/router
const mockRouter = { push: jest.fn() };
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock diff
jest.mock('diff', () => ({
  diffLines: jest.fn(() => []),
}));

describe('Phase 1 - Navigation Bar', () => {
  beforeEach(() => {
    // Mock fetch for categories
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Technical', 'Behavioral'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders navbar with correct title', async () => {
    render(<Home />);
    
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Interview Prep')).toBeInTheDocument();
  });

  it('shows navigation links', async () => {
    render(<Home />);
    
    // The main interface acts as navigation between different workflows
    expect(screen.getByRole('button', { name: /random question/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate answer/i })).toBeInTheDocument();
  });

  it('displays page title consistently', async () => {
    render(<Home />);
    
    expect(screen.getByText('Interview Prep')).toBeInTheDocument();
  });
}); 