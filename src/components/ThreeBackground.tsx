/**
 * src/components/ThreeBackground.tsx
 * OHIMS Uganda — Ultra-Premium Holographic 3D Medical Globe & ECG Pulse Engine
 * Features:
 *  - 3D Wireframe Health Globe with glowing latitudinal rings
 *  - Dynamic 3D Heartbeat ECG Pulse Wave Ribbon
 *  - Floating Polyhedral Bio-Cells & Shield Nodes
 *  - Dual Point Lighting engine with specular highlights & mouse interactivity
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  theme?: 'light' | 'dark';
}

export default function ThreeBackground({ theme = 'dark' }: ThreeBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera & Lighting Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 28);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Dynamic Lights
    const ambientLight = new THREE.AmbientLight(0x0a1628, 1.5);
    scene.add(ambientLight);

    const tealLight = new THREE.PointLight(0x0d9488, 8, 50);
    tealLight.position.set(15, 12, 10);
    scene.add(tealLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 6, 50);
    cyanLight.position.set(-15, -10, 8);
    scene.add(cyanLight);

    // 2. Main 3D Holographic Globe Group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // A. Outer Wireframe Globe (National Coverage Net)
    const globeGeo = new THREE.IcosahedronGeometry(7.5, 3);
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      wireframe: true,
      transparent: true,
      opacity: theme === 'dark' ? 0.35 : 0.2,
      roughness: 0.2,
      metalness: 0.8,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    mainGroup.add(globeMesh);

    // B. Inner Core Glowing Sphere
    const coreGeo = new THREE.SphereGeometry(6.2, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x0a1628,
      transparent: true,
      opacity: theme === 'dark' ? 0.85 : 0.4,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    mainGroup.add(coreMesh);

    // C. Orbital Equator Rings (Health Coverage Shield Bands)
    const ringGeo1 = new THREE.TorusGeometry(10.5, 0.08, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: theme === 'dark' ? 0.5 : 0.3,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    mainGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(12, 0.05, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: theme === 'dark' ? 0.4 : 0.2,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    mainGroup.add(ring2);

    // D. 3D ECG Heartbeat Pulse Ribbon
    const ecgPointsCount = 200;
    const ecgPositions = new Float32Array(ecgPointsCount * 3);
    const ecgGeometry = new THREE.BufferGeometry();

    for (let i = 0; i < ecgPointsCount; i++) {
      const theta = (i / ecgPointsCount) * Math.PI * 2;
      const r = 9.2;
      ecgPositions[i * 3] = Math.cos(theta) * r;
      ecgPositions[i * 3 + 1] = Math.sin(theta * 6) * 0.8; // ECG spikes
      ecgPositions[i * 3 + 2] = Math.sin(theta) * r;
    }
    ecgGeometry.setAttribute('position', new THREE.BufferAttribute(ecgPositions, 3));

    const ecgMat = new THREE.LineBasicMaterial({
      color: 0x2dd4bf, // Glowing Teal
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    const ecgLine = new THREE.LineLoop(ecgGeometry, ecgMat);
    ecgLine.rotation.x = Math.PI / 6;
    mainGroup.add(ecgLine);

    // E. Floating 3D Bio-Cell & Shield Nodes (Polyhedral Geometry)
    const nodeGroup = new THREE.Group();
    const nodeCount = 18;
    const nodeGeometries = [
      new THREE.IcosahedronGeometry(0.6, 0),
      new THREE.DodecahedronGeometry(0.5, 0),
      new THREE.OctahedronGeometry(0.7, 0),
    ];
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      metalness: 0.9,
      roughness: 0.1,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });

    const nodesData: { mesh: THREE.Mesh; speed: number; orbitR: number; angle: number; rotAxis: THREE.Vector3 }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const geo = nodeGeometries[i % nodeGeometries.length];
      const mesh = new THREE.Mesh(geo, nodeMaterial);

      const orbitR = 13 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 14;

      mesh.position.set(Math.cos(angle) * orbitR, height, Math.sin(angle) * orbitR);
      nodeGroup.add(mesh);

      nodesData.push({
        mesh,
        speed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
        orbitR,
        angle,
        rotAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
      });
    }
    mainGroup.add(nodeGroup);

    // Position main group slightly right on desktop, centered on mobile
    mainGroup.position.set(window.innerWidth > 1024 ? 8 : 0, 0, -2);

    // 3. Mouse & Touch Parallax Controls
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.0008;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.0008;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 4. Responsive Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      mainGroup.position.x = window.innerWidth > 1024 ? 8 : 0;
    };

    window.addEventListener('resize', handleResize);

    // 5. High Performance Animation Loop
    let animFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth mouse easing
      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;

      // Rotate Globe & Rings
      globeMesh.rotation.y = time * 0.08 + targetX;
      globeMesh.rotation.x = Math.sin(time * 0.05) * 0.1 + targetY;

      ring1.rotation.z = time * 0.12;
      ring2.rotation.z = -time * 0.09;

      // Pulsing ECG Wave animation
      ecgLine.rotation.z = time * 0.2 + targetX;
      const ecgPositionsAttr = ecgGeometry.attributes.position as THREE.BufferAttribute;
      const array = ecgPositionsAttr.array as Float32Array;

      for (let i = 0; i < ecgPointsCount; i++) {
        const theta = (i / ecgPointsCount) * Math.PI * 2;
        // Pulse heartbeat wave amplitude
        const pulse = Math.sin(theta * 8 + time * 4) * Math.cos(time * 2);
        array[i * 3 + 1] = Math.sin(theta * 6) * 0.8 + pulse * 0.4;
      }
      ecgPositionsAttr.needsUpdate = true;

      // Animate Floating Bio-Nodes
      nodesData.forEach((node) => {
        node.angle += node.speed;
        node.mesh.position.x = Math.cos(node.angle) * node.orbitR;
        node.mesh.position.z = Math.sin(node.angle) * node.orbitR;
        node.mesh.rotateOnAxis(node.rotAxis, 0.015);
      });

      // Move point lights gently with mouse
      tealLight.position.x = 15 + targetX * 20;
      tealLight.position.y = 12 + targetY * 20;

      renderer.render(scene, camera);
    };

    animate();

    // Clean up resources on unmount
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      globeGeo.dispose();
      globeMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      ecgGeometry.dispose();
      ecgMat.dispose();
      nodeGeometries.forEach((g) => g.dispose());
      nodeMaterial.dispose();
      renderer.dispose();
    };
  }, [theme]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-90 transition-opacity duration-500"
      aria-hidden="true"
    />
  );
}
