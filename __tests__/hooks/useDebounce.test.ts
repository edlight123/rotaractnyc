/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update the value before the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } }
    );

    rerender({ value: 'b', delay: 500 });

    // Not yet expired
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('a');
  });

  it('updates the value after the specified delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('debounces rapid value changes and only returns the last', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'c' });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'd' });

    // Still showing initial value — none of the intermediate timers completed
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Only the final value comes through
    expect(result.current).toBe('d');
  });

  it('resets the timer when value changes before delay completes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });

    // Advance 250ms — not yet expired
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe('first');

    // Change again — this should reset the 300ms timer
    rerender({ value: 'third' });

    // Advance another 250ms (total 500ms from first change, but only 250ms from last)
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe('first');

    // Now complete the remaining 50ms
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('third');
  });

  it('uses the default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'start' } }
    );

    rerender({ value: 'end' });

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('start');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('end');
  });

  it('works with non-string types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(42);
  });
});
