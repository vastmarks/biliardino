import { create } from "zustand";

interface AppState {
  /** season shown on pages that have a season selector */
  season: number;
  /** true once the user picked a season themselves (otherwise the current season is used) */
  seasonPicked: boolean;
  setSeason: (season: number) => void;
  /** sets the default (current) season without marking it as picked */
  setDefaultSeason: (season: number) => void;
}

export const useStore = create<AppState>(set => ({
  season: 1,
  seasonPicked: false,
  setSeason: (season: number) => set({ season, seasonPicked: true }),
  setDefaultSeason: (season: number) =>
    set(state => (state.seasonPicked ? state : { season })),
}));
