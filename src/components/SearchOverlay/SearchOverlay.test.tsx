import { invoke } from '@tauri-apps/api/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSnippetStore } from '@/stores/snippetStore';

import { SearchOverlay } from './SearchOverlay';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}));

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({
    tags: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    getTagColor: (tagName: string) => {
      // Simple hash-based color for testing - return hex colors
      const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899'];
      return colors[hash % colors.length] || '#3b82f6';
    },
  }),
}));

describe('SearchOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear store state between tests
    useSnippetStore.getState().clearSelected();
    useSnippetStore.getState().setSearchQuery('');
    useSnippetStore.getState().setSearchResults([]);
  });

  it('renders search input', () => {
    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');
    expect(searchInput).toBeInTheDocument();
  });

  it('shows initial state message', () => {
    render(<SearchOverlay />);
    expect(screen.getByText('Start typing to search snippets')).toBeInTheDocument();
  });

  it('calls search command when query is entered', async () => {
    const mockResults = [
      {
        id: 1,
        name: 'Test Snippet',
        content: 'Test content',
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
        tags: ['test'],
        usage_count: 5,
        last_used: null,
        relevance_score: 1.0,
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockResults);

    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');

    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('search_snippets', {
        query: 'test',
        limit: 50,
      });
    });
  });

  it('displays search results', async () => {
    const mockResults = [
      {
        id: 1,
        name: 'Test Snippet',
        content: 'Test content',
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
        tags: ['test'],
        usage_count: 5,
        last_used: null,
        relevance_score: 1.0,
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockResults);

    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');

    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Snippet')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  it('shows empty state when no results found', async () => {
    vi.mocked(invoke).mockResolvedValue([]);

    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No snippets found')).toBeInTheDocument();
    });
  });

  it('handles checkbox selection', async () => {
    const mockResults = [
      {
        id: 1,
        name: 'Test Snippet',
        content: 'Test content',
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
        tags: [],
        usage_count: 0,
        last_used: null,
        relevance_score: 1.0,
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockResults);

    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');

    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Snippet')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/Select snippet/);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('1 snippet selected')).toBeInTheDocument();
    });
  });

  it('calls copy command when copy button is clicked', async () => {
    const mockResults = [
      {
        id: 1,
        name: 'Test Snippet',
        content: 'Test content',
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
        tags: [],
        usage_count: 0,
        last_used: null,
        relevance_score: 1.0,
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockResults);

    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');

    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Snippet')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/Select snippet/);
    fireEvent.click(checkbox);

    // Wait for selection to be confirmed
    await waitFor(() => {
      expect(screen.getByText('1 snippet selected')).toBeInTheDocument();
    });

    // Now get the Copy button
    const copyButton = screen.getByRole('button', { name: /copy snippet/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('copy_snippets_with_analytics', {
        snippetIds: [1],
      });
      expect(invoke).toHaveBeenCalledWith('hide_search_window');
    });
  });

  it('displays tags for snippets', async () => {
    const mockResults = [
      {
        id: 1,
        name: 'Tagged Snippet',
        content: 'Content',
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
        tags: ['react', 'typescript'],
        usage_count: 0,
        last_used: null,
        relevance_score: 1.0,
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockResults);

    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');

    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });
  });
});
