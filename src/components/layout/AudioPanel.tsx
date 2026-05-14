import { useStore } from '@/store/useStore';
import { Settings2, Volume2, Activity } from 'lucide-react';
import { t } from '@/lib/i18n';

const Slider = ({ label, value, onChange, min = 0, max = 2, step = 0.01 }: any) => (
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

export function AudioPanel() {
  const { inputGain, bassReact, midReact, trebReact, setAudioControl, language } = useStore();
  const i18n = t[language];

  return (
    <div className="w-full p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 text-white/80">
        <Activity size={16} className="text-green-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest">{i18n.AUDIO_ENGINE}</span>
      </div>
      
      <div className="pt-2">
        <Slider 
          label={i18n.INPUT_GAIN} 
          value={inputGain} 
          onChange={(v: number) => setAudioControl('inputGain', v)} 
          max={3} 
        />
        <Slider 
          label={i18n.BASS_IMPACT} 
          value={bassReact} 
          onChange={(v: number) => setAudioControl('bassReact', v)} 
          max={3} 
        />
        <Slider 
          label={i18n.MID_SHAPE} 
          value={midReact} 
          onChange={(v: number) => setAudioControl('midReact', v)} 
          max={3} 
        />
        <Slider 
          label={i18n.TREBLE_SPARK} 
          value={trebReact} 
          onChange={(v: number) => setAudioControl('trebReact', v)} 
          max={3} 
        />
      </div>
    </div>
  );
}
