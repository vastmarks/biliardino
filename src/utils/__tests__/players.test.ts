import {
  cleanPlayerName,
  formatSize,
  playerKey,
  teamNameFromKeys,
  validatePlayerName,
} from "~/utils/players";
import { matchAddValidation } from "~/utils/validation";

describe("teamNameFromKeys", () => {
  it("does not depend on the order", () => {
    expect(teamNameFromKeys(["elena", "chiara"])).toBe("chiara,elena");
    expect(teamNameFromKeys(["chiara", "elena"])).toBe("chiara,elena");
  });
  it("ignores case, padding and duplicates", () => {
    expect(teamNameFromKeys([" Elena", "elena", "CHIARA "])).toBe(
      "chiara,elena",
    );
  });
  it("works for single players", () => {
    expect(teamNameFromKeys(["elena"])).toBe("elena");
  });
});

describe("player names", () => {
  it("cleans and keys names", () => {
    expect(cleanPlayerName("  Anne   Marie ")).toBe("Anne Marie");
    expect(playerKey("  Elena ")).toBe("elena");
  });
  it("accepts normal names", () => {
    for (const n of [
      "Elena",
      "Anne-Marie",
      "O'Neil",
      "José",
      "Zoë 2",
      "李雷",
    ]) {
      expect(validatePlayerName(n)).toBeNull();
    }
  });
  it("rejects names that would break team names or be empty", () => {
    for (const n of [
      "",
      "   ",
      "Elena,Chiara",
      "Elena & Chiara",
      "-x",
      "a".repeat(31),
      "<b>",
    ]) {
      expect(validatePlayerName(n)).not.toBeNull();
    }
  });
});

describe("matchAddValidation", () => {
  const base = {
    format: "2v2",
    players1: [1, 2],
    players2: [3, 4],
    score1: "10",
    score2: 7,
    comment: "",
  };
  it("accepts a valid 2v2 and coerces scores", () => {
    const r = matchAddValidation.parse(base);
    expect(r.score1).toBe(10);
    expect(r.score2).toBe(7);
  });
  it("accepts a 1v1", () => {
    expect(
      matchAddValidation.safeParse({
        ...base,
        format: "1v1",
        players1: [1],
        players2: [2],
      }).success,
    ).toBe(true);
  });
  it("requires the right number of players for the format", () => {
    expect(
      matchAddValidation.safeParse({ ...base, players1: [1] }).success,
    ).toBe(false);
    expect(
      matchAddValidation.safeParse({ ...base, format: "1v1" }).success,
    ).toBe(false);
  });
  it("rejects the same player twice", () => {
    expect(
      matchAddValidation.safeParse({ ...base, players2: [2, 4] }).success,
    ).toBe(false);
    expect(
      matchAddValidation.safeParse({ ...base, players1: [1, 1] }).success,
    ).toBe(false);
  });
  it("rejects missing or negative scores", () => {
    expect(matchAddValidation.safeParse({ ...base, score1: "" }).success).toBe(
      false,
    );
    expect(matchAddValidation.safeParse({ ...base, score2: -1 }).success).toBe(
      false,
    );
  });
  it("knows the format sizes", () => {
    expect(formatSize("1v1")).toBe(1);
    expect(formatSize("2v2")).toBe(2);
  });
});
