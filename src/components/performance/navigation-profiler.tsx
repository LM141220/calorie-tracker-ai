"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type PendingNavigation = {
  from: string;
  to: string;
  startedAt: number;
  resourceStartIndex: number;
};

function displayPath(pathname: string) {
  return pathname.replace(/\/meal\/[0-9a-f-]{36}(?=\/|$)/gi, "/meal/[id]");
}

export function NavigationProfiler() {
  const pathname = usePathname();
  const pendingNavigation = useRef<PendingNavigation | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const [navigationTiming] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (navigationTiming) {
      console.info(
        [
          "[PERF HYDRATION] NavigationProfiler mounted",
          `time after navigation start: ${performance.now().toFixed(1)}ms`,
          `TTFB: ${navigationTiming.responseStart.toFixed(1)}ms`,
          `DOMContentLoaded: ${navigationTiming.domContentLoadedEventEnd.toFixed(1)}ms`,
          "Landmark only; this does not mean every client component has hydrated.",
        ].join("\n"),
      );
    }

    function recordClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const destination = new URL(anchor.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname
      ) {
        return;
      }

      pendingNavigation.current = {
        from: window.location.pathname,
        to: destination.pathname,
        startedAt: performance.now(),
        resourceStartIndex: performance.getEntriesByType("resource").length,
      };
    }

    document.addEventListener("click", recordClick, true);
    return () => document.removeEventListener("click", recordClick, true);
  }, []);

  useEffect(() => {
    const navigation = pendingNavigation.current;
    if (!navigation || navigation.to !== pathname) {
      return;
    }
    pendingNavigation.current = null;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const routePaintTime = performance.now();
        window.setTimeout(() => {
          const resources = performance
            .getEntriesByType("resource")
            .slice(navigation.resourceStartIndex)
            .filter(
              (resource): resource is PerformanceResourceTiming =>
                resource instanceof PerformanceResourceTiming,
            );
          const bytes = resources.reduce(
            (total, resource) => total + resource.transferSize,
            0,
          );
          const imageResources = resources.filter((resource) =>
            resource.name.includes("/_next/image"),
          );
          console.info(
            [
              `[PERF NAV] ${displayPath(navigation.from)} → ${displayPath(navigation.to)}`,
              `click-to-route-commit-and-paint: ${(routePaintTime - navigation.startedAt).toFixed(1)}ms`,
              `browser resources started since click (prefetch-before-click excluded): ${resources.length}`,
              `reported transfer bytes: ${bytes}`,
              `Next Image requests: ${imageResources.length}`,
            ].join("\n"),
          );
        }, 250);
      });
    });
  }, [pathname]);

  return null;
}
