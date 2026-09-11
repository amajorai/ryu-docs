/** Bound source-history lookups during large MDX builds. Missing history means
 * no timestamp: filesystem copy times are not editorial modification dates.
 */
export function createContentTimestampReader(
  lookup: (filePath: string) => Promise<string>,
  concurrency = 4,
) {
  const pending: Array<() => void> = [];
  let active = 0;

  return async (filePath: string): Promise<Date | null> => {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => pending.push(resolve));
    } else {
      active += 1;
    }

    try {
      const timestamp = (await lookup(filePath)).trim();
      if (!timestamp) return null;
      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    } finally {
      const next = pending.shift();
      if (next) next();
      else active -= 1;
    }
  };
}
