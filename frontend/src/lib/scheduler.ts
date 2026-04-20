import { SchedulerResult } from '../types';

/**
 * FCFS: process positions in the order provided (caller sorts by createdAt).
 */
export function runFCFS(
  positions: number[],
  initialHead: number
): SchedulerResult {
  if (positions.length === 0) {
    return { sequence: [], seekDistance: 0, finalHead: initialHead };
  }

  const sequence = [...positions];
  let seekDistance = Math.abs(sequence[0] - initialHead);
  for (let i = 1; i < sequence.length; i++) {
    seekDistance += Math.abs(sequence[i] - sequence[i - 1]);
  }

  return {
    sequence,
    seekDistance,
    finalHead: sequence[sequence.length - 1],
  };
}

/**
 * SSTF: always move to the nearest unvisited position.
 */
export function runSSTF(
  positions: number[],
  initialHead: number
): SchedulerResult {
  if (positions.length === 0) {
    return { sequence: [], seekDistance: 0, finalHead: initialHead };
  }

  const remaining = [...positions];
  const sequence: number[] = [];
  let currentHead = initialHead;
  let seekDistance = 0;

  while (remaining.length > 0) {
    // Find nearest
    let nearestIdx = 0;
    let nearestDist = Math.abs(remaining[0] - currentHead);
    for (let i = 1; i < remaining.length; i++) {
      const dist = Math.abs(remaining[i] - currentHead);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    seekDistance += nearestDist;
    currentHead = remaining[nearestIdx];
    sequence.push(currentHead);
    remaining.splice(nearestIdx, 1);
  }

  return { sequence, seekDistance, finalHead: sequence[sequence.length - 1] };
}

/**
 * SCAN: move ascending servicing requests, reach maxByte boundary, reverse.
 */
export function runSCAN(
  positions: number[],
  initialHead: number,
  maxByte: number
): SchedulerResult {
  if (positions.length === 0) {
    return { sequence: [], seekDistance: 0, finalHead: initialHead };
  }

  const above = positions.filter((p) => p >= initialHead).sort((a, b) => a - b);
  const below = positions.filter((p) => p < initialHead).sort((a, b) => b - a);

  // Move ascending to maxByte, then reverse
  const sequence = [...above, ...below];

  let seekDistance = 0;
  let currentHead = initialHead;

  // Go up through above positions, then to boundary
  for (const pos of above) {
    seekDistance += Math.abs(pos - currentHead);
    currentHead = pos;
  }
  // Reach boundary (maxByte) if there are positions above or we need to reverse
  if (above.length > 0) {
    seekDistance += Math.abs(maxByte - currentHead);
    currentHead = maxByte;
  }
  // Come back down through below positions
  for (const pos of below) {
    seekDistance += Math.abs(pos - currentHead);
    currentHead = pos;
  }

  return {
    sequence,
    seekDistance,
    finalHead: sequence[sequence.length - 1],
  };
}
