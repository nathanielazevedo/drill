import worldData from './data/world.json';
import { CountryHome } from './components/CountryHome';
import { DrillGame } from './components/DrillGame';
import { useCountriesGame } from './lib/useGame';
import type { WorldData } from './lib/types';

const world = worldData as unknown as WorldData;

export function CountriesCategory() {
  const game = useCountriesGame(world);

  return game.screen === 'home' ? <CountryHome world={world} game={game} /> : <DrillGame world={world} game={game} />;
}
