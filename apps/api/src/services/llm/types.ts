/**
 * LLM Provider Abstraction
 *
 * All LLM calls go through this interface.
 * Swap providers without changing planner logic.
 */

export interface LLMMessage {
  role: 'user' | 'model';
  content: string;
}

export interface LLMResponse {
  text: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LLMProvider {
  name: string;
  generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T>;
  generateText(prompt: string, systemPrompt?: string): Promise<LLMResponse>;
}
