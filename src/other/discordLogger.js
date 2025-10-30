const axios = require("axios");
const { discordWebhookUrl, botAvatarUrl } = require("../main/config");

const sendLogToDiscord = async (logMessage, logType = "Info", requestData = {}) => {
  try {
    if (!discordWebhookUrl || !discordWebhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      console.error("Invalid Discord webhook URL.");
      return;
    }

    const currentTime = new Date().toISOString();
    const { method = "N/A", url = "N/A", responseTime = "N/A" } = requestData;

    // Discord tidak menerima field dengan value undefined/null
    const safe = (v) => (v ? String(v) : "N/A");

    const payload = {
      username: "UNV48 API",
      avatar_url: botAvatarUrl || undefined,
      embeds: [
        {
          title: `API Log - ${logType}`,
          description: logMessage || "(no message provided)",
          color: logType.toLowerCase() === "error" ? 0xff0000 : 0x00ff00,
          timestamp: currentTime,
          footer: {
            text: "UNV48 API Logger",
            icon_url: botAvatarUrl || undefined,
          },
          fields: [
            { name: "Method", value: safe(method), inline: true },
            { name: "URL", value: safe(url), inline: true },
            { name: "Response Time", value: `${safe(responseTime)} ms`, inline: true },
          ],
        },
      ],
    };

    const res = await axios.post(discordWebhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });

    if (res.status !== 204) {
      console.warn("Unexpected Discord response:", res.status, res.data);
    }
  } catch (error) {
    console.error("Error sending log to Discord:", error.response?.data || error.message);
  }
};

module.exports = { sendLogToDiscord };
