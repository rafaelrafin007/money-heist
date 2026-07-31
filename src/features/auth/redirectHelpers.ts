export function buildRedirectUrl(origin: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}
