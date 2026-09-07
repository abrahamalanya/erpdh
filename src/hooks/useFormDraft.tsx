import { useCallback, useEffect, useRef, useState } from 'react';
import { clearDraft, loadDraft, saveDraft } from '../utils/formDraft';

interface UseFormDraftResult {
  /** A draft saved before the last reload is available to restore. */
  pendingDraft: boolean;
  /** When that draft was saved, epoch ms. */
  savedAt: number | null;
  /** Apply the pending draft to the form. */
  restore: () => void;
  /** Drop the pending draft without applying it. */
  discard: () => void;
  /** Drop any stored draft — call after a successful submit. */
  clear: () => void;
}

const AUTOSAVE_DELAY_MS = 800;

/**
 * Keeps an unsaved create form recoverable across a tab reload (see
 * {@link file://../utils/formDraft.ts}). While `enabled`, the current `value`
 * is written to IndexedDB — debounced, and immediately whenever the tab is
 * hidden, which is exactly when the camera app foregrounds and the tab risks
 * being discarded. On the next open, a previously saved draft is offered via
 * `pendingDraft`/`restore` instead of being silently overwritten.
 */
export function useFormDraft<T>(
  key: string,
  value: T,
  onRestore: (value: T) => void,
  enabled: boolean
): UseFormDraftResult {
  const [pending, setPending] = useState<{ value: T; savedAt: number } | null>(null);

  const valueRef = useRef(value);
  valueRef.current = value;
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  /** Autosave stays parked until the user resolves an offered draft, so opening the form can't clobber it. */
  const armedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setPending(null);
      armedRef.current = false;
      return;
    }
    let cancelled = false;
    armedRef.current = false;
    void loadDraft<T>(key).then((record) => {
      if (cancelled) {
        return;
      }
      if (record) {
        setPending({ value: record.value, savedAt: record.savedAt });
      } else {
        armedRef.current = true;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const flush = (): void => {
      if (armedRef.current) {
        void saveDraft(key, valueRef.current);
      }
    };
    const timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, key, value]);

  const restore = useCallback((): void => {
    setPending((current) => {
      if (current) {
        onRestoreRef.current(current.value);
      }
      return null;
    });
    armedRef.current = true;
  }, []);

  const discard = useCallback((): void => {
    void clearDraft(key);
    setPending(null);
    armedRef.current = true;
  }, [key]);

  const clear = useCallback((): void => {
    void clearDraft(key);
    setPending(null);
    armedRef.current = false;
  }, [key]);

  return {
    pendingDraft: pending !== null,
    savedAt: pending?.savedAt ?? null,
    restore,
    discard,
    clear,
  };
}
