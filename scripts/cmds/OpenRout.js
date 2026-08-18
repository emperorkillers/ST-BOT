"use strict";

const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    description: "IA via DeepSeek API (modèle puissant et rapide)",
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
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        return message.reply("❌ Clé DeepSeek manquante. Contacte l'administrateur.");
      }

      const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
          model: "deepseek-chat", // 👈 Modèle standard (V4-Pro)
          // Pour utiliser le modèle "reasoner" (plus de réflexion) :
          // model: "deepseek-reasoner",
          messages: [
            { role: "system", content: "Tu es un assistant utile et amical." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: false
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 60000
        }
      );

      const reply = response.data.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Réponse vide");

      // Découpage si la réponse est trop longue
      if (reply.length > 1500) {
        const chunks = reply.match(/.{1,1500}/g) || [reply];
        for (const chunk of chunks) {
          await message.reply(chunk);
        }
      } else {
        await message.reply(reply);
      }

    } catch (err) {
      console.error("DeepSeek error:", err.response?.data || err.message);
      
      let errorMsg = "❌ Erreur";
      if (err.response?.status === 401) {
        errorMsg = "❌ Clé API invalide. Vérifie DEEPSEEK_API_KEY sur Render.";
      } else if (err.response?.status === 429) {
        errorMsg = "❌ Trop de requêtes. Attends quelques secondes.";
      } else if (err.response?.status === 402) {
        errorMsg = "❌ Crédits insuffisants. Recharge ton compte DeepSeek.";
      } else if (err.response?.data?.error?.message) {
        errorMsg += `: ${err.response.data.error.message}`;
      } else {
        errorMsg += `: ${err.message}`;
      }
      
      message.reply(errorMsg);
    }
  }
};