import { storage } from '../../utils/storage';
import { logger } from '../../utils/logger';

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'openai' | 'anthropic' | 'deepseek' | 'cohere';

export interface SavedKey {
  provider: AIProvider;
  key: string;
}

export interface AIReportResult {
  coachNotes: string[];
  exerciseRecap: string[];
}

const STORAGE_KEY = 'fitrack_api_keys_list';

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

    let lastError: Error | null = null;

    // Run the key queue fallback loop
    for (let i = 0; i < savedKeys.length; i++) {
      const keyObj = savedKeys[i];
      logger.info(`[aiService] Attempting generation using provider: ${keyObj.provider}...`);

      try {
        const textResult = await this.callProviderAPI(keyObj.provider, keyObj.key, systemPrompt, userPrompt);
        const parsed = this.cleanAndParseJSON(textResult);
        return parsed;
      } catch (err: any) {
        logger.error(`[aiService] Provider ${keyObj.provider} failed:`, err);
        lastError = new Error(`${keyObj.provider.toUpperCase()} failed: ${err.message || 'Unknown error'}`);
      }
    }

    throw lastError || new Error('Generation failed across all available keys.');
  },

  async callProviderAPI(provider: AIProvider, key: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out after 12 seconds')), 12000)
    );

    const apiCallPromise = (async () => {
      if (provider === 'gemini') {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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
        return text;
      }

      if (provider === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
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
        return text;
      }

      if (provider === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
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
        return text;
      }

      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
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
        return text;
      }

      if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-latest',
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
        return text;
      }

      if (provider === 'deepseek') {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
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
        return text;
      }

      if (provider === 'cohere') {
        const response = await fetch('https://api.cohere.com/v2/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'command-r-plus',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status} ${errBody || response.statusText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from Cohere API');
        return text;
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
