import { afterEach, describe, expect, it, vi } from 'vitest';
import { byText, cleanup, click, render } from '@/components/test/render';
import { IosInstallGuide } from './IosInstallGuide';

vi.mock('@/lib/pwa/ios-detect', () => ({
  isStandalonePwa: vi.fn(() => false),
  setIosPushDismissed: vi.fn(),
}));

afterEach(async () => {
  await cleanup();
});

describe('IosInstallGuide', () => {
  it('explains what to do when "I added it" is tapped from a browser tab', async () => {
    const onOpenChange = vi.fn();
    await render(<IosInstallGuide open onOpenChange={onOpenChange} />);
    expect(document.querySelector('[data-testid="ios-install-still-in-browser"]')).toBeNull();
    await click(byText(document.body, 'button', 'I added it to Home'));
    expect(document.querySelector('[data-testid="ios-install-still-in-browser"]')?.textContent).toMatch(/still in the browser/);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
