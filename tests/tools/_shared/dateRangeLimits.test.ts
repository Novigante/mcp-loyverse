import { describe, it, expect } from 'vitest';
import { resolveDateRange } from '../../../src/tools/_shared/dateRange.js';

describe('resolveDateRange — max 90-day limit', () => {
  it('allows a 90-day range', () => {
    const result = resolveDateRange(
      { from: '2025-01-01T00:00:00.000Z', to: '2025-04-01T00:00:00.000Z' },
      'UTC',
    );
    expect(result.from).toBeDefined();
    expect(result.to).toBeDefined();
  });

  it('rejects a range exceeding 90 days', () => {
    expect(() =>
      resolveDateRange(
        { from: '2025-01-01T00:00:00.000Z', to: '2025-06-01T00:00:00.000Z' },
        'UTC',
      ),
    ).toThrow(/90 days/);
  });

  it('allows exactly 90 days', () => {
    // 90 days from Jan 1 = April 1
    const from = '2025-01-01T00:00:00.000Z';
    const to = new Date(new Date(from).getTime() + 90 * 86_400_000).toISOString();
    const result = resolveDateRange({ from, to }, 'UTC');
    expect(result.from).toBeDefined();
  });

  it('does not apply 90-day limit to presets (they are bounded by design)', () => {
    // Presets like last_30_days are always < 90 days, so this just verifies no error
    const result = resolveDateRange({ period: 'last_30_days' }, 'UTC');
    expect(result.from).toBeDefined();
  });
});
