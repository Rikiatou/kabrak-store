// Admin alerts to the owner's Telegram; no-op unless TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.
export function notifyAdmin(text: string): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(5000),
  })
    .then((r) => {
      if (!r.ok) process.stderr.write(`[telegram] HTTP ${r.status}\n`);
    })
    .catch((e) => process.stderr.write(`[telegram] ${(e as Error).message}\n`));
}
