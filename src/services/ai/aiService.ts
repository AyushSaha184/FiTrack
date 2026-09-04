import { storage } from '../../utils/storage';
import { logger } from '../../utils/logger';

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'openai' | 'anthropic' | 'deepseek';

export interface SavedKey {
  provider: AIProvider;
  key: string;
}

export interface AIReportResult {
  coachNotes: string[];
  exerciseRecap: string[];
  provider?: AIProvider;
  model?: string;
}

const STORAGE_KEY = 'fitrack_api_keys_list';

/**
 * In-memory response cache so that re-running an AI report with the same input
 * (e.g. user re-opens the report screen, or hits "regenerate" with identical
 * data) does not burn another API call. Keyed by a hash of (workoutHistory,
 * provider key prefix) so that swapping providers still hits the network.
 */
interface CacheEntry {
  expires: number;
  result: AIReportResult;
}
const responseCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function hashPrompt(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return String(hash);
}

function getCachedResult(key: string): AIReportResult | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    responseCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCachedResult(key: string, result: AIReportResult) {
  responseCache.set(key, { expires: Date.now() + CACHE_TTL_MS, result });
  // Cap the cache to the last 20 entries to bound memory.
  if (responseCache.size > 20) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}

export const aiService = {
  // Key Storage helpers
  getSavedKeys(): SavedKey[] {
    return storage.get<SavedKey[]>(STORAGE_KEY) || [];
  },

  saveKeys(keys: SavedKey[]): void {
    storage.set(STORAGE_KEY, keys);
  },

  addKey(provider: AIProvider, key: string): void {
    const keys = this.getSavedKeys().filter((k) => k.provider !== provider);
    keys.push({ provider, key });
    this.saveKeys(keys);
  },

  deleteKey(provider: AIProvider): void {
    const keys = this.getSavedKeys().filter((k) => k.provider !== provider);
    this.saveKeys(keys);
  },

  // LLM prompts & APIs
  buildSystemPrompt(): string {
    return `You are an expert fitness coach and personal trainer. You analyze workout logs and generate brief progress reports.
    You MUST respond with a valid, clean JSON object ONLY. Do NOT wrap your JSON in markdown code blocks like \`\`\`json.
    Ensure there are no leading or trailing letters, only raw JSON.
    
    The JSON structure must match this schema:
    {
      "coachNotes": [
        "A brief bullet point highlighting their consistency or main wins",
        "Another point about a struggle area or target suggestion for the exercise where it's needed"
      ],
      "exerciseRecap": [
        "Exercise Name: 3-5 sentence recap of strength/reps of every exercise done in that week (if any) , followed by specific action recommendation for next week."
      ]
    }`;
  },

  buildUserPrompt(workoutHistoryJSON: string): string {
    return `Here is the user's workout history for this specific day of the week over the last 4 weeks:
    ${workoutHistoryJSON}
    
    Please evaluate their progress. If they have only 1 week of data, analyze that week and give encouraging notes and recommendations.
    Be positive, direct, and concise. Do not output any markdown blocks, code formatting, or summary notes outside the requested JSON.`;
  },

  async generateReport(workoutHistoryJSON: string): Promise<AIReportResult> {
    const savedKeys = this.getSavedKeys();
    if (savedKeys.length === 0) {
      throw new Error('No API keys configured. Please add a key in Settings.');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(workoutHistoryJSON);

    // Check the in-memory response cache using a hash of the input. We include
    // the active provider order so that a different provider config doesn't
    // accidentally return a stale result.
    const cacheKey = `${savedKeys.map((k) => k.provider).join('|')}::${hashPrompt(systemPrompt + userPrompt)}`;
    const cached = getCachedResult(cacheKey);
    if (cached) {
      logger.info('[aiService] Returning cached report for input hash');
      return cached;
    }

    let lastError: Error | null = null;

    // Run the key queue fallback loop
    for (let i = 0; i < savedKeys.length; i++) {
      const keyObj = savedKeys[i];
      logger.info(`[aiService] Attempting generation using provider: ${keyObj.provider}...`);

      try {
        const { text, model } = await this.callProviderAPI(keyObj.provider, keyObj.key, systemPrompt, userPrompt);
        const parsed = this.cleanAndParseJSON(text);
        const result: AIReportResult = { ...parsed, provider: keyObj.provider, model };
        setCachedResult(cacheKey, result);
        return result;
      } catch (err: any) {
        logger.error(`[aiService] Provider ${keyObj.provider} failed:`, err);
        lastError = new Error(`${keyObj.provider.toUpperCase()} failed: ${err.message || 'Unknown error'}`);
      }
    }

    throw lastError || new Error('Generation failed across all available keys.');
  },

  async callProviderAPI(provider: AIProvider, key: string, systemPrompt: string, userPrompt: string): Promise<{ text: string; model: string }> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out after 12 seconds')), 12000)
    );

    const apiCallPromise = (async () => {
      if (provider === 'gemini') {
        const model = 'gemini-2.5-flash';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Data:\n${userPrompt}` }] }],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} ${errBody || response.statusText}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from Gemini API');
        return { text, model };
      }

      if (provider === 'groq') {
        const model = 'llama-3.3-70b-versatile';
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} ${errBody || response.statusText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from Groq API');
        return { text, model };
      }

      if (provider === 'openrouter') {
        const model = 'google/gemini-2.5-flash';
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} ${errBody || response.statusText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from OpenRouter API');
        return { text, model };
      }

      if (provider === 'openai') {
        const model = 'gpt-4o-mini';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} ${errBody || response.statusText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from OpenAI API');
        return { text, model };
      }

      if (provider === 'anthropic') {
        const model = 'claude-3-5-haiku-latest';
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt }
            ]
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} ${errBody || response.statusText}`);
        }

        const data = await response.json();
        const text = data?.content?.[0]?.text;
        if (!text) throw new Error('Empty response from Anthropic API');
        return { text, model };
      }

      if (provider === 'deepseek') {
        const model = 'deepseek-chat';
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} ${errBody || response.statusText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from DeepSeek API');
        return { text, model };
      }

      throw new Error('Unsupported provider type');
    })();

    return Promise.race([apiCallPromise, timeoutPromise]);
  },

  cleanAndParseJSON(rawText: string): AIReportResult {
    let cleanText = rawText.trim();
    // Strip markdown code blocks if the model ignored instructions
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleanText);
      if (!Array.isArray(parsed.coachNotes) || !Array.isArray(parsed.exerciseRecap)) {
        throw new Error('JSON structure does not match target schema');
      }
      return parsed as AIReportResult;
    } catch (err) {
      logger.error('[aiService] JSON clean parsing failed:', err, rawText);
      throw new Error('Received malformed response format from AI model');
    }
  },
};
