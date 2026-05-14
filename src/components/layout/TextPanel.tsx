import { useStore } from '@/store/useStore';
import { Type } from 'lucide-react';
import { t } from '@/lib/i18n';

const TextSlider = ({ label, value, onChange, min = 0, max = 2, step = 0.01 }: any) => (
  <div className="flex flex-col gap-2 mb-4">
    <div className="flex justify-between text-[10px] uppercase font-bold text-white/40 tracking-widest">
      <span>{label}</span>
      <span className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/5">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-150 transition-all cursor-pointer"
    />
  </div>
);

export function TextPanel() {
  const { language, textInput, textAnimStyle, textGlow, textSpeed, textReactive, setTextEngine, applyPreset } = useStore();
  const i18n = t[language];

  const styles = [
    { id: 'Cinematic', label: 'Cinematic Title' },
    { id: 'Massive', label: 'Massive Typography' },
    { id: 'Glitch', label: 'Cyber Glitch' },
    { id: 'Hologram', label: 'Hologram Text' },
    { id: 'Floating', label: 'Floating Words' },
    { id: 'Beat', label: 'Beat Sync Text' },
  ];

  const handleTextChange = (val: string) => {
    setTextEngine('textInput', val);
    const lower = val.toLowerCase();
    
    if (lower.includes('cyber') || lower.includes('future') || lower.includes('glitch')) {
      applyPreset('Cyberpunk');
    } else if (lower.includes('dream') || lower.includes('ocean') || lower.includes('water')) {
      applyPreset('Liquid Dream');
    } else if (lower.includes('chaos') || lower.includes('rage')) {
      applyPreset('Neon Pulse');
      setTextEngine('textAnimStyle', 'Glitch');
    } else if (lower.includes('space') || lower.includes('void')) {
      applyPreset('Dark Space');
    }
  };

  return (
    <div className="w-full p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 text-white/80">
        <Type size={16} className="text-purple-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest">AI Reactive Text</span>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">
            Drive Visuals via Text
          </label>
          <input 
            type="text" 
            value={textInput}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-[13px] font-mono text-white outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all shadow-inner placeholder:text-white/20"
            placeholder="e.g. Cyber Future..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">
            Typography Style
          </label>
          <div className="relative">
            <select 
              value={textAnimStyle}
              onChange={(e) => setTextEngine('textAnimStyle', e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-[13px] font-mono text-white outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all appearance-none cursor-pointer"
            >
              {styles.map(style => (
                <option key={style.id} value={style.id}>{style.label}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-[10px]">
              ▼
            </div>
          </div>
        </div>

        <div className="pt-2">
          <TextSlider 
            label="Glow Intensity" 
            value={textGlow} 
            onChange={(v: number) => setTextEngine('textGlow', v)} 
            max={5} 
          />
          <TextSlider 
            label="Motion Speed" 
            value={textSpeed} 
            onChange={(v: number) => setTextEngine('textSpeed', v)} 
            max={3} 
          />
          <TextSlider 
            label="Reactive Intensity" 
            value={textReactive} 
            onChange={(v: number) => setTextEngine('textReactive', v)} 
            max={3} 
          />
        </div>
      </div>
    </div>
  );
}
