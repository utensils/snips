import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

// Clear localStorage before each test to ensure clean state for Zustand persist
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// Mock ResizeObserver for react-window 2.x
global.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrent: vi.fn(() => ({
    close: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
  })),
  getCurrentWindow: vi.fn(() => ({
    label: 'main',
    close: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
  })),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(() => Promise.resolve()),
}));
