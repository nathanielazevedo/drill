import { createContext, type RefObject, useContext, useEffect } from 'react';

type BackHandler = (() => void) | null;

/**
 * The app header's back button. By default it leaves the category; a screen inside one (a run in
 * progress) can take it over so back goes one step at a time. Held in a ref, not state, so taking
 * it over doesn't re-render the app.
 */
export const BackContext = createContext<RefObject<BackHandler>>({ current: null });

/** While mounted, the header's back button calls `handler` instead of leaving the category. */
export function useBackOverride(handler: () => void) {
  const ref = useContext(BackContext);
  useEffect(() => {
    ref.current = handler;
    return () => {
      if (ref.current === handler) ref.current = null;
    };
  });
}
