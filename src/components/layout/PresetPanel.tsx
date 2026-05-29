import { useStore } from '@/store/useStore';
import { Monitor } from 'lucide-react';
import { t } from '@/lib/i18n';

export function PresetPanel() {
  const { applyPreset, currentScene, language } = useStore();
  const strings = t[language];
  
  const presets = [
    { id: 'Dumbar Base', name: strings.PRESET_DUMBAR || 'Grey Glass Blocks', desc: strings.PRESET_DUMBAR_DESC || 'Refractive tiles distorting text', scene: 'Dumbar' },
    { id: 'Sonic Topology', name: strings.PRESET_TOPOLOGY || 'Sonic Topology', desc: strings.PRESET_TOPOLOGY_DESC || 'Liquified contour type', scene: 'Topology' },
    { id: 'Liquid Dream', name: strings.PRESET_LIQUID || 'Liquid Dream', desc: strings.PRESET_LIQUID_DESC || 'Slow purple fluid', scene: 'Liquid' },
    { id: 'Chromaflux', name: strings.PRESET_CHROMAFLUX || 'Chromaflux', desc: strings.PRESET_CHROMAFLUX_DESC || 'Thermal liquid river', scene: 'Chromaflux' },
    { id: 'Blue Font', name: strings.PRESET_BLUE_FONT || 'Blue Font', desc: strings.PRESET_BLUE_FONT_DESC || 'Liquid chrome blue typography', scene: 'Blue Font' },
    { id: 'Cyberpunk', name: strings.PRESET_CYBER || 'Cyberpunk', desc: strings.PRESET_CYBER_DESC || 'Neon blue, high glitch', scene: 'Cyber' },
    { id: 'Dark Space', name: strings.PRESET_VOID || 'Dark Space', desc: strings.PRESET_VOID_DESC || 'Monochrome void', scene: 'Void' },
    { id: 'Neon Pulse', name: strings.PRESET_PULSE || 'Neon Pulse', desc: strings.PRESET_PULSE_DESC || 'Aggressive pink bass', scene: 'Pulse' },
    { id: 'Purple', name: strings.PRESET_PURPLE || 'Purple', desc: strings.PRESET_PURPLE_DESC || 'Liquid holographic purple stream', scene: 'Purple' },
  ];

  return (
    <div className="w-full p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 text-white/80">
        <Monitor size={16} className="text-[#a0a0ff]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#e0e0e0]">{strings.VISUAL_TEMPLATES || 'Visual Templates'}</span>
      </div>
      
      <div className="flex flex-col gap-3">
        {presets.map((preset, index) => {
          const isActive = currentScene === preset.scene;
          return (
            <button
              type="button"
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`flex flex-col items-start p-4 rounded-xl transition-all duration-300 pointer-events-auto ${
                isActive
                  ? 'bg-white text-black shadow-[0_4px_30px_rgba(255,255,255,0.15)] scale-[1.02]'
                  : 'bg-[#151515] hover:bg-[#222222] text-white border border-[#2a2a2a]'
              }`}
            >
              <span className={`text-[13px] font-bold tracking-wide ${
                 isActive ? 'text-black' : 'text-[#ffffff]'
              }`}>{index + 1}. {preset.name}</span>
              <span className={`text-[11px] mt-1.5 text-left ${
                 isActive ? 'text-[#666666]' : 'text-[#666666]'
              }`}>{preset.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
