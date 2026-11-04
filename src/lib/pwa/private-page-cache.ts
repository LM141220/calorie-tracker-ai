"use client";

const PRIVATE_PAGE_CACHE_NAMES = [
  "calorie-tracker-ai-private-pages",
  "start-url",
];

export async function clearPrivatePageCaches(): Promise<void> {
  if (!("caches" in window)) {
    return;
  }

  await Promise.all(
    PRIVATE_PAGE_CACHE_NAMES.map((cacheName) => caches.delete(cacheName)),
  );
}
