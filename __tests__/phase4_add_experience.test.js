import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import AddExperience from '../pages/add-experience';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  isReady: true,
  query: {},
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Phase 4 – Add Experience Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    mockRouter.query = {};
    mockRouter.isReady = true;
  });

  it('prevents submission with empty title and content', async () => {
    render(<AddExperience />);

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /add experience/i });
    
    // Button should be disabled when fields are empty
    expect(submitButton).toBeDisabled();
    
    // Try clicking the disabled button
    fireEvent.click(submitButton);
    
    // Should not have made any API calls
    expect(fetch).not.toHaveBeenCalled();
    
    // Should show no success or error messages yet
    expect(screen.queryByText(/experience submitted/i)).not.toBeInTheDocument();
  });

  it('shows validation errors for empty required fields on submit attempt', async () => {
    render(<AddExperience />);

    // Fill in only title, leave content empty
    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);
    
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    
    // Content is still empty, so button should be disabled
    const submitButton = screen.getByRole('button', { name: /add experience/i });
    expect(submitButton).toBeDisabled();
    
    // Now clear title to test empty title validation
    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.change(contentInput, { target: { value: 'Test Content' } });
    
    // Title is empty, so button should be disabled
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when required fields are filled', async () => {
    render(<AddExperience />);

    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);
    const submitButton = screen.getByRole('button', { name: /add experience/i });

    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Fill required fields
    fireEvent.change(titleInput, { target: { value: 'Leadership Challenge' } });
    fireEvent.change(contentInput, { target: { value: 'Led a team through a complex project...' } });

    // Should be enabled now
    expect(submitButton).not.toBeDisabled();
  });

  it('displays success message and resets form on successful submission', async () => {
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Experience added',
        experience: {
          _id: '12345',
          title: 'Leadership Challenge',
          content: 'Led a team through a complex project...',
          metadata: { category: 'Leadership' }
        }
      })
    });

    render(<AddExperience />);

    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);
    const submitButton = screen.getByRole('button', { name: /add experience/i });

    // Fill form
    fireEvent.change(titleInput, { target: { value: 'Leadership Challenge' } });
    fireEvent.change(contentInput, { target: { value: 'Led a team through a complex project...' } });

    // Submit
    fireEvent.click(submitButton);

    // Should show submitting state
    await waitFor(() => {
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/experience submitted/i)).toBeInTheDocument();
    });

    // Form should be reset
    expect(titleInput.value).toBe('');
    expect(contentInput.value).toBe('');

    // Should have called API
    expect(fetch).toHaveBeenCalledWith('/api/experiences/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Leadership Challenge',
        content: 'Led a team through a complex project...',
        tags: '',
        category: '',
        role: '',
        date: ''
      })
    });
  });

  it('displays error message on API failure', async () => {
    // Mock API error response
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message: 'Database connection failed',
        errors: {}
      })
    });

    render(<AddExperience />);

    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);
    const submitButton = screen.getByRole('button', { name: /add experience/i });

    // Fill form
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(contentInput, { target: { value: 'Test content...' } });

    // Submit
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
    });

    // Form should not be reset on error
    expect(titleInput.value).toBe('Test Title');
    expect(contentInput.value).toBe('Test content...');
  });

  it('prefills form from router query parameters', () => {
    // Update mock router with query parameters
    mockRouter.query = {
      title: 'Prefilled Title',
      content: 'Prefilled content...',
      category: 'Leadership'
    };

    render(<AddExperience />);

    // Form should be prefilled
    expect(screen.getByDisplayValue('Prefilled Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Prefilled content...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Leadership')).toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    // Mock network error
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<AddExperience />);

    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);

    // Fill form
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(contentInput, { target: { value: 'Test content...' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /add experience/i }));

    // Wait for generic error message
    await waitFor(() => {
      expect(screen.getByText(/failed to submit experience/i)).toBeInTheDocument();
    });
  });
}); 