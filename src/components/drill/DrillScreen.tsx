import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, WorldData } from '@/lib/drill/types';
import type { DrillGame } from '@/lib/drill/useGame';
import { ChoiceGrid } from './ChoiceGrid';
import { Hud } from './Hud';
import { ResultBanner } from './ResultBanner';
import { RunDoneDialog } from './RunDoneDialog';
import { RunOverDialog } from './RunOverDialog';
import { WorldMap } from './WorldMap';

interface DrillScreenProps {
  /** the world map to show targets on; categories without one pass `renderStage` instead */
  basemap?: WorldData;
  /** what to show in place of the map for the current target (a portrait, a flag, ...) */
  renderStage?: (target: DrillTarget, outcome: 'ok' | 'bad' | null) => ReactNode;
  game: DrillGame;
  copy: DrillCopy;
  /** extra detail about the target, shown in the result banner once it's been answered */
  renderFacts?: (target: DrillTarget) => ReactNode;
}

export function DrillScreen({ basemap, renderStage, game, copy, renderFacts }: DrillScreenProps) {
  const { store, byId, showFacts, phase, run, target, targetId, choices, pickedId, pick, advance, quitToHome, startRun } = game;

  if (!run || !target) return null;

  const locked = phase !== 'asking';
  const outcome = phase === 'ok' ? 'ok' : phase === 'over' ? 'bad' : null;
  const pickedName = pickedId ? byId.get(pickedId)?.name : undefined;
  const targetGeo = target.f ? { name: target.name, f: target.f, a: target.a ?? 0 } : null;
  // With facts showing, the answer card can push the bottom of the screen out of view, so Next
  // moves up to sit right above it.
  const nextOnTop = showFacts && !!renderFacts && phase === 'ok';

  return (
    <div className="flex flex-col gap-4">
      <Hud run={run} store={store} phase={phase} copy={copy} onQuit={quitToHome} />

      {renderStage
        ? renderStage(target, outcome)
        : basemap && <WorldMap world={basemap} targetId={targetId} targetGeo={targetGeo} outcome={outcome} run={run} />}

      {nextOnTop && (
        <Button type="button" onClick={advance}>
          Next
        </Button>
      )}

      {phase === 'ok' && (
        <ResultBanner kind="ok" title={`✓ ${target.name}`}>
          {showFacts && renderFacts?.(target)}
        </ResultBanner>
      )}

      <ChoiceGrid choices={choices} byId={byId} targetId={targetId} pickedId={pickedId} locked={locked} onPick={pick} />

      {phase === 'ok' && !nextOnTop && (
        <Button type="button" onClick={advance}>
          Next
        </Button>
      )}

      <RunOverDialog
        open={phase === 'over'}
        run={run}
        store={store}
        target={target}
        pickedName={pickedName}
        facts={showFacts ? renderFacts?.(target) : null}
        onPlayAgain={startRun}
        onHome={quitToHome}
      />
      <RunDoneDialog
        open={phase === 'done'}
        run={run}
        copy={copy}
        onPlayAgain={startRun}
        onHome={quitToHome}
      />
    </div>
  );
}
