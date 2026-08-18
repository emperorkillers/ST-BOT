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
      if (!apiKey) throw new Error("OPENROUTER_API_KEY manquante");

      // 👇 IDENTIQUE au code OpenRouter
      const openrouter = new OpenRouter({ apiKey });

      const stream = await openrouter.chat.send({
        chatRequest: {
          model: "z-ai/glm-5.2:free",
          messages: [{ role: "user", content: prompt }],
          stream: true
        }
      });

      let response = "";
      let reasoningTokens = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          response += content;
        }

        if (chunk.usage?.completionTokensDetails?.reasoningTokens) {
          reasoningTokens = chunk.usage.completionTokensDetails.reasoningTokens;
        }
      }

      if (!response) throw new Error("Réponse vide");

      // Affiche les tokens de raisonnement si disponibles
      const finalReply = reasoningTokens
        ? `🧠 ${reasoningTokens} tokens de raisonnement\n\n${response}`
        : response;

      message.reply(finalReply);

    } catch (err) {
      console.error("OpenRouter error:", err);
      message.reply(`❌ Erreur: ${err.message}`);
    }
  }
};