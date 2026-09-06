/**
 * Dev-only: React DevTools' installHook.js logs a cosmetic Suspense instrumentation
 * error with React 19 + Next.js 16. Fixed upstream in react-devtools (Sep 2025) but
 * older extension builds still emit it.
 *
 * Next.js patches console.error after this script runs and shows its overlay
 * *before* calling through. A simple wrap therefore still pops the red box.
 * Install a getter/setter so later patches become the inner function and this
 * filter stays outermost.
 */
export const SUPPRESS_REACT_DEVTOOLS_SUSPENSE_WARNING_SCRIPT = `
(function () {
  var markers = [
    'react instrumentation encountered an error',
    'cleaning up async info that was not on the parent suspense boundary',
  ];
  function includesKnownBug(value) {
    if (value == null) return false;
    var lower = String(value).toLowerCase();
    for (var i = 0; i < markers.length; i++) {
      if (lower.indexOf(markers[i]) !== -1) return true;
    }
    if (typeof value === 'object') {
      if (includesKnownBug(value.message) || includesKnownBug(value.stack)) return true;
    }
    return false;
  }
  function argsIncludeKnownBug(args) {
    for (var i = 0; i < args.length; i++) {
      if (includesKnownBug(args[i])) return true;
    }
    return false;
  }

  var nativeError = console.error.bind(console);
  var current = nativeError;
  var depth = 0;

  function filtered() {
    if (argsIncludeKnownBug(arguments)) return;
    if (depth > 0) {
      return nativeError.apply(console, arguments);
    }
    depth += 1;
    try {
      return current.apply(console, arguments);
    } finally {
      depth -= 1;
    }
  }

  try {
    Object.defineProperty(console, 'error', {
      configurable: true,
      enumerable: true,
      get: function () {
        return filtered;
      },
      set: function (fn) {
        if (typeof fn === 'function' && fn !== filtered) {
          current = fn;
        }
      },
    });
  } catch (err) {
    console.error = filtered;
  }
})();
`.trim();
