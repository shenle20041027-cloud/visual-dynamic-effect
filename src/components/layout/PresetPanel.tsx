import { useStore } from '@/store/useStore';
import { Monitor } from 'lucide-react';
import { t } from '@/lib/i18n';

export function PresetPanel() {
  const { applyPreset, currentScene, language } = useStore();
  
  const presets = [
    { id: 'Cyberpunk', name: 'Cyberpunk', desc: 'Neon blue, high glitch', scene: 'Cyber' },
    { id: 'Liquid Dream', name: 'Liquid Dream', desc: 'Slow purple fluid', scene: 'Liquid' },
    { id: 'Dark Space', name: 'Dark Space', desc: 'Monochrome void', scene: 'Void' },
    { id: 'Neon Pulse', name: 'Neon Pulse', desc: 'Aggressive pink bass', scene: 'Pulse' },
    { id: 'Dumbar Base', name: 'Studio Dumbar', desc: 'High-contrast kinetic typography', scene: 'Dumbar' },
  ];

  return (
    <div className="w-full p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 text-white/80">
        <Monitor size={16} className="text-[#a0a0ff]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#e0e0e0]">Visual Templates</span>
      </div>
      
      <div className="flex flex-col gap-3">
        {presets.map((preset) => {
          const isActive = currentScene === preset.scene;
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`flex flex-col items-start p-4 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-white text-black shadow-[0_4px_30px_rgba(255,255,255,0.15)] scale-[1.02]'
                  : 'bg-[#151515] hover:bg-[#222222] text-white border border-[#2a2a2a]'
              }`}
            >
              <span className={`text-[13px] font-bold tracking-wide ${
                 isActive ? 'text-black' : 'text-[#ffffff]'
              }`}>{preset.name}</span>
              <span className={`text-[11px] mt-1.5 ${
                 isActive ? 'text-[#666666]' : 'text-[#666666]'
              }`}>{preset.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
