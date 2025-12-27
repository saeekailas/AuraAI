
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Message, Document, Asset, SupportedLanguage } from "../types";

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000';

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateSynthesis(docContent: string, targetLang: SupportedLanguage = 'English'): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Summarize in ${targetLang}. Concise only.
      CONTENT: ${docContent.substring(0, 15000)}`,
      config: { temperature: 0.7 }
    });
    return response.text || "Error.";
  }

  async commitToLongTermMemory(id: string, text: string, metadata: any) {
    try {
      await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text, metadata: { ...metadata, text } })
      });
    } catch (e) {
      console.warn("Backend not available for memory ingestion.");
    }
  }

  async searchMemory(query: string): Promise<string> {
    try {
      const res = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, top_k: 3 })
      });
      const data = await res.json();
      return data.context || "";
    } catch (e) {
      console.warn("Backend not available for memory query.");
      return "";
    }
  }

  async generateImage(prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1"): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio })
      });
      
      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.image || "Image generation failed";
    } catch (error: any) {
      console.error("Visual Error:", error);
      throw error;
    }
  }

  async generateVideo(
    prompt: string, 
    config: { aspectRatio: '16:9' | '9:16', resolution: '720p' | '1080p' }
  ): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          aspect_ratio: config.aspectRatio,
          resolution: config.resolution
        })
      });
      
      if (!response.ok) {
        throw new Error(`Video generation failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.video || "Video generation queued";
    } catch (err: any) {
      console.error("Video generation error:", err);
      throw err;
    }
  }

  async detectIntent(prompt: string): Promise<'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO'> {
    try {
      const response = await fetch(`${API_BASE_URL}/detect-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: prompt })
      });
      
      if (!response.ok) {
        return 'TEXT';
      }
      
      const data = await response.json();
      const intent = data.intent?.toUpperCase() || 'TEXT';
      return intent as 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO';
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

    const systemInstruction = `Persona: Expert Multimodal AI assistant with Long-term Memory. Language: ${targetLang}. 
    Capabilities: You analyze text, images, videos, audio.
    Semantic Context from Long-term Memory: ${longTermContext || "No past relevant memories found."}
    Current Local Context: ${context || "General assistance."}`;

    const config: any = {
      systemInstruction,
      temperature: 0.8,
    };

    if (useGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const chat = ai.chats.create({
      model: "gemini-1.5-flash",
      config,
    });

    const parts: any[] = [{ text: lastUserPrompt || "Analyze the following media:" }];
    assets.forEach(asset => {
      const base64Data = asset.data.includes(',') ? asset.data.split(',')[1] : asset.data;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: asset.mimeType
        }
      });
    });

    try {
      const result = await chat.sendMessageStream({ message: parts });
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const groundingChunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const urls = groundingChunks
          ?.filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title }));

        yield { text: c.text || "", urls: urls || [] };
      }
    } catch (e) {
      console.error("Stream Error:", e);
      yield { text: "Error processing stream.", urls: [] };
    }
  }

  async connectLive(callbacks: any, voiceConfig: { voiceName: string, systemInstruction?: string }) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: voiceConfig.systemInstruction || 'You are a professional assistant.',
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
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s * 32768;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64Audio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
