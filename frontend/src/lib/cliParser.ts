export type ParsedCommand =
  | { type: 'open'; folder: string }
  | { type: 'del'; filename: string }
  | { type: 'touch'; filename: string; size: number }
  | { type: 'mkdir'; folder: string }
  | { type: 'back' };

/**
 * Parses a CLI command string into a structured command object.
 * Returns null for unrecognised or malformed input.
 *
 * Supported commands:
 *   open <folder>
 *   del <filename>
 *   touch <filename> [size]
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === 'open' && parts.length >= 2) {
    return { type: 'open', folder: parts[1] };
  }

  if (cmd === 'del' && parts.length >= 2) {
    return { type: 'del', filename: parts[1] };
  }

  if (cmd === 'touch' && parts.length >= 2) {
    const size = parts[2] ? parseInt(parts[2], 10) : 0;
    return { type: 'touch', filename: parts[1], size: isNaN(size) ? 0 : size };
  }

  if (cmd === 'mkdir' && parts.length >= 2) {
    return { type: 'mkdir', folder: parts[1] };
  }

  if (cmd === 'back') {
    return { type: 'back' };
  }

  return null;
}
