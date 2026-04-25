const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3004";

export interface DeepSeekRequest {
  prompt: string;
  model?: string;
}

export interface DeepSeekService {
  generateText(prompt: string): Promise<ReadableStream<Uint8Array>>;
  generateTextSync(prompt: string): Promise<string>;
}

class DeepSeekServiceImpl implements DeepSeekService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async generateText(prompt: string): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseUrl}/api/deepseek`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        // Mirror of src/lib/deepseek/constants.ts (DEEPSEEK_MODELS.pro.id).
        // Keep in sync — chrome-extension is a separate Vite build with no
        // shared types path into the parent Next.js app.
        model: "deepseek-v4-pro",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `DeepSeek API error: ${response.status} ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error("No response body available");
    }

    return response.body;
  }

  async generateTextSync(prompt: string): Promise<string> {
    const stream = await this.generateText(prompt);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }
      return result;
    } finally {
      reader.releaseLock();
    }
  }
}

export const deepseekService = new DeepSeekServiceImpl();
