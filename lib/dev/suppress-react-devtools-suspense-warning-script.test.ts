import { afterEach, describe, expect, it, vi } from 'vitest';
import { SUPPRESS_REACT_DEVTOOLS_SUSPENSE_WARNING_SCRIPT } from './suppress-react-devtools-suspense-warning-script';

const DEVTOOLS_MESSAGE =
  'We are cleaning up async info that was not on the parent Suspense boundary. This is a bug in React.';

describe('SUPPRESS_REACT_DEVTOOLS_SUSPENSE_WARNING_SCRIPT', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(console, 'error');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(console, 'error', originalDescriptor);
    }
  });

  function installSuppressScript() {
    // eslint-disable-next-line no-eval -- the production script is an inline IIFE
    eval(SUPPRESS_REACT_DEVTOOLS_SUSPENSE_WARNING_SCRIPT);
  }

  function patchLikeNextOverlay() {
    const overlay = vi.fn();
    const previous = console.error;
    console.error = function nextJsHandleConsoleError(...args: unknown[]) {
      overlay(...args);
      return previous.apply(console, args);
    };
    return overlay;
  }

  it('keeps filtering the DevTools Suspense message after a later console.error patch', () => {
    const native = vi.fn();
    Object.defineProperty(console, 'error', {
      configurable: true,
      writable: true,
      value: native,
    });

    installSuppressScript();
    const overlay = patchLikeNextOverlay();

    console.error(DEVTOOLS_MESSAGE);
    console.error(new Error(DEVTOOLS_MESSAGE));

    expect(overlay).not.toHaveBeenCalled();
    expect(native).not.toHaveBeenCalled();
  });

  it('still forwards real console errors through a later overlay patch', () => {
    const native = vi.fn();
    Object.defineProperty(console, 'error', {
      configurable: true,
      writable: true,
      value: native,
    });

    installSuppressScript();
    const overlay = patchLikeNextOverlay();

    console.error('Failed to load listing');

    expect(overlay).toHaveBeenCalledTimes(1);
    expect(overlay).toHaveBeenCalledWith('Failed to load listing');
    expect(native).toHaveBeenCalledTimes(1);
    expect(native).toHaveBeenCalledWith('Failed to load listing');
  });
});
