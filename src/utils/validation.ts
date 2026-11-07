import { z } from "zod";
import { MATCH_FORMATS, formatSize } from "~/utils/players";

const nonNegativeInt = z
  .union([z.string(), z.number()])
  .refine(
    v => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0,
    "Must be a non-negative whole number",
  )
  .transform(Number);

/**
 * A match is entered by picking the format and the players of both sides from the list of
 * known players. Which team that makes is decided on the server (see utils/players.ts).
 */
export const matchAddValidation = z
  .object({
    format: z.enum(MATCH_FORMATS),
    players1: z.array(z.number().int().positive()),
    players2: z.array(z.number().int().positive()),
    score1: nonNegativeInt,
    score2: nonNegativeInt,
    comment: z.string().max(500).optional().default(""),
  })
  .superRefine((value, ctx) => {
    const size = formatSize(value.format);
    for (const side of ["players1", "players2"] as const) {
      if (value[side].length !== size) {
        ctx.addIssue({
          code: "custom",
          path: [side],
          message: `Pick exactly ${size} player${size > 1 ? "s" : ""} for a ${value.format}`,
        });
      }
    }
    const all = [...value.players1, ...value.players2];
    if (new Set(all).size !== all.length) {
      ctx.addIssue({
        code: "custom",
        path: ["players1"],
        message: "A player can only be picked once",
      });
    }
  });

export const playerAddValidation = z.object({
  name: z.string().min(1).max(100),
});

export const seasonAddValidation = z.object({
  number: nonNegativeInt,
});

export type MatchAddInput = z.input<typeof matchAddValidation>;
export type MatchAddOutput = z.output<typeof matchAddValidation>;
export type SeasonAddInput = z.input<typeof seasonAddValidation>;
export type SeasonAddOutput = z.output<typeof seasonAddValidation>;
