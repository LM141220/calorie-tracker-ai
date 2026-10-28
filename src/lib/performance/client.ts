"use client";

import { useEffect } from "react";

type PendingNavigation = {
  from: string;
  to: string;
  startedAt: number;
  dashboardContentVisibleAt?: number;
};

declare global {
  interface Window {
    __lumoPendingNavigation?: PendingNavigation;
  }
}

type PerformanceWindow = Window & {
  __lumoFeatureMountCounts?: Record<string, number>;
  __lumoPendingNavigation?: PendingNavigation;
};

export function recordDashboardContentVisible() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_PERF_LOGS !== "true"
  ) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const performanceWindow = window as PerformanceWindow;
      const navigation = performanceWindow.__lumoPendingNavigation;
      if (!navigation || navigation.to !== "/dashboard") {
        return;
      }

      const visibleAt = performance.now();
      if (navigation.dashboardContentVisibleAt) {
        return;
      }
      navigation.dashboardContentVisibleAt = visibleAt;
      console.info(
        [
          "[PERF DASHBOARD VISIBLE]",
          `${navigation.from} → /dashboard`,
          `click-to-dashboard-content-visible: ${(visibleAt - navigation.startedAt).toFixed(1)}ms`,
        ].join("\n"),
      );
    });
  });
}

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
