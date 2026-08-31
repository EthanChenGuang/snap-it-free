/**
 * Dev-only: React DevTools' installHook.js logs a cosmetic Suspense instrumentation
 * error with React 19 + Next.js 16. Fixed upstream in react-devtools (Sep 2025) but
 * older extension builds still emit it. Filter the known message so real errors show.
 */
export const SUPPRESS_REACT_DEVTOOLS_SUSPENSE_WARNING_SCRIPT = `
(function () {
  var markers = [
    'react instrumentation encountered an error',
    'cleaning up async info that was not on the parent suspense boundary',
  ];
  function includesKnownBug(value) {
    if (typeof value !== 'string') return false;
    var lower = value.toLowerCase();
    for (var i = 0; i < markers.length; i++) {
      if (lower.indexOf(markers[i]) !== -1) return true;
    }
    return false;
  }
  function argsIncludeKnownBug(args) {
    for (var i = 0; i < args.length; i++) {
      if (includesKnownBug(String(args[i]))) return true;
    }
    return false;
  }
  var origError = console.error;
  console.error = function () {
    if (argsIncludeKnownBug(arguments)) return;
    return origError.apply(console, arguments);
  };
})();
`.trim();
