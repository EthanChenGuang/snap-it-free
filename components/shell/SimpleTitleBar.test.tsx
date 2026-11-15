import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@/components/test/render';
import { SimpleTitleBar } from './SimpleTitleBar';

afterEach(cleanup);

describe('SimpleTitleBar', () => {
  it('shows only the title when no back target is given', async () => {
    const container = await render(<SimpleTitleBar title="Favorites" />);
    expect(container.querySelector('h1')?.textContent).toBe('Favorites');
    expect(container.querySelector('a')).toBeNull();
  });

  it('shows a labelled back link to the given path', async () => {
    const container = await render(<SimpleTitleBar title="Settings" backHref="/" backLabel="Back" />);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.getAttribute('aria-label')).toBe('Back');
  });
});
