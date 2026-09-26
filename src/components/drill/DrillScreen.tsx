import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useBackOverride } from '@/lib/back';
import type { DrillCopy } from '@/lib/drill/copy';
import type { DrillTarget, WorldData } from '@/lib/drill/types';
import type { DrillGame } from '@/lib/drill/useGame';
import { ChoiceGrid } from './ChoiceGrid';
import { Hud } from './Hud';
import { RunDoneDialog } from './RunDoneDialog';
import { RunOverPanel } from './RunOverPanel';
import { type TargetOutline, WorldMap } from './WorldMap';

interface DrillScreenProps {
  /** the world map to show targets on; categories without one pass `renderStage` instead */
  basemap?: WorldData;
  /** outlines for targets that aren't shapes on the basemap (Terrain's deserts, lakes...) */
  outlines?: TargetOutline[];
  /** what to show in place of the map for the current target (a portrait, a flag, ...) */
  renderStage?: (target: DrillTarget, outcome: 'ok' | 'bad' | null) => ReactNode;
  game: DrillGame;
  copy: DrillCopy;
  /** extra detail about the target, shown once it's been answered (when facts are on) */
  renderFacts?: (target: DrillTarget) => ReactNode;
  /** how to answer, in place of the multiple choice (Mandarin Sentences' reveal and mark-yourself); null keeps the choices */
  renderControls?: (target: DrillTarget) => ReactNode;
}

export function DrillScreen({ basemap, outlines, renderStage, game, copy, renderFacts, renderControls }: DrillScreenProps) {
  const { store, byId, showFacts, phase, run, target, targetId, choices, pickedId, pick, advance, quitToHome, startRun } = game;
  // During a run, the header's back arrow returns to this category's menu (the run stays saved).
  useBackOverride(quitToHome);

  if (!run || !target) return null;

  const locked = phase !== 'asking';
  const outcome = phase === 'ok' ? 'ok' : phase === 'over' ? 'bad' : null;
  const pickedName = pickedId ? byId.get(pickedId)?.name : undefined;
  const targetGeo = target.f ? { name: target.name, f: target.f, a: target.a ?? 0 } : null;
  // Next only appears when facts are showing, since that's the only time a right answer waits;
  // otherwise it moves on by itself. It sits above the facts card, which can push the bottom of
  // the screen out of view.
  const showNext = showFacts && phase === 'ok';

  return (
    <div className="flex flex-col gap-4">
      <Hud run={run} store={store} phase={phase} copy={copy} />

      {renderStage
        ? renderStage(target, outcome)
        : basemap && <WorldMap world={basemap} outlines={outlines} targetId={targetId} targetGeo={targetGeo} outcome={outcome} run={run} />}

      {showNext && (
        <Button type="button" onClick={advance}>
          Next
        </Button>
      )}

      {/* A right answer speaks for itself (the choice turns green, the map labels it); only facts get a card. */}
      {phase === 'ok' && showFacts && renderFacts && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">{renderFacts(target)}</div>
      )}

      {phase === 'over' ? (
        <RunOverPanel
          run={run}
          store={store}
          target={target}
          pickedName={pickedName}
          facts={showFacts ? renderFacts?.(target) : null}
          onPlayAgain={startRun}
          onHome={quitToHome}
        />
      ) : (
        (renderControls?.(target) ?? (
          <ChoiceGrid choices={choices} byId={byId} targetId={targetId} pickedId={pickedId} locked={locked} onPick={pick} />
        ))
      )}

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
