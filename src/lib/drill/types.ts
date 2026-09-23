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

/** A physical world basemap: ocean, land silhouettes, borders, graticule. `countries` are the fillable quiz shapes. */
export interface WorldData {
  w: number;
  top: number;
  bottom: number;
  /** frame [x, y, w, h] that "zoom out" returns to; the whole world when absent */
  home?: [number, number, number, number];
  ocean: string;
  graticule: string;
  context: string;
  borders: string;
  countries: Country[];
}

/**
 * One quizzable thing on the map — a country, a lake, a mountain range... Categories build
 * these from their own data; the drill engine and map only ever see this shape.
 */
export interface DrillTarget {
  id: string;
  name: string;
  /** the filterable grouping shown as chips on the home screen (a continent, a feature type, ...) */
  region: string;
  /** focus frame [x, y, w, h] in the shared basemap's projection; only for targets shown on the map */
  f?: [number, number, number, number];
  /** projected area, for targets shown on the map */
  a?: number;
}

/** A run goes until the first miss, or until every target is answered. */
export interface RunState {
  /** the selection key the run was started with ('All', or regions joined by ' + ') */
  region: string;
  order: string[];
  i: number;
  results: Record<string, 'ok' | 'bad'>;
  correct: number;
  finished?: boolean;
  newBest?: boolean;
}

export interface Store {
  v: 1;
  /** best streak per selection, keyed by bestKey() */
  best: Record<string, number>;
  /** the regions selected on the home screen; empty means every target */
  regions: string[];
  /** show the category's facts after each answer (and wait for Next instead of auto-advancing) */
  showFacts: boolean;
  /** ask targets in a fresh random order each run instead of the fixed one */
  shuffle: boolean;
  /** the run to resume; only saved once it has an answer in it */
  run: RunState | null;
}
