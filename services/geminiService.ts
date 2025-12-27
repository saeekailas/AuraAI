import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Message, Document, Asset, SupportedLanguage } from "../types";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateSynthesis(docContent: string, targetLang: SupportedLanguage = 'English'): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following content in ${targetLang}. Provide a concise, professional summary.
      CONTENT: ${docContent.substring(0, 15000)}`,
      config: { temperature: 0.7 }
    });
    return response.text || "Synthesis failed.";
  }

  async commitToLongTermMemory(id: string, text: string, metadata: any) {
    try {
      // Local fall-back for persistence
      const localMemories = JSON.parse(localStorage.getItem('local_memories') || '[]');
      localMemories.push({ id, text, metadata, timestamp: Date.now() });
      localStorage.setItem('local_memories', JSON.stringify(localMemories.slice(-100)));

      // Sync to FastAPI backend if available
      await fetch('http://localhost:8000/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text, metadata: { ...metadata, timestamp: Date.now() } })
      });
    } catch (e) {
      console.warn("Backend sync unavailable, using local memory only.");
    }
  }

  async searchMemory(query: string): Promise<string> {
    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, top_k: 3 })
      });
      const data = await res.json();
      return data.context || "";
    } catch (e) {
      // Local semantic-ish fallback
      const localMemories = JSON.parse(localStorage.getItem('local_memories') || '[]');
      const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);
      const results = localMemories
        .filter((m: any) => queryWords.some(word => m.text.toLowerCase().includes(word)))
        .slice(0, 2)
        .map((m: any) => m.text)
        .join("\n---\n");
      return results;
    }
  }

  async generateImage(
    prompt: string, 
    aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1",
    quality: 'standard' | 'pro' = 'standard'
  ): Promise<string> {
    let ai;
    let model = 'gemini-2.5-flash-image';

    if (quality === 'pro') {
      if (!(window as any).aistudio?.hasSelectedApiKey()) {
        await (window as any).aistudio?.openSelectKey();
      }
      ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      model = 'gemini-3-pro-image-preview';
    } else {
      ai = this.getClient();
    }

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }] },
        config: { 
          imageConfig: { 
            aspectRatio,
            ...(quality === 'pro' ? { imageSize: '1K' } : {})
          } 
        }
      });
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) throw new Error("No image generated.");
      for (const part of parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
      throw new Error("Missing image data in response.");
    } catch (error: any) {
      if (error.message?.includes("429") || error.message?.includes("quota")) {
        throw new Error("QUOTA_EXCEEDED: The standard image generator is busy. Please switch to 'Pro Mode' to use your own API key.");
      }
      throw error;
    }
  }

  async generateVideo(
    prompt: string, 
    config: { aspectRatio: '16:9' | '9:16', resolution: '720p' | '1080p' }
  ): Promise<string> {
    if (!(window as any).aistudio?.hasSelectedApiKey()) {
      await (window as any).aistudio?.openSelectKey();
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation failed.");

      const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!videoResponse.ok) throw new Error("Failed to download video.");
      
      const blob = await videoResponse.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
        throw new Error("API Key session invalid. Re-select key.");
      }
      throw err;
    }
  }

  async detectIntent(prompt: string): Promise<'IMAGE' | 'VIDEO' | 'TEXT'> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze intent: Return 'IMAGE', 'VIDEO', or 'TEXT'. PROMPT: "${prompt}"`,
        config: { temperature: 0 }
      });
      const t = response.text?.toUpperCase() || '';
      if (t.includes('VIDEO')) return 'VIDEO';
      if (t.includes('IMAGE')) return 'IMAGE';
      return 'TEXT';
    } catch {
      return 'TEXT';
    }
  }

  async *streamChat(
    messages: Message[], 
    context: string, 
    assets: Asset[] = [], 
    useGrounding: boolean = false,
    useMemory: boolean = false,
    targetLang: SupportedLanguage = 'English'
  ): AsyncGenerator<{ text: string; urls: { uri: string; title: string }[] }> {
    const ai = this.getClient();
    const lastUserPrompt = messages[messages.length - 1].content;
    
    let longTermContext = "";
    if (useMemory && lastUserPrompt) {
      longTermContext = await this.searchMemory(lastUserPrompt);
    }

    const systemInstruction = `You are AuraAI. Target: ${targetLang}. Context: ${context}`;

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: { 
        systemInstruction,
        tools: useGrounding ? [{ googleSearch: {} }] : undefined
      },
    });

    const parts: any[] = [{ text: lastUserPrompt || "Analyze assets:" }];
    assets.forEach(asset => {
      const base64Data = asset.data.includes(',') ? asset.data.split(',')[1] : asset.data;
      parts.push({ inlineData: { data: base64Data, mimeType: asset.mimeType } });
    });

    const result = await chat.sendMessageStream({ message: parts });
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      const groundingChunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const urls = groundingChunks
        ?.filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title }));
      yield { text: c.text || "", urls: urls || [] };
    }
  }

  async connectLive(callbacks: any, voiceConfig: { voiceName: string, systemInstruction?: string }) {
    if (!(window as any).aistudio?.hasSelectedApiKey()) {
      await (window as any).aistudio?.openSelectKey();
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: voiceConfig.systemInstruction,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceConfig.voiceName } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });
  }
}

export const geminiService = new GeminiService();

export function encodeAudio(data: Float32Array) {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64Audio(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}
