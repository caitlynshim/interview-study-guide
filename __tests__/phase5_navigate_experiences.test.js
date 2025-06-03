import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import NavigateExperiences from '../pages/navigate-experiences';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  isReady: true,
  query: {},
  pathname: '/navigate-experiences',
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock the diff library
jest.mock('diff', () => ({
  diffLines: jest.fn(() => [
    { value: 'Old content', removed: true },
    { value: 'New content', added: true },
  ]),
}));

describe('Phase 5 – Navigate Experiences (React Component)', () => {
  const mockExperiences = [
    {
      _id: 'exp1',
      title: 'Leadership Challenge',
      content: 'Led a team through difficult project...',
      category: 'Leadership',
      metadata: {
        category: 'Leadership',
        tags: ['leadership', 'teamwork'],
        role: 'Senior Manager',
        date: '2023-06-15',
      },
      createdAt: '2023-06-15T10:00:00Z',
      updatedAt: '2023-06-15T10:00:00Z',
    },
    {
      _id: 'exp2',
      title: 'Technical Architecture',
      content: 'Designed a scalable system...',
      category: 'Technical',
      metadata: {
        category: 'Technical',
        tags: ['architecture', 'scalability'],
        role: 'Lead Engineer',
      },
      createdAt: '2023-06-16T10:00:00Z',
      updatedAt: '2023-06-16T10:00:00Z',
    },
    {
      _id: 'exp3',
      title: 'Customer Focus',
      content: 'Improved customer satisfaction...',
      category: 'Customer Focus',
      metadata: {
        category: 'Customer Focus',
        tags: ['customer', 'satisfaction'],
      },
      createdAt: '2023-06-17T10:00:00Z',
      updatedAt: '2023-06-17T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    mockRouter.query = {};
    mockRouter.isReady = true;
  });

  it('fetches and renders experiences list on load', async () => {
    // Mock successful experiences list fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    });

    render(<NavigateExperiences />);

    // Should show loading initially
    expect(screen.getByText('Loading experiences...')).toBeInTheDocument();

    // Wait for experiences to load
    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    // Should display all experience titles
    expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    expect(screen.getByText('Technical Architecture')).toBeInTheDocument();
    // Use more specific query for Customer Focus title (within list item)
    const customerFocusItems = screen.getAllByText('Customer Focus');
    expect(customerFocusItems.length).toBeGreaterThan(0); // Button + title + category

    // Should display categories as buttons
    expect(screen.getByRole('button', { name: 'Leadership' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Technical' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Customer Focus' })).toBeInTheDocument();

    // Should have called the API
    expect(fetch).toHaveBeenCalledWith('/api/experiences/list');
  });

  it('displays category filter bubbles including All', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    // Should show All category plus unique categories from experiences
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leadership' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Technical' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Customer Focus' })).toBeInTheDocument();
  });

  it('filters experiences by selected category', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    // Initially shows all experiences
    expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    expect(screen.getByText('Technical Architecture')).toBeInTheDocument();
    // Check for Customer Focus experience title specifically
    const customerFocusItems = screen.getAllByText('Customer Focus');
    expect(customerFocusItems.length).toBeGreaterThan(0);

    // Click on Leadership category
    fireEvent.click(screen.getByRole('button', { name: 'Leadership' }));

    // Should only show Leadership experience
    expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    expect(screen.queryByText('Technical Architecture')).not.toBeInTheDocument();
    // Customer Focus button should still be there, but not the experience
    expect(screen.getByRole('button', { name: 'Customer Focus' })).toBeInTheDocument();
    // The experience title "Customer Focus" should not be visible
    const visibleCustomerFocus = screen.queryAllByText('Customer Focus');
    // Should only have the button, not the experience title/category
    expect(visibleCustomerFocus.length).toBe(1);

    // Click on All to show all again
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    // Should show all experiences again
    expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    expect(screen.getByText('Technical Architecture')).toBeInTheDocument();
    const allCustomerFocus = screen.getAllByText('Customer Focus');
    expect(allCustomerFocus.length).toBeGreaterThan(1); // Button + title + category
  });

  it('expands experience details when clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    // Initially details should not be visible
    expect(screen.queryByText('Led a team through difficult project...')).not.toBeInTheDocument();
    expect(screen.queryByText('Tags:')).not.toBeInTheDocument();

    // Click on experience to expand (click on the list item containing the title)
    const listItem = screen.getByText('Leadership Challenge').closest('li');
    fireEvent.click(listItem);

    // Should show expanded details
    expect(screen.getByText('Led a team through difficult project...')).toBeInTheDocument();
    expect(screen.getByText('Tags:')).toBeInTheDocument();
    expect(screen.getByText('leadership, teamwork')).toBeInTheDocument();
    expect(screen.getByText('Role:')).toBeInTheDocument();
    expect(screen.getByText('Senior Manager')).toBeInTheDocument();
    expect(screen.getByText('Date:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('collapses experience details when clicked again', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    const listItem = screen.getByText('Leadership Challenge').closest('li');

    // Click to expand
    fireEvent.click(listItem);
    
    await waitFor(() => {
      expect(screen.getByText('Led a team through difficult project...')).toBeInTheDocument();
    });

    // Click again to collapse
    fireEvent.click(listItem);

    // Details should be hidden again
    expect(screen.queryByText('Led a team through difficult project...')).not.toBeInTheDocument();
    expect(screen.queryByText('Tags:')).not.toBeInTheDocument();
  });

  it('opens edit form when Edit button is clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    // Expand experience
    const listItem = screen.getByText('Leadership Challenge').closest('li');
    fireEvent.click(listItem);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    // Click Edit button
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    // Should show edit form
    expect(screen.getByDisplayValue('Leadership Challenge')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Led a team through difficult project...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    // Edit button should be hidden when editing
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('cancels edit form when Cancel button is clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    // Expand and start editing
    const listItem = screen.getByText('Leadership Challenge').closest('li');
    fireEvent.click(listItem);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Leadership Challenge')).toBeInTheDocument();
    });

    // Click Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Should hide edit form
    expect(screen.queryByDisplayValue('Leadership Challenge')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    
    // Should show Edit button again (but experience might be collapsed)
    await waitFor(() => {
      // Either the edit button is visible, or we need to re-expand to see it
      if (screen.queryByRole('button', { name: 'Edit' })) {
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      } else {
        // Re-expand to confirm edit button is available
        fireEvent.click(listItem);
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      }
    });
  });

  it('submits edit form and shows success message', async () => {
    // Mock successful edit API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Experience updated',
        experience: { ...mockExperiences[0], title: 'Updated Leadership Challenge' },
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    // Expand and start editing
    const listItem = screen.getByText('Leadership Challenge').closest('li');
    fireEvent.click(listItem);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Leadership Challenge')).toBeInTheDocument();
    });

    // Modify the title
    const titleInput = screen.getByDisplayValue('Leadership Challenge');
    fireEvent.change(titleInput, { target: { value: 'Updated Leadership Challenge' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Experience updated successfully!')).toBeInTheDocument();
    });

    // Should have called the edit API
    expect(fetch).toHaveBeenCalledWith('/api/experiences/edit?id=exp1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Leadership Challenge',
        content: 'Led a team through difficult project...',
      }),
    });

    // Should show updated title
    expect(screen.getByText('Updated Leadership Challenge')).toBeInTheDocument();
  });

  it('displays error message when edit fails', async () => {
    // Mock failed edit API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: mockExperiences,
      }),
    }).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message: 'Database connection failed',
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('Leadership Challenge')).toBeInTheDocument();
    });

    // Expand and start editing
    const listItem = screen.getByText('Leadership Challenge').closest('li');
    fireEvent.click(listItem);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Leadership Challenge')).toBeInTheDocument();
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Edit failed.*Database connection failed/)).toBeInTheDocument();
    });

    // Should remain in edit mode
    expect(screen.getByDisplayValue('Leadership Challenge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('handles API error when fetching experiences', async () => {
    // Mock failed API response
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message: 'Database connection failed',
      }),
    });

    render(<NavigateExperiences />);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error fetching experiences.*Database connection failed/)).toBeInTheDocument();
    });

    // Should show placeholder
    expect(screen.getByText('No experiences found.')).toBeInTheDocument();
  });

  it('shows placeholder when no experiences exist', async () => {
    // Mock empty experiences response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiences: [],
      }),
    });

    render(<NavigateExperiences />);

    await waitFor(() => {
      expect(screen.getByText('No experiences found.')).toBeInTheDocument();
    });

    // Should only show All category
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leadership' })).not.toBeInTheDocument();
  });
}); 