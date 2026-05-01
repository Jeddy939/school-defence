
import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { Renderer } from '../game/Renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface Props {
  engine: GameEngine;
}

export const GameCanvas: React.FC<Props> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    const renderer = new Renderer(engine);
    renderer.setContext(ctx);

    let lastTime = 0;
    let animationFrameId: number;
    let isHidden = document.hidden;

    const loop = (timestamp: number) => {
      if (isHidden) {
        lastTime = timestamp;
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      const dt = (timestamp - lastTime) / 1000; // delta in seconds
      lastTime = timestamp;
      
      // Cap dt to avoid spiraling if tab inactive
      const safeDt = Math.min(dt, 0.1);
      
      engine.update(safeDt);
      renderer.draw();
      
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    const handleVisibilityChange = () => {
      isHidden = document.hidden;
      if (!isHidden) {
        lastTime = performance.now();
      }
    };

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const isBrowserNavigationButton = (button: number) => button === 3 || button === 4;

    const handleMouseDown = (e: MouseEvent) => {
      if (isBrowserNavigationButton(e.button)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      canvas.focus();
      // Convert button ID: 0=Left, 1=Middle, 2=Right
      let btn = 'LEFT';
      if (e.button === 1) btn = 'MIDDLE';
      if (e.button === 2) btn = 'RIGHT';
      
      engine.handleMouseDown(btn, x, y);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      engine.handleMouseMove(x, y);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isBrowserNavigationButton(e.button)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      
      let btn = 'LEFT';
      if (e.button === 1) btn = 'MIDDLE';
      if (e.button === 2) btn = 'RIGHT';

      engine.handleMouseUp(btn, x, y);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      engine.handleWheel(e.deltaY, x, y);
    };
    
    // Disable context menu for right click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleAuxClick = (e: MouseEvent) => {
      if (isBrowserNavigationButton(e.button)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    // Handle Mouse Enter/Leave for edge panning logic
    const handleMouseEnter = () => engine.setMouseInsideCanvas(true);
    const handleMouseLeave = () => engine.setMouseInsideCanvas(false);
    
    // Global Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => engine.handleKeyDown(e.key);
    const handleKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e.key);

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('auxclick', handleAuxClick);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('auxclick', handleAuxClick);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [engine]);

  return (
    <canvas 
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      tabIndex={0}
      className="game-canvas cursor-crosshair"
    />
  );
};
