//Send the whole message to the telegram API to post it
export async function sendToTelegramTransfer(env: any, message: string, thread: number): Promise<void> {
    const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.CHAT_ID,
        text: message,
        message_thread_id: thread,
        parse_mode: "HTML",
      }),
    });
    const data = await response.json();
    if (!response.ok) console.error("Failed to send message to Telegram:", data);
  }
