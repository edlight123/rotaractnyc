/**
 * Tests for lib/utils/sanitizeHtml.ts
 *
 * DOMPurify requires a browser DOM. Since our Jest environment is 'node',
 * we mock DOMPurify entirely and test that our wrapper delegates correctly.
 */

// Mock DOMPurify before importing the module under test
var mockSanitize: jest.Mock;
var mockAddHook: jest.Mock;

jest.mock('dompurify', () => {
  mockSanitize = jest.fn((dirty: string) => dirty);
  mockAddHook = jest.fn();
  return {
    __esModule: true,
    default: {
      sanitize: mockSanitize,
      addHook: mockAddHook,
    },
  };
});

// Simulate a browser environment so the SSR guard doesn't short-circuit
const originalWindow = globalThis.window;

beforeAll(() => {
  // Define window as a minimal object so `typeof window !== 'undefined'` passes
  if (typeof globalThis.window === 'undefined') {
    (globalThis as Record<string, unknown>).window = {} as Window & typeof globalThis;
  }
});

afterAll(() => {
  if (originalWindow === undefined) {
    delete (globalThis as Record<string, unknown>).window;
  }
});

import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

describe('sanitizeHtml', () => {
  beforeEach(() => {
    mockSanitize.mockClear();
    mockAddHook.mockClear();
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
    // Should short-circuit before calling DOMPurify
    expect(mockSanitize).not.toHaveBeenCalled();
  });

  it('returns empty string for falsy input', () => {
    // @ts-expect-error testing edge case with undefined-like input
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    expect(sanitizeHtml(null as unknown as string)).toBe('');
  });

  it('calls DOMPurify.sanitize with the dirty HTML and config', () => {
    sanitizeHtml('<p>Hello</p>');
    expect(mockSanitize).toHaveBeenCalledTimes(1);
    expect(mockSanitize).toHaveBeenCalledWith(
      '<p>Hello</p>',
      expect.objectContaining({
        ALLOWED_TAGS: expect.any(Array),
        ALLOWED_ATTR: expect.any(Array),
        ALLOW_DATA_ATTR: false,
      }),
    );
  });

  it('passes ALLOWED_TAGS containing common safe elements', () => {
    sanitizeHtml('<p>test</p>');
    const config = mockSanitize.mock.calls[0][1];
    expect(config.ALLOWED_TAGS).toEqual(
      expect.arrayContaining(['p', 'a', 'strong', 'em', 'h1', 'ul', 'li', 'img']),
    );
  });

  it('passes ALLOWED_ATTR containing href, src, alt, class', () => {
    sanitizeHtml('<a href="#">link</a>');
    const config = mockSanitize.mock.calls[0][1];
    expect(config.ALLOWED_ATTR).toEqual(
      expect.arrayContaining(['href', 'src', 'alt', 'class']),
    );
  });

  it('disables data attributes', () => {
    sanitizeHtml('<div data-foo="bar">test</div>');
    const config = mockSanitize.mock.calls[0][1];
    expect(config.ALLOW_DATA_ATTR).toBe(false);
  });

  it('returns whatever DOMPurify.sanitize returns (strip simulation)', () => {
    mockSanitize.mockReturnValueOnce('<p>clean</p>');
    expect(sanitizeHtml('<script>alert("xss")</script><p>clean</p>')).toBe('<p>clean</p>');
  });

  it('handles script tag XSS payload (DOMPurify strips it)', () => {
    mockSanitize.mockReturnValueOnce('');
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
  });

  it('handles onerror XSS payload', () => {
    mockSanitize.mockReturnValueOnce('<img>');
    expect(sanitizeHtml('<img onerror="alert(1)" src="x">')).toBe('<img>');
  });

  it('handles javascript: URL payload', () => {
    mockSanitize.mockReturnValueOnce('<a>click</a>');
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).toBe('<a>click</a>');
  });
});
