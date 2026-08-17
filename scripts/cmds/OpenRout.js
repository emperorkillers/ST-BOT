"use strict";

const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    description: "Pose une question à l'IA via OpenRouter",
    role: 0,
    category: "ai"
  },
  onStart: async function(params) {
    const { message, args } = params;
    const prompt = args.join(" ").trim();

    if (!prompt) {
      return message.reply("❌ Utilisation : /ai <ta question>");
    }

    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OPENROUTER_API_KEY manquante !");

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "z-ai/glm-5.2:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 60000
        }
      );

      const reply = response.data.choices[0]?.message?.content;
      if (!reply) throw new Error("Réponse vide");
      message.reply(reply);

    } catch (err) {
      console.error("OpenRouter error:", err.response?.data || err.message);
      const status = err.response?.status;
      const detail = err.response?.data?.error?.message || err.message;
      message.reply(`❌ Erreur ${status || ""} : ${detail}`);
    }
  }
};