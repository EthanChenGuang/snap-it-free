import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { AppLanguage } from '@/messages';

// Lets React flush effects inside act() without the "not wrapped in act" warning.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ root: Root; container: HTMLElement }> = [];

/** Renders into jsdom with the app language preference seeded, the way a returning user has it. */
export async function render(ui: ReactNode, language: AppLanguage = 'en') {
  localStorage.setItem('shoumanwu_app_preferences', JSON.stringify({ language, appearance: 'light', soundAlerts: false }));
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(ui));
  return container;
}

export async function cleanup() {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  localStorage.clear();
}

export async function click(element: Element | null | undefined) {
  if (!element) throw new Error('nothing to click');
  await act(async () => {
    (element as HTMLElement).click();
  });
}

/** Lets pending fetch promises and the state updates they trigger settle. */
export async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });
}

export function byText(container: HTMLElement, selector: string, text: string) {
  return Array.from(container.querySelectorAll(selector)).find((el) => el.textContent?.trim() === text) ?? null;
}

export function jsonResponse(status: number, body: unknown) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
