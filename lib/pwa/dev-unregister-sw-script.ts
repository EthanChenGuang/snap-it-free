/** Dev-only inline script: unregister stale service workers so MapLibre/hot reload work. */
export const DEV_UNREGISTER_SW_SCRIPT = `
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
  });
}
`.trim();
