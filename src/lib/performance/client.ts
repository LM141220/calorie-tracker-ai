"use client";

import { useEffect } from "react";

type PerformanceWindow = Window & {
  __lumoFeatureMountCounts?: Record<string, number>;
};

export function usePerformanceMount(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const performanceWindow = window as PerformanceWindow;
    const counts = (performanceWindow.__lumoFeatureMountCounts ??= {});
    counts[componentName] = (counts[componentName] ?? 0) + 1;
    console.info(
      `[PERF MOUNT] ${componentName} #${counts[componentName]} (dev Strict Mode may count intentional remounts)`,
    );
  }, [componentName]);
}
