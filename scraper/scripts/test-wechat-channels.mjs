#!/usr/bin/env node
/**
 * Compare WeChat alert delivery channels and send test messages.
 *
 * Usage:
 *   cd scraper && npm run test:wechat              # default channel (app)
 *   cd scraper && npm run test:wechat -- --all     # test every configured channel
 *   cd scraper && npm run test:wechat -- --channel app
 *
 * Channels:
 *   pushplus:app     — PushPlus App lock-screen notification (recommended)
 *   pushplus:wechat  — PushPlus 微信服务号 inbox (not personal chat)
 *   wxpusher         — WxPusher SPT (requires WXPUSHER_SPT; install WxPusher app)
 *
 * Note: WeChat does NOT allow third-party APIs to message your personal chat directly.
 * All "WeChat" integrations use 服务号 / App push / 企业微信.
 */
import 'dotenv/config';

const args = process.argv.slice(2);
const all = args.includes('--all');
const channelArg = args.find((a) => a.startsWith('--channel='))?.split('=')[1]
  ?? (args.includes('--channel') ? args[args.indexOf('--channel') + 1] : null);

const pushplusToken = process.env.PUSHPLUS_TOKEN?.trim();
const wxpusherSpt = process.env.WXPUSHER_SPT?.trim();
const defaultChannel = process.env.PUSHPLUS_CHANNEL?.trim() || 'app';

async function sendPushPlus(channel) {
  if (!pushplusToken) {
    return { label: `pushplus:${channel}`, skipped: true, reason: 'no PUSHPLUS_TOKEN' };
  }

  const res = await fetch('https://www.pushplus.plus/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: pushplusToken,
      title: `[零元] 渠道测试 — ${channel}`,
      content: `PushPlus channel=${channel}\n${new Date().toISOString()}`,
      template: 'txt',
      channel,
    }),
  });
  const data = await res.json();
  return {
    label: `pushplus:${channel}`,
    ok: data.code === 200,
    code: data.code,
    msg: data.msg,
    hint:
      channel === 'app'
        ? 'Install PushPlus App + enable notifications (not 服务号 inbox)'
        : 'Opens in PushPlus 微信服务号 chat',
  };
}

async function sendWxPusher() {
  if (!wxpusherSpt) {
    return { label: 'wxpusher', skipped: true, reason: 'no WXPUSHER_SPT' };
  }

  const res = await fetch('https://wxpusher.zjiecode.com/api/send/message/simple-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spt: wxpusherSpt,
      summary: '[零元] 渠道测试 — wxpusher',
      content: `WxPusher SPT test\n${new Date().toISOString()}`,
      contentType: 1,
    }),
  });
  const data = await res.json();
  const ok = data.success === true || data.code === 1000;
  return {
    label: 'wxpusher',
    ok,
    code: data.code,
    msg: data.msg,
    hint: 'Install WxPusher App or check WxPusher WeChat binding for notifications',
  };
}

const tests = [];

if (all) {
  tests.push(() => sendPushPlus('app'));
  tests.push(() => sendPushPlus('wechat'));
  tests.push(() => sendWxPusher());
} else if (channelArg === 'wechat' || channelArg === 'app') {
  tests.push(() => sendPushPlus(channelArg));
} else if (channelArg === 'wxpusher') {
  tests.push(() => sendWxPusher());
} else if (wxpusherSpt && !pushplusToken) {
  tests.push(() => sendWxPusher());
} else if (pushplusToken) {
  tests.push(() => sendPushPlus(defaultChannel));
} else {
  console.error('[test-wechat-channels] Configure PUSHPLUS_TOKEN or WXPUSHER_SPT in scraper/.env');
  process.exit(1);
}

console.log('[test-wechat-channels] WeChat cannot push to personal chat — testing available channels…\n');

let anyOk = false;
for (const run of tests) {
  const result = await run();
  if (result.skipped) {
    console.log(`⏭  ${result.label}: skipped (${result.reason})`);
    continue;
  }
  const icon = result.ok ? '✓' : '✗';
  console.log(`${icon}  ${result.label}: code=${result.code} ${result.msg ?? ''}`);
  if (result.hint) console.log(`   → ${result.hint}`);
  if (result.ok) anyOk = true;
  if (tests.length > 1) await new Promise((r) => setTimeout(r, 2000));
}

console.log('');
if (!anyOk) {
  console.error('[test-wechat-channels] All channels failed or skipped.');
  process.exit(1);
}

console.log('[test-wechat-channels] Recommended: PUSHPLUS_CHANNEL=app + install PushPlus App');
console.log('[test-wechat-channels] Or: Telegram (npm run test:telegram) for direct phone notifications');
console.log('[test-wechat-channels] Compare all: npm run test:wechat -- --all');
