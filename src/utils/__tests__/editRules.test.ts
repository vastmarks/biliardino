import { canModifyMatch, EDIT_WINDOW_HOURS } from "~/utils/editRules";

const now = new Date(2026, 10, 7, 12, 0);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

describe("canModifyMatch", () => {
  it("lets everybody fix a fresh match", () => {
    expect(canModifyMatch(hoursAgo(1), false, now)).toBe(true);
    expect(canModifyMatch(hoursAgo(EDIT_WINDOW_HOURS - 0.1), false, now)).toBe(
      true,
    );
  });
  it("locks old matches for everybody but the admin", () => {
    expect(canModifyMatch(hoursAgo(EDIT_WINDOW_HOURS + 0.1), false, now)).toBe(
      false,
    );
    expect(canModifyMatch(hoursAgo(24 * 90), true, now)).toBe(true);
  });
  it("accepts ISO strings (data coming from the API)", () => {
    expect(canModifyMatch(hoursAgo(2).toISOString(), false, now)).toBe(true);
  });
});
