export function readingBackHref(pathname: string): string | null {
  const chapter = pathname.match(/^\/home\/books\/(\d+)\/chapters\/\d+$/);
  if (chapter) return `/home/books/${chapter[1]}`;
  if (/^\/home\/texts\/[^/]+$/.test(pathname)) return "/home/texts";
  return null;
}
