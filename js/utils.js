/**
 * Helper to resolve asset URLs whether running on localhost or as an extension content script
 */
export function getAssetUrl(path) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    const cleanPath = path.replace(/^\.\//, '');
    return chrome.runtime.getURL(cleanPath);
  }
  return path;
}
