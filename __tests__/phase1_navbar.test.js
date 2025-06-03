import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../pages/index';

// Mock next/router to control pathname
jest.mock('next/router', () => ({
  useRouter() {
    return {
      pathname: '/',
      push: jest.fn(),
    };
  },
}));

describe('Navigation Bar', () => {
  it('renders navbar with correct title and links', () => {
    render(<Home />);

    // Title
    expect(screen.getByText('Mock Interview Questions')).toBeInTheDocument();

    // Links
    expect(screen.getByRole('link', { name: /answer a question/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add an experience/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /navigate experiences/i })).toBeInTheDocument();
  });

  it('highlights current route link as active', () => {
    render(<Home />);
    const activeLink = screen.getByRole('link', { name: /answer a question/i });
    expect(activeLink.className).toMatch(/active/);
  });
}); 