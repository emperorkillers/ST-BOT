"use strict";

const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    description: "IA via DeepSeek (optimisé tokens)",
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
        return message.reply("❌ Clé DeepSeek manquante");
      }

      // 🔥 Vérification du cache (questions fréquentes)
      const cacheKey = prompt.toLowerCase().trim();
      const cached = global.deepseekCache?.get(cacheKey);
      if (cached) {
        return message.reply(`💾 (cache) ${cached}`);
      }

      const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
          model: "deepseek-chat",
          messages: [
            // 👇 System prompt optimisé (court et efficace)
            { 
              role: "system", 
              content: "Réponds de façon concise et utile. Max 3 phrases." 
            },
            { role: "user", content: prompt }
          ],
          // 👇 Paramètres économes
          temperature: 0.3,        // Moins créatif = moins de tokens
          max_tokens: 500,         // Limite stricte (au lieu de 4000)
          top_p: 0.9,              // Réduit la diversité
          frequency_penalty: 0.5,  // Évite les répétitions
          presence_penalty: 0.3,   // Évite les digressions
          stream: false
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 30000  // 30s max
        }
      );

      const reply = response.data.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Réponse vide");

      // 🔥 Mise en cache des réponses (1 heure)
      if (!global.deepseekCache) global.deepseekCache = new Map();
      global.deepseekCache.set(cacheKey, reply);
      setTimeout(() => global.deepseekCache.delete(cacheKey), 3600000);

      // 🔥 Tokens utilisés (pour info)
      const usage = response.data.usage;
      const tokensInfo = usage 
        ? `\n\n📊 ${usage.total_tokens} tokens (${usage.prompt_tokens} entrée, ${usage.completion_tokens} sortie)` 
        : "";

      message.reply(reply + tokensInfo);

    } catch (err) {
      console.error("DeepSeek error:", err.response?.data || err.message);
      
      let errorMsg = "❌ Erreur";
      if (err.response?.status === 401) {
        errorMsg = "❌ Clé API invalide";
      } else if (err.response?.status === 429) {
        errorMsg = "❌ Trop de requêtes. Attends un peu.";
      } else if (err.response?.status === 402) {
        errorMsg = "❌ Crédits insuffisants. Recharge ton compte.";
      } else if (err.response?.data?.error?.message) {
        errorMsg += `: ${err.response.data.error.message}`;
      } else {
        errorMsg += `: ${err.message}`;
      }
      
      message.reply(errorMsg);
    }
  }
};