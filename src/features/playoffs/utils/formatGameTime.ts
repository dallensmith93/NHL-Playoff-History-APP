/** Local start time from NHL `startTimeUTC` / `gameDateUtc` (ISO string). */

export function formatGameStartDetails(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/** Compact time only (e.g. for score ticker chips). */
export function formatGameStartTimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}
