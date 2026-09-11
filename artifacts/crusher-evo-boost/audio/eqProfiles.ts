// Keep the five controls, but cover the audible range through the upper treble.
export const EQ_BAND_FREQUENCIES = [60, 150, 400, 2000, 12000] as const;

export type EqProfileValues = {
  bassBoost: number;
  subBass: number;
  bands: number[];
};

export const DEFAULT_PROFILE_VALUES: Record<string, EqProfileValues> = {
  'crusher-drive': {
    bassBoost: 78,
    subBass: 6,
    bands: [8, 6, 3, 1, 2],
  },
  'night-bass': {
    bassBoost: 54,
    subBass: 3,
    bands: [6, 4, 2, 1, 2],
  },
  balanced: {
    bassBoost: 20,
    subBass: 0,
    bands: [2, 0, 0, 1, 1],
  },
};