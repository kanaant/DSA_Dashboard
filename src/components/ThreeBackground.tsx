"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Parameters
    const particleCount = 75;
    const connectionDistance = 90;
    const particleSpeed = 0.35;
    const mouseRadius = 150;
    const mouseGravity = 0.08;

    // Screen dimensions
    let width = container.clientWidth;
    let height = container.clientHeight;

    // Mouse Tracking (shared coordinate systems)
    const mouse = { x: 9999, y: 9999 };
    const targetMouse = { x: 9999, y: 9999 };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse.x = event.clientX - rect.left;
      targetMouse.y = event.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      targetMouse.x = 9999;
      targetMouse.y = 9999;
    };

    window.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Flag to determine active mode
    let isWebGL = true;

    // Three.js Objects
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let pointCloud: THREE.Points | null = null;
    let lineMesh: THREE.LineSegments | null = null;
    let particleGeometry: THREE.BufferGeometry | null = null;
    let particleMaterial: THREE.PointsMaterial | null = null;
    let lineGeometry: THREE.BufferGeometry | null = null;
    let lineMaterial: THREE.LineBasicMaterial | null = null;

    const particlesData: Array<{
      velocity: THREE.Vector3;
      numConnections: number;
    }> = [];

    let positions: Float32Array;
    let colors: Float32Array;
    let linePositions: Float32Array;
    let lineColors: Float32Array;

    const rWidth = 600;
    const rHeight = 450;
    const rDepth = 400;

    // Canvas 2D Fallback Objects
    let ctx2d: CanvasRenderingContext2D | null = null;
    const particles2D: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      glowColor: string;
    }> = [];

    const colors2D = [
      { fill: "#8b5cf6", glow: "rgba(139, 92, 246, 0.4)" }, // Purple
      { fill: "#00d4ff", glow: "rgba(0, 212, 255, 0.4)" },  // Cyan
      { fill: "#5b3cc4", glow: "rgba(91, 60, 196, 0.3)" }   // Indigo
    ];

    try {
      // 1. Attempt to initialize WebGL
      scene = new THREE.Scene();
      scene.background = null;

      camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
      camera.position.z = 400;

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        failIfMajorPerformanceCaveat: false, // Don't block VM contexts unnecessarily
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Initialise particle arrays
      positions = new Float32Array(particleCount * 3);
      colors = new Float32Array(particleCount * 3);

      const primaryColor = new THREE.Color("#8b5cf6");
      const accentColor = new THREE.Color("#00d4ff");
      const mixedColor = new THREE.Color("#5b3cc4");

      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * rWidth - rWidth / 2;
        const y = Math.random() * rHeight - rHeight / 2;
        const z = Math.random() * rDepth - rDepth / 2;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const rand = Math.random();
        const color = rand < 0.4 ? primaryColor : rand < 0.8 ? accentColor : mixedColor;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        particlesData.push({
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * particleSpeed,
            (Math.random() - 0.5) * particleSpeed,
            (Math.random() - 0.5) * particleSpeed
          ),
          numConnections: 0,
        });
      }

      particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      // Circular glowing dot texture
      const createCircleTexture = () => {
        const size = 64;
        const canvasTex = document.createElement("canvas");
        canvasTex.width = size;
        canvasTex.height = size;
        const ctx = canvasTex.getContext("2d");
        if (ctx) {
          const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
          );
          gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
          gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
          gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
          gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, size, size);
        }
        return new THREE.CanvasTexture(canvasTex);
      };

      particleMaterial = new THREE.PointsMaterial({
        size: 4.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        map: createCircleTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      pointCloud = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(pointCloud);

      // Line network structures
      linePositions = new Float32Array(particleCount * particleCount * 3);
      lineColors = new Float32Array(particleCount * particleCount * 3);

      lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

      lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lineMesh);

    } catch (e) {
      // 2. Fail gracefully and fall back to Canvas 2D
      console.warn("WebGL initialization failed, falling back to 2D Canvas:", e);
      isWebGL = false;

      ctx2d = canvas.getContext("2d");
      
      // Seed 2D particles
      for (let i = 0; i < particleCount; i++) {
        const colorSet = colors2D[Math.floor(Math.random() * colors2D.length)];
        particles2D.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * particleSpeed * 2.4,
          vy: (Math.random() - 0.5) * particleSpeed * 2.4,
          radius: Math.random() * 2 + 1.2,
          color: colorSet.fill,
          glowColor: colorSet.glow,
        });
      }
    }

    // Animation Loop
    let animationFrameId: number;

    const animateWebGL = () => {
      if (!scene || !camera || !renderer || !pointCloud || !lineMesh || !particleGeometry || !lineGeometry) return;

      const positionsAttr = pointCloud.geometry.attributes.position as THREE.BufferAttribute;
      const positionsArr = positionsAttr.array as Float32Array;

      // Mouse tracking interpolation
      const currentMouse = new THREE.Vector2(9999, 9999);
      if (targetMouse.x !== 9999) {
        if (mouse.x === 9999) {
          mouse.x = targetMouse.x;
          mouse.y = targetMouse.y;
        } else {
          mouse.x += (targetMouse.x - mouse.x) * 0.1;
          mouse.y += (targetMouse.y - mouse.y) * 0.1;
        }
        // Normalize coordinates for Three.js camera unproject
        currentMouse.x = (mouse.x / width) * 2 - 1;
        currentMouse.y = -(mouse.y / height) * 2 + 1;
      } else {
        mouse.x = 9999;
        mouse.y = 9999;
      }

      const mouse3D = new THREE.Vector3();
      if (targetMouse.x !== 9999) {
        mouse3D.set(currentMouse.x, currentMouse.y, 0.5).unproject(camera);
      }

      let vertexIndex = 0;
      let colorIndex = 0;

      for (let i = 0; i < particleCount; i++) {
        const xIdx = i * 3;
        const yIdx = i * 3 + 1;
        const zIdx = i * 3 + 2;

        let px = positionsArr[xIdx];
        let py = positionsArr[yIdx];
        let pz = positionsArr[zIdx];

        const data = particlesData[i];

        // Velocity drift
        px += data.velocity.x;
        py += data.velocity.y;
        pz += data.velocity.z;

        // Bounce checks
        if (px < -rWidth / 2 || px > rWidth / 2) data.velocity.x = -data.velocity.x;
        if (py < -rHeight / 2 || py > rHeight / 2) data.velocity.y = -data.velocity.y;
        if (pz < -rDepth / 2 || pz > rDepth / 2) data.velocity.z = -data.velocity.z;

        // Interactive mouse distortion
        if (targetMouse.x !== 9999) {
          const pVec = new THREE.Vector3(px, py, pz).project(camera);
          const screenPos = new THREE.Vector2(pVec.x, pVec.y);
          const dist = screenPos.distanceTo(currentMouse);

          if (dist < 0.45) {
            const pullStrength = (1.0 - dist / 0.45) * mouseGravity;
            const diff = new THREE.Vector3(mouse3D.x - px, mouse3D.y - py, 0);
            diff.normalize().multiplyScalar(pullStrength * 4);
            px += diff.x;
            py += diff.y;
          }
        }

        positionsArr[xIdx] = px;
        positionsArr[yIdx] = py;
        positionsArr[zIdx] = pz;
      }

      // Re-map line networks
      for (let i = 0; i < particleCount; i++) {
        const p1 = new THREE.Vector3(
          positionsArr[i * 3],
          positionsArr[i * 3 + 1],
          positionsArr[i * 3 + 2]
        );

        for (let j = i + 1; j < particleCount; j++) {
          const p2 = new THREE.Vector3(
            positionsArr[j * 3],
            positionsArr[j * 3 + 1],
            positionsArr[j * 3 + 2]
          );

          const dist = p1.distanceTo(p2);

          if (dist < connectionDistance) {
            linePositions[vertexIndex++] = p1.x;
            linePositions[vertexIndex++] = p1.y;
            linePositions[vertexIndex++] = p1.z;

            linePositions[vertexIndex++] = p2.x;
            linePositions[vertexIndex++] = p2.y;
            linePositions[vertexIndex++] = p2.z;

            const alpha = 1.0 - dist / connectionDistance;
            
            const p1Color = new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
            const p2Color = new THREE.Color(colors[j * 3], colors[j * 3 + 1], colors[j * 3 + 2]);

            lineColors[colorIndex++] = p1Color.r * alpha * 0.035;
            lineColors[colorIndex++] = p1Color.g * alpha * 0.035;
            lineColors[colorIndex++] = p1Color.b * alpha * 0.035;

            lineColors[colorIndex++] = p2Color.r * alpha * 0.035;
            lineColors[colorIndex++] = p2Color.g * alpha * 0.035;
            lineColors[colorIndex++] = p2Color.b * alpha * 0.035;
          }
        }
      }

      positionsAttr.needsUpdate = true;
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions.slice(0, vertexIndex), 3));
      lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors.slice(0, colorIndex), 3));
      
      pointCloud.rotation.y += 0.0006;
      lineMesh.rotation.y += 0.0006;

      renderer.render(scene, camera);
    };

    const animateCanvas2D = () => {
      if (!ctx2d) return;

      ctx2d.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      if (targetMouse.x !== 9999) {
        if (mouse.x === 9999) {
          mouse.x = targetMouse.x;
          mouse.y = targetMouse.y;
        } else {
          mouse.x += (targetMouse.x - mouse.x) * 0.1;
          mouse.y += (targetMouse.y - mouse.y) * 0.1;
        }
      } else {
        mouse.x = 9999;
        mouse.y = 9999;
      }

      // Draw active lines first (so they are rendered behind particles)
      for (let i = 0; i < particleCount; i++) {
        const p1 = particles2D[i];
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles2D[j];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = (1.0 - dist / connectionDistance) * 0.035;
            ctx2d.beginPath();
            ctx2d.moveTo(p1.x, p1.y);
            ctx2d.lineTo(p2.x, p2.y);
            ctx2d.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx2d.lineWidth = 0.85;
            ctx2d.stroke();
          }
        }
      }

      // Update and draw particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles2D[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Screen margins bounce
        if (p.x < 0 || p.x > width) p.vx = -p.vx;
        if (p.y < 0 || p.y > height) p.vy = -p.vy;

        // Interactive mouse hover push/pull
        if (mouse.x !== 9999) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseRadius) {
            const pullForce = (1.0 - dist / mouseRadius) * mouseGravity * 4.5;
            // Draw node slightly closer to mouse vector coordinates
            p.x += (dx / dist) * pullForce;
            p.y += (dy / dist) * pullForce;
          }
        }

        // Draw particle dot with soft glow matching darksenses
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx2d.fillStyle = p.color;
        
        ctx2d.shadowBlur = 6;
        ctx2d.shadowColor = p.color;
        ctx2d.fill();
      }

      // Reset shadows for next iterations
      ctx2d.shadowBlur = 0;
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isWebGL) {
        animateWebGL();
      } else {
        animateCanvas2D();
      }
    };

    animate();

    // Responsive Canvas Resizer
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;

      if (isWebGL && camera && renderer) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      } else {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Cleanup Loop
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      resizeObserver.disconnect();

      if (renderer) renderer.dispose();
      if (particleGeometry) particleGeometry.dispose();
      if (particleMaterial) particleMaterial.dispose();
      if (lineGeometry) lineGeometry.dispose();
      if (lineMaterial) lineMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-[#050816]"
      style={{
        background: `
          radial-gradient(circle at 40% 20%, rgba(139, 92, 246, 0.15), transparent 45%),
          radial-gradient(circle at 80% 80%, rgba(0, 212, 255, 0.12), transparent 40%),
          linear-gradient(180deg, #02040a 0%, #050816 100%)
        `,
      }}
    >
      {/* Mesh grid overlay for tech control room look */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      
      {/* Dynamic Background Canvas */}
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
