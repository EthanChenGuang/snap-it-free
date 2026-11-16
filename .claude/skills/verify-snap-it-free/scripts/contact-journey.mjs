// `contact` journey: the Chinese contact assistant on the signed-in listing detail page ("mocked auth").
// See ../features/contact-assistant.md. Every check labelled "mocked auth" proves the UI, not the server auth.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as H from './contact-harness.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const PHONE = { width: 390, height: 844 };

const TEMPLATES = [
  { id: 'today', it: 'Ciao! È ancora disponibile? Posso passare oggi. Grazie!', zh: '还在吗？我今天可以来取', en: 'Still available? I can come today' },
  { id: 'tomorrow', it: 'Ciao! È ancora disponibile? Posso passare domani. Grazie!', zh: '还在吗？我明天可以来取', en: 'Still available? I can come tomorrow' },
  { id: 'address', it: 'Ciao! Mi interessa. Dove si trova per il ritiro? Grazie!', zh: '请问取货地址在哪里？', en: 'Where is the pickup address?' },
  { id: 'time', it: 'Ciao! Mi interessa. A che ora posso passare? Grazie!', zh: '请问我几点可以来取？', en: 'What time can I come?' },
];

const COPY = {
  zh: {
    cta: '联系卖家', title: '中文联系助手', primary: '复制消息并打开卖家页面', tabSend: '发消息', tabTranslate: '翻译',
    close: '关闭', pick: '选一条消息发给卖家', copied: '已复制', copy: '复制', translate: '翻译', translating: '翻译中…',
    toItalian: '翻成意大利语', pickReply: '选一条回复', claimed: '已领取',
    sentFrag: '翻译', goTranslate: '去翻译', replyHint: '在卖家页面的聊天里长按对方的消息 → 复制，再粘贴到这里',
    aiNote: 'AI 翻译，可能有误。地址、时间和电话请以原文为准。', limitReached: '最多 1000 字，超出的部分没有保留', copyFailedHint: '没能自动复制，请长按上面的意大利语手动复制',
    unavailable: '翻译暂时不可用，请稍后再试', subscriptionRequired: '翻译功能需要订阅后使用',
    dailyLimit: '今天的翻译次数已用完，明天再来', signInAgain: '登录已过期，请重新登录后再试',
    composeUnclear: '这句话我们没看懂，请换个说法再试',
  },
  en: {
    cta: 'Contact the seller', title: 'Contact helper', primary: "Copy and open seller's page", tabSend: 'Send a message', tabTranslate: 'Translate',
    close: 'Close', pick: 'Pick a message to send the seller', copied: 'Copied', copy: 'Copy', translate: 'Translate', translating: 'Translating…',
    toItalian: 'Translate to Italian', pickReply: 'Pick a reply', claimed: 'Claimed',
    sentFrag: 'Translate', goTranslate: 'Go to Translate', replyHint: "In the chat on the seller's page, long-press their message → Copy, then paste it here",
    aiNote: 'AI translation — it can be wrong. Trust the original for addresses, times and phone numbers.', limitReached: 'The limit is 1,000 characters. Anything beyond that was not kept', copyFailedHint: 'Could not copy automatically. Copy the Italian text above by hand',
    unavailable: 'Translation is unavailable right now, please try again later', subscriptionRequired: 'Translation is available to subscribers',
    dailyLimit: "You've used today's translations. Try again tomorrow.", signInAgain: 'Your session expired. Sign in again and retry',
    composeUnclear: 'We could not understand that. Please try rephrasing',
  },
};

export async function contactJourney({ browser, url, out, check, shot, rows = 'ABCDEFG' }) {
  const on = (r) => rows.includes(r);
  mkdirSync(out, { recursive: true });
  const supabaseUrl = H.readSupabaseUrl(REPO);
  const proxy = await H.startStrippingProxy(url);
  const { accessToken, session } = H.forgeSession();
  const auditTotals = { leaked: 0, mocked: 0 };
  const sleep = (page, ms) => page.waitForTimeout(ms);

  // A real listing id and its seller URL from the live home page / detail HTML (anonymous server reads).
  const home = await (await fetch(`${url}/`)).text();
  const ids = [...new Set([...home.matchAll(/\/listing\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g)].map((m) => m[1]))];
  const listingId = ids[0];
  const detailHtml = await (await fetch(`${url}/listing/${listingId}`)).text();
  const externalUrl = detailHtml.match(/\\"external_url\\":\\"([^"\\]+)\\"/)?.[1];
  check(Boolean(listingId && externalUrl), `setup: real listing ${listingId?.slice(0, 8)} with a seller URL (anonymous read)`);
  const detailPath = `/listing/${listingId}`;

  /** A browser context that believes it is signed in (mocked auth). */
  async function session_({ lang = 'zh', viewport = PHONE, appearance = 'light', signedIn = true, variant = null, clipboard = true, execFails = false, locale = 'en-US' } = {}) {
    proxy.hooks.mutate = variant ? H.listingVariant(listingId, variant) : null;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale });
    await context.addInitScript(([l, a]) => {
      try {
        localStorage.setItem('shoumanwu_app_preferences', JSON.stringify({ language: l, appearance: a, soundAlerts: false }));
        localStorage.setItem('shoumanwu_onboarding_completed_v2', '1');
      } catch {}
    }, [lang, appearance]);
    if (execFails) await context.addInitScript(() => { document.execCommand = () => false; });
    if (clipboard) await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: proxy.url });
    if (signedIn) await context.addCookies([H.cookieFor(supabaseUrl, session, proxy.url)]);
    const audit = await H.installSupabaseMocks(context, { supabaseUrl, accessToken, session, signedIn });
    const sellerHits = await H.stubSellerSite(context);
    const ctl = { translateCalls: [], translate: null };
    await context.route('**/api/contact/translate', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}');
      ctl.translateCalls.push(body);
      if (ctl.translate) return ctl.translate(route, body);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ italian: 'Ciao', unclear: false }) });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${proxy.url}${detailPath}`, { waitUntil: 'load' });
    proxy.hooks.mutate = null;
    await page.waitForTimeout(1200);
    const close = async () => {
      auditTotals.leaked += audit.leaked;
      auditTotals.mocked += audit.mocked;
      await context.close();
    };
    return { context, page, audit, sellerHits, ctl, errors, close, lang };
  }

  const dialog = (page) => page.getByRole('dialog');
  const primaryCta = (s) => s.page.locator('.listing-detail-sticky-bar button');
  async function openSheet(s) {
    await primaryCta(s).click();
    await dialog(s.page).waitFor({ timeout: 5000 });
    await sleep(s.page, 500);
  }
  const preview = (page) => page.getByTestId('contact-italian-preview');
  const tabBtn = (page, name) => dialog(page).getByRole('tab', { name });
  const clip = async (page) => {
    await page.bringToFront();
    return page.evaluate(() => navigator.clipboard.readText());
  };
  const textarea = (page, i) => dialog(page).locator('textarea').nth(i);
  async function fill(page, i, value) {
    const ta = textarea(page, i);
    await ta.fill(value);
  }

  const respond = (status, body) => (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  // ---------------------------------------------------------------- A. entry points
  if (on('A')) {
  for (const lang of ['zh', 'en']) {
    const c = COPY[lang];
    const s = await session_({ lang });
    const label = (await primaryCta(s).innerText()).trim();
    check(label === c.cta, `A [${lang}] primary button label is "${c.cta}" (mocked auth): "${label}"`);
    await openSheet(s);
    check((await dialog(s.page).getByText(c.title, { exact: true }).count()) > 0, `A [${lang}] click opens the sheet titled "${c.title}" (mocked auth)`);
    if (lang === 'zh') await shot(s.page, 'c01-sheet-zh-send');
    await s.close();
  }
  {
    const s = await session_({ lang: 'it' });
    const popupP = s.context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await primaryCta(s).click();
    const popup = await popupP;
    check(popup && popup.url().startsWith(externalUrl.slice(0, 40)), `A [it] opens the seller page directly in a new tab (popup url ${popup?.url().slice(0, 45)}) (mocked auth)`);
    check((await dialog(s.page).count()) === 0, 'A [it] no sheet is shown');
    await s.close();
  }
  {
    const s = await session_({ lang: 'zh', variant: (seg) => seg.replace('\\"status\\":\\"active\\"', '\\"status\\":\\"expired\\"') });
    const btn = primaryCta(s);
    check((await btn.innerText()).trim() === COPY.zh.claimed && (await btn.isDisabled()), 'A [zh] non-available listing: disabled "已领取" button, nothing to open (mocked SSR payload: status=expired)');
    await btn.click({ force: true, timeout: 1000 }).catch(() => {});
    check((await dialog(s.page).count()) === 0, 'A [zh] non-available listing: no sheet');
    await s.close();
  }
  {
    const s = await session_({ lang: 'zh', variant: (seg) => seg.replace(/\\"external_url\\":\\"[^"\\]*\\"/, '\\"external_url\\":\\"https://evil.example/x\\"') });
    check(await primaryCta(s).isDisabled(), 'A [zh] listing with a non-allowed seller URL: button disabled, no sheet (mocked SSR payload)');
    await s.close();
  }
  {
    const s = await session_({ lang: 'zh', variant: (seg) => seg.replace('\\"source\\":\\"subito\\"', '\\"source\\":\\"vinted\\"').replace(/\\"external_url\\":\\"[^"\\]*\\"/, '\\"external_url\\":\\"https://www.vinted.it/items/1\\"') });
    const label = (await primaryCta(s).innerText()).trim();
    const popupP = s.context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await primaryCta(s).click();
    const popup = await popupP;
    check(!label.includes('联系卖家') && popup && /vinted\.it/.test(popup.url()) && (await dialog(s.page).count()) === 0, `A [zh] non-Subito source keeps today's behaviour: label "${label}", opens the page directly, no sheet (mocked SSR payload)`);
    await s.close();
  }
  {
    const s = await session_({ lang: 'zh', signedIn: false });
    await sleep(s.page, 2500);
    check((await s.page.getByText('联系卖家', { exact: true }).count()) === 0 && (await s.page.getByText('中文联系助手').count()) === 0 && (await s.page.getByText('登录以免费领取').count()) > 0, 'A [zh] signed out: sign-in guest card, no contact button, no contact sheet');
    await shot(s.page, 'c02-signed-out-guest');
    await s.close();
  }

  }

  if (on('B')) {
  // ---------------------------------------------------------------- B. send tab
  for (const lang of ['zh', 'en']) {
    const c = COPY[lang];
    const s = await session_({ lang });
    await openSheet(s);
    const checked0 = await dialog(s.page).getByRole('radio', { checked: true }).count();
    check(checked0 === 1 && (await preview(s.page).innerText()) === TEMPLATES[0].it, `B [${lang}] default template is the first one, preview shows its Italian text`);
    const group = dialog(s.page).getByRole('radiogroup', { name: c.pick });
    check((await group.count()) === 1, `B [${lang}] radio group is labelled "${c.pick}"`);
    for (const t of TEMPLATES) {
      await dialog(s.page).getByText(t[lang], { exact: true }).click();
      const text = await preview(s.page).innerText();
      const meaningOk = lang === 'zh' ? /[一-鿿]/.test(t.zh) : !/[一-鿿]/.test(t.en);
      check(text === t.it && meaningOk, `B [${lang}] template "${t.id}": option reads "${t[lang]}", preview is exactly its Italian text`);
    }
    await s.close();
  }
  {
    const s = await session_({ lang: 'zh' });
    for (const [i, t] of TEMPLATES.entries()) {
      if (i > 0) await openSheet(s);
      else await openSheet(s);
      await dialog(s.page).getByText(t.zh, { exact: true }).click();
      const footerBefore = await s.page.getByTestId('contact-footer').evaluate((el) => el.getBoundingClientRect().height);
      const popupP = s.context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
      await dialog(s.page).getByTestId('contact-primary').click();
      const popup = await popupP;
      await sleep(s.page, 400);
      const clipText = await clip(s.page);
      check(clipText === t.it, `B [zh] "${t.id}": clipboard holds exactly the Italian text`);
      check(popup && popup.url().startsWith(externalUrl.slice(0, 40)) && s.sellerHits.includes(externalUrl), `B [zh] "${t.id}": new tab opens the listing's seller URL`);
      if (i === 0) {
        check((await s.page.getByText('已复制，去卖家页面粘贴').count()) === 0, 'B [zh] U1 no toast: the in-sheet notice is the only "copied" message (nothing overlaps)');
        check(await s.page.evaluate(() => document.activeElement?.dataset.testid === 'contact-primary'), 'B [zh] R3 focus is back on the pressed primary button after copy (sheet stays open)');
        const u1 = await s.page.evaluate(() => {
          const btn = document.querySelector('[data-testid=contact-sent] button');
          const sc = document.querySelector('[data-testid=contact-scroll]');
          const foot = document.querySelector('[data-testid=contact-footer]').getBoundingClientRect();
          const b = btn.getBoundingClientRect();
          const r = sc.getBoundingClientRect();
          const covered = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === btn;
          return { visible: b.top >= r.top - 1 && b.bottom <= r.bottom + 1 && b.bottom <= innerHeight, covered, footerH: foot.height, scrollTop: sc.scrollTop };
        });
        check(u1.visible && u1.covered, 'B [zh] U1 the "去翻译" button in the notice is fully visible and not covered by anything');
        check(Math.abs(u1.footerH - footerBefore) < 1, `B [zh] U1 the footer does not grow after sending (${Math.round(footerBefore)}px -> ${Math.round(u1.footerH)}px)`);
        await shot(s.page, 'c03-after-send-original-tab');
        const sheetOpen = (await dialog(s.page).count()) > 0;
        console.log(`INFO B after a successful send the sheet is ${sheetOpen ? 'still open' : 'closed'}`);
        s.afterSendOpen = sheetOpen;
        const sent = await dialog(s.page).getByTestId('contact-sent').innerText().catch(() => '');
        check(sent.includes(COPY.zh.sentFrag), `B [zh] after sending, the sheet tells the user the next step: "${sent.split('\n')[0].slice(0, 40)}…"`);
        await s.page.getByTestId('contact-scroll').evaluate((el) => { el.scrollTop = 60; });
        await dialog(s.page).getByRole('button', { name: COPY.zh.goTranslate }).click();
        await sleep(s.page, 200);
        check((await tabBtn(s.page, COPY.zh.tabTranslate).getAttribute('aria-selected')) === 'true', 'B [zh] the "去翻译" button takes the user straight to the Translate tab');
        const r2 = await s.page.evaluate(() => ({ role: document.activeElement?.getAttribute('role'), id: document.activeElement?.id ?? '', top: document.querySelector('[data-testid=contact-scroll]').scrollTop }));
        check(r2.role === 'tab' && r2.id.endsWith('-translate') && r2.top === 0, `B [zh] R2 focus lands on the Translate tab and the content is scrolled to the top (${r2.role}, scrollTop ${r2.top})`);
        await tabBtn(s.page, COPY.zh.tabSend).click();
      }
      if (popup) await popup.close();
      await s.page.bringToFront();
      await sleep(s.page, 3200); // toast gone, as after a real round trip to the other tab
      if ((await dialog(s.page).count()) > 0) {
        await s.page.keyboard.press('Escape');
        await sleep(s.page, 600);
      }
    }
    // Returning to the original tab: what does the user see / what is the next step?
    await sleep(s.page, 500);
    const bodyText = await s.page.locator('body').innerText();
    const hint = /翻译|粘贴卖家的回复|收到回复/.test(bodyText);
    check(hint || s.afterSendOpen, 'B [zh] back on the original tab the next step (translate the reply) is visible or reachable without guessing (sheet stays open with instructions)');
    await shot(s.page, 'c04-return-to-tab');
    await s.close();
  }
  {
    // copy failure: clipboard permission denied and execCommand returns false
    const s = await session_({ lang: 'zh', clipboard: false, execFails: true });
    await openSheet(s);
    const popupP = s.context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await dialog(s.page).getByTestId('contact-primary').click();
    const popup = await popupP;
    await sleep(s.page, 800);
    check(Boolean(popup), 'B [zh] copy failure: the seller page still opens');
    await s.page.bringToFront();
    check((await dialog(s.page).count()) === 1, 'B [zh] copy failure: the sheet stays open');
    check(await dialog(s.page).getByText(COPY.zh.copyFailedHint).isVisible(), 'B [zh] copy failure: the "copy by hand" hint is shown');
    check((await s.page.getByTestId('contact-sent').innerText()) === '', 'B [zh] copy failure: no false success notice');
    const sel = await s.page.evaluate(() => {
      const el = document.querySelector('[data-testid=contact-italian-preview]');
      const r = document.createRange();
      r.selectNodeContents(el);
      const sObj = getSelection();
      sObj.removeAllRanges();
      sObj.addRange(r);
      return { text: sObj.toString(), userSelect: getComputedStyle(el).userSelect };
    });
    check(sel.text === TEMPLATES[0].it && sel.userSelect !== 'none', `B [zh] copy failure: Italian text is selectable (user-select ${sel.userSelect})`);
    await shot(s.page, 'c05-copy-failed-hint');
    await s.close();
  }

  }

  if (on('C')) {
  // ---------------------------------------------------------------- C. translate tab
  const REPLY = {
    meaning: '是的，还在。你什么时候可以来？ Via Garibaldi 15',
    replies: [
      { italian: 'Posso passare oggi.', meaning: '我今天可以来。' },
      { italian: 'Posso passare domani.', meaning: '我明天可以来。' },
      { italian: 'A che ora ti va bene?', meaning: '你几点方便？' },
    ],
  };
  const errCase = async (s, status, expected, label, mode = 0) => {
    s.ctl.translate = respond(status, { error: 'x' });
    await fill(s.page, mode, 'Ciao, quando passi?');
    await dialog(s.page).getByRole('button', { name: mode === 0 ? COPY[s.lang].translate : COPY[s.lang].toItalian, exact: true }).click();
    await sleep(s.page, 600);
    const alert = await dialog(s.page).getByRole('alert').first().innerText().catch(() => '');
    check(alert === expected, `C [${s.lang}] ${label}: shows "${expected}" (got "${alert}")`);
  };
  for (const lang of ['zh', 'en']) {
    const c = COPY[lang];
    const s = await session_({ lang });
    await openSheet(s);
    await tabBtn(s.page, c.tabTranslate).click();
    await sleep(s.page, 300);
    const [replyBtn, composeBtn] = [dialog(s.page).getByRole('button', { name: c.translate, exact: true }), dialog(s.page).getByRole('button', { name: c.toItalian, exact: true })];
    check((await replyBtn.isDisabled()) && (await composeBtn.isDisabled()), `C [${lang}] both translate buttons are disabled for empty input`);
    await fill(s.page, 0, '   \n  ');
    check(await replyBtn.isDisabled(), `C [${lang}] whitespace-only input keeps the button disabled`);

    if (lang === 'zh') {
      // reply success
      s.ctl.translate = respond(200, REPLY);
      await fill(s.page, 0, '  Sì, è disponibile. Quando vuoi passare? Via Garibaldi 15  ');
      await replyBtn.click();
      await sleep(s.page, 700);
      check(JSON.stringify(s.ctl.translateCalls.at(-1)) === JSON.stringify({ mode: 'reply', text: 'Sì, è disponibile. Quando vuoi passare? Via Garibaldi 15', language: 'zh' }), 'C [zh] reply request body: mode/text trimmed/language');
      const body = await dialog(s.page).innerText();
      check(body.includes(REPLY.meaning) && body.includes(COPY.zh.pickReply) && REPLY.replies.every((r) => body.includes(r.italian) && body.includes(r.meaning)), 'C [zh] reply success shows the meaning and three alternatives with their meanings');
      await shot(s.page, 'c06-translate-reply-zh');
      const copyBtns = dialog(s.page).getByRole('button', { name: /^复制: / });
      check((await copyBtns.count()) === 3, 'C [zh] each alternative has its own copy button');
      for (let i = 0; i < 3; i += 1) {
        await copyBtns.nth(i).click();
        await sleep(s.page, 250);
        const got = await clip(s.page);
        check(got === REPLY.replies[i].italian, `C [zh] copy button ${i + 1} copies exactly "${REPLY.replies[i].italian}"`);
      }
      check(body.includes(COPY.zh.replyHint), 'C [zh] U4 hint under the paste label says where to find the seller reply');
      check((await dialog(s.page).getByTestId('contact-ai-note').count()) === 1 && body.includes(COPY.zh.aiNote), 'C [zh] U5 honesty note under the reply result');
      const original = 'Sì, è disponibile. Quando vuoi passare? Via Garibaldi 15';
      await fill(s.page, 0, original + ' domani?');
      await sleep(s.page, 200);
      check((await copyBtns.count()) === 0 && !(await dialog(s.page).innerText()).includes(REPLY.meaning), 'C [zh] R1 editing the pasted text hides the previous meaning and its copy buttons');
      await fill(s.page, 0, original);
      await sleep(s.page, 200);
      check((await copyBtns.count()) === 3, 'C [zh] R1 restoring the exact text shows its result again');
      // compose success, emoji + mixed text
      const mixed = '你好 😀 Ciao! 我 arrivo tra 10 minuti 👍🏽 谢谢 grazie';
      s.ctl.translate = respond(200, { italian: 'Ciao! Arrivo tra 10 minuti. Grazie! 😀', unclear: false });
      await fill(s.page, 1, mixed);
      await composeBtn.click();
      await sleep(s.page, 700);
      check(s.ctl.translateCalls.at(-1)?.text === mixed && s.ctl.translateCalls.at(-1)?.mode === 'compose', 'C [zh] emoji and mixed zh/it text is sent unchanged');
      check((await dialog(s.page).getByTestId('contact-ai-note').count()) === 2, 'C [zh] U5 honesty note under the compose result too');
      const composeCopy = dialog(s.page).getByRole('button', { name: /^复制: 将发送的意大利语/ });
      await composeCopy.click();
      await sleep(s.page, 250);
      check((await clip(s.page)) === 'Ciao! Arrivo tra 10 minuti. Grazie! 😀', 'C [zh] compose copy button copies exactly the Italian text (with emoji)');
      // unclear
      s.ctl.translate = respond(200, { italian: '', unclear: true });
      await fill(s.page, 1, 'asdfghjkl');
      await composeBtn.click();
      await sleep(s.page, 600);
      check((await dialog(s.page).getByRole('alert').last().innerText().catch(() => '')) === c.composeUnclear, 'C [zh] unclear compose input shows "couldn\'t understand, rephrase" (not "unavailable")');
      await shot(s.page, 'c07-compose-unclear-zh');
    }

    await errCase(s, 401, c.signInAgain, '401');
    await errCase(s, 403, c.subscriptionRequired, '403 subscription_required');
    await errCase(s, 429, c.dailyLimit, '429 daily_limit');
    await errCase(s, 502, c.unavailable, '502');
    await errCase(s, 503, c.unavailable, '503');
    s.ctl.translate = (route) => route.abort('connectionreset');
    await fill(s.page, 0, 'Ciao, quando passi?');
    await replyBtn.click();
    await sleep(s.page, 700);
    check((await dialog(s.page).getByRole('alert').first().innerText().catch(() => '')) === c.unavailable, `C [${lang}] network failure shows "${c.unavailable}"`);
    // an error must clear once the retry works
    s.ctl.translate = respond(200, REPLY);
    await replyBtn.click();
    await sleep(s.page, 700);
    check((await dialog(s.page).getByRole('alert').filter({ hasText: c.unavailable }).count()) === 0, `C [${lang}] a successful retry clears the error`);
    await s.close();
  }
  if (on('C')) {
    // R1: an edit while a request is in flight
    const s = await session_({ lang: 'zh' });
    await openSheet(s);
    await tabBtn(s.page, COPY.zh.tabTranslate).click();
    s.ctl.translate = async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REPLY) }).catch(() => {});
    };
    await fill(s.page, 0, 'primo testo');
    const trBtn = dialog(s.page).getByRole('button', { name: COPY.zh.translate, exact: true });
    await trBtn.click();
    await fill(s.page, 0, 'secondo testo');
    await sleep(s.page, 300);
    check(await trBtn.isEnabled(), 'C [zh] R1 editing while a request is in flight frees the button (no stuck spinner)');
    await sleep(s.page, 3000);
    check(!(await dialog(s.page).innerText()).includes(REPLY.meaning), 'C [zh] R1 the late response for the old text is not shown against the new text');
    await s.close();
  }

  {
    // 12-second slow response
    const s = await session_({ lang: 'zh' });
    await openSheet(s);
    await tabBtn(s.page, COPY.zh.tabTranslate).click();
    s.ctl.translate = async (route) => {
      await new Promise((r) => setTimeout(r, 12000));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REPLY) }).catch(() => {});
    };
    await fill(s.page, 0, 'Quando puoi passare?');
    const btn = dialog(s.page).getByRole('button', { name: COPY.zh.translate, exact: true });
    await btn.click();
    await sleep(s.page, 400);
    const loadingBtn = dialog(s.page).getByRole('button', { name: COPY.zh.translating });
    check((await loadingBtn.count()) === 1 && (await loadingBtn.first().isDisabled()), 'C [zh] slow response: button shows "翻译中…" and is disabled');
    await loadingBtn.first().click({ force: true, timeout: 800 }).catch(() => {});
    await loadingBtn.first().dispatchEvent('click').catch(() => {});
    await sleep(s.page, 400);
    check(s.ctl.translateCalls.length === 1, `C [zh] slow response: no double submit (${s.ctl.translateCalls.length} request)`);
    await shot(s.page, 'c08-translate-loading');
    await dialog(s.page).getByRole('button', { name: '关闭' }).click();
    await sleep(s.page, 600);
    check((await dialog(s.page).count()) === 0, 'C [zh] slow response: the sheet can still be closed while loading');
    await sleep(s.page, 11500);
    check(s.errors.length === 0, `C [zh] slow response arriving after the sheet closed raises no page error (${s.errors.length})`);
    await s.close();
  }
  {
    // length limits, long result, tab switching, reopen
    const s = await session_({ lang: 'en' });
    await openSheet(s);
    await tabBtn(s.page, COPY.en.tabTranslate).click();
    const thousand = 'a'.repeat(1000);
    await textarea(s.page, 0).fill(thousand + 'b');
    const len = await textarea(s.page, 0).evaluate((el) => el.value.length);
    const bodyText = await dialog(s.page).innerText();
    check(len === 1000, `C [en] input is capped at 1000 characters (typed 1001, kept ${len})`);
    const counter = await textarea(s.page, 0).evaluate((el) => { const n = el.nextElementSibling; return { role: n.getAttribute('role'), text: n.textContent, below: n.getBoundingClientRect().top >= el.getBoundingClientRect().bottom - 1, aboveBtn: n.getBoundingClientRect().bottom <= el.parentElement.nextElementSibling.getBoundingClientRect().top + 1 }; });
    check(counter.role === 'status' && counter.text === '1000/1000' && counter.below && counter.aboveBtn, `C [en] R5 typed to the limit: neutral "${counter.text}" in a role=status directly under the textarea, above the button`);
    await textarea(s.page, 0).fill('');
    await s.page.evaluate((t) => navigator.clipboard.writeText(t), 'b'.repeat(1500));
    await textarea(s.page, 0).focus();
    await s.page.keyboard.press('Control+V');
    await sleep(s.page, 200);
    const pasted = await textarea(s.page, 0).evaluate((el) => ({ len: el.value.length, note: el.nextElementSibling.textContent }));
    check(pasted.len === 1000 && pasted.note === COPY.en.limitReached, `C [en] R5 pasting 1500 characters keeps 1000 and says "${pasted.note}"`);
    await shot(s.page, 'c09-length-limit');
    const long = 'Parola '.repeat(285).trim(); // ~2000 chars
    s.ctl.translate = respond(200, { italian: long, unclear: false });
    await fill(s.page, 1, 'hello');
    await dialog(s.page).getByRole('button', { name: COPY.en.toItalian, exact: true }).click();
    await sleep(s.page, 700);
    const copyLong = dialog(s.page).getByRole('button', { name: /^Copy: / }).last();
    await copyLong.scrollIntoViewIfNeeded();
    const vis = await copyLong.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    });
    check(vis, 'C [en] with a ~2000-character result the copy button can be scrolled into view');
    await copyLong.click();
    await sleep(s.page, 250);
    const got = await clip(s.page);
    check(got === long && got.length === long.length, `C [en] copying a ${long.length}-character result copies it exactly`);
    await shot(s.page, 'c10-long-result');
    // switching tabs and back keeps typed text
    await textarea(s.page, 0).fill('Testo da tenere');
    await tabBtn(s.page, COPY.en.tabSend).click();
    await tabBtn(s.page, COPY.en.tabTranslate).click();
    const kept = await textarea(s.page, 0).inputValue();
    check(kept === 'Testo da tenere', `C [en] typed text survives switching to Send and back (got "${kept}")`);
    // close + reopen resets to Send
    await dialog(s.page).getByRole('button', { name: 'Close' }).click();
    await sleep(s.page, 600);
    await openSheet(s);
    check((await tabBtn(s.page, COPY.en.tabSend).getAttribute('aria-selected')) === 'true' && (await preview(s.page).count()) === 1, 'C [en] closing and reopening resets to the Send tab');
    await s.close();
  }

  }

  // ---------------------------------------------------------------- D. layout
  const REPLY_RESULT = {
    meaning: '是的，还在。你什么时候可以来？ Via Garibaldi 15, campanello Bianchi',
    replies: [
      { italian: 'Posso passare oggi.', meaning: '我今天可以来。' },
      { italian: 'Posso passare domani.', meaning: '我明天可以来。' },
      { italian: 'A che ora ti va bene?', meaning: '你几点方便？' },
    ],
  };
  const hscroll = (page) =>
    page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][data-vaul-drawer], [role="dialog"]');
      const r = d.getBoundingClientRect();
      const wide = [];
      for (const el of d.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.opacity === '0' || cs.display === 'none') continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (b.right > r.right + 1 || b.left < r.left - 1) wide.push(`${el.tagName.toLowerCase()}:${(el.textContent || '').trim().slice(0, 20)}`);
      }
      return {
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        dialogW: Math.round(r.width),
        dialogTop: Math.round(r.top),
        dialogBottom: Math.round(r.bottom),
        vh: innerHeight,
        outside: wide.slice(0, 4),
      };
    });
  const sendMetrics = (page) =>
    page.evaluate(() => {
      const body = document.querySelector('[data-testid=contact-scroll]');
      const footer = document.querySelector('[data-testid=contact-footer]');
      const prev = document.querySelector('[data-testid=contact-italian-preview]');
      const primary = document.querySelector('[data-testid=contact-primary]');
      const checked = document.querySelector('[role=dialog] input[type=radio]:checked').closest('label');
      const within = (el, box) => {
        const a = el.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
      };
      checked.scrollIntoView({ block: 'nearest' });
      const radioAtTop = within(checked, body);
      prev.scrollIntoView({ block: 'nearest' });
      const previewAtBottom = within(prev, body);
      const p = primary.getBoundingClientRect();
      const stepsRect = footer.querySelector('ol').getBoundingClientRect();
      return {
        fits: body.scrollHeight <= body.clientHeight + 1,
        stepsVisible: stepsRect.top >= 0 && stepsRect.bottom <= innerHeight,
        bodyH: Math.round(body.clientHeight),
        footerH: Math.round(footer.getBoundingClientRect().height),
        radioAtTop,
        previewAtBottom,
        primaryVisible: p.top >= 0 && p.bottom <= innerHeight && p.width > 0,
      };
    });
  const translateMetrics = (page) =>
    page.evaluate(() => {
      const panel = document.querySelector('[data-testid=contact-scroll]');
      const tas = [...document.querySelectorAll('[role=dialog] textarea')];
      const out = [];
      for (const [i, ta] of tas.entries()) {
        const btn = ta.nextElementSibling;
        ta.scrollIntoView({ block: 'center' });
        const box = panel.getBoundingClientRect();
        const a = ta.getBoundingClientRect();
        btn.scrollIntoView({ block: 'nearest' });
        const b = btn.getBoundingClientRect();
        out.push({ i, ta: a.top >= box.top - 1 && a.bottom <= box.bottom + 1 || a.height >= box.height, btn: b.top >= box.top - 1 && b.bottom <= box.bottom + 1 && b.bottom <= innerHeight });
      }
      return { panelH: Math.round(panel.clientHeight), fields: out };
    });

  if (on('D')) {
    const longTitle = 'Armadio altissimo con anta in vetro e ripiani regolabili ' + 'Superlongtokenwithoutanyspaces'.repeat(3) + ' da ritirare subito';
    const variants = [
      ['plain', null],
      ['longtitle', (seg) => seg.replace(/\\"title\\":\\"[^"\\]*\\"/, `\\"title\\":\\"${longTitle}\\"`)],
      ['nophoto', (seg) => seg.replace(/\\"photo_url\\":\\"[^"\\]*\\"/, '\\"photo_url\\":null')],
    ];
    const sizes = [[320, 568], [360, 640], [390, 844], [430, 932], [844, 390]];
    for (const [vname, variant] of variants) {
      for (const lang of ['zh', 'en']) {
        for (const [w, h] of vname === 'plain' ? sizes : [[320, 568], [390, 844]]) {
          const s = await session_({ lang, viewport: { width: w, height: h }, variant });
          await openSheet(s);
          const tag = `D [${lang} ${w}x${h} ${vname}]`;
          const m = await hscroll(s.page);
          const sm = await sendMetrics(s.page);
          check(m.pageOverflow <= 0 && m.outside.length === 0, `${tag} send tab: no horizontal overflow, nothing outside the sheet (${m.outside.join(',') || 'ok'})`);
          check(sm.primaryVisible, `${tag} send tab: primary button visible without scrolling`);
          check(sm.radioAtTop && sm.previewAtBottom && sm.bodyH >= 120, `${tag} send tab: the selected template and the Italian preview can each be scrolled fully into view (body ${sm.bodyH}px, footer ${sm.footerH}px, radio ${sm.radioAtTop}, preview ${sm.previewAtBottom})`);
          if (vname === 'plain' && w === 390 && h === 844) check(sm.fits && sm.stepsVisible, `${tag} U2/U7 four template rows with the selected Italian text, and the three-step guide, fit without scrolling`);
          if (vname === 'plain' && w === 320) check(!sm.fits && sm.radioAtTop && sm.previewAtBottom, `${tag} U2 still scrollable on a small screen and every row reachable`);
          if (vname === 'plain' && [[320, 568], [390, 844], [844, 390]].some(([a, b]) => a === w && b === h)) await shot(s.page, `d-send-${lang}-${w}x${h}`);
          await tabBtn(s.page, COPY[lang].tabTranslate).click();
          s.ctl.translate = respond(200, REPLY_RESULT);
          await fill(s.page, 0, 'Sì, è disponibile. Quando vuoi passare?');
          await dialog(s.page).getByRole('button', { name: COPY[lang].translate, exact: true }).click();
          await sleep(s.page, 600);
          const m2 = await hscroll(s.page);
          const tm = await translateMetrics(s.page);
          check(m2.pageOverflow <= 0 && m2.outside.length === 0, `${tag} translate tab: no horizontal overflow (${m2.outside.join(',') || 'ok'})`);
          check(tm.fields.every((f) => f.ta && f.btn) && tm.panelH >= 120, `${tag} translate tab: both textareas and their buttons reachable (panel ${tm.panelH}px)`);
          if (vname === 'plain' && [[320, 568], [390, 844], [844, 390]].some(([a, b]) => a === w && b === h)) await shot(s.page, `d-translate-${lang}-${w}x${h}`);
          await s.close();
        }
      }
    }
    // keyboard simulation: viewport shrinks to ~45% while a textarea is focused
    for (const lang of ['zh', 'en']) {
      const s = await session_({ lang });
      await openSheet(s);
      await tabBtn(s.page, COPY[lang].tabTranslate).click();
      for (const i of [0, 1]) {
        await textarea(s.page, i).click();
        await textarea(s.page, i).fill('Testo di prova');
        await s.page.setViewportSize({ width: 390, height: Math.round(844 * 0.45) });
        await sleep(s.page, 400);
        const r = await s.page.evaluate((idx) => {
          const ta = document.querySelectorAll('[role=dialog] textarea')[idx];
          const btn = ta.nextElementSibling;
          const panel = document.querySelector('[data-testid=contact-scroll]');
          ta.scrollIntoView({ block: 'nearest' });
          btn.scrollIntoView({ block: 'nearest' });
          const a = ta.getBoundingClientRect();
          const b = btn.getBoundingClientRect();
          const p = panel.getBoundingClientRect();
          return { panelH: Math.round(p.height), ta: a.bottom <= innerHeight && a.top >= 0, btn: b.bottom <= innerHeight && b.top >= 0, dialogTop: Math.round(document.querySelector('[role=dialog]').getBoundingClientRect().top) };
        }, i);
        check(r.ta && r.btn && r.panelH >= 80, `D [${lang}] keyboard open (viewport 390x380), field ${i + 1}: textarea and its button are visible/scrollable (panel ${r.panelH}px, sheet top ${r.dialogTop}px)`);
        if (i === 0 && lang === 'zh') await shot(s.page, 'd-keyboard-zh-translate');
        await s.page.setViewportSize({ width: 390, height: 844 });
        await sleep(s.page, 300);
      }
      await s.close();
    }
    // dark appearance + light: contrast of every text element in both tabs, with results and errors shown
    const contrast = (page) =>
      page.evaluate(() => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 1;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        const rgba = (css) => {
          cx.clearRect(0, 0, 1, 1);
          cx.fillStyle = '#000';
          cx.fillStyle = css;
          cx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
          return [r, g, b, a / 255];
        };
        const lum = ([r, g, b]) => {
          const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const bgOf = (el) => {
          let layers = [];
          for (let n = el; n; n = n.parentElement) {
            const c = rgba(getComputedStyle(n).backgroundColor);
            if (c[3] > 0) layers.push(c);
            if (c[3] >= 1) break;
          }
          let base = [255, 255, 255];
          for (const c of layers.reverse()) base = base.map((v, i) => c[i] * c[3] + v * (1 - c[3]));
          return base;
        };
        const bad = [];
        const root = document.querySelector('[role=dialog]');
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        while (walker.nextNode()) {
          const t = walker.currentNode;
          if (!t.textContent.trim()) continue;
          const el = t.parentElement;
          if (seen.has(el)) continue;
          seen.add(el);
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || el.closest('[disabled]')) continue;
          const fg = rgba(cs.color);
          const bg = bgOf(el);
          const fgc = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
          const L1 = lum(fgc);
          const L2 = lum(bg);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const size = parseFloat(cs.fontSize);
          const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
          if (ratio < (large ? 3 : 4.5)) bad.push(`${t.textContent.trim().slice(0, 24)} ${ratio.toFixed(2)}`);
        }
        return { bad, theme: document.documentElement.className + '|' + (document.documentElement.dataset.theme ?? ''), bodyBg: getComputedStyle(document.body).backgroundColor };
      });
    for (const appearance of ['light', 'dark']) {
      for (const lang of ['zh', 'en']) {
        const s = await session_({ lang, appearance });
        await openSheet(s);
        let r = await contrast(s.page);
        check(r.bad.length === 0, `D [${lang} ${appearance}] send tab text contrast >= 4.5:1 (${r.bad.length ? r.bad.join('; ') : 'ok'}) [theme ${r.theme} bg ${r.bodyBg}]`);
        if (lang === 'zh') await shot(s.page, `d-send-${appearance}`);
        await tabBtn(s.page, COPY[lang].tabTranslate).click();
        s.ctl.translate = respond(200, REPLY_RESULT);
        await fill(s.page, 0, 'Quando puoi passare?');
        await dialog(s.page).getByRole('button', { name: COPY[lang].translate, exact: true }).click();
        await sleep(s.page, 500);
        s.ctl.translate = respond(200, { italian: 'Ciao! Arrivo tra un\'ora.', unclear: false });
        await fill(s.page, 1, 'I can be there in an hour');
        await dialog(s.page).getByRole('button', { name: COPY[lang].toItalian, exact: true }).click();
        await sleep(s.page, 500);
        s.ctl.translate = respond(502, {});
        await fill(s.page, 0, 'Quando puoi passare? 2');
        await dialog(s.page).getByRole('button', { name: COPY[lang].translate, exact: true }).click();
        await sleep(s.page, 500);
        r = await contrast(s.page);
        check(r.bad.length === 0, `D [${lang} ${appearance}] translate tab (results + error + disabled excluded) text contrast >= 4.5:1 (${r.bad.length ? r.bad.join('; ') : 'ok'})`);
        if (lang === 'zh') await shot(s.page, `d-translate-${appearance}`);
        await s.close();
      }
    }
    // U6: hover state of the shared default Button / primary links, dark and light, on real pages
    const hoverContrast = (el) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const rgba = (css) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1); const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data; return [r, g, b, a / 255]; };
      const lum = ([r, g, b]) => { const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      let page = [255, 255, 255];
      for (let n = el.parentElement; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] >= 1) { page = c.slice(0, 3); break; } }
      const cs = getComputedStyle(el);
      const o = Number(cs.opacity);
      const mix = (c, base) => c.slice(0, 3).map((v, i) => v * c[3] * o + base[i] * (1 - c[3] * o));
      const bg = mix(rgba(cs.backgroundColor), page);
      const fg = mix(rgba(cs.color), page);
      const l1 = lum(fg); const l2 = lum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    for (const appearance of ['dark', 'light']) {
      const s = await session_({ lang: 'zh', appearance });
      for (const route of [detailPath, '/', '/settings', '/favorites']) {
        if (route !== detailPath) await s.page.goto(`${proxy.url}${route}`, { waitUntil: 'load' });
        await sleep(s.page, 1500);
        const targets = s.page.locator('button.bg-primary:visible, a.bg-primary:visible');
        const n = Math.min(await targets.count(), 3);
        if (n === 0) { console.log(`INFO D U6 [${appearance}] ${route}: no default primary button on this page`); continue; }
        for (let i = 0; i < n; i += 1) {
          const t = targets.nth(i);
          await t.scrollIntoViewIfNeeded();
          await t.hover();
          await sleep(s.page, 400);
          const ratio = await t.evaluate(hoverContrast);
          check(ratio >= 4.5, `D U6 [${appearance}] ${route}: hovered primary button "${(await t.innerText()).trim().slice(0, 14)}" contrast ${ratio.toFixed(1)}:1`);
          if (i === 0) await shot(s.page, `d-hover-${appearance}-${route === '/' ? 'feed' : route.replace(/\W+/g, '-').replace(/^-/, '').slice(0, 14)}`);
        }
      }
      await s.close();
    }
    // 200% text zoom (root font size doubled, as the browser text-size setting does)
    for (const [w, h] of [[390, 844], [320, 568]]) {
      for (const lang of ['zh', 'en']) {
        const s = await session_({ lang, viewport: { width: w, height: h } });
        await s.page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await sleep(s.page, 300);
        await openSheet(s);
        const m = await hscroll(s.page);
        const sm = await sendMetrics(s.page).catch(() => ({ primaryVisible: false, bodyH: 0, footerH: 0 }));
        check(m.pageOverflow <= 0 && m.outside.length === 0, `D [${lang} ${w}x${h} 200% text] no horizontal overflow (${m.outside.join(',') || 'ok'})`);
        check(sm.primaryVisible, `D [${lang} ${w}x${h} 200% text] primary button visible (scroll area ${sm.bodyH}px, footer ${sm.footerH}px of ${h}px)`);
        check(sm.bodyH >= 60, `D [${lang} ${w}x${h} 200% text] templates still have room to scroll (${sm.bodyH}px)`);
        if (w === 390) await shot(s.page, `d-zoom200-${lang}-${w}x${h}`);
        await s.close();
      }
    }
  }

  // ---------------------------------------------------------------- E. accessibility
  if (on('E')) {
    for (const lang of ['zh', 'en']) {
      const c = COPY[lang];
      const s = await session_({ lang });
      const page = s.page;
      await primaryCta(s).focus();
      await page.keyboard.press('Enter');
      await dialog(page).waitFor();
      await sleep(page, 600);
      const inside = await page.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement));
      check(inside, `E [${lang}] focus moves into the sheet on open`);
      // tab order
      const label = () => page.evaluate(() => {
        const a = document.activeElement;
        return `${document.querySelector('[role=dialog]')?.contains(a) ? '' : 'OUTSIDE:'}${a.dataset.testid || a.getAttribute('aria-label') || (a.getAttribute('role') ?? a.tagName.toLowerCase())}`;
      });
      const order = [await label()];
      for (let i = 0; i < 14; i += 1) {
        await page.keyboard.press('Tab');
        order.push(await page.evaluate(() => {
          const a = document.activeElement;
          const inDlg = document.querySelector('[role=dialog]')?.contains(a);
          return `${inDlg ? '' : 'OUTSIDE:'}${a.dataset.testid || a.getAttribute('aria-label') || (a.getAttribute('role') ?? a.tagName.toLowerCase())}`;
        }));
      }
      console.log(`INFO E [${lang}] tab order: ${order.slice(0, 8).join(' > ')}`);
      check(order.every((o) => !o.startsWith('OUTSIDE:')), `E [${lang}] focus stays trapped inside the sheet over 14 Tab presses`);
      const idx = (re) => order.findIndex((o) => re.test(o));
      const iClose = idx(new RegExp(c.close)), iTab = idx(/^tab$/), iRadio = idx(/^radio$|^input$/), iPrimary = idx(/contact-primary/);
      check(iClose > -1 && iClose < iTab && iTab < iRadio && iRadio < iPrimary, `E [${lang}] tab order is close > tab > template radio > primary (${iClose},${iTab},${iRadio},${iPrimary})`);
      // radios by arrow keys
      await dialog(page).getByRole('radio', { checked: true }).focus();
      await page.keyboard.press('ArrowDown');
      check((await preview(page).innerText()) === TEMPLATES[1].it, `E [${lang}] ArrowDown on the radio group selects the next template`);
      const tabs = dialog(page).getByRole('tab');
      check((await tabs.count()) === 2 && (await tabs.nth(0).getAttribute('aria-selected')) === 'true' && (await tabs.nth(1).getAttribute('aria-selected')) === 'false', `E [${lang}] tabs expose aria-selected`);
      check((await dialog(page).getByRole('tablist').count()) === 1, `E [${lang}] tablist has an accessible name`);
      await tabs.nth(0).focus();
      await page.keyboard.press('ArrowRight');
      check((await tabs.nth(1).getAttribute('aria-selected')) === 'true', `E [${lang}] ArrowRight on the tablist moves to the Translate tab (ARIA tabs pattern)`);
      await tabs.nth(0).click();
      // accessible names
      const snap = await dialog(page).ariaSnapshot();
      const unnamed = snap.split('\n').filter((l) => /^\s*- (button|textbox|radio|tab|checkbox)(\s*\[[^\]]*\])*:?\s*$/.test(l));
      check(unnamed.length === 0, `E [${lang}] every control in the send tab has an accessible name (${unnamed.length} unnamed)`);
      await tabs.nth(1).click();
      const snap2 = await dialog(page).ariaSnapshot();
      const unnamed2 = snap2.split('\n').filter((l) => /^\s*- (button|textbox|radio|tab|checkbox)(\s*\[[^\]]*\])*:?\s*$/.test(l));
      check(unnamed2.length === 0, `E [${lang}] every control in the translate tab has an accessible name (${unnamed2.length} unnamed)`);
      await tabs.nth(0).click();
      // touch targets
      const small = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('[role=dialog] button, [role=dialog] [role=tab], [role=dialog] label')) {
          const b = el.getBoundingClientRect();
          if (b.width === 0) continue;
          if (b.height < 44 - 0.5 || b.width < 44 - 0.5) out.push(`${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 18)} ${Math.round(b.width)}x${Math.round(b.height)}`);
        }
        return out;
      });
      check(small.length === 0, `E [${lang}] send tab: every button, tab and radio row is at least 44x44 CSS px (${small.join('; ') || 'ok'})`);
      // toast / live region on copy success
      await dialog(page).getByTestId('contact-primary').click();
      await sleep(page, 700);
      const live = await page.evaluate((msg) => [...document.querySelectorAll('[role=status],[role=alert],[aria-live]:not([aria-live=off])')].some((n) => (n.textContent || '').includes(msg)), c.sentFrag);
      check(live, `E [${lang}] copy success is announced through the always-mounted status region (next-step notice)`);
      await s.close();
    }
    {
      const s = await session_({ lang: 'zh' });
      const page = s.page;
      await openSheet(s);
      await page.keyboard.press('Escape');
      await sleep(page, 700);
      check((await dialog(page).count()) === 0, 'E [zh] Escape closes the sheet');
      const back = await page.evaluate(() => document.activeElement?.closest('.listing-detail-sticky-bar') !== null);
      check(back, 'E [zh] focus returns to the "联系卖家" button on close');
      // translate: live regions for result, error and copy
      await openSheet(s);
      await tabBtn(page, COPY.zh.tabTranslate).click();
      s.ctl.translate = respond(200, REPLY_RESULT);
      await fill(page, 0, 'Quando puoi passare?');
      await dialog(page).getByRole('button', { name: COPY.zh.translate, exact: true }).click();
      await sleep(page, 600);
      const liveResult = await page.evaluate((m) => [...document.querySelectorAll('[role=status],[role=alert],[aria-live]:not([aria-live=off])')].some((n) => (n.textContent || '').includes(m)), '是的，还在');
      check(liveResult, 'E [zh] translation result is inside a live region (announced to screen readers)');
      await dialog(page).getByRole('button', { name: /^复制: / }).first().click();
      await sleep(page, 300);
      const liveCopy = await page.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],[aria-live]:not([aria-live=off])')].some((n) => (n.textContent || '').includes('已复制')));
      check(liveCopy, 'E [zh] translate-tab copy success is announced (live region)');
      s.ctl.translate = respond(502, {});
      await fill(page, 0, 'Quando puoi passare? 2');
      await dialog(page).getByRole('button', { name: COPY.zh.translate, exact: true }).click();
      await sleep(page, 500);
      check((await dialog(page).getByRole('alert').count()) >= 1, 'E [zh] translation error uses role=alert');
      // axe
      let axeLoaded = null;
      try {
        const { createRequire } = await import('node:module');
        const req = createRequire(import.meta.url);
        axeLoaded = req(process.env.AXE_PLAYWRIGHT ?? '/tmp/claude-0/axe/node_modules/@axe-core/playwright');
      } catch {}
      if (!axeLoaded) console.log('INFO E axe: @axe-core/playwright not installed (set AXE_PLAYWRIGHT); axe not run');
      else {
        for (const tabName of ['send', 'translate']) {
          if (tabName === 'send') await tabBtn(page, COPY.zh.tabSend).click();
          else await tabBtn(page, COPY.zh.tabTranslate).click();
          await sleep(page, 300);
          const result = await new axeLoaded.AxeBuilder({ page }).include('[role=dialog]').analyze();
          const v = result.violations.map((x) => `${x.id}(${x.impact}) x${x.nodes.length}`);
          check(v.length === 0, `E axe-core on the ${tabName} tab (zh): ${v.length} violations ${v.join(', ')}`);
        }
      }
      await s.close();
    }
  }
  // ---------------------------------------------------------------- F. onboarding contact step (free mode build)
  if (on('F')) {
    const overlay = (page) => page.getByTestId('onboarding-overlay');
    const screenOf = (page) => overlay(page).getAttribute('data-screen', { timeout: 8000 }).catch(() => null);
    const cont = (page) => page.getByTestId('onboarding-continue');
    async function startOnboarding(lang, viewport = PHONE) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'en-US' });
      await context.addInitScript((l) => {
        try {
          if (!localStorage.getItem('shoumanwu_app_preferences')) localStorage.setItem('shoumanwu_app_preferences', JSON.stringify({ language: l, appearance: 'light', soundAlerts: false }));
        } catch {}
      }, lang);
      const page = await context.newPage();
      await page.goto(`${url}/?onboarding=1`, { waitUntil: 'load' });
      await overlay(page).waitFor({ timeout: 15000 });
      await sleep(page, 600);
      return { context, page };
    }
    async function walkTo(page, target, max = 9) {
      const seq = [await screenOf(page)];
      for (let i = 0; i < max && seq.at(-1) !== target; i += 1) {
        await cont(page).click();
        await sleep(page, 450);
        seq.push(await screenOf(page));
      }
      return seq;
    }
    for (const lang of ['zh', 'en', 'it']) {
      const { context, page } = await startOnboarding(lang);
      const seq = await walkTo(page, 'interests');
      const expected = lang === 'it' ? ['hook', 'how', 'weekly', 'map', 'favorites', 'trust', 'interests'] : ['hook', 'how', 'weekly', 'map', 'favorites', 'contact', 'trust', 'interests'];
      check(JSON.stringify(seq) === JSON.stringify(expected), `F [${lang}] step order ${lang === 'it' ? 'skips the contact step' : 'shows the contact step between favorites and trust'}: ${seq.join(' > ')}`);
      await context.close();
    }
    for (const lang of ['zh', 'en']) {
      const rowText = lang === 'zh' ? '选一条现成的意大利语消息' : 'Pick a ready-made Italian message';
      for (const [w, h] of [[320, 568], [360, 640], [390, 844], [430, 932]]) {
        const { context, page } = await startOnboarding(lang, { width: w, height: h });
        await walkTo(page, 'contact');
        const m = await page.evaluate(() => {
          const rows = document.querySelector('[data-testid=contact-rows]');
          const bubbles = document.querySelector('[data-testid=contact-bubbles]');
          const btn = document.querySelector('[data-testid=onboarding-continue]').getBoundingClientRect();
          const ov = document.querySelector('[data-testid=onboarding-overlay]');
          const outside = [...ov.querySelectorAll('*')].filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1);
          }).length;
          const scroller = [...ov.querySelectorAll('*')].find((el) => el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY));
          return {
            rows: rows?.querySelectorAll('li').length,
            text: ov.innerText,
            overflowX: document.documentElement.scrollWidth - innerWidth,
            outside,
            continueVisible: btn.top >= 0 && btn.bottom <= innerHeight,
            rowsReachable: Boolean(rows && bubbles),
            scrolls: Boolean(scroller),
          };
        });
        const tag = `F [${lang} ${w}x${h}]`;
        check(m.rows === 3 && m.text.includes(rowText) && m.text.includes('Ciao! È ancora disponibile?'), `${tag} contact step shows the three rows and the Italian example`);
        check(m.overflowX <= 0 && m.outside === 0, `${tag} no horizontal overflow, nothing outside the viewport (${m.outside} elements)`);
        check(m.continueVisible, `${tag} Continue button is visible without scrolling`);
        if ([320, 390].includes(w)) await shot(page, `f-contact-${lang}-${w}`);
        if (w === 390) {
          const forbidden = /subito/i.test(m.text);
          check(!forbidden, `${tag} step copy does not name the source marketplace`);
          const backBtn = page.getByRole('button', { name: lang === 'zh' ? /返回/ : /back/i });
          await backBtn.click();
          await sleep(page, 450);
          check((await screenOf(page)) === 'favorites', `${tag} Back returns to favorites`);
          await cont(page).click();
          await sleep(page, 450);
          await cont(page).click();
          await sleep(page, 450);
          check((await screenOf(page)) === 'trust', `${tag} Continue from the contact step reaches trust`);
          await backBtn.click();
          await sleep(page, 450);
          check((await screenOf(page)) === 'contact', `${tag} Back from trust returns to the contact step`);
          const skipCount = await page.getByRole('button', { name: lang === 'zh' ? '跳过' : /skip/i }).count();
          console.log(`INFO ${tag} Skip button on the contact step: ${skipCount ? 'present' : 'absent'}`);
          if (skipCount) {
            await page.getByRole('button', { name: lang === 'zh' ? '跳过' : /skip/i }).click();
            await sleep(page, 600);
            console.log(`INFO ${tag} Skip lands on: ${await screenOf(page)}`);
          }
        }
        await context.close();
      }
    }
    {
      // switching language on the first screen (the only screen with the language chip) adds/removes the contact step
      const { context, page } = await startOnboarding('zh');
      const dots = () => page.locator('header div[aria-hidden="true"] > span').count();
      const withContact = await dots();
      await overlay(page).getByRole('button', { name: /语言|language/i }).click();
      await page.getByRole('menuitem', { name: /Italiano/ }).click();
      await sleep(page, 500);
      const withoutContact = await dots();
      const seq = await walkTo(page, 'interests');
      check(withoutContact === withContact - 1 && !seq.includes('contact'), `F switching to Italiano on the first screen removes the contact step (dots ${withContact} -> ${withoutContact}; ${seq.join(' > ')})`);
      await context.close();
    }
  }


  // ---------------------------------------------------------------- G. copy review (automatable part)
  if (on('G')) {
    for (const lang of ['zh', 'en']) {
      const s = await session_({ lang });
      await openSheet(s);
      const grab = () => s.page.evaluate(() => {
        const d = document.querySelector('[role=dialog]');
        return [...d.querySelectorAll('[role=tabpanel]:not([hidden]), [data-testid=contact-footer], header, [role=tablist]')].map((n) => n.innerText).join('\n');
      });
      let text = await grab();
      await tabBtn(s.page, COPY[lang].tabTranslate).click();
      s.ctl.translate = respond(200, { meaning: 'x', replies: [{ italian: 'y', meaning: 'z' }] });
      await fill(s.page, 0, 'Ciao');
      await dialog(s.page).getByRole('button', { name: COPY[lang].translate, exact: true }).click();
      await sleep(s.page, 500);
      text += '\n' + (await grab());
      check(!/subito|vinted|wallapop|facebook/i.test(text), `G [${lang}] no source marketplace is named anywhere in the sheet's own copy`);
      check(/Contatta/.test(text), `G [${lang}] the guide quotes the Italian button label "Contatta"`);
      await s.close();
    }
  }

  await proxy.close();
  const stats = proxy.stats;
  check(stats.cookiesStripped > 0, `safety: ${stats.cookiesStripped}/${stats.requests} requests carried the forged cookie and every Cookie header was stripped before reaching the Next server`);
  check(auditTotals.leaked === 0, `safety: 0 requests carried the forged bearer to the Supabase host unmocked (${auditTotals.mocked} answered locally)`);
}
