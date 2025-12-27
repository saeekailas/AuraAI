
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { Asset } from '../types';

interface VideoGeneratorProps {
  onClose: () => void;
  onAssetGenerated: (asset: Asset) => void;
  onLog: (msg: string, type?: any) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onClose, onAssetGenerated, onLog }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing Veo Core...');

  const loadingMessages = [
    "Simulating fluid dynamics...",
    "Lighting the scene with neural raytracing...",
    "Rendering temporal consistency...",
    "Baking shadow maps...",
    "Fine-tuning motion vectors...",
    "Finalizing cinematic polish..."
  ];

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      let i = 0;
      interval = setInterval(() => {
        setStatusMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    onLog(`Initiating Motion Synthesis: "${prompt.substring(0, 30)}..."`, "info");

    try {
      const videoData = await geminiService.generateVideo(prompt, { aspectRatio, resolution });
      setResult(videoData);
      onLog("Motion Matrix Resolved: Video Generated", "success");
    } catch (err: any) {
      const msg = err.message || "Motion Engine Failure";
      setError(msg);
      onLog(msg, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    const asset: Asset = {
      id: `mov-${Date.now()}`,
      name: `Motion_${Date.now()}.mp4`,
      data: result,
      mimeType: 'video/mp4'
    };
    onAssetGenerated(asset);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[120] flex items-center justify-center font-sans p-6 overflow-hidden">
      <div className="w-full max-w-6xl bg-white rounded-[40px] shadow-2xl flex flex-col md:flex-row overflow-hidden h-[85vh] border border-white/20">
        
        {/* Settings Panel */}
        <div className="w-full md:w-2/5 p-12 flex flex-col gap-10 bg-gray-50/50 overflow-y-auto">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Motion Lab</h2>
              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.4em] mt-1">Veo_Neural_Cinema_v3.1</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-500 hover:text-black transition-all">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-500">Scene Narrative</label>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic cyber-city at dusk, cinematic lighting, slow dolly zoom..."
              className="w-full h-44 p-6 bg-white border border-gray-200 rounded-3xl text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all resize-none shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-500">Aspect Ratio</label>
              <div className="flex flex-col gap-2">
                {(['16:9', '9:16'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`px-4 py-3 rounded-2xl text-[11px] font-black border-2 transition-all flex items-center justify-between ${
                      aspectRatio === r ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {r === '16:9' ? 'Landscape' : 'Portrait'}
                    <span className="opacity-50">{r}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-500">Precision</label>
              <div className="flex flex-col gap-2">
                {(['720p', '1080p'] as const).map(res => (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`px-4 py-3 rounded-2xl text-[11px] font-black border-2 transition-all flex items-center justify-between ${
                      resolution === res ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {res === '1080p' ? 'HD Master' : 'Standard'}
                    <span className="opacity-50">{res}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-2xl flex items-center gap-3">
                <i className="fas fa-exclamation-circle text-sm"></i>
                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={`w-full py-5 rounded-3xl text-[12px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${
                isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-play text-[10px]"></i>
                  Create Motion
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-full md:w-3/5 bg-gray-100 relative flex items-center justify-center overflow-hidden">
          {isGenerating && (
            <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-white px-12 text-center">
              <div className="relative w-24 h-24 mb-10">
                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <i className="fas fa-film text-2xl text-indigo-500"></i>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4 tracking-tight">{statusMessage}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] max-w-xs leading-loose">
                Visualizing temporal vectors. Large cinematic sequences may take up to 2 minutes.
              </p>
            </div>
          )}

          {!result && !isGenerating && (
            <div className="text-center flex flex-col items-center gap-6 p-20">
              <div className="w-20 h-20 bg-white rounded-[30px] flex items-center justify-center text-gray-200 shadow-sm mb-2 border border-gray-100">
                <i className="fas fa-photo-video text-4xl"></i>
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Projection Bay Ready</h4>
                <p className="text-[11px] text-gray-300 mt-2 font-medium">Define your scene to begin the synthesis process.</p>
              </div>
            </div>
          )}

          {result && (
            <div className="w-full h-full flex flex-col p-12">
              <div className="flex-1 bg-black rounded-[40px] shadow-2xl relative group overflow-hidden border border-white/10 ring-1 ring-black/5">
                <video 
                  src={result} 
                  autoPlay 
                  loop 
                  muted 
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-10 flex gap-4">
                <button
                  onClick={() => setResult(null)}
                  className="px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black hover:bg-gray-200 transition-all border border-transparent"
                >
                  Discard
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-neutral-800 transition-all shadow-xl shadow-black/10"
                >
                  Inject Sequence to Chat
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default VideoGenerator;
