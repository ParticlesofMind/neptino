"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * React hook replacing src/scripts/utils/courseId.ts
 * Provides course ID from URL params via Next.js router instead of window.location
 */
export function useCourseId() {
  const searchParams = useSearchParams();

  const courseId = useMemo(() => {
    return searchParams.get("courseId") || searchParams.get("id") || null;
  }, [searchParams]);

  const isNewCourseMode = useMemo(() => courseId === null, [courseId]);

  const navigateToCourse = useCallback(
    (id: string, section?: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("courseId", id);
      if (section) {
        url.hash = `#${section}`;
      }
      window.location.href = url.toString();
    },
    [],
  );

  return { courseId, isNewCourseMode, navigateToCourse };
}

/**
 * Standalone utility for non-React contexts (e.g., vanilla TS files that still need it)
 * This maintains backward compatibility during migration.
 */
export function getCourseId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("courseId") || urlParams.get("id") || null;
}

export function isNewCourseMode(): boolean {
  return getCourseId() === null;
}
