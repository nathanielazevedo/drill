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
];
