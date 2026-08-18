"use strict";

const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  config: {
    name: "ai",
    description: "IA DeepSeek avec recherche web automatique",
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
      if (!apiKey) return message.reply("❌ Clé DeepSeek manquante");

      // 🔍 Vérifier si la question nécessite une recherche (mots-clés)
      const searchKeywords = ["actualité", "aujourd'hui", "dernier", "récent", "2026", "en direct", "météo", "résultat", "score", "prix", "cours", "live", "news", "maintenant", "ce jour"];
      const needsSearch = searchKeywords.some(keyword => prompt.toLowerCase().includes(keyword));

      let context = "";

      // 🌐 Si la question implique des infos récentes, on cherche
      if (needsSearch) {
        const searchResults = await webSearch(prompt);
        if (searchResults && searchResults.length > 0) {
          context = `\n\nVoici des informations récentes trouvées sur le web :\n${searchResults.map((r, i) => 
            `${i+1}. ${r.title}\n${r.snippet}\nSource: ${r.url}`
          ).join("\n\n")}`;
        }
      }

      const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
          model: "deepseek-chat",
          messages: [
            { 
              role: "system", 
              content: `Tu es un assistant utile. Réponds de façon concise et précise.
              ${context ? `Utilise les informations ci-dessous pour répondre si elles sont pertinentes. Si tu ne sais pas, dis-le honnêtement.` : ''}`
            },
            { role: "user", content: prompt + context }
          ],
          temperature: 0.3,
          max_tokens: 800,
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

      let reply = response.data.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Réponse vide");

      const usage = response.data.usage;
      const tokensInfo = usage 
        ? `\n\n📊 ${usage.total_tokens} tokens (${usage.prompt_tokens} entrée, ${usage.completion_tokens} sortie)${context ? ' 🌐 recherche web' : ''}` 
        : "";

      message.reply(reply + tokensInfo);

    } catch (err) {
      console.error("DeepSeek error:", err.response?.data || err.message);
      message.reply(`❌ Erreur: ${err.response?.data?.error?.message || err.message}`);
    }
  }
};

// 🔍 Fonction de recherche web (DuckDuckGo)
async function webSearch(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').each((i, el) => {
      if (i >= 5) return false; // On prend les 5 premiers résultats
      
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      let link = $(el).find('.result__url').text().trim();
      
      if (title && snippet) {
        results.push({ title, snippet, url: link || '#' });
      }
    });

    return results;
  } catch (err) {
    console.error('Search error:', err.message);
    return null;
  }
}