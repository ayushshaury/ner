export function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  // Ensure starting slash
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return cleanPath;
}
