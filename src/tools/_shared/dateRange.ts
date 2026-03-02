import { z } from 'zod';

const presetSchema = z.object({
  period: z.enum([
    'today',
    'yesterday',
    'this_week',
    'this_month',
    'last_7_days',
    'last_30_days',
  ]),
});

const explicitSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const dateRangeSchema = z.union([presetSchema, explicitSchema]);

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

export interface ResolvedDateRange {
  from: string;
  to: string;
}

/**
 * Get the start of a day in a given timezone, returned as a UTC Date.
 */
function startOfDayInTz(date: Date, tz: string): Date {
  // Format the date parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );

  // Build an ISO string in the target timezone, then compute the UTC offset
  const localStr = `${parts.year}-${parts.month}-${parts.day}T00:00:00`;

  // Create a date as if it were UTC, then find the actual offset
  const asUtc = new Date(localStr + 'Z');

  // Get what the timezone thinks the time is at asUtc
  const checkFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const checkParts = Object.fromEntries(
    checkFormatter.formatToParts(asUtc).map((p) => [p.type, p.value]),
  );

  const checkHour = parseInt(checkParts.hour === '24' ? '0' : checkParts.hour, 10);
  const checkDay = parseInt(checkParts.day, 10);
  const origDay = parseInt(parts.day, 10);

  // Calculate offset: difference between what we set (00:00 UTC) and what TZ shows.
  // dayDiff detects if the timezone shifted the day forward or backward.
  // At month boundaries, large positive dayDiff (e.g. 27+) means backward wrap
  // (orig=1, check=28 → previous month), and large negative means forward wrap
  // (orig=31, check=1 → next month).
  let offsetHours = checkHour;
  const dayDiff = checkDay - origDay;
  if (dayDiff === 1 || dayDiff < -26) {
    // Check is 1 day ahead (or forward month wrap: orig=28+, check=1 → dayDiff ≤ -27)
    offsetHours += 24;
  } else if (dayDiff === -1 || dayDiff > 26) {
    // Check is 1 day behind (or backward month wrap: orig=1, check=28+ → dayDiff ≥ 27)
    offsetHours -= 24;
  }

  // The offset is: localTime = UTC + offset, so UTC = localTime - offset
  // We want midnight local = midnight local, so UTC = midnight_local - offset
  // offset = checkHour (what the TZ shows when UTC is midnight of that day)
  const result = new Date(asUtc.getTime() - offsetHours * 3600_000);
  return result;
}

/**
 * Get the local date parts for a given Date in a timezone.
 */
function getLocalParts(date: Date, tz: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
  };
}

function resolvePreset(period: string, tz: string, now: Date): ResolvedDateRange {
  const nowIso = now.toISOString();

  switch (period) {
    case 'today': {
      const start = startOfDayInTz(now, tz);
      return { from: start.toISOString(), to: nowIso };
    }

    case 'yesterday': {
      const yesterdayDate = new Date(now.getTime() - 86_400_000);
      const start = startOfDayInTz(yesterdayDate, tz);
      const end = new Date(start.getTime() + 86_400_000 - 1);
      return { from: start.toISOString(), to: end.toISOString() };
    }

    case 'this_week': {
      // Find Monday of the current week in the local timezone
      const local = getLocalParts(now, tz);
      const tempDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
      const dayOfWeek = tempDate.getUTCDay(); // 0=Sun, 1=Mon, ...
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      // Get start of that Monday in the timezone
      const mondayDate = new Date(now.getTime() - daysFromMonday * 86_400_000);
      const start = startOfDayInTz(mondayDate, tz);
      return { from: start.toISOString(), to: nowIso };
    }

    case 'this_month': {
      const local = getLocalParts(now, tz);
      // Create a date on the 1st of the month, then get start of day in tz
      const firstOfMonth = new Date(
        Date.UTC(local.year, local.month - 1, 1, 12, 0, 0),
      );
      const start = startOfDayInTz(firstOfMonth, tz);
      return { from: start.toISOString(), to: nowIso };
    }

    case 'last_7_days': {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
      const start = startOfDayInTz(sevenDaysAgo, tz);
      return { from: start.toISOString(), to: nowIso };
    }

    case 'last_30_days': {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
      const start = startOfDayInTz(thirtyDaysAgo, tz);
      return { from: start.toISOString(), to: nowIso };
    }

    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a date string, interpreting date-only strings (YYYY-MM-DD) in the given
 * timezone instead of UTC. Returns the parsed Date.
 */
function parseDateString(
  value: string,
  timezone: string,
  mode: 'start' | 'end',
): Date {
  if (DATE_ONLY_RE.test(value)) {
    // Date-only: interpret as start or end of that day in the configured timezone
    const dateParts = new Date(value + 'T12:00:00Z'); // noon UTC to avoid any date-shift
    const start = startOfDayInTz(dateParts, timezone);
    if (mode === 'end') {
      return new Date(start.getTime() + 86_400_000 - 1);
    }
    return start;
  }
  return new Date(value);
}

export function resolveDateRange(
  input: DateRangeInput,
  timezone: string,
): ResolvedDateRange {
  if ('period' in input) {
    return resolvePreset(input.period, timezone, new Date());
  }

  const from = parseDateString(input.from, timezone, 'start');
  const to = parseDateString(input.to, timezone, 'end');

  if (isNaN(from.getTime())) {
    throw new Error(`Invalid "from" date: ${input.from}`);
  }
  if (isNaN(to.getTime())) {
    throw new Error(`Invalid "to" date: ${input.to}`);
  }
  if (from >= to) {
    throw new Error('"from" must be before "to"');
  }

  const MAX_RANGE_DAYS = 90;
  const rangeMs = to.getTime() - from.getTime();
  if (rangeMs > MAX_RANGE_DAYS * 86_400_000) {
    throw new Error(
      `Date range exceeds maximum of ${MAX_RANGE_DAYS} days. Please narrow your query.`,
    );
  }

  return { from: from.toISOString(), to: to.toISOString() };
}
