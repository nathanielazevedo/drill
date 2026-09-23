import { Locate, Globe2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { RunState, WorldData } from '@/lib/drill/types';
import './world-map.css';

export interface TargetGeo {
  name: string;
  /** focus frame [x, y, w, h] in the basemap's projection */
  f: [number, number, number, number];
  /** projected area, used to decide if the locator ring should show */
  a: number;
}

interface WorldMapProps {
  world: WorldData;
  targetId: string | null;
  targetGeo: TargetGeo | null;
  outcome: 'ok' | 'bad' | null;
  run: RunState | null;
}

interface View {
  cx: number;
  cy: number;
  w: number;
}

interface EngineApi {
  flyTo: (t: View, ms?: number) => void;
  targetView: (f: [number, number, number, number]) => View;
  worldView: () => View;
  setTarget: (id: string | null) => void;
  markOutcome: (kind: 'ok' | 'bad') => void;
  paintPool: (run: RunState | null) => void;
}

/** targets smaller than this projected area always get the locator ring, whatever the zoom */
const RING_MAX_AREA = 1000;

function buildSvgInner(world: WorldData): string {
  const { w: W, top: TOP, bottom: BOT, ocean, graticule, context, borders, countries } = world;
  return `
    <path class="sea" d="${ocean}"/>
    <path class="grat" d="${graticule}"/>
    <path class="ctx" d="${context}"/>
    <g id="land">${countries.map((c) => `<path class="c" data-id="${c.id}" d="${c.d}"/>`).join('')}</g>
    <path class="borders" d="${borders}"/>
    <path class="sea-edge" d="M0,${TOP}H${W}M0,${BOT}H${W}"/>`;
}

/**
 * The physical world map: pan/zoom/fly-to, plus a ring+label locator over whatever `targetGeo`
 * points at. Country paths (from `world`) get highlighted when `targetId` happens to match one —
 * harmless no-op otherwise, which is how categories with no fillable shape (lakes, mountain
 * ranges, ...) still get the locator without any per-target geometry of their own.
 */
export function WorldMap({ world, targetId, targetGeo, outcome, run }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGGElement>(null);
  const geoRef = useRef<TargetGeo | null>(targetGeo);
  geoRef.current = targetGeo;

  const eRef = useRef<{
    pathEls: Map<string, SVGPathElement>;
    ring: SVGCircleElement;
    pulse: SVGCircleElement;
    label: SVGTextElement;
    aspect: number;
    pxW: number;
    view: View;
    anim: number;
    reduceMotion: boolean;
    ptrs: Map<number, { x: number; y: number }>;
    targetId: string | null;
  } | null>(null);

  const engineApiRef = useRef<EngineApi | null>(null);

  // One-time setup: build the SVG contents and wire up pan/zoom. Runs once per mount.
  useLayoutEffect(() => {
    const svg = svgRef.current!;
    const wrap = wrapRef.current!;
    const overlay = overlayRef.current!;
    const { w: W, top: TOP, bottom: BOT } = world;

    const world1 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    world1.setAttribute('id', 'world');
    world1.innerHTML = buildSvgInner(world);
    svg.insertBefore(world1, overlay);

    const useA = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    useA.setAttribute('href', '#world');
    useA.setAttribute('x', String(-W));
    const useB = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    useB.setAttribute('href', '#world');
    useB.setAttribute('x', String(W));
    svg.insertBefore(useA, overlay);
    svg.insertBefore(useB, overlay);

    const land = world1.querySelector('#land')!;
    const pathEls = new Map<string, SVGPathElement>(
      [...land.children].map((el) => [el.getAttribute('data-id')!, el as SVGPathElement]),
    );

    const e = {
      pathEls,
      ring: overlay.querySelector('.ring') as SVGCircleElement,
      pulse: overlay.querySelector('.pulse') as SVGCircleElement,
      label: overlay.querySelector('.label') as SVGTextElement,
      aspect: 1,
      pxW: 1,
      view: { cx: W / 2, cy: (TOP + BOT) / 2, w: W },
      anim: 0,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ptrs: new Map<number, { x: number; y: number }>(),
      targetId: null as string | null,
    };
    eRef.current = e;

    const worldView = (): View => ({
      cx: W / 2,
      cy: (TOP + BOT) / 2,
      w: Math.max(W * 1.03, (BOT - TOP) * 1.03 * e.aspect),
    });
    const wrapX = () => {
      e.view.cx = ((e.view.cx % W) + W) % W;
    };
    const fitY = (v: View) => {
      const h = v.w / e.aspect;
      const worldH = BOT - TOP;
      v.cy = h >= worldH ? (TOP + BOT) / 2 : Math.min(Math.max(v.cy, TOP + h / 2), BOT - h / 2);
      return v;
    };

    function measure() {
      const w = svg.clientWidth;
      const h = svg.clientHeight;
      if (!w || !h) return false;
      e.pxW = w;
      e.aspect = w / h;
      return true;
    }

    function updateOverlay() {
      const t = e.targetId && geoRef.current;
      overlay.style.display = t ? '' : 'none';
      if (!t) return;
      const upp = e.view.w / e.pxW;
      const [x, y, w, h] = t.f;
      const cy = y + h / 2;
      let cx = x + w / 2;
      cx += Math.round((e.view.cx - cx) / W) * W;
      // Targets with no fillable shape of their own (nothing in `pathEls`, e.g. a lake or
      // mountain range) have no other way to show where they are, so the ring always shows.
      // Anything up to about Zimbabwe's size always gets it too: judging by on-screen size alone,
      // mid-size countries (Tunisia, Ghana) lost the ring as soon as the map zoomed in on them.
      const hasFill = e.targetId != null && e.pathEls.has(e.targetId);
      const small = !hasFill || t.a < RING_MAX_AREA || Math.sqrt(t.a) / upp < 24;
      const r = Math.max((Math.hypot(w, h) / 2) * 1.3, 18 * upp);
      for (const el of [e.ring, e.pulse]) {
        el.setAttribute('cx', String(cx));
        el.setAttribute('cy', String(cy));
        el.setAttribute('r', String(r));
        el.style.display = small ? '' : 'none';
      }
      const fs = 13.5 * upp;
      e.label.setAttribute('x', String(cx));
      e.label.setAttribute('y', String(small ? cy - r - 10 * upp : cy));
      e.label.setAttribute('font-size', String(fs));
      e.label.setAttribute('stroke-width', String(fs * 0.28));
    }

    function frame() {
      const h = e.view.w / e.aspect;
      svg.setAttribute(
        'viewBox',
        `${(e.view.cx - e.view.w / 2).toFixed(2)} ${(e.view.cy - h / 2).toFixed(2)} ${e.view.w.toFixed(2)} ${h.toFixed(2)}`,
      );
      updateOverlay();
    }

    function targetView(f: [number, number, number, number]): View {
      const [x, y, w, h] = f;
      const big = Math.min(1, Math.max(w, h * e.aspect) / (W * 0.35));
      const k = 2.6 - 1.3 * big;
      const vw = Math.min(Math.max(w * k, h * k * e.aspect, 130), W * 1.03);
      return fitY({ cx: x + w / 2, cy: y + h / 2, w: vw });
    }

    function flyTo(t: View, ms = 800) {
      cancelAnimationFrame(e.anim);
      const target = { ...t };
      target.cx += Math.round((e.view.cx - target.cx) / W) * W;
      if (e.reduceMotion || !ms) {
        e.view = target;
        wrapX();
        svg.classList.remove('moving');
        frame();
        return;
      }
      const from = { ...e.view };
      const t0 = performance.now();
      svg.classList.add('moving');
      const step = (now: number) => {
        let k = Math.min(1, (now - t0) / ms);
        k = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        e.view.cx = from.cx + (target.cx - from.cx) * k;
        e.view.cy = from.cy + (target.cy - from.cy) * k;
        e.view.w = Math.exp(Math.log(from.w) + (Math.log(target.w) - Math.log(from.w)) * k);
        frame();
        if (k < 1) e.anim = requestAnimationFrame(step);
        else {
          svg.classList.remove('moving');
          wrapX();
          frame();
        }
      };
      e.anim = requestAnimationFrame(step);
    }

    function setTarget(id: string | null) {
      const prev = e.targetId && e.pathEls.get(e.targetId);
      if (prev) prev.classList.remove('target', 'ok', 'bad');
      e.targetId = id;
      const el = id && e.pathEls.get(id);
      if (el) {
        land.appendChild(el);
        el.classList.add('target');
      }
      e.label.textContent = '';
      e.ring.classList.remove('ok', 'bad');
      e.pulse.classList.remove('ok', 'bad', 'still');
      updateOverlay();
    }

    function markOutcome(kind: 'ok' | 'bad') {
      const el = e.targetId && e.pathEls.get(e.targetId);
      if (el) {
        el.classList.remove('ok', 'bad');
        el.classList.add(kind);
      }
      e.ring.classList.add(kind);
      e.pulse.classList.add(kind, 'still');
      e.label.textContent = geoRef.current?.name ?? '';
      updateOverlay();
    }

    function paintPool(runState: RunState | null) {
      const pool = new Set(runState ? runState.order : []);
      for (const [id, el] of e.pathEls) {
        const r = runState?.results[id];
        el.setAttribute('class', 'c' + (pool.has(id) ? '' : ' out') + (r ? ' ' + r : ''));
      }
    }

    const clampView = () => {
      e.view.w = Math.min(Math.max(e.view.w, 6), W * 1.6);
      fitY(e.view);
    };
    const zoomAt = (px: number, py: number, factor: number) => {
      const r = svg.getBoundingClientRect();
      const upp0 = e.view.w / r.width;
      const wx = e.view.cx + (px - r.left - r.width / 2) * upp0;
      const wy = e.view.cy + (py - r.top - r.height / 2) * upp0;
      e.view.w *= factor;
      clampView();
      const upp1 = e.view.w / r.width;
      e.view.cx = wx - (px - r.left - r.width / 2) * upp1;
      e.view.cy = wy - (py - r.top - r.height / 2) * upp1;
      clampView();
      wrapX();
    };

    const onPointerDown = (ev: PointerEvent) => {
      svg.setPointerCapture(ev.pointerId);
      e.ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      cancelAnimationFrame(e.anim);
      svg.classList.add('moving');
    };
    const onPointerMove = (ev: PointerEvent) => {
      const p = e.ptrs.get(ev.pointerId);
      if (!p) return;
      if (e.ptrs.size === 1) {
        const upp = e.view.w / e.pxW;
        e.view.cx -= (ev.clientX - p.x) * upp;
        e.view.cy -= (ev.clientY - p.y) * upp;
        clampView();
        wrapX();
      } else if (e.ptrs.size === 2) {
        const [a, b] = [...e.ptrs.values()];
        const before = Math.hypot(a.x - b.x, a.y - b.y);
        const otherEntry = [...e.ptrs.entries()].find(([id]) => id !== ev.pointerId)!;
        const other = otherEntry[1];
        const after = Math.hypot(ev.clientX - other.x, ev.clientY - other.y);
        const upp = e.view.w / e.pxW;
        e.view.cx -= ((ev.clientX - p.x) / 2) * upp;
        e.view.cy -= ((ev.clientY - p.y) / 2) * upp;
        if (before > 0 && after > 0) zoomAt((ev.clientX + other.x) / 2, (ev.clientY + other.y) / 2, before / after);
      }
      p.x = ev.clientX;
      p.y = ev.clientY;
      frame();
    };
    const endPtr = (ev: PointerEvent) => {
      e.ptrs.delete(ev.pointerId);
      if (!e.ptrs.size) svg.classList.remove('moving');
    };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      cancelAnimationFrame(e.anim);
      zoomAt(ev.clientX, ev.clientY, Math.exp(ev.deltaY * 0.0016));
      frame();
    };

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', endPtr);
    svg.addEventListener('pointercancel', endPtr);
    svg.addEventListener('wheel', onWheel, { passive: false });

    const ro = new ResizeObserver(() => {
      if (measure()) frame();
    });
    ro.observe(wrap);

    measure();
    e.view = worldView();
    frame();

    engineApiRef.current = { flyTo, targetView, setTarget, markOutcome, paintPool, worldView };

    return () => {
      ro.disconnect();
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', endPtr);
      svg.removeEventListener('pointercancel', endPtr);
      svg.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(e.anim);
      engineApiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  useEffect(() => {
    const engine = engineApiRef.current;
    if (!engine) return;
    engine.setTarget(targetId);
    if (targetGeo) engine.flyTo(engine.targetView(targetGeo.f));
  }, [targetId, targetGeo]);

  useEffect(() => {
    const engine = engineApiRef.current;
    if (!engine || !outcome) return;
    engine.markOutcome(outcome);
    if (targetGeo) engine.flyTo(engine.targetView(targetGeo.f), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  useEffect(() => {
    engineApiRef.current?.paintPool(run);
  }, [run]);

  return (
    <div ref={wrapRef} className="map-wrap">
      <svg ref={svgRef} className="map-svg" viewBox="0 0 2000 1163">
        <defs>
          <radialGradient id="sea" cx="50%" cy="38%" r="80%">
            <stop className="s1" offset="0" />
            <stop className="s2" offset="1" />
          </radialGradient>
        </defs>
        <g ref={overlayRef} id="overlay">
          <circle className="pulse" r="10" />
          <circle className="ring" r="10" />
          <text className="label" />
        </g>
      </svg>
      <div className="map-tools">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="map-tool"
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={() => {
            const engine = engineApiRef.current;
            if (engine && targetGeo) engine.flyTo(engine.targetView(targetGeo.f), 600);
          }}
          aria-label="Recenter on target"
        >
          <Locate />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="map-tool"
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={() => {
            engineApiRef.current?.flyTo(engineApiRef.current.worldView(), 600);
          }}
          aria-label="Zoom to world"
        >
          <Globe2 />
        </Button>
      </div>
    </div>
  );
}
