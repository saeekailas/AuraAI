import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { Asset } from '../types';

interface VisualGeneratorProps {
  onClose: () => void;
  onAssetGenerated: (asset: Asset) => void;
  onLog: (msg: string, type?: any) => void;
}

const VisualGenerator: React.FC<VisualGeneratorProps> = ({ onClose, onAssetGenerated, onLog }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<any>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ratios = ["1:1", "3:4", "4:3", "9:16", "16:9"];

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    onLog(`Initiating Visual Synthesis: "${prompt.substring(0, 30)}..."`, "info");

    try {
      const imageUrl = await geminiService.generateImage(prompt, aspectRatio);
      setResult(imageUrl);
      onLog("Neural Matrix Resolved: Asset Generated", "success");
    } catch (err: any) {
      const msg = err.message || "Visual Engine Failure";
      setError(msg);
      onLog(msg, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    const asset: Asset = {
      id: `vis-${Date.now()}`,
      name: `Synthesis_${Date.now()}.png`,
      data: result,
      mimeType: 'image/png'
    };
    onAssetGenerated(asset);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[110] flex items-center justify-center font-mono p-6">
      <div className="w-full max-w-5xl bg-white border-2 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] flex flex-col md:flex-row overflow-hidden h-[80vh]">
        <div className="w-full md:w-1/2 p-10 border-r-2 border-black flex flex-col gap-8 bg-neutral-50 overflow-y-auto">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black">Visual Lab</h2>
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-[0.3em]">Synthesis_Core_v1.0</span>
            </div>
            <button onClick={onClose} className="text-black hover:rotate-90 transition-transform">
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest block text-neutral-500">Prompt_Input</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the neural projection in detail..."
              className="w-full h-40 p-4 border-2 border-black text-xs font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all resize-none text-black"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest block text-neutral-500">Dimensions</label>
            <div className="flex flex-wrap gap-2">
              {ratios.map(r => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`px-4 py-2 text-[10px] font-black border-2 transition-all ${
                    aspectRatio === r ? 'bg-black text-white border-black' : 'bg-white text-black border-neutral-200 hover:border-black'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-8">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 text-red-500 text-[10px] font-black uppercase leading-tight">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={`w-full py-5 text-[12px] font-black uppercase tracking-[0.5em] transition-all border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${
                isGenerating ? 'bg-neutral-100 text-neutral-400' : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {isGenerating ? 'Computing Pixels...' : 'Synthesize Visual'}
            </button>
          </div>
        </div>

        <div className="w-full md:w-1/2 bg-neutral-200 relative flex items-center justify-center overflow-hidden">
          {isGenerating && (
            <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4">
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Rendering Matrix...</span>
            </div>
          )}

          {!result && !isGenerating && (
            <div className="text-center opacity-20 flex flex-col items-center gap-4">
              <i className="fas fa-image text-8xl text-black"></i>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black">Ready_For_Projection</span>
            </div>
          )}

          {result && (
            <div className="w-full h-full flex flex-col p-8">
              <div className="flex-1 border-2 border-black bg-white shadow-2xl relative group overflow-hidden">
                <img src={result} alt="Generated" className="w-full h-full object-contain" />
              </div>
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 py-4 border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all bg-white text-black"
                >
                  Discard
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all border-2 border-black"
                >
                  Inject To Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualGenerator;