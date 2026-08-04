/**
 * src/components/ThreeBackground.tsx
 * OHIMS Uganda — Intuitive 3D Medical Constellation & Health Shield Background Canvas
 * Powered by Three.js with mouse cursor interactivity, ambient teal/navy floating particles,
 * and high-performance RAF loop.
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

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Particle System (Medical Constellation / Floating Nodes)
    const particleCount = window.innerWidth < 768 ? 120 : 250;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    // Color palette: Teal (#0D9488), Cyan (#06B6D4), Emerald (#10B981)
    const tealColor = new THREE.Color(0x0d9488);
    const cyanColor = new THREE.Color(0x06b6d4);
    const emeraldColor = new THREE.Color(0x10b981);
    const palette = [tealColor, cyanColor, emeraldColor];

    for (let i = 0; i < particleCount; i++) {
      // Spread in a spherical space
      const radius = 25 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      scales[i] = Math.random() * 2 + 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Shader / Material
    const pMaterial = new THREE.PointsMaterial({
      size: 0.75,
      vertexColors: true,
      transparent: true,
      opacity: theme === 'dark' ? 0.65 : 0.35,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, pMaterial);
    scene.add(particles);

    // 4. DNA Double Helix Constellation Mesh
    const helixGroup = new THREE.Group();
    const strandCount = 40;
    const helixRadius = 8;
    const helixHeight = 35;
    const helixGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const helixMat1 = new THREE.MeshBasicMaterial({ color: 0x0d9488, transparent: true, opacity: 0.7 });
    const helixMat2 = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 });

    for (let i = 0; i < strandCount; i++) {
      const y = (i / strandCount) * helixHeight - helixHeight / 2;
      const angle = (i / strandCount) * Math.PI * 6;

      // Node 1
      const x1 = Math.cos(angle) * helixRadius;
      const z1 = Math.sin(angle) * helixRadius;
      const node1 = new THREE.Mesh(helixGeometry, helixMat1);
      node1.position.set(x1, y, z1);
      helixGroup.add(node1);

      // Node 2 (Opposite)
      const x2 = Math.cos(angle + Math.PI) * helixRadius;
      const z2 = Math.sin(angle + Math.PI) * helixRadius;
      const node2 = new THREE.Mesh(helixGeometry, helixMat2);
      node2.position.set(x2, y, z2);
      helixGroup.add(node2);

      // Connecting rungs every 3 nodes
      if (i % 3 === 0) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x1, y, z1),
          new THREE.Vector3(x2, y, z2),
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x0d9488, transparent: true, opacity: 0.25 });
        const line = new THREE.Line(lineGeo, lineMat);
        helixGroup.add(line);
      }
    }

    helixGroup.position.set(18, 0, -10);
    scene.add(helixGroup);

    // 5. Mouse Parallax & Interactivity
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 6. Window Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse easing
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Rotate particle cloud
      particles.rotation.y = elapsedTime * 0.03 + targetX;
      particles.rotation.x = elapsedTime * 0.01 + targetY;

      // Rotate DNA Helix
      helixGroup.rotation.y = elapsedTime * 0.15 + targetX;
      helixGroup.rotation.z = Math.sin(elapsedTime * 0.2) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      pMaterial.dispose();
      renderer.dispose();
    };
  }, [theme]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-80"
      aria-hidden="true"
    />
  );
}
