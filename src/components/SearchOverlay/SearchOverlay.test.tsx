import { invoke } from '@tauri-apps/api/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    await userEvent.type(searchInput, 'test');

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

    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText('Test Snippet')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  it('shows empty state when no results found', async () => {
    vi.mocked(invoke).mockResolvedValue([]);

    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');

    await userEvent.type(searchInput, 'nonexistent');

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

    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText('Test Snippet')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText('Select snippet');
    await userEvent.click(checkbox);

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

    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText('Test Snippet')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText('Select snippet');
    await userEvent.click(checkbox);

    // Wait for selection to be confirmed
    await waitFor(() => {
      expect(screen.getByText('1 snippet selected')).toBeInTheDocument();
    });

    // Now get the Copy All button
    const copyButton = screen.getByRole('button', { name: /copy all/i });
    await userEvent.click(copyButton);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('copy_to_clipboard', { text: 'Test content' });
      expect(invoke).toHaveBeenCalledWith('hide_search_window');
    });
  });

  it('displays usage count badge', async () => {
    const mockResults = [
      {
        id: 1,
        name: 'Popular Snippet',
        content: 'Content',
        description: null,
        created_at: Date.now(),
        updated_at: Date.now(),
        tags: [],
        usage_count: 42,
        last_used: Date.now(),
        relevance_score: 1.0,
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockResults);

    render(<SearchOverlay />);
    const searchInput = screen.getByPlaceholderText('Search snippets...');

    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText('42x')).toBeInTheDocument();
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

    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });
  });
});
