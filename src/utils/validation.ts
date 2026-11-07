import { z } from "zod";

function normalizeTeamName(name: string) {
  return name
    .split(",")
    .map(t => t.toLowerCase().trim())
    .filter(t => t !== "")
    .sort()
    .join(",");
}

const nonNegativeInt = z
  .union([z.string(), z.number()])
  .refine(
    v => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0,
    "Must be a non-negative whole number",
  )
  .transform(Number);

export const matchAddValidation = z.object({
  team1: z.string().min(2).transform(normalizeTeamName),
  team2: z.string().min(2).transform(normalizeTeamName),
  score1: nonNegativeInt,
  score2: nonNegativeInt,
  comment: z.string().optional().default(""),
});

export const seasonAddValidation = z.object({
  number: nonNegativeInt,
});

export type MatchAddInput = z.input<typeof matchAddValidation>;
export type MatchAddOutput = z.output<typeof matchAddValidation>;
export type SeasonAddInput = z.input<typeof seasonAddValidation>;
export type SeasonAddOutput = z.output<typeof seasonAddValidation>;
