/**
 * Players and team names.
 *
 * A team is nothing but a set of players. Its name is built from the players' keys
 * (lower-cased names), sorted, joined by a comma: "Chiara + Elena" and "Elena + Chiara"
 * therefore always end up as the one and the same team "chiara,elena".
 */

/** Letters (any language), digits, spaces and . ' ’ - ; must start with a letter or digit. */
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .'’-]*$/u;
export const MAX_PLAYER_NAME_LENGTH = 30;

export function cleanPlayerName(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function playerKey(name: string): string {
  return cleanPlayerName(name).toLowerCase();
}

/** Returns an error message, or null if the name is fine. */
export function validatePlayerName(input: string): string | null {
  const name = cleanPlayerName(input);
  if (name.length === 0) {
    return "Please enter a name";
  }
  if (name.length > MAX_PLAYER_NAME_LENGTH) {
    return `Names can have at most ${MAX_PLAYER_NAME_LENGTH} characters`;
  }
  if (!NAME_PATTERN.test(name)) {
    return "Names may only contain letters, numbers, spaces and . ' -";
  }
  return null;
}

/** The canonical team name for the given player keys (order doesn't matter). */
export function teamNameFromKeys(keys: string[]): string {
  return [...new Set(keys.map(k => k.trim().toLowerCase()))].sort().join(",");
}

export const MATCH_FORMATS = ["1v1", "2v2"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export function formatSize(format: MatchFormat): number {
  return format === "1v1" ? 1 : 2;
}
