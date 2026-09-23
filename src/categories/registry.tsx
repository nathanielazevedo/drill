import { lazy, type ComponentType } from 'react';

export interface CategoryDef {
  id: string;
  name: string;
  description: string;
  Component: ComponentType;
}

// Each category is lazy-loaded: some (like Countries, with its ~2MB map data) shouldn't
// weigh down the home screen for anyone who hasn't opened them yet.
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'countries',
    name: 'Countries',
    description: 'Name every country on the map.',
    Component: lazy(() => import('./countries/CountriesCategory').then((m) => ({ default: m.CountriesCategory }))),
  },
  {
    id: 'terrain',
    name: 'Terrain',
    description: 'Oceans, lakes, mountain ranges, and deserts.',
    Component: lazy(() => import('./terrain/TerrainCategory').then((m) => ({ default: m.TerrainCategory }))),
  },
  {
    id: 'china',
    name: 'Chinese Provinces',
    description: 'All 33, from Xinjiang to Macau.',
    Component: lazy(() => import('./china/ChinaCategory').then((m) => ({ default: m.ChinaCategory }))),
  },
  {
    id: 'presidents',
    name: 'US Presidents',
    description: 'All 45, in order, from their portraits.',
    Component: lazy(() => import('./presidents/PresidentsCategory').then((m) => ({ default: m.PresidentsCategory }))),
  },
];
