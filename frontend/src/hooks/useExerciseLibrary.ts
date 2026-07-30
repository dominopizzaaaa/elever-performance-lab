'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ExerciseLibrary } from '@/lib/types';

/** Module-level cache — the catalogue is static reference data. */
let cached: ExerciseLibrary | null = null;

export function useExerciseLibrary(): { library: ExerciseLibrary | null; isLoading: boolean } {
  const [library, setLibrary] = useState<ExerciseLibrary | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;

    const controller = new AbortController();
    api
      .getLibrary(controller.signal)
      .then((result) => {
        cached = result;
        setLibrary(result);
      })
      .catch(() => {
        /* the add-exercise form falls back to free text */
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  return { library, isLoading };
}
