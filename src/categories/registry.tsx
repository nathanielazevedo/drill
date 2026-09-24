import { lazy, type ComponentType } from 'react';

export interface CategoryDef {
  id: string;
  name: string;
  description: string;
  /** how many targets it has, for "Best 7/50" on the category list (which doesn't load the data) */
  size: number;
  Component: ComponentType;
}

// Each category is lazy-loaded: some (like Countries, with its ~2MB map data) shouldn't
// weigh down the home screen for anyone who hasn't opened them yet.
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'countries',
    name: 'Countries',
    description: 'Name every country on the map.',
    size: 197,
    Component: lazy(() => import('./countries/CountriesCategory').then((m) => ({ default: m.CountriesCategory }))),
  },
  {
    id: 'terrain',
    name: 'Terrain',
    description: 'Oceans, lakes, mountain ranges, and deserts.',
    size: 61,
    Component: lazy(() => import('./terrain/TerrainCategory').then((m) => ({ default: m.TerrainCategory }))),
  },
  {
    id: 'us-states',
    name: 'US States',
    description: 'All 50, from Maine to Hawaii.',
    size: 50,
    Component: lazy(() => import('./us-states/UsStatesCategory').then((m) => ({ default: m.UsStatesCategory }))),
  },
  {
    id: 'china',
    name: 'Chinese Provinces',
    description: 'All 33, from Xinjiang to Macau.',
    size: 33,
    Component: lazy(() => import('./china/ChinaCategory').then((m) => ({ default: m.ChinaCategory }))),
  },
  {
    id: 'presidents',
    name: 'US Presidents',
    description: 'All 45, in order, from their portraits.',
    size: 45,
    Component: lazy(() => import('./presidents/PresidentsCategory').then((m) => ({ default: m.PresidentsCategory }))),
  },
];
