import { FileRecord, QUOTA } from '../types';

export interface AllocationResult {
  start: number;
  end: number;
}

/**
 * Finds the earliest available byte range that fits newSize bytes
 * within the 100 MB quota, given existing file records.
 * Returns null if no space is available.
 */
export function allocate(
  files: FileRecord[],
  newSize: number
): AllocationResult | null {
  // Sort files by start byte
  const sorted = [...files].sort((a, b) => a.start - b.start);

  // Handle zero-byte files
  if (newSize === 0) {
    const afterLast = sorted.length > 0 ? sorted[sorted.length - 1].end + 1 : 0;
    if (afterLast > QUOTA) return null;
    return { start: afterLast, end: afterLast - 1 };
  }

  // Check gap before first file
  if (sorted.length === 0 || sorted[0].start >= newSize) {
    const candidateEnd = newSize - 1;
    if (candidateEnd < QUOTA) {
      return { start: 0, end: candidateEnd };
    }
  }

  // Check gaps between consecutive files
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end + 1;
    const gapEnd = sorted[i + 1].start - 1;
    const gapSize = gapEnd - gapStart + 1;
    if (gapSize >= newSize) {
      return { start: gapStart, end: gapStart + newSize - 1 };
    }
  }

  // Fallback: space after last file
  const afterLast = sorted.length > 0 ? sorted[sorted.length - 1].end + 1 : 0;
  if (afterLast + newSize <= QUOTA) {
    return { start: afterLast, end: afterLast + newSize - 1 };
  }

  // No space available
  return null;
}
