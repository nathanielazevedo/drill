export interface Country {
  id: string;
  name: string;
  region: string;
  alt: string[];
  d: string;
  /** focus frame [x, y, w, h] in map units */
  f: [number, number, number, number];
  /** projected area, used to decide if a country needs a locator ring */
  a: number;
}

export interface WorldData {
  w: number;
  top: number;
  bottom: number;
  ocean: string;
  graticule: string;
  context: string;
  borders: string;
  countries: Country[];
}

export type Mode = 'strict' | 'free' | 'missed';

export interface Miss {
  id: string;
  pickedId: string | null;
}

export interface RunState {
  mode: Mode;
  region: string;
  order: string[];
  i: number;
  results: Record<string, 'ok' | 'bad'>;
  correct: number;
  wrong: number;
  misses: Miss[];
  finished?: boolean;
  newBest?: boolean;
}

export interface MissedEntry {
  n: number;
  t: number;
}

export interface Store {
  v: 1;
  missed: Record<string, MissedEntry>;
  best: Record<string, number>;
  region: string;
  run: RunState | null;
}
