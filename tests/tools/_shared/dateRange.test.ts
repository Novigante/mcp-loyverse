import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveDateRange } from '../../../src/tools/_shared/dateRange.js';

// Fix "now" to 2025-06-15T14:30:00Z (Sunday) for deterministic tests
const FIXED_NOW = new Date('2025-06-15T14:30:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('resolveDateRange — presets with UTC timezone', () => {
  const tz = 'UTC';

  it('"today" returns start of today → now', () => {
    const result = resolveDateRange({ period: 'today' }, tz);
    expect(result.from).toBe('2025-06-15T00:00:00.000Z');
    expect(result.to).toBe('2025-06-15T14:30:00.000Z');
  });

  it('"yesterday" returns full yesterday', () => {
    const result = resolveDateRange({ period: 'yesterday' }, tz);
    expect(result.from).toBe('2025-06-14T00:00:00.000Z');
    expect(result.to).toBe('2025-06-14T23:59:59.999Z');
  });

  it('"this_week" returns Monday 00:00 → now', () => {
    // 2025-06-15 is Sunday, so Monday of this week is 2025-06-09
    const result = resolveDateRange({ period: 'this_week' }, tz);
    expect(result.from).toBe('2025-06-09T00:00:00.000Z');
    expect(result.to).toBe('2025-06-15T14:30:00.000Z');
  });

  it('"this_month" returns 1st of month → now', () => {
    const result = resolveDateRange({ period: 'this_month' }, tz);
    expect(result.from).toBe('2025-06-01T00:00:00.000Z');
    expect(result.to).toBe('2025-06-15T14:30:00.000Z');
  });

  it('"last_7_days" returns 7 days ago 00:00 → now', () => {
    const result = resolveDateRange({ period: 'last_7_days' }, tz);
    expect(result.from).toBe('2025-06-08T00:00:00.000Z');
    expect(result.to).toBe('2025-06-15T14:30:00.000Z');
  });

  it('"last_30_days" returns 30 days ago 00:00 → now', () => {
    const result = resolveDateRange({ period: 'last_30_days' }, tz);
    expect(result.from).toBe('2025-05-16T00:00:00.000Z');
    expect(result.to).toBe('2025-06-15T14:30:00.000Z');
  });
});

describe('resolveDateRange — presets with non-UTC timezone', () => {
  // America/Mexico_City is UTC-6 year-round (Mexico abolished DST in Oct 2022)
  // 2025-06-15T14:30:00Z = 2025-06-15T08:30:00 CST (UTC-6)
  const tz = 'America/Mexico_City';

  it('"today" uses local midnight in timezone', () => {
    const result = resolveDateRange({ period: 'today' }, tz);
    // Local midnight 2025-06-15T00:00:00 CST = 2025-06-15T06:00:00Z
    expect(result.from).toBe('2025-06-15T06:00:00.000Z');
    expect(result.to).toBe('2025-06-15T14:30:00.000Z');
  });

  it('"yesterday" uses local day boundaries in timezone', () => {
    const result = resolveDateRange({ period: 'yesterday' }, tz);
    // Local yesterday start: 2025-06-14T00:00:00 CST = 2025-06-14T06:00:00Z
    // Local yesterday end:   2025-06-14T23:59:59.999 CST = 2025-06-15T05:59:59.999Z
    expect(result.from).toBe('2025-06-14T06:00:00.000Z');
    expect(result.to).toBe('2025-06-15T05:59:59.999Z');
  });
});

describe('resolveDateRange — explicit range', () => {
  it('accepts valid from/to ISO strings', () => {
    const result = resolveDateRange(
      { from: '2025-06-01T00:00:00Z', to: '2025-06-10T23:59:59Z' },
      'UTC',
    );
    expect(result.from).toBe('2025-06-01T00:00:00.000Z');
    expect(result.to).toBe('2025-06-10T23:59:59.000Z');
  });

  it('throws when from > to', () => {
    expect(() =>
      resolveDateRange(
        { from: '2025-06-10T00:00:00Z', to: '2025-06-01T00:00:00Z' },
        'UTC',
      ),
    ).toThrow(/must be before/i);
  });

  it('throws on invalid ISO date', () => {
    expect(() =>
      resolveDateRange({ from: 'not-a-date', to: '2025-06-10T00:00:00Z' }, 'UTC'),
    ).toThrow();
  });
});
