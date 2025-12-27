import React, { useEffect, useRef, useState } from 'react';
import { geminiService, decodeBase64Audio, decodeAudioData, encodeAudio } from '../services/geminiService';
import { SupportedLanguage } from '../types';

interface VoiceTerminalProps {
  onClose: () => void;
  language: SupportedLanguage;
  onLog: (msg: string, type?: any) => void;
}

const ALL_LANGUAGES: SupportedLanguage[] = [
  'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Assamese', 'Aymara', 'Azerbaijani',
  'Bambara', 'Basque', 'Belarusian', 'Bengali', 'Bhojpuri', 'Bosnian', 'Bulgarian', 'Burmese', 
  'Catalan', 'Cebuano', 'Chichewa', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Corsican', 
  'Croatian', 'Czech', 'Danish', 'Dhivehi', 'Dogri', 'Dutch', 'English', 'Esperanto', 'Estonian', 
  'Ewe', 'Filipino', 'Finnish', 'French', 'Frisian', 'Galician', 'Georgian', 'German', 'Greek', 
  'Guarani', 'Gujarati', 'Haitian Creole', 'Hausa', 'Hawaiian', 'Hebrew', 'Hindi', 'Hmong', 
  'Hungarian', 'Icelandic', 'Igbo', 'Ilocano', 'Indonesian', 'Irish', 'Italian', 'Japanese', 
  'Javanese', 'Kannada', 'Kazakh', 'Khmer', 'Kinyarwanda', 'Konkani', 'Korean', 'Krio', 
  'Kurdish', 'Kurdish (Sorani)', 'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 
  'Luganda', 'Luxembourgish', 'Macedonian', 'Maithili', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 
  'Maori', 'Marathi', 'Meiteilon (Manipuri)', 'Mizo', 'Mongolian', 'Nepali', 'Norwegian', 'Odia (Oriya)', 
  'Oromo', 'Pashto', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Quechua', 'Romanian', 'Russian', 
  'Samoan', 'Sanskrit', 'Scots Gaelic', 'Sepedi', 'Serbian', 'Sesotho', 'Shona', 'Sindhi', 'Sinhala', 
  'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Sundanese', 'Swahili', 'Swedish', 'Tajik', 'Tamil', 
  'Tatar', 'Telugu', 'Thai', 'Tigrinya' , 'Tsonga', 'Turkish', 'Turkmen', 'Twi', 'Ukrainian', 'Urdu', 
  'Uyghur', 'Uzbek', 'Vietnamese', 'Welsh', 'Xhosa', 'Yiddish', 'Yoruba', 'Zulu'
];

const VoiceTerminal: React.FC<VoiceTerminalProps> = ({ onClose, language, onLog }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [mode, setMode] = useState<'assistant' | 'translator'>('assistant');
  const [sourceLang, setSourceLang] = useState<SupportedLanguage>(language);
  const [targetLang, setTargetLang] = useState<SupportedLanguage>('Spanish');
  const [micLevel, setMicLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<'female' | 'male'>('female');
  const [transcription, setTranscription] = useState<string>('');
  
  const statusRef = useRef<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => cleanup();
  }, []);

  const cleanup = () => {
    stopAllAudio();
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
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const startSession = async () => {
    try {
      cleanup();
      setStatus('connecting');
      setErrorMessage(null);
      setTranscription('');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      }).catch((err) => {
        throw new Error("Microphone access denied.");
      });
      
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
      const instruction = mode === 'translator' 
        ? `UNIVERSAL TRANSLATOR MODE. Act as a simultaneous interpreter. 
           Source: ${sourceLang}
           Target: ${targetLang}
           RULES: 
           1. If you hear ${sourceLang}, translate immediately to ${targetLang} and speak ONLY the translation.
           2. If you hear ${targetLang}, translate immediately to ${sourceLang} and speak ONLY the translation.
           3. Maintain the tone and emotion of the speaker.`
        : `You are a professional assistant fluent in ${sourceLang}. Your personality is ${voiceProfile}.`;

      const sessionPromise = geminiService.connectLive({
        onopen: () => {
          setStatus('active');
          updateLevel();
          onLog(`${mode.toUpperCase()} Matrix Online`, "success");
          
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(2048, 1, 1);
          
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
          if (message.serverContent?.inputTranscription) {
            setTranscription(message.serverContent.inputTranscription.text);
          }
          if (message.serverContent?.outputTranscription) {
            setTranscription(message.serverContent.outputTranscription.text);
          }
          if (message.serverContent?.turnComplete) {
            setTimeout(() => setTranscription(''), 5000);
          }
          if (message.serverContent?.interrupted) stopAllAudio();
          
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
              source.onended = () => activeSourcesRef.current.delete(source);
            } catch (err) {}
          }
        },
        onerror: () => setStatus('error'),
        onclose: () => setStatus('idle'),
      }, { voiceName: selectedVoice, systemInstruction: instruction });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || "Neural connection failed.");
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-300 font-sans">
      <div className="w-full max-w-xl p-8 flex flex-col items-center gap-8 text-center overflow-y-auto max-h-screen">
        
        {/* Toggle Controls */}
        <div className={`flex flex-col gap-4 items-center w-full transition-all ${status === 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-full w-full max-w-xs shadow-inner">
            <button 
              onClick={() => setMode('assistant')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${mode === 'assistant' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
            >
              Assistant
            </button>
            <button 
              onClick={() => setMode('translator')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${mode === 'translator' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
            >
              Translator
            </button>
          </div>

          <div className="flex gap-1 p-1 bg-gray-50 rounded-full">
            <button 
              onClick={() => setVoiceProfile('female')}
              className={`px-8 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all ${voiceProfile === 'female' ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'text-gray-400 hover:text-pink-500'}`}
            >
              Female
            </button>
            <button 
              onClick={() => setVoiceProfile('male')}
              className={`px-8 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all ${voiceProfile === 'male' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-blue-500'}`}
            >
              Male
            </button>
          </div>
        </div>

        {/* Global Language Selection for Translator */}
        {mode === 'translator' && status === 'idle' && (
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 w-full px-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col gap-1.5 items-start">
              <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Native Language</label>
              <select 
                value={sourceLang} 
                onChange={(e) => setSourceLang(e.target.value as any)} 
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-black transition-all appearance-none cursor-pointer"
              >
                {ALL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button onClick={handleSwap} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white transition-all mx-auto flex items-center justify-center">
              <i className="fas fa-exchange-alt"></i>
            </button>
            <div className="flex flex-col gap-1.5 items-start">
              <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Translate To</label>
              <select 
                value={targetLang} 
                onChange={(e) => setTargetLang(e.target.value as any)} 
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-black transition-all appearance-none cursor-pointer"
              >
                {ALL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-6 relative">
          <div className="relative">
            <div 
              className={`absolute inset-[-60px] rounded-full transition-all duration-150 ${status === 'active' ? (voiceProfile === 'female' ? 'bg-pink-50/50' : 'bg-blue-50/50') + ' opacity-100' : 'opacity-0'}`}
              style={{ transform: `scale(${1 + (micLevel / 60)})` }}
            ></div>
            
            <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 border-4 ${
              status === 'active' ? `bg-black scale-110 ${voiceProfile === 'female' ? 'border-pink-500' : 'border-blue-600'}` : 
              status === 'connecting' ? 'bg-gray-100 border-gray-100 animate-pulse' : 
              'bg-gray-50 border-gray-100'
            }`}>
              {status === 'active' ? (
                <div className="flex items-center gap-1.5 h-12">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1 rounded-full transition-all duration-75 ${voiceProfile === 'female' ? 'bg-pink-400' : 'bg-blue-400'}`}
                      style={{ height: `${20 + (Math.random() * (micLevel * 1.8))}%` }}
                    ></div>
                  ))}
                </div>
              ) : (
                <i className={`fas ${status === 'connecting' ? 'fa-sync fa-spin' : (voiceProfile === 'female' ? 'fa-user' : 'fa-user-tie')} text-4xl text-gray-200`}></i>
              )}
            </div>
          </div>
          
          <div className="z-20">
            <h2 className="text-2xl font-black tracking-tighter text-gray-900 uppercase">
              {status === 'idle' ? (mode === 'translator' ? "Neural Polyglot" : "Neural Link") : 
               status === 'connecting' ? "Calibrating..." : "Active Stream"}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? (voiceProfile === 'female' ? 'bg-pink-500 animate-pulse' : 'bg-blue-600 animate-pulse') : 'bg-gray-300'}`}></span>
              <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${voiceProfile === 'female' ? 'text-pink-500' : 'text-blue-600'}`}>
                {voiceProfile} System - {mode} Mode
              </p>
            </div>
          </div>

          {status === 'active' && transcription && (
            <div className="absolute top-[210px] left-1/2 -translate-x-1/2 w-[340px] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white/90 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-gray-100 text-xs font-bold text-gray-700 leading-relaxed italic">
                {transcription}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          {status === 'idle' && (
            <button 
              onClick={startSession}
              className="px-24 py-6 bg-black text-white text-[11px] font-black uppercase tracking-[0.5em] rounded-full hover:scale-105 transition-all shadow-2xl active:scale-95"
            >
              Start {mode}
            </button>
          )}

          {status === 'active' && (
             <button 
               onClick={cleanup}
               className="px-12 py-3 text-red-500 text-[10px] font-black uppercase tracking-widest border-2 border-red-50 rounded-full hover:bg-red-50 transition-all"
             >
               Terminate Link
             </button>
          )}

          {status === 'error' && (
            <div className="text-red-500 text-[10px] font-black uppercase tracking-widest">{errorMessage || "Protocol Failure"}</div>
          )}
        </div>

        <button 
          onClick={onClose} 
          className="mt-4 text-[9px] font-black uppercase tracking-[0.3em] text-gray-300 hover:text-black transition-colors"
        >
          Exit Interface
        </button>
      </div>
    </div>
  );
};

export default VoiceTerminal;