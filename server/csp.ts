/**
 * Content Security Policy: the exact list of outside services the site may load from. Anything
 * else — an injected script, a tampered image URL, a form posting elsewhere — is blocked by the
 * browser. Built from an inventory of every external host the code uses:
 *
 *   images.unsplash.com                  photos on the public pages
 *   server.arcgisonline.com              map tiles (Leaflet)
 *   fonts.googleapis.com / gstatic.com   web fonts (index.html)
 *   geocoding-api.open-meteo.com         address lookup (primary)
 *   nominatim.openstreetmap.org          address lookup (fallback)
 *   router.project-osrm.org              road routes on the map
 *
 * Adding a new outside service means adding its host to the matching directive below,
 * otherwise browsers will block it. Set CSP_REPORT_ONLY=true to have browsers only report
 * violations (in the console) without blocking — a safe way to trial a change on the live site.
 */
/**
 * `appOrigin`: on the admin host, the main site the page loads its code and API from
 * (https://duolingoexpresslogistics.com) — allowed alongside 'self'.
 */
export function cspDirectives(isProduction: boolean, appOrigin?: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    // 'unsafe-inline' for styles only: React style={{...}} props and Leaflet position map
    // elements with inline styles. Scripts get no such exception.
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    // data:/blob: — uploaded signature stamps, the transparent fallback map tile, and the
    // images html2canvas/jsPDF generate while exporting a PDF.
    'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://server.arcgisonline.com'],
    'connect-src': [
      "'self'",
      'https://geocoding-api.open-meteo.com',
      'https://nominatim.openstreetmap.org',
      'https://router.project-osrm.org',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'manifest-src': ["'self'"],
  };
  // Upgrading http:// subresources to https:// only makes sense behind HTTPS (production);
  // locally it would break plain-http development.
  if (appOrigin) {
    for (const d of ['script-src', 'style-src', 'font-src', 'img-src', 'connect-src', 'manifest-src']) directives[d].push(appOrigin);
  }
  if (isProduction) directives['upgrade-insecure-requests'] = [];
  return directives;
}
