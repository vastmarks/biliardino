import { z } from "zod";
import { MATCH_FORMATS, formatSize } from "~/utils/players";

/** A whole number from a form field (string) or JSON (number), within limits. */
const wholeNumber = (min: number, max: number) =>
  z
    .union([z.string().max(10), z.number()])
    .refine(
      v =>
        v !== "" &&
        Number.isInteger(Number(v)) &&
        Number(v) >= min &&
        Number(v) <= max,
      `Must be a whole number between ${min} and ${max}`,
    )
    .transform(Number);

/** Ids of the players of one side (1v1 or 2v2, so at most 2). */
const side = z.array(z.number().int().positive()).min(1).max(2);

/**
 * A match is entered by picking the format and the players of both sides from the list of
 * known players. Which team that makes is decided on the server (see utils/players.ts).
 */
export const matchAddValidation = z
  .object({
    format: z.enum(MATCH_FORMATS),
    players1: side,
    players2: side,
    score1: wholeNumber(0, 99),
    score2: wholeNumber(0, 99),
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

/** Correcting a saved match: same fields as entering one, minus the format (it can't change). */
export const matchUpdateValidation = z
  .object({
    id: z.number().int().positive(),
    players1: side,
    players2: side,
    score1: wholeNumber(0, 99),
    score2: wholeNumber(0, 99),
    comment: z.string().max(500).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.players1.length !== value.players2.length) {
      ctx.addIssue({
        code: "custom",
        path: ["players2"],
        message: "Both sides need the same number of players",
      });
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
  name: z.string().min(1).max(100), // the real rules are in validatePlayerName
});

export const seasonAddValidation = z.object({
  number: wholeNumber(1, 9999),
});

export type MatchUpdateInput = z.input<typeof matchUpdateValidation>;
export type MatchAddInput = z.input<typeof matchAddValidation>;
export type MatchAddOutput = z.output<typeof matchAddValidation>;
export type SeasonAddInput = z.input<typeof seasonAddValidation>;
export type SeasonAddOutput = z.output<typeof seasonAddValidation>;
