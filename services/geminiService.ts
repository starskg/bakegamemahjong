import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';
import { translations } from '../translations';

const getSystemInstruction = (lang: Language) => {
  const instructions = {
      uz: "Siz donishmand Mahjong ustasisiz. O'zbek tilida sabr-toqat, strategiya yoki kuzatish haqida juda qisqa, bir gaplik maslahat yoki falsafiy iqtibos keltiring. 15 ta so'zdan oshmasin.",
      ru: "Вы мудрый мастер Маджонга. Дайте очень короткий совет или философскую цитату о терпении, стратегии или наблюдении на русском языке. Не более 15 слов.",
      en: "You are a wise Mahjong master. Provide a very short, single sentence advice or philosophical quote about patience, strategy, or observation in English. Keep it encouraging and under 15 words."
  };
  return instructions[lang];
};

export const getGeminiAdvice = async (lang: Language = 'uz'): Promise<string> => {
  try {
    const t = translations[lang];

    if (!process.env.API_KEY) {
      return t.gemini_key_missing;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Give me wisdom.",
      config: {
        systemInstruction: getSystemInstruction(lang),
      }
    });

    return response.text || t.gemini_default;
  } catch (error) {
    console.error("Gemini Error:", error);
    return translations[lang].gemini_default;
  }
};