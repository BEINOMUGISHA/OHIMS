/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Heart, 
  Activity, 
  ShieldAlert, 
  TrendingUp, 
  Plus, 
  Brain, 
  Zap, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface HologramDashboardProps {
  onRefreshData?: () => void;
}

export default function MedicalHologramDashboard({ onRefreshData }: HologramDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<'heart' | 'head' | 'spine' | 'joints' | 'all'>('all');
  
  // Real-time medical simulation values
  const [heartRate, setHeartRate] = useState(72);
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [bodyTemp, setBodyTemp] = useState(36.6);
  const [activeAlerts, setActiveAlerts] = useState<string[]>([]);
  const [ecgPoints, setEcgPoints] = useState<number[]>(Array(40).fill(50));

  // Pulse simulation for heart rate and ECG
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate heart rate slight fluctuation
      const baseHr = activeRegion === 'heart' ? 95 : 72;
      const hr = Math.round(baseHr + (Math.random() * 6 - 3));
      setHeartRate(hr);

      // Simulate body temp fluctuation
      setBodyTemp(parseFloat((36.5 + Math.random() * 0.3).toFixed(1)));

      // Simulate ECG heart beat wave
      setEcgPoints(prev => {
        const next = [...prev.slice(1)];
        // Generate heart wave components: QRS complex
        const idx = Math.floor(Math.random() * 10);
        if (idx === 0) {
          next.push(20); // P wave
        } else if (idx === 1) {
          next.push(10); // R wave spike
        } else if (idx === 2) {
          next.push(90); // S wave drop
        } else {
          next.push(50 + (Math.random() * 4 - 2)); // baseline
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [activeRegion]);

  // Adjust alert logs based on activeRegion selection
  useEffect(() => {
    if (activeRegion === 'heart') {
      setActiveAlerts([
        'Cardiovascular SLA Check: Claim ID CLM-9912 approved automatically.',
        'Low Claim Limit Bypass: Minor ECG triage resolved.'
      ]);
    } else if (activeRegion === 'head') {
      setActiveAlerts([
        'Neurology Diagnostics: High SLA processing queue (2.1s).',
        'Accreditation Alert: Norvik Lab scans verified.'
      ]);
    } else if (activeRegion === 'spine') {
      setActiveAlerts([
        'Orthopedic Therapy Claim: Pending provider review.',
        'Spine MRI: Flagged unusual limit ceiling check.'
      ]);
    } else if (activeRegion === 'joints') {
      setActiveAlerts([
        'Rheumatology Consultation: Case Medical Centre.',
        'Accreditation status active for joint orthopedics.'
      ]);
    } else {
      setActiveAlerts([
        'System Status: All active insurance policies fully synchronized.',
        'SLA Triage: 98.4% of claims processed within 5-day window.'
      ]);
    }
  }, [activeRegion]);

  // Three.js Scene Setup and Animation Loop
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Scene dimensions
    const width = container.clientWidth;
    const height = container.clientHeight || 550;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1628, 0.08);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    camera.lookAt(0, 0.8, 0);

    // Group to hold the entire hologram rig
    const hologramGroup = new THREE.Group();
    scene.add(hologramGroup);

    // 1. Procedural Wireframe Human Body meshes
    const bodyColor = 0x00f0ff;
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: bodyColor,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });

    const bodyGroup = new THREE.Group();
    hologramGroup.add(bodyGroup);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const head = new THREE.Mesh(headGeo, bodyMaterial);
    head.position.y = 1.7;
    bodyGroup.add(head);

    // Torso
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.22, 0.85, 10);
    const torso = new THREE.Mesh(torsoGeo, bodyMaterial);
    torso.position.y = 0.95;
    bodyGroup.add(torso);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8);
    const neck = new THREE.Mesh(neckGeo, bodyMaterial);
    neck.position.y = 1.425;
    bodyGroup.add(neck);

    // Left Arm
    const leftArmGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.7, 8);
    const leftArm = new THREE.Mesh(leftArmGeo, bodyMaterial);
    leftArm.position.set(-0.55, 1.05, 0);
    leftArm.rotation.z = Math.PI / 10;
    bodyGroup.add(leftArm);

    // Right Arm
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.55;
    rightArm.rotation.z = -Math.PI / 10;
    bodyGroup.add(rightArm);

    // Left Leg
    const leftLegGeo = new THREE.CylinderGeometry(0.14, 0.08, 0.95, 8);
    const leftLeg = new THREE.Mesh(leftLegGeo, bodyMaterial);
    leftLeg.position.set(-0.2, 0.2, 0);
    bodyGroup.add(leftLeg);

    // Right Leg
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.2;
    bodyGroup.add(rightLeg);

    // Spine Line (Glowing core)
    const spinePoints = [
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(0, 0.6, -0.05),
      new THREE.Vector3(0, 1.0, -0.05),
      new THREE.Vector3(0, 1.4, 0)
    ];
    const spineGeo = new THREE.BufferGeometry().setFromPoints(spinePoints);
    const spineMat = new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 });
    const spine = new THREE.Line(spineGeo, spineMat);
    bodyGroup.add(spine);

    // 2. Holographic Projector Base Platform
    const baseGroup = new THREE.Group();
    hologramGroup.add(baseGroup);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      wireframe: true
    });

    const baseRing1 = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 32), ringMat);
    baseRing1.rotation.x = Math.PI / 2;
    baseRing1.position.y = -0.3;
    baseGroup.add(baseRing1);

    const baseRing2 = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.75, 24), ringMat);
    baseRing2.rotation.x = Math.PI / 2;
    baseRing2.position.y = -0.3;
    baseGroup.add(baseRing2);

    // Glowing Light Cylinder Beam
    const beamGeo = new THREE.CylinderGeometry(0.9, 0.9, 2.5, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.95;
    baseGroup.add(beam);

    // 3. Upward Drifting Particles (Dust system)
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Procedural distribution in a cylinder around the body
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.1 + Math.random() * 0.95;
      particlePositions[i] = Math.cos(angle) * radius;
      particlePositions[i + 1] = -0.3 + Math.random() * 2.3; // y height
      particlePositions[i + 2] = Math.sin(angle) * radius;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.025,
      transparent: true,
      opacity: 0.6,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    hologramGroup.add(particleSystem);

    // 4. Glowing Medical Diagnostics hotspots (Interactive Spheres)
    const hotspotGroup = new THREE.Group();
    hologramGroup.add(hotspotGroup);

    // Hotspot maker helper
    const makeHotspot = (color: number, size: number, y: number, x = 0, z = 0.1) => {
      const geo = new THREE.SphereGeometry(size, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      return mesh;
    };

    const heartHotspot = makeHotspot(0xec4899, 0.065, 1.1, 0, 0.18); // pulsing heart (pink)
    const headHotspot = makeHotspot(0x3b82f6, 0.06, 1.7, 0, 0.15); // brain (blue)
    const spineHotspot = makeHotspot(0xa855f7, 0.06, 0.9, 0, -0.15); // spine (purple)
    const leftJointHotspot = makeHotspot(0x10b981, 0.05, 0.2, -0.2, 0.1); // joints (green)
    const rightJointHotspot = makeHotspot(0x10b981, 0.05, 0.2, 0.2, 0.1); // joints (green)

    hotspotGroup.add(heartHotspot, headHotspot, spineHotspot, leftJointHotspot, rightJointHotspot);

    // 5. Grid helper in 3D
    const gridHelper = new THREE.GridHelper(8, 20, 0x0d9488, 0x022c22);
    gridHelper.position.y = -0.3;
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Lights (even though mesh materials are basic wireframe, Fog & Particle system look great with lighting overlays)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // Animation variables
    let clock = new THREE.Clock();

    const animate = () => {
      const requestID = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Spin entire hologram rig
      hologramGroup.rotation.y = elapsed * 0.2;

      // Spin rings in base base in opposite directions
      baseRing1.rotation.z = elapsed * -0.4;
      baseRing2.rotation.z = elapsed * 0.7;

      // Pulse the heart hotspot
      const pulse = 1.0 + Math.sin(elapsed * 7) * 0.2;
      heartHotspot.scale.set(pulse, pulse, pulse);

      // Pulse head and spine glow slightly
      const brainPulse = 1.0 + Math.sin(elapsed * 2) * 0.1;
      headHotspot.scale.set(brainPulse, brainPulse, brainPulse);
      spineHotspot.scale.set(brainPulse, brainPulse, brainPulse);

      // Dynamic color highlighting based on state
      if (activeRegion === 'heart') {
        bodyMaterial.color.setHex(0xec4899); // Pink
        beamMat.color.setHex(0xec4899);
      } else if (activeRegion === 'head') {
        bodyMaterial.color.setHex(0x3b82f6); // Blue
        beamMat.color.setHex(0x3b82f6);
      } else if (activeRegion === 'spine') {
        bodyMaterial.color.setHex(0xa855f7); // Purple
        beamMat.color.setHex(0xa855f7);
      } else if (activeRegion === 'joints') {
        bodyMaterial.color.setHex(0x10b981); // Green
        beamMat.color.setHex(0x10b981);
      } else {
        bodyMaterial.color.setHex(bodyColor); // Cyan/Default
        beamMat.color.setHex(bodyColor);
      }

      // Animate drifting particles upward
      const positions = particleSystem.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.005; // Move up
        if (positions[i] > 2.0) {
          positions[i] = -0.3; // reset to bottom circular platform
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      // Wave-breathing human body wireframe effect
      bodyGroup.position.y = Math.sin(elapsed * 1.5) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resizing
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 550;
      
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [activeRegion]);

  return (
    <div className="w-full bg-[#0a1628] rounded-3xl border border-[#1e293b]/70 overflow-hidden relative font-mono shadow-2xl p-6 text-[#94a3b8]">
      
      {/* Dynamic Background Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(13,148,136,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#0f172a] pb-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            <h2 className="text-lg font-bold tracking-wider text-white uppercase flex items-center gap-2">
              <Zap className="h-5 w-5 text-teal-400" />
              OHIMS 3D Diagnostic Hologram Triage
            </h2>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">Biometric Diagnostics & Claims Mapping Simulator</p>
        </div>
        <div className="flex space-x-2 mt-3 sm:mt-0">
          <button 
            onClick={() => setActiveRegion('all')}
            className={`px-3 py-1 text-xs rounded border transition-all ${activeRegion === 'all' ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.3)]' : 'border-[#1e293b] hover:bg-slate-900/60'}`}
          >
            System Reset
          </button>
        </div>
      </div>

      {/* THREE JS VIEWPORT & OVERLAY GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* LEFT FLOATING GLASS PANEL */}
        <div className="col-span-1 lg:col-span-3 flex flex-col space-y-4">
          
          {/* Diagnostic Hotspot Selectors */}
          <div className="bg-[#0b1329]/80 backdrop-blur-md rounded-2xl border border-[#1e293b]/50 p-4 shadow-lg">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3 border-b border-[#0f172a] pb-2 flex items-center gap-1.5">
              <Brain className="h-4 w-4" />
              Triage Hotspots
            </h3>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => setActiveRegion('head')}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${activeRegion === 'head' ? 'bg-blue-500/10 border-blue-500/40 text-blue-300' : 'bg-slate-950/40 border-transparent hover:border-[#1e293b]'}`}
              >
                <span>Head / Neurology</span>
                <span className="h-2 w-2 rounded-full bg-blue-400" />
              </button>
              <button 
                onClick={() => setActiveRegion('heart')}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${activeRegion === 'heart' ? 'bg-pink-500/10 border-pink-500/40 text-pink-300' : 'bg-slate-950/40 border-transparent hover:border-[#1e293b]'}`}
              >
                <span>Heart / Cardiology</span>
                <span className="h-2 w-2 rounded-full bg-pink-400 animate-ping" />
              </button>
              <button 
                onClick={() => setActiveRegion('spine')}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${activeRegion === 'spine' ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' : 'bg-slate-950/40 border-transparent hover:border-[#1e293b]'}`}
              >
                <span>Spine / Orthopedics</span>
                <span className="h-2 w-2 rounded-full bg-purple-400" />
              </button>
              <button 
                onClick={() => setActiveRegion('joints')}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${activeRegion === 'joints' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/40 border-transparent hover:border-[#1e293b]'}`}
              >
                <span>Joints / Rheumatology</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </button>
            </div>
          </div>

          {/* DNA Helix visualization mockup */}
          <div className="bg-[#0b1329]/80 backdrop-blur-md rounded-2xl border border-[#1e293b]/50 p-4 shadow-lg flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3 border-b border-[#0f172a] pb-2">
                Helix Sequence
              </h3>
              <div className="flex justify-between items-center px-2 py-4 h-24 relative overflow-hidden bg-slate-950/40 rounded-xl border border-[#0f172a]">
                {/* Visual helical nodes */}
                <div className="absolute inset-0 flex items-center justify-around opacity-40">
                  <div className="h-12 w-1.5 bg-teal-400/80 rounded animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="h-8 w-1.5 bg-teal-500/80 rounded animate-bounce" style={{ animationDelay: '0.3s' }} />
                  <div className="h-10 w-1.5 bg-teal-400/80 rounded animate-bounce" style={{ animationDelay: '0.5s' }} />
                  <div className="h-6 w-1.5 bg-teal-500/80 rounded animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="h-14 w-1.5 bg-teal-400/80 rounded animate-bounce" style={{ animationDelay: '0.4s' }} />
                  <div className="h-8 w-1.5 bg-teal-500/80 rounded animate-bounce" style={{ animationDelay: '0.6s' }} />
                </div>
                <div className="text-[10px] text-[#64748b] leading-tight select-none">
                  SEQ: ATCG-88219<br />
                  SLA: STABLE 100%<br />
                  GEN: MUTATION FREE
                </div>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-[#475569] leading-relaxed">
              *Real-time procedural visualization of biometric data mapping.
            </div>
          </div>

        </div>

        {/* CENTER 3D CANVAS PORT */}
        <div ref={containerRef} className="col-span-1 lg:col-span-6 bg-slate-950/50 rounded-3xl border border-[#1e293b]/40 relative min-h-[400px] lg:min-h-[550px] overflow-hidden flex flex-col justify-end p-4">
          
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Interactive Floating Status overlays */}
          <div className="relative z-10 w-full flex justify-between items-end">
            <div className="bg-[#0b1329]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1e293b]/70 flex flex-col space-y-1">
              <span className="text-[10px] text-[#64748b]">TRIAGE INDEX</span>
              <span className="text-xs font-bold text-teal-400 tracking-wider">
                {activeRegion === 'all' ? 'GLOBAL MONITOR' : `${activeRegion.toUpperCase()} MAPPING ACTIVE`}
              </span>
            </div>
            <div className="text-[9px] text-[#475569] bg-[#0b1329]/80 backdrop-blur-md px-2 py-1 rounded-lg border border-[#1e293b]/50">
              ROTATION ENABLED: 0.2 RAD/S
            </div>
          </div>

          {/* Hologram Light Emission Overlay (Ambient glowing ring) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* RIGHT FLOATING GLASS PANEL */}
        <div className="col-span-1 lg:col-span-3 flex flex-col space-y-4">
          
          {/* Biometrics Monitor */}
          <div className="bg-[#0b1329]/80 backdrop-blur-md rounded-2xl border border-[#1e293b]/50 p-4 shadow-lg">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3 border-b border-[#0f172a] pb-2 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-pink-400 animate-pulse" />
              Biometrics
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-[#0f172a] flex flex-col justify-between">
                <span className="text-[9px] text-[#64748b]">PULSE RATE</span>
                <span className="text-xl font-bold text-white tracking-tight flex items-baseline">
                  {heartRate} <span className="text-[10px] text-pink-400 ml-1">BPM</span>
                </span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-[#0f172a] flex flex-col justify-between">
                <span className="text-[9px] text-[#64748b]">BLOOD TEMP</span>
                <span className="text-xl font-bold text-white tracking-tight flex items-baseline">
                  {bodyTemp}°C
                </span>
              </div>
            </div>

            {/* ECG waves */}
            <div className="bg-slate-950/60 h-16 rounded-xl border border-[#0f172a] relative overflow-hidden flex items-end px-1 pb-1">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#002a35_1px,transparent_1px),linear-gradient(to_bottom,#002a35_1px,transparent_1px)] bg-[size:0.5rem_0.5rem] opacity-35" />
              <div className="w-full h-full flex items-center justify-around z-10">
                {ecgPoints.map((pt, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-teal-400/80 rounded-full transition-all duration-300"
                    style={{ height: `${pt}%`, opacity: 0.3 + (i / ecgPoints.length) * 0.7 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* SLA Logs / Active claims linked to that region */}
          <div className="bg-[#0b1329]/80 backdrop-blur-md rounded-2xl border border-[#1e293b]/50 p-4 shadow-lg flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3 border-b border-[#0f172a] pb-2 flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                Live Log
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeAlerts.map((alert, idx) => (
                  <div key={idx} className="p-2 bg-slate-950/40 rounded-lg border border-[#0f172a] text-[10px] text-[#94a3b8] leading-relaxed flex items-start space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 mt-1 shrink-0" />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#0f172a] flex justify-between items-center text-[10px] text-[#64748b]">
              <span>STATUS: SECURITY OK</span>
              <span className="text-teal-400">ONLINE</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
