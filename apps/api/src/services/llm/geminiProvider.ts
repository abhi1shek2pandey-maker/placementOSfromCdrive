import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { LLMProvider, LLMResponse } from './types';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.modelName = env.GEMINI_MODEL;
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3, // lower = more consistent, structured output
        maxOutputTokens: 4096,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const fullPrompt = systemPrompt
      ? `SYSTEM:\n${systemPrompt}\n\nUSER:\n${prompt}`
      : prompt;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();

        // Validate: must be parseable JSON
        try {
          return JSON.parse(text) as T;
        } catch (parseErr) {
          throw new Error(`LLM returned non-JSON response: ${text.slice(0, 200)}`);
        }
      } catch (err) {
        const isLast = attempt === MAX_RETRIES;
        logger.warn(`Gemini attempt ${attempt}/${MAX_RETRIES} failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
        if (isLast) throw err;
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }

    throw new Error('Gemini generateJSON failed after max retries');
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const fullPrompt = systemPrompt
      ? `SYSTEM:\n${systemPrompt}\n\nUSER:\n${prompt}`
      : prompt;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();
        return { text, model: this.modelName };
      } catch (err) {
        const isLast = attempt === MAX_RETRIES;
        logger.warn(`Gemini text attempt ${attempt}/${MAX_RETRIES} failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
        if (isLast) throw err;
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }

    throw new Error('Gemini generateText failed after max retries');
  }
}

// Singleton
let _provider: GeminiProvider | null = null;

export function getLLMProvider(): GeminiProvider {
  if (!_provider) {
    _provider = new GeminiProvider();
  }
  return _provider;
}
