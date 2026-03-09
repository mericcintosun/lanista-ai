const GAME_HTML_URL = '/lanista-build/game.html';
let prefetched = false;

export function prefetchGameHtml(): void {
  if (prefetched) return;
  prefetched = true;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = GAME_HTML_URL;
  link.as = 'document';
  document.head.appendChild(link);
}
