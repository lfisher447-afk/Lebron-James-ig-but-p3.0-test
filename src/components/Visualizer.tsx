import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { VisualizerStyle, ThemePalette } from '../types';

interface VisualizerProps {
  style: VisualizerStyle;
  palette: ThemePalette;
  height?: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({ style, palette, height = 50 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors: Record<ThemePalette, { primary: string; secondary: string; glow: string }> = {
      cyan: { primary: '#48e4ff', secondary: '#097a8e', glow: 'rgba(72, 228, 255, 0.4)' },
      violet: { primary: '#c084fc', secondary: '#6b21a8', glow: 'rgba(192, 132, 252, 0.4)' },
      emerald: { primary: '#34d399', secondary: '#065f46', glow: 'rgba(52, 211, 153, 0.4)' },
      amber: { primary: '#fbbf24', secondary: '#92400e', glow: 'rgba(251, 191, 36, 0.4)' },
      crimson: { primary: '#f87171', secondary: '#991b1b', glow: 'rgba(248, 113, 113, 0.4)' },
    };

    const activeTheme = colors[palette] || colors.cyan;

    const render = () => {
      const data = audioEngine.getFrequencyData();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (style === 'bars') {
        const barCount = 32;
        const barWidth = canvas.width / barCount;
        for (let i = 0; i < barCount; i++) {
          const val = data[i * 2] || 0;
          const barHeight = (val / 255) * canvas.height;

          const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
          grad.addColorStop(0, activeTheme.secondary);
          grad.addColorStop(1, activeTheme.primary);

          ctx.fillStyle = grad;
          ctx.fillRect(i * barWidth + 2, canvas.height - barHeight, barWidth - 4, barHeight);
        }
      } else if (style === 'wave') {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = activeTheme.primary;
        ctx.shadowColor = activeTheme.glow;
        ctx.shadowBlur = 10;

        const sliceWidth = canvas.width / (data.length / 2);
        let x = 0;

        for (let i = 0; i < data.length / 2; i++) {
          const v = (data[i] || 0) / 255.0;
          const y = canvas.height - v * canvas.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else if (style === 'cyber-vu') {
        let total = 0;
        for (let i = 0; i < 30; i++) total += data[i] || 0;
        const avg = total / 30 / 255;
        const ledCount = 20;
        const activeLeds = Math.round(avg * ledCount);

        const ledWidth = canvas.width / ledCount;
        for (let i = 0; i < ledCount; i++) {
          ctx.fillStyle = i < activeLeds ? (i > 15 ? '#ef4444' : activeTheme.primary) : '#14272c';
          ctx.fillRect(i * ledWidth + 2, canvas.height / 2 - 8, ledWidth - 4, 16);
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [style, palette]);

  return <canvas ref={canvasRef} width={280} height={height} className="rounded-lg" />;
};
