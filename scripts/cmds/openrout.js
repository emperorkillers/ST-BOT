"use strict";

const { OpenRouter } = require("@openrouter/sdk");

module.exports = {
  config: {
    name: "ai",
    description: "Pose une question à l'IA via OpenRouter (GLM 5.2)",
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

      const openrouter = new OpenRouter({ apiKey });

      const stream = await openrouter.chat.send({
        chatRequest: {
          model: "z-ai/glm-5.2:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4000,
          stream: true
        }
      });

      let response = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) response += content;
      }

      if (!response) throw new Error("Réponse vide d'OpenRouter");
      message.reply(response);

    } catch (err) {
      message.reply(`❌ Erreur : ${err.message}`);
    }
  }
};