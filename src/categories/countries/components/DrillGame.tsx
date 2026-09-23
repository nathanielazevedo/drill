import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WorldData } from '../lib/types';
import type { useCountriesGame } from '../lib/useGame';
import { ChoiceGrid } from './ChoiceGrid';
import { Hud } from './Hud';
import { ResultBanner } from './ResultBanner';
import { RunDoneDialog } from './RunDoneDialog';
import { RunOverDialog } from './RunOverDialog';
import { WorldMap } from './WorldMap';

interface DrillGameProps {
  world: WorldData;
  game: ReturnType<typeof useCountriesGame>;
}

function missNote(pickedName: string | undefined, none: string): string {
  return pickedName ? `You picked ${pickedName}` : none;
}

export function DrillGame({ world, game }: DrillGameProps) {
  const { store, byId, phase, run, target, targetId, choices, pickedId, pick, skip, advance, quitToHome, startRun } = game;
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<number>(undefined);
  const [prevTargetId, setPrevTargetId] = useState(targetId);

  if (targetId !== prevTargetId) {
    setPrevTargetId(targetId);
    if (armed) setArmed(false);
  }

  if (!run || !target) return null;

  const locked = phase !== 'asking';
  const outcome = phase === 'ok' ? 'ok' : phase === 'bad' || phase === 'over' ? 'bad' : null;
  const pickedName = pickedId ? byId.get(pickedId)?.name : undefined;

  const handleSkip = () => {
    if (run.mode === 'strict' && !armed) {
      setArmed(true);
      armTimer.current = window.setTimeout(() => setArmed(false), 2500);
      return;
    }
    setArmed(false);
    skip();
  };

  return (
    <div className="flex flex-col gap-4">
      <Hud run={run} store={store} phase={phase} onQuit={quitToHome} />

      <WorldMap world={world} targetId={targetId} outcome={outcome} run={run} />

      {phase === 'bad' && (
        <ResultBanner kind="bad" title={`It's ${target.name}`} sub={missNote(pickedName, 'You skipped this one')} />
      )}
      {phase === 'ok' && <ResultBanner kind="ok" title={`✓ ${target.name}`} />}

      <ChoiceGrid choices={choices} byId={byId} targetId={targetId} pickedId={pickedId} locked={locked} onPick={pick} />

      <div className="flex gap-2">
        {locked ? (
          <Button type="button" className="flex-1" onClick={advance}>
            Next
          </Button>
        ) : (
          <Button type="button" variant="outline" className="flex-1" onClick={handleSkip}>
            {run.mode === 'strict' ? (armed ? 'Tap again to end run' : 'Give up') : 'Skip'}
          </Button>
        )}
      </div>

      <RunOverDialog open={phase === 'over'} run={run} store={store} target={target} pickedName={pickedName} onPlayAgain={() => startRun(run.mode)} onHome={quitToHome} />
      <RunDoneDialog open={phase === 'done'} run={run} byId={byId} missedCount={Object.keys(store.missed).length} onDrillMissed={() => startRun('missed')} onPlayAgain={() => startRun(run.mode === 'missed' ? 'free' : run.mode)} onHome={quitToHome} />
    </div>
  );
}
