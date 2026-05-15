import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Glitch, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { Text } from '@react-three/drei';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { audioEngine } from '@/lib/AudioEngine';
import { useStore } from '@/store/useStore';

// === WEBCAM HOOK ===
function useWebcamTexture() {
  const [video] = useState(() => {
    const v = document.createElement('video');
    v.crossOrigin = 'Anonymous';
    v.playsInline = true;
    v.muted = true;
    return v;
  });
  const [texture] = useState(() => {
    const tex = new THREE.VideoTexture(video);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  });

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        video.srcObject = stream;
        video.play().catch((e) => {
          if (e.name !== 'AbortError') console.warn('Error playing video', e);
        });
      }).catch(err => console.log('Camera access denied or unavailable', err));
    return () => {
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [video]);

  return texture;
}

// === SCENES ===

// 1. VOID SCENE (Deep glowing particles)
const voidVertex = `
  uniform float uTime;
  uniform float uSubBass;
  uniform float uBass;
  uniform float uMid;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Sub-bass causes large vertical wave distortion
    p.y += sin(p.x * 2.0 + uTime) * 1.5 * uSubBass;
    // Bass causes depth expansion
    p.z += cos(p.y * 2.0 + uTime) * 1.5 * uBass;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    // Mids affect particle size
    gl_PointSize = (10.0 + 30.0 * uMid) * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const voidFragment = `
  uniform vec3 uColor;
  uniform float uEnergy;
  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if(r > 1.0) discard;
    float alpha = exp(-r * (3.0 - uEnergy * 2.0));
    gl_FragColor = vec4(uColor * alpha, alpha);
  }
`;

function VoidScene() {
  const { baseColor, speed } = useStore();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions] = useMemo(() => {
    const count = 5000;
    const pos = new Float32Array(count * 3);
    for(let i=0; i<count; i++) {
      pos[i*3] = (Math.random() - 0.5) * 40;
      pos[i*3+1] = (Math.random() - 0.5) * 40;
      pos[i*3+2] = (Math.random() - 0.5) * 40;
    }
    return [pos];
  }, []);

  useFrame((state, delta) => {
    if(!materialRef.current || !pointsRef.current) return;
    const { subBass, bass, mid, energy, beat } = audioEngine.current;
    
    // Beat causes sudden rotation surge
    pointsRef.current.rotation.y += delta * 0.1 * speed * (1 + beat * 5.0 + subBass);
    pointsRef.current.rotation.x += delta * 0.05 * speed * bass;
    
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uSubBass.value = subBass;
    materialRef.current.uniforms.uBass.value = bass;
    materialRef.current.uniforms.uMid.value = mid;
    materialRef.current.uniforms.uEnergy.value = energy;
    materialRef.current.uniforms.uColor.value.set(baseColor);
    
    // Additive scale on beat
    pointsRef.current.scale.setScalar(1.0 + (beat * 0.1));
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial 
        ref={materialRef}
        vertexShader={voidVertex}
        fragmentShader={voidFragment}
        uniforms={{
          uTime: { value: 0 },
          uSubBass: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uEnergy: { value: 0 },
          uColor: { value: new THREE.Color() }
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// 2. LIQUID SCENE (Ultra smooth fbm flows)
const liquidFragment = `
  uniform float uTime;
  uniform float uBass;
  uniform float uLowMid;
  uniform float uEnergy;
  varying vec2 vUv;
  
  float smin(float a, float b, float k) {
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
  }
  
  float sdCircle(vec2 p, float r) { return length(p) - r; }
  
  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
  }
  
  mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= 1.5; // aspect ratio approximation
    
    // Add subtle wave distortion from audio
    p += vec2(sin(p.y * 3.0 + uTime), cos(p.x * 2.0 + uTime)) * (0.02 + uEnergy * 0.05);

    float d = 100.0;
    
    // Blob 1: Center pulsing
    d = smin(d, sdCircle(p - vec2(0.0, 0.0), 0.3 + uBass * 0.1), 0.2);
    
    // Blob 2: Orbiting fast
    vec2 pos2 = vec2(sin(uTime * 1.5), cos(uTime * 1.5)) * 0.5;
    d = smin(d, sdCircle(p - pos2, 0.15 + uLowMid * 0.1), 0.2);
    
    // Blob 3: Figure 8
    vec2 pos3 = vec2(sin(uTime * 0.8) * 0.8, sin(uTime * 1.6) * 0.4);
    d = smin(d, sdBox(p - pos3, vec2(0.2)), 0.3);
    
    // Blob 4: Random drift
    vec2 pos4 = vec2(cos(uTime * 0.5) * 0.6, sin(uTime * 0.7) * 0.6);
    d = smin(d, sdCircle(p - pos4, 0.2), 0.2);

    // Inner Cutout / Negative Space (creates hollow organic shapes like letters)
    float d_hole = sdCircle(p - vec2(sin(uTime), cos(uTime*1.2)) * 0.2, 0.15 + uEnergy*0.1);
    d = max(d, -d_hole); // subtract hole

    // Rendering
    // Background: Mauvey Pink #A8828C
    vec3 bgCol = vec3(0.66, 0.51, 0.55);
    
    // Colors for the shapes
    vec3 innerCol = vec3(0.0, 0.0, 0.0); // Inside is Black
    
    // Stroke / Outlines
    // We want a bright yellow/green core outline, and a purple outer outline
    float outlineWidth = 0.02 + uEnergy * 0.01;
    
    // Create the contour logic
    float fill = smoothstep(0.0, -0.01, d);             // 1 if inside, 0 if outside
    float strokeCore = smoothstep(0.01, -0.01, abs(d) - outlineWidth*0.5); // 1 on the exact boundary
    float strokeOuter = smoothstep(0.04, -0.01, abs(d) - outlineWidth); // slightly wider outer glow
    
    vec3 neonYellow = vec3(0.8, 1.0, 0.0);
    vec3 neonPurple = vec3(0.4, 0.0, 1.0);
    
    vec3 col = mix(bgCol, innerCol, fill);
    
    // Add strokes
    col = mix(col, neonPurple, strokeOuter * 0.8);
    col = mix(col, neonYellow, strokeCore);
    
    gl_FragColor = vec4(col, 1.0);
  }
`;

function LiquidScene() {
  const { speed } = useStore();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame((state) => {
    if(!materialRef.current) return;
    const { bass, lowMid, energy } = audioEngine.current;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * speed;
    materialRef.current.uniforms.uBass.value = bass;
    materialRef.current.uniforms.uLowMid.value = lowMid;
    materialRef.current.uniforms.uEnergy.value = energy;
  });

  return (
    <mesh position={[0,0,-2]} scale={[40, 20, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial 
        ref={materialRef}
        vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
        fragmentShader={liquidFragment}
        uniforms={{
          uTime: { value: 0 },
          uBass: { value: 0 },
          uLowMid: { value: 0 },
          uEnergy: { value: 0 }
        }}
        depthWrite={false}
      />
    </mesh>
  );
}

// 3. CYBER GRID (Perspective lines and glitching geometry)
function CyberScene() {
  const group = useRef<THREE.Group>(null);
  const { speed, baseColor } = useStore();
  
  useFrame((state, delta) => {
    if(!group.current) return;
    const { bass, beat, highMid } = audioEngine.current;
    group.current.position.z = (state.clock.elapsedTime * 5 * speed) % 2;
    group.current.rotation.z += delta * (0.05 + highMid * 0.5);
    group.current.scale.setScalar(1 + bass * 0.1 + beat * 0.2);
  });

  return (
    <group>
      <group ref={group} position={[0,-2,-10]} rotation={[Math.PI/2, 0, 0]}>
        <gridHelper args={[40, 40, baseColor, baseColor]} />
      </group>
      <group position={[0,2,-10]} rotation={[-Math.PI/2, 0, 0]}>
        <gridHelper args={[40, 40, baseColor, baseColor]} />
      </group>
    </group>
  );
}

// 4. HOLOGRAM SCENE (Using Webcam via Shader)
const hologramFragment = `
  uniform sampler2D tCamera;
  uniform float uTime;
  uniform float uBass;
  uniform float uBeat;
  uniform float uTreble;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv;
    // Glitch effect on X based on bass and beat
    if(sin(p.y * 100.0 + uTime) > 0.9) {
      p.x += (sin(uTime * 10.0) * 0.02 * (uBass + uBeat));
    }
    
    vec4 cam = texture2D(tCamera, p);
    float luma = dot(cam.rgb, vec3(0.299, 0.587, 0.114));
    
    // Scanlines driven by treble
    float scanline = sin(vUv.y * 200.0 - uTime * (10.0 + uTreble * 50.0)) * 0.1 + 0.9;
    
    vec3 finalColor = uColor * luma * scanline * (1.0 + uBass * 0.5 + uBeat * 2.0);
    gl_FragColor = vec4(finalColor, min(1.0, luma * 2.0));
  }
`;

function HologramScene() {
  const camTex = useWebcamTexture();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { baseColor } = useStore();

  useFrame((state) => {
    if(!matRef.current) return;
    const { bass, treble, beat } = audioEngine.current;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uBass.value = bass;
    matRef.current.uniforms.uBeat.value = beat;
    matRef.current.uniforms.uTreble.value = treble;
    matRef.current.uniforms.uColor.value.set(baseColor);
  });

  return (
    <mesh position={[0,0,-3]}>
      <planeGeometry args={[16*0.6, 9*0.6]} />
      <shaderMaterial 
        ref={matRef}
        vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
        fragmentShader={hologramFragment}
        uniforms={{
          tCamera: { value: camTex },
          uTime: { value: 0 },
          uBass: { value: 0 },
          uBeat: { value: 0 },
          uTreble: { value: 0 },
          uColor: { value: new THREE.Color() }
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

const TRAIL_COUNT = 12;

function DumbarScene() {
  const { textInput } = useStore();
  const groupRef = useRef<THREE.Group>(null);
  const bgMatRef = useRef<THREE.MeshBasicMaterial>(null);
  
  const historyRef = useRef<any[]>(Array(TRAIL_COUNT).fill(null).map(() => ({ x:0, y:0, scaleX:1, scaleY:1, rotZ:0 })));
  
  const targetState = useRef({ 
    bg: new THREE.Color('#020202'), 
    fg: new THREE.Color('#ffffff'), 
    out: new THREE.Color('#333333'),
    outlineWidth: 0.05
  });

  useFrame((state) => {
    if(!groupRef.current) return;
    const { bass, treble, beat, energy, subBass, highMid } = audioEngine.current;
    
    // Dynamic theme colors inspired by Google Sans Flex / Studio Dumbar
    if (energy > 0.7 && beat > 0.4) {
      targetState.current.bg.set('#00ff3c'); // Intense Green
      targetState.current.fg.set('#000000'); // Black core
      targetState.current.out.set('#ffffff'); // White outline glow
      targetState.current.outlineWidth = 0.15;
    } else if (bass > 0.5 || subBass > 0.5) {
      targetState.current.bg.set('#050000'); // Deep dark pulse
      targetState.current.fg.set('#ffffff');
      targetState.current.out.set('#ff003c'); // Red slit-scan trail
      targetState.current.outlineWidth = 0.08 + (bass * 0.1);
    } else {
      targetState.current.bg.set('#050505');
      targetState.current.fg.set('#ffffff');
      targetState.current.out.set('#222222');
      targetState.current.outlineWidth = 0.05;
    }
    
    if (bgMatRef.current) {
       bgMatRef.current.color.lerp(targetState.current.bg, 0.15);
    }
    
    const time = state.clock.elapsedTime;
    
    const targetScaleX = 1 + (bass * 2.5) + (energy * 1.5) + (beat * 1.0);
    const targetScaleY = 1 + (highMid * 1.0) - (subBass * 0.2) + (beat * 0.5);
    
    // Kinetic wavy motion
    const waveDistortionX = Math.sin(time * 5.0) * (energy + bass) * 0.6;
    const waveDistortionY = Math.cos(time * 3.7) * (energy) * 0.4;
    const rotZ = Math.sin(time * 2.0) * bass * 0.3;
    
    const currentFront = {
      x: waveDistortionX,
      y: waveDistortionY,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      rotZ: rotZ
    };
    
    historyRef.current.unshift(currentFront);
    historyRef.current.pop();
    
    groupRef.current.children.forEach((mesh: any, i: number) => {
      const hist = historyRef.current[i];
      if (!hist) return;
      
      mesh.position.x += (hist.x - mesh.position.x) * 0.4;
      mesh.position.y += (hist.y - mesh.position.y) * 0.4;
      mesh.scale.x += (hist.scaleX - mesh.scale.x) * 0.4;
      mesh.scale.y += (hist.scaleY - mesh.scale.y) * 0.4;
      mesh.rotation.z += (hist.rotZ - mesh.rotation.z) * 0.4;
      
      mesh.position.z = -i * 0.2; 
      
      if (!mesh.color) mesh.color = new THREE.Color();
      if (!mesh.outlineColor) mesh.outlineColor = new THREE.Color();

      if (i === 0) {
        mesh.color.lerp(targetState.current.fg, 0.2);
        mesh.outlineWidth = 0;
      } else {
        mesh.color.lerp(targetState.current.bg, 0.2);
        mesh.outlineColor.lerp(targetState.current.out, 0.2);
        mesh.outlineWidth = targetState.current.outlineWidth;
        mesh.fillOpacity = 1.0;
      }

      if (mesh.sync) mesh.sync();
    });
  });

  const displayText = (textInput || "YOU").toUpperCase();

  return (
    <group>
      <mesh position={[0,0,-20]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial ref={bgMatRef} color="#000" />
      </mesh>
      
      <group ref={groupRef} position={[0, 0, 0]}>
        {new Array(TRAIL_COUNT).fill(0).map((_, i) => (
           <Text
             key={i}
             font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
             fontSize={5}
             letterSpacing={-0.1}
             anchorX="center"
             anchorY="middle"
           >
             {displayText}
           </Text>
        ))}
      </group>
    </group>
  );
}

// === ROUTER ===
function SceneRouter() {
  const { currentScene } = useStore();
  switch(currentScene) {
    case 'Cyber': return <CyberScene />;
    case 'Liquid': return <LiquidScene />;
    case 'Pulse': return <HologramScene />;
    case 'Void': return <VoidScene />;
    case 'Dumbar': return <DumbarScene />;
    default: return <VoidScene />;
  }
}

// === CINEMATIC TYPOGRAPHY ===
function VisualText() {
  const textRef = useRef<THREE.Mesh>(null);
  const { currentScene, textInput, textAnimStyle, textGlow, textSpeed, textReactive, baseColor } = useStore();

  useFrame((state) => {
    if(!textRef.current) return;
    const { bass, treble, beat } = audioEngine.current;
    const t = state.clock.elapsedTime * textSpeed;
    const react = bass * textReactive + (beat * 0.5 * textReactive);

    if(textAnimStyle === 'Cinematic') {
      textRef.current.scale.setScalar(1 + react * 0.2);
      textRef.current.position.y = Math.sin(t) * 0.2;
    } else if (textAnimStyle === 'Glitch') {
      textRef.current.scale.setScalar(1 + react);
      if(Math.random() > 0.8 || beat > 0.5) {
        textRef.current.position.x = (Math.random()-0.5)*0.5 * react;
      } else {
        textRef.current.position.x = 0;
      }
    } else if (textAnimStyle === 'Floating') {
      textRef.current.rotation.z = Math.sin(t * 0.5) * 0.1;
      textRef.current.position.y = Math.sin(t) * 0.5;
      textRef.current.scale.setScalar(1 + (react * 0.1));
    } else if (textAnimStyle === 'Massive') {
      textRef.current.scale.setScalar(4 + react * 2.5);
      textRef.current.position.z = -2 + (beat * 2.0);
    } 
    
    // Adjust material properties dynamically if needed
    const mat = textRef.current.material as THREE.MeshBasicMaterial;
    if(mat && mat.color) {
       mat.color.set(baseColor);
       mat.color.multiplyScalar(textGlow + beat * 2.0);
    }
  });

  if(!textInput || currentScene === 'Dumbar') return null;

  return (
    <Text
      ref={textRef}
      position={[0, 0, 1]}
      fontSize={1}
      font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      anchorX="center"
      anchorY="middle"
      textAlign="center"
      maxWidth={15}
    >
      {textInput.toUpperCase()}
      <meshBasicMaterial transparent opacity={0.9} />
    </Text>
  );
}

// === HIGH-END POST PROCESSING ===
function PostProcessing() {
  const { bloomIntensity, rgbSplitAmount, glitchActive } = useStore();
  const [dynamicBloom, setDynamicBloom] = useState(bloomIntensity);
  const [dynamicSplit, setDynamicSplit] = useState(rgbSplitAmount);

  useFrame(() => {
    const { energy, beat, bass } = audioEngine.current;
    
    // Dynamic bloom
    const targetBloom = bloomIntensity + (energy * 0.5) + (beat * 2.0);
    setDynamicBloom(prev => prev + (targetBloom - prev) * 0.1); 

    // Dynamic Chromatic Aberration
    const targetSplit = rgbSplitAmount + (bass * 0.015) + (beat * 0.03);
    setDynamicSplit(prev => prev + (targetSplit - prev) * 0.2);
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom 
        luminanceThreshold={0.2} 
        luminanceSmoothing={0.9} 
        intensity={dynamicBloom} 
        mipmapBlur
      />
      {glitchActive && (
        <Glitch 
          delay={new THREE.Vector2(0.5, 1.5)} 
          duration={new THREE.Vector2(0.1, 0.3)} 
          strength={new THREE.Vector2(0.3, 1.0)} 
          mode={GlitchMode.SPORADIC}
          ratio={0.85}
        />
      )}
      <ChromaticAberration offset={new THREE.Vector2(dynamicSplit, dynamicSplit)} />
      <Vignette eskil={false} offset={0.1} darkness={1.1} />
    </EffectComposer>
  );
}

export function Visualizer() {
  const { isFullscreen, contrast, brightness, saturation, bgColor } = useStore();
  
  return (
    <div 
      className="absolute inset-0 w-full h-full"
      style={{
        filter: `contrast(${contrast}) brightness(${brightness}) saturate(${saturation})`
      }}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={[bgColor]} />
        <SceneRouter />
        <VisualText />
        <PostProcessing />
      </Canvas>
    </div>
  );
}

