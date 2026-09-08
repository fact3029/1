export const EQ_BAND_FREQUENCIES = [60, 150, 400, 1000, 4000] as const;

export type EqProfileValues = {
  bassBoost: number;
  subBass: number;
  bands: number[];
};

export const DEFAULT_PROFILE_VALUES: Record<string, EqProfileValues> = {
  'crusher-drive': {
    bassBoost: 78,
    subBass: 6,
    bands: [6, 4, 2, 0, 1],
  },
  'night-bass': {
    bassBoost: 54,
    subBass: 3,
    bands: [4, 3, 1, 0, 1],
  },
  balanced: {
    bassBoost: 20,
    subBass: 0,
    bands: [1, 0, 0, 0, 1],
  },
};