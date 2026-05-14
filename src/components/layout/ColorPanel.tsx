import { useStore } from '@/store/useStore';
import { Palette } from 'lucide-react';

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

export function ColorPanel() {
  const { saturation, contrast, brightness, baseColor, setColorGrading } = useStore();

  const colors = [
    { name: 'Cyber Blue', value: '#00f3ff' },
    { name: 'Neon Purple', value: '#b026ff' },
    { name: 'Acid Green', value: '#39ff14' },
    { name: 'Infrared', value: '#ff003c' },
    { name: 'Monochrome', value: '#ffffff' },
  ];

  return (
    <div className="w-full p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 text-white/80">
        <Palette size={16} className="text-pink-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Color Grading</span>
      </div>
      
      <div className="flex gap-3 flex-wrap mb-2">
        {colors.map((c) => (
          <button
            key={c.value}
            onClick={() => setColorGrading('baseColor', c.value)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${
              baseColor === c.value ? 'border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ backgroundColor: c.value }}
            title={c.name}
          />
        ))}
      </div>

      <div className="pt-2">
        <Slider 
          label="Saturation" 
          value={saturation} 
          onChange={(v: number) => setColorGrading('saturation', v)} 
          max={3} 
        />
        <Slider 
          label="Contrast" 
          value={contrast} 
          onChange={(v: number) => setColorGrading('contrast', v)} 
          max={3} 
        />
        <Slider 
          label="Brightness" 
          value={brightness} 
          onChange={(v: number) => setColorGrading('brightness', v)} 
          max={3} 
        />
      </div>
    </div>
  );
}
