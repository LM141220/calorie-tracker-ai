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
    if (
      process.env.NODE_ENV === "production" &&
      process.env.NEXT_PUBLIC_PERF_LOGS !== "true"
    ) {
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

      const startedAt = performance.now();
      const resourceStartIndex =
        performance.getEntriesByType("resource").length;
      pendingNavigation.current = {
        from: window.location.pathname,
        to: destination.pathname,
        startedAt,
        resourceStartIndex,
      };
      window.__lumoPendingNavigation = {
        from: window.location.pathname,
        to: destination.pathname,
        startedAt,
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
          const rscResources = resources.filter((resource) => {
            try {
              const url = new URL(resource.name);
              return (
                url.pathname === navigation.to && url.searchParams.has("_rsc")
              );
            } catch {
              return false;
            }
          });
          const rscLines =
            rscResources.length > 0
              ? rscResources.flatMap((resource, index) => [
                  `RSC #${index + 1} start-after-click: ${(resource.startTime - navigation.startedAt).toFixed(1)}ms`,
                  `RSC #${index + 1} first-byte-after-click: ${(resource.responseStart - navigation.startedAt).toFixed(1)}ms`,
                  `RSC #${index + 1} end-after-click: ${(resource.responseEnd - navigation.startedAt).toFixed(1)}ms`,
                  `RSC #${index + 1} request-duration: ${(resource.responseEnd - resource.startTime).toFixed(1)}ms`,
                  `RSC #${index + 1} TTFB: ${(resource.responseStart - resource.startTime).toFixed(1)}ms`,
                  `RSC #${index + 1} body-transfer: ${(resource.responseEnd - resource.responseStart).toFixed(1)}ms`,
                  `RSC #${index + 1} bytes: transfer=${resource.transferSize}, encoded=${resource.encodedBodySize}, decoded=${resource.decodedBodySize}`,
                  `RSC #${index + 1} server-timing: ${resource.serverTiming.map((timing) => `${timing.name}=${timing.duration.toFixed(1)}ms`).join(", ") || "not exposed"}`,
                ])
              : [
                  "RSC request: no matching request started after click (possibly prefetched or served from Next.js cache)",
                ];
          console.info(
            [
              `[PERF NAV] ${displayPath(navigation.from)} → ${displayPath(navigation.to)}`,
              `click-to-route-commit-and-paint: ${(routePaintTime - navigation.startedAt).toFixed(1)}ms`,
              `browser resources started since click (prefetch-before-click excluded): ${resources.length}`,
              `reported transfer bytes: ${bytes}`,
              `Next Image requests: ${imageResources.length}`,
              ...rscLines,
            ].join("\n"),
          );
        }, 250);
      });
    });
  }, [pathname]);

  return null;
}
