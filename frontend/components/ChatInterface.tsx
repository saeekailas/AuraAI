import React, { useState, useRef, useEffect } from 'react';
import { Message, Document, SystemLog, Asset, SupportedLanguage } from '../types';
import { geminiService } from '../services/geminiService';
import VoiceTerminal from './VoiceTerminal';
import VisualGenerator from './VisualGenerator';
import VideoGenerator from './VideoGenerator';

interface ChatInterfaceProps {
  selectedDoc?: Document;
  onLog: (message: string, type?: SystemLog['type']) => void;
  logs: SystemLog[];
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onDocumentIngested: (file: File) => Promise<void>;
  isIndexing: boolean;
  indexingProgress: number;
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  selectedDoc, onLog, logs, language, onLanguageChange, onDocumentIngested, isIndexing, indexingProgress,
  initialMessages = [], onMessagesChange
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [useMemory, setUseMemory] = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVisualLabActive, setIsVisualLabActive] = useState(false);
  const [isMotionLabActive, setIsMotionLabActive] = useState(false);
  const [computeStatus, setComputeStatus] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Asset[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onMessagesChange) onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Explicitly type 'file' as 'File' to resolve 'unknown' type issues during FileList iteration
    Array.from(files).forEach((file: File) => {
      if (file.type === 'application/pdf' || file.type === 'text/plain') {
        onDocumentIngested(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (rev) => {
        const data = rev.target?.result as string;
        const newAsset: Asset = {
          id: `attach-${Date.now()}-${Math.random()}`,
          name: file.name,
          data: data,
          mimeType: file.type
        };
        setAttachments(prev => [...prev, newAsset]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      assets: [...attachments]
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Auto-commit to long-term memory in background
    if (input.length > 20) {
      geminiService.commitToLongTermMemory(userMessage.id, input, { role: 'user', language });
    }

    const promptSnapshot = input;
    const assetsSnapshot = [...attachments];
    
    setInput('');
    setAttachments([]);
    setIsTyping(true);
    setComputeStatus("Recalling Memories & Analyzing...");

    try {
      const intent = assetsSnapshot.length === 0 ? await geminiService.detectIntent(promptSnapshot) : 'TEXT';
      
      if (intent === 'IMAGE') {
        setComputeStatus("Creating image...");
        const assistantId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: 'Generating...', timestamp: Date.now(), assets: [] }]);
        try {
          const imageUrl = await geminiService.generateImage(promptSnapshot);
          setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: '', assets: [{ id: `img-${Date.now()}`, name: 'gen.png', data: imageUrl, mimeType: 'image/png' }] } : msg));
        } catch (error: any) {
          setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: `Error: ${error.message}` } : msg));
        }
      } else if (intent === 'VIDEO') {
        setComputeStatus("Synthesizing motion...");
        const assistantId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: 'Generating...', timestamp: Date.now(), assets: [] }]);
        try {
          const videoUrl = await geminiService.generateVideo(promptSnapshot, { aspectRatio: '16:9', resolution: '720p' });
          setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: '', assets: [{ id: `mov-${Date.now()}`, name: 'scene.mp4', data: videoUrl, mimeType: 'video/mp4' }] } : msg));
        } catch (error: any) {
          setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: `Error: ${error.message}` } : msg));
        }
      } else {
        const context = selectedDoc ? `[FOCUS: ${selectedDoc.name}]\n${selectedDoc.content}` : "";
        let assistantContent = '';
        let accumulatedUrls: { uri: string; title: string }[] = [];
        const assistantId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), assets: [] }]);

        const stream = geminiService.streamChat([...messages, userMessage], context, assetsSnapshot, useGrounding, useMemory, language);
        for await (const chunk of stream) {
          assistantContent += chunk.text;
          if (chunk.urls?.length) accumulatedUrls = [...new Set([...accumulatedUrls, ...chunk.urls])];
          setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: assistantContent, groundingUrls: accumulatedUrls } : msg));
        }
        
        // Index assistant response too
        if (assistantContent.length > 50) {
          geminiService.commitToLongTermMemory(assistantId, assistantContent, { role: 'assistant', language });
        }
      }
    } catch (error) {
      onLog("Processing error.", "error");
    } finally {
      setIsTyping(false);
      setComputeStatus(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full relative overflow-hidden">
      {isVoiceActive && <VoiceTerminal language={language} onClose={() => setIsVoiceActive(false)} onLog={onLog} />}
      {isVisualLabActive && <VisualGenerator onClose={() => setIsVisualLabActive(false)} onAssetGenerated={(asset) => setAttachments(prev => [...prev, asset])} onLog={onLog} />}
      {isMotionLabActive && <VideoGenerator onClose={() => setIsMotionLabActive(false)} onAssetGenerated={(asset) => setAttachments(prev => [...prev, asset])} onLog={onLog} />}

      <header className="h-14 flex items-center justify-between px-6 border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
            <div className={`w-1.5 h-1.5 rounded-full ${selectedDoc ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className="text-[11px] font-bold text-gray-600">
              {selectedDoc ? `Focus: ${selectedDoc.name}` : 'AuraAI Interface'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
            <i className="fas fa-language text-gray-400 text-xs"></i>
            <select 
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              className="bg-transparent text-[11px] font-bold text-gray-600 outline-none cursor-pointer max-w-[120px]"
            >
              {['Afrikaans', 'Arabic', 'Chinese', 'English', 'French', 'German', 'Hindi', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Russian', 'Spanish'].map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50/30">
        <div className="max-w-3xl mx-auto py-12 px-6 space-y-10">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center pt-20 text-center">
              <div className="w-16 h-16 bg-black rounded-[24px] flex items-center justify-center text-white text-xl mb-8 shadow-2xl">
                <i className="fas fa-layer-group"></i>
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tighter italic uppercase">AuraAI Workspace</h1>
              <p className="text-gray-500 text-sm max-w-sm font-medium leading-relaxed">
                Experience unified multimodal intelligence with long-term semantic persistence.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="group flex gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                  msg.role === 'user' ? 'bg-white border-gray-200 text-gray-600' : 'bg-black border-black text-white'
                }`}>
                  <i className={`fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'} text-[11px]`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.content}
                  </div>
                  {msg.assets?.length ? (
                    <div className="mt-5 flex flex-wrap gap-4">
                      {msg.assets.map(asset => (
                        <div key={asset.id} className="rounded-3xl overflow-hidden border-2 border-white shadow-xl max-w-full md:max-w-[450px] bg-white group/asset relative">
                          {asset.mimeType.startsWith('image/') ? (
                            <img src={asset.data} alt={asset.name} className="w-full h-auto" />
                          ) : asset.mimeType.startsWith('video/') ? (
                            <div className="bg-black aspect-video w-full flex flex-col items-center justify-center rounded-2xl overflow-hidden">
                               <video src={asset.data} controls className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="p-4 flex items-center gap-3 bg-indigo-50/50">
                              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                                <i className="fas fa-file-audio"></i>
                              </div>
                              <span className="text-[10px] font-black uppercase truncate tracking-tighter text-black">{asset.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {msg.groundingUrls?.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {msg.groundingUrls.map((u, i) => (
                        <a key={i} href={u.uri} target="_blank" className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-all shadow-sm">
                          <i className="fas fa-link mr-1.5 text-[8px]"></i> {u.title || 'Source'}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {isTyping && computeStatus && (
            <div className="flex gap-6 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                <i className="fas fa-brain fa-fade text-[11px]"></i>
              </div>
              <div className="text-[11px] text-indigo-400 font-bold uppercase tracking-widest pt-3">{computeStatus}</div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full pb-10 px-6 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto pt-6">
          {(isIndexing || attachments.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {isIndexing && (
                <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full w-full">
                  <i className="fas fa-circle-notch fa-spin text-indigo-600 text-xs"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Indexing Memory... {indexingProgress}%</span>
                  <div className="flex-1 h-1 bg-indigo-200 rounded-full overflow-hidden ml-2">
                    <div className="bg-indigo-600 h-full transition-all" style={{ width: `${indexingProgress}%` }}></div>
                  </div>
                </div>
              )}
              {attachments.map(asset => (
                <div key={asset.id} className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-2xl border-2 border-gray-100 overflow-hidden bg-white shadow-sm ring-2 ring-indigo-50 ring-offset-2">
                    {asset.mimeType.startsWith('image/') ? <img src={asset.data} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-indigo-600"><i className={`fas ${asset.mimeType.startsWith('video/') ? 'fa-film' : 'fa-music'} text-lg`}></i></div>}
                  </div>
                  <button onClick={() => removeAttachment(asset.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[8px] border-2 border-white shadow-md hover:scale-110 transition-transform"><i className="fas fa-times"></i></button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex flex-col w-full bg-gray-50 border border-gray-200 rounded-[32px] transition-all p-3 group focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 focus-within:border-indigo-200">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Recall information or analyze media..."
              className="w-full px-5 py-4 bg-transparent border-none outline-none resize-none text-[15px] font-medium placeholder:text-gray-400 min-h-[56px] max-h-[200px] text-black"
            />
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="flex items-center gap-1">
                <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.txt,image/*,video/*,audio/*" onChange={handleFileAttach} />
                <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-200/50 rounded-full transition-all" title="Attach Files"><i className="fas fa-paperclip text-sm"></i></button>
                <button onClick={() => setIsVoiceActive(true)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all" title="Voice"><i className="fas fa-microphone text-sm"></i></button>
                <button onClick={() => setIsVisualLabActive(true)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all" title="Visuals"><i className="fas fa-palette text-sm"></i></button>
                <button onClick={() => setIsMotionLabActive(true)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all" title="Motion"><i className="fas fa-video text-sm"></i></button>
              </div>
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || isTyping || isIndexing}
                className={`w-11 h-11 flex items-center justify-center rounded-[20px] transition-all ${
                  (!input.trim() && attachments.length === 0) || isTyping || isIndexing ? 'bg-gray-100 text-gray-300' : 'bg-black text-white shadow-xl hover:scale-105 active:scale-95'
                }`}
              >
                <i className="fas fa-arrow-up text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;