import React, { useEffect, useRef, useState } from 'react';
import { geminiService, decodeBase64Audio, decodeAudioData, encodeAudio } from '../services/geminiService';
import { SupportedLanguage } from '../types';

interface VoiceTerminalProps {
  onClose: () => void;
  language: SupportedLanguage;
  onLog: (msg: string, type?: any) => void;
}

const VoiceTerminal: React.FC<VoiceTerminalProps> = ({ onClose, language, onLog }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [mode, setMode] = useState<'assistant' | 'translator'>('assistant');
  const [sourceLanguage, setSourceLanguage] = useState<SupportedLanguage>(language);
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('Spanish');
  const [micLevel, setMicLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<'female' | 'male'>('female');
  const [transcription, setTranscription] = useState<string>('');
  
  const statusRef = useRef<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);

  const languages: SupportedLanguage[] = [
    'Arabic', 'Chinese', 'English', 'French', 'German', 'Hindi', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Russian', 'Spanish'
  ].sort() as SupportedLanguage[];

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    stopAllAudio();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sessionRef.current) {
      try { 
        sessionRef.current.close(); 
        sessionRef.current = null;
      } catch (e) {}
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close().catch(() => {});
      inputContextRef.current = null;
    }
    setStatus('idle');
    statusRef.current = 'idle';
  };

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const handleSwap = () => {
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
  };

  const startSession = async () => {
    try {
      cleanup();
      
      setStatus('connecting');
      setErrorMessage(null);
      setTranscription('');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      }).catch((err) => {
        throw new Error("Microphone access denied.");
      });
      
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await inputCtx.resume();
      await outputCtx.resume();
      
      audioContextRef.current = outputCtx;
      inputContextRef.current = inputCtx;

      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current || statusRef.current !== 'active') return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(avg);
        requestAnimationFrame(updateLevel);
      };

      const selectedVoice = voiceProfile === 'female' ? 'Zephyr' : 'Puck';

      const assistantPrompt = `Professional assistant. Language: ${sourceLanguage}. Profile: ${voiceProfile}.`;
      const translatorPrompt = `Live translator from ${sourceLanguage} to ${targetLanguage}. Voice Profile: ${voiceProfile}.`;

      const systemInstruction = mode === 'translator' ? translatorPrompt : assistantPrompt;

      const sessionPromise = geminiService.connectLive({
        onopen: () => {
          setStatus('active');
          updateLevel();
          onLog("Neural Link Established", "success");
          
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          
          source.connect(analyser);
          processor.onaudioprocess = (e: any) => {
            if (statusRef.current !== 'active') return;
            const inputData = e.inputBuffer.getChannelData(0);
            const base64 = encodeAudio(inputData);
            
            sessionPromise.then(session => {
              if (session) {
                session.sendRealtimeInput({ 
                  media: { data: base64, mimeType: 'audio/pcm;rate=16000' } 
                });
              }
            }).catch(() => {});
          };
          
          source.connect(processor);
          processor.connect(inputCtx.destination);
        },
        onmessage: async (message: any) => {
          if (message.serverContent?.turnComplete) setTranscription('');
          
          const audioBase64 = message.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
          if (audioBase64) {
            try {
              const decodedData = decodeBase64Audio(audioBase64);
              const buffer = await decodeAudioData(decodedData, outputCtx);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              const startTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              source.start(startTime);
              nextStartTimeRef.current = startTime + buffer.duration;
              activeSourcesRef.current.add(source);
            } catch (err) {}
          }
        },
        onerror: () => setStatus('error'),
        onclose: () => setStatus('idle'),
      }, { voiceName: selectedVoice, systemInstruction });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-300 font-sans text-black">
      <div className="w-full max-w-2xl p-10 flex flex-col items-center gap-8 text-center">
        
        <div className={`flex flex-col gap-6 items-center w-full transition-all ${status === 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-full">
            <button 
              onClick={() => setMode('assistant')}
              className={`px-10 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all ${mode === 'assistant' ? 'bg-black text-white' : 'text-gray-400'}`}
            >
              Assistant
            </button>
            <button 
              onClick={() => setMode('translator')}
              className={`px-10 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all ${mode === 'translator' ? 'bg-black text-white' : 'text-gray-400'}`}
            >
              Translator
            </button>
          </div>

          <div className="flex gap-1 p-1 bg-gray-50 rounded-full mt-2">
            <button 
              onClick={() => setVoiceProfile('female')}
              className={`px-8 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all ${voiceProfile === 'female' ? 'bg-pink-500 text-white shadow-md shadow-pink-100' : 'text-gray-300 hover:text-pink-400'}`}
            >
              Female (Zephyr)
            </button>
            <button 
              onClick={() => setVoiceProfile('male')}
              className={`px-8 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all ${voiceProfile === 'male' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-300 hover:text-blue-500'}`}
            >
              Male (Puck)
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="relative">
            <div 
              className={`absolute inset-[-60px] rounded-full transition-all duration-150 ${status === 'active' ? (voiceProfile === 'female' ? 'bg-pink-50/50' : 'bg-blue-50/50') + ' opacity-100' : 'opacity-0'}`}
              style={{ transform: `scale(${1 + (micLevel / 60)})` }}
            ></div>
            <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 border-4 shadow-2xl ${
              status === 'active' ? `bg-black scale-110 ${voiceProfile === 'female' ? 'border-pink-500' : 'border-blue-500'}` : 'bg-gray-50 border-gray-50'
            }`}>
              {status === 'active' ? (
                <div className="flex items-center gap-2 h-12">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className={`w-1.5 rounded-full transition-all duration-100 ${voiceProfile === 'female' ? 'bg-pink-400' : 'bg-blue-400'}`}
                         style={{ height: `${20 + (Math.random() * (micLevel * 2))}%` }}></div>
                  ))}
                </div>
              ) : (
                <i className={`fas ${voiceProfile === 'female' ? 'fa-user' : 'fa-user-tie'} text-4xl text-gray-200`}></i>
              )}
            </div>
          </div>
          
          <h2 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">
             {status === 'idle' ? "Voice Link" : "Active Stream"}
          </h2>
        </div>

        <div className="flex flex-col items-center gap-4 w-full mt-4">
          {status === 'idle' ? (
            <button onClick={startSession} className="px-24 py-6 bg-black text-white text-[12px] font-black uppercase tracking-[0.6em] rounded-full shadow-2xl">Connect</button>
          ) : (
             <button onClick={cleanup} className="px-12 py-4 text-red-500 text-[11px] font-black uppercase border-2 border-red-50 rounded-full">End Session</button>
          )}
        </div>

        <button onClick={onClose} className="mt-6 text-[10px] font-black uppercase text-gray-300 hover:text-black">Dismiss</button>
      </div>
    </div>
  );
};

export default VoiceTerminal;