"use client";

import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const PARTICLE_DENSITY = 12000;
const MAX_PARTICLE_COUNT = 120;
const LINK_DISTANCE = 130;
const MOUSE_RADIUS = 180;
const BASE_SPEED = 0.35;

export const InteractiveBackground = (): ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    const mouse = { x: -9999, y: -9999 };

    const createParticles = (): void => {
      const count = Math.min(
        Math.floor((width * height) / PARTICLE_DENSITY),
        MAX_PARTICLE_COUNT,
      );
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * BASE_SPEED * 2,
        vy: (Math.random() - 0.5) * BASE_SPEED * 2,
        radius: Math.random() * 1.8 + 0.8,
      }));
    };

    const resize = (): void => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createParticles();
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };

    const handlePointerLeave = (): void => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const updateParticle = (particle: Particle): void => {
      // 마우스 주변 입자를 부드럽게 밀어내는 인터랙션
      const dx = particle.x - mouse.x;
      const dy = particle.y - mouse.y;
      const distance = Math.hypot(dx, dy);

      if (distance < MOUSE_RADIUS && distance > 0) {
        const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
        particle.vx += (dx / distance) * force * 0.6;
        particle.vy += (dy / distance) * force * 0.6;
      }

      // 속도 감쇠로 원래의 느린 흐름으로 복귀
      particle.vx *= 0.96;
      particle.vy *= 0.96;

      const speed = Math.hypot(particle.vx, particle.vy);
      if (speed < BASE_SPEED * 0.5) {
        particle.vx += (Math.random() - 0.5) * 0.08;
        particle.vy += (Math.random() - 0.5) * 0.08;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;
    };

    const drawLinks = (): void => {
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.hypot(dx, dy);

          if (distance < LINK_DISTANCE) {
            const opacity = (1 - distance / LINK_DISTANCE) * 0.35;
            ctx.strokeStyle = `rgba(165, 180, 252, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const render = (): void => {
      ctx.clearRect(0, 0, width, height);

      drawLinks();

      particles.forEach((particle) => {
        updateParticle(particle);
        ctx.fillStyle = "rgba(199, 210, 254, 0.9)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    resize();
    render();

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
};
