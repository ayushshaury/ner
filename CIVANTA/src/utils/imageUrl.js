export function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const backendBase = import.meta.env.VITE_BACKEND_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "") : "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return backendBase ? `${backendBase}${cleanPath}` : cleanPath;
}
