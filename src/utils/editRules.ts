/**
 * Who may change or delete a match.
 *
 * biliardino is an open office tool (nobody logs in to enter results), so a typo has to be fixable
 * by whoever made it, but old results must not be changed by just anybody: a match can be
 * edited/deleted by everybody for EDIT_WINDOW_HOURS after its date, and by the admin always.
 */
export const EDIT_WINDOW_HOURS = 24;

export function canModifyMatch(
  matchDate: Date | string,
  isAdmin: boolean,
  now: Date = new Date(),
): boolean {
  if (isAdmin) {
    return true;
  }
  const ageMs = now.getTime() - new Date(matchDate).getTime();
  return ageMs < EDIT_WINDOW_HOURS * 60 * 60 * 1000;
}
