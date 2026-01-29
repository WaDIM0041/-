
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types.ts";

// Инициализация строго по инструкции
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing in environment");
  }
  return new GoogleGenAI({ apiKey });
};

async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Очищаем префикс base64
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = () => reject(new Error("Failed to convert image to base64"));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Zodchiy AI Error: Image conversion failed", err);
    throw err;
  }
}

export const analyzeConstructionTask = async (
  taskTitle: string,
  taskDescription: string,
  imageUrls: string[]
): Promise<AIAnalysisResult> => {
  if (!imageUrls || imageUrls.length === 0) {
    return {
      status: 'warning',
      feedback: 'Фотографии для анализа отсутствуют.',
      detectedIssues: [],
      timestamp: new Date().toISOString()
    };
  }

  try {
    const ai = getAI();
    // Берем до 3-х последних фото для экономии токенов и точности
    const imageParts = await Promise.all(
      imageUrls.slice(-3).map(async (url) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: await urlToBase64(url)
        }
      }))
    );

    const prompt = `
      Как ведущий инженер технадзора, проанализируй качество строительных работ по фото.
      Объект задачи: "${taskTitle}"
      Техническое задание: "${taskDescription}"
      
      Твоя задача: выявить отклонения от СНиП, ГОСТ или дефекты исполнения. 
      Дай оценку (passed/warning/failed) и краткий профессиональный фидбек.
      ОТВЕТЬ СТРОГО В JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: prompt }, ...imageParts]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['passed', 'warning', 'failed'] },
            feedback: { type: Type.STRING },
            detectedIssues: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['status', 'feedback', 'detectedIssues']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      ...result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Zodchiy AI: Analysis failed", error);
    return {
      status: 'warning',
      feedback: 'Автоматический аудит временно недоступен. Проверьте соединение или API ключ.',
      detectedIssues: ['Ошибка сервиса аналитики'],
      timestamp: new Date().toISOString()
    };
  }
};

export const getAITechnicalAdvice = async (query: string, context: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        Ты — ИИ-ассистент системы ЗОДЧИЙ. Твой профиль: строительный контроль и СНиП.
        Контекст: ${context}
        Запрос: ${query}
        Отвечай как эксперт: лаконично, используя профессиональную терминологию.
      `,
    });
    return response.text || "Не удалось получить ответ от ядра ИИ.";
  } catch (error) {
    return "Сервис консультаций ЗОДЧИЙ AI временно перегружен.";
  }
};
