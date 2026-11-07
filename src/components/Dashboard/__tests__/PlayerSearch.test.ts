import { searchPlayers } from "~/components/Dashboard/PlayerSearch";

const p = (name: string) => ({ name });
const roster = [
  "Marco",
  "Chiara",
  "Giulia",
  "Zoë",
  "Marta",
  "Anna-Maria",
  "Luca",
].map(p);

describe("searchPlayers", () => {
  it("offers the first players (the recent ones) when nothing is typed", () => {
    expect(searchPlayers(roster, "", 3).map(x => x.name)).toEqual([
      "Marco",
      "Chiara",
      "Giulia",
    ]);
    expect(searchPlayers(roster, "   ", 3)).toHaveLength(3);
  });
  it("matches the start of the name first, then anywhere in it", () => {
    expect(searchPlayers(roster, "mar").map(x => x.name)).toEqual([
      "Marco",
      "Marta",
      "Anna-Maria",
    ]);
  });
  it("ignores case and accents in both directions", () => {
    expect(searchPlayers(roster, "ZOE").map(x => x.name)).toEqual(["Zoë"]);
    expect(searchPlayers([p("Zoe")], "zoë").map(x => x.name)).toEqual(["Zoe"]);
  });
  it("finds nothing for an unknown name and respects the limit", () => {
    expect(searchPlayers(roster, "xyz")).toEqual([]);
    expect(searchPlayers(roster, "a", 2)).toHaveLength(2);
  });
});
