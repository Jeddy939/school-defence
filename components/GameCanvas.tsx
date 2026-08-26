
import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { Renderer } from '../game/Renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface Props {
  engine: GameEngine;
  inputMode?: 'mouse' | 'touch';
}

export const GameCanvas: React.FC<Props> = ({ engine, inputMode = 'mouse' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const renderer = new Renderer(engine);
    renderer.setContext(ctx);

    let lastTime = 0;
    let animationFrameId: number;
    let isHidden = document.hidden;
    let activeTouch: {
      startClientX: number;
      startClientY: number;
      lastClientX: number;
      lastClientY: number;
      startCanvasX: number;
      startCanvasY: number;
      startedAt: number;
      moved: boolean;
    } | null = null;
    let lastTap: { time: number; x: number; y: number } | null = null;
    let pendingTapTimeout: number | null = null;
    let lastPinchDistance: number | null = null;

    let renderPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const resizeCanvasForDisplay = () => {
      renderPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const backingWidth = Math.round(CANVAS_WIDTH * renderPixelRatio);
      const backingHeight = Math.round(CANVAS_HEIGHT * renderPixelRatio);
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      ctx.setTransform(renderPixelRatio, 0, 0, renderPixelRatio, 0, 0);
    };

    resizeCanvasForDisplay();
    window.addEventListener('resize', resizeCanvasForDisplay);

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
      ctx.setTransform(renderPixelRatio, 0, 0, renderPixelRatio, 0, 0);
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
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const isBrowserNavigationButton = (button: number) => button === 3 || button === 4;
    const touchDistance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const touchMidpoint = (a: Touch, b: Touch) => ({
      clientX: (a.clientX + b.clientX) / 2,
      clientY: (a.clientY + b.clientY) / 2
    });

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

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      canvas.focus();
      engine.setMouseInsideCanvas(true);

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const coords = getCanvasCoords(touch.clientX, touch.clientY);
        activeTouch = {
          startClientX: touch.clientX,
          startClientY: touch.clientY,
          lastClientX: touch.clientX,
          lastClientY: touch.clientY,
          startCanvasX: coords.x,
          startCanvasY: coords.y,
          startedAt: Date.now(),
          moved: false
        };
        lastPinchDistance = null;
        engine.handleMouseMove(coords.x, coords.y);
        return;
      }

      if (e.touches.length === 2) {
        activeTouch = null;
        if (pendingTapTimeout !== null) {
          window.clearTimeout(pendingTapTimeout);
          pendingTapTimeout = null;
        }
        lastTap = null;
        lastPinchDistance = touchDistance(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2 && lastPinchDistance !== null) {
        const nextDistance = touchDistance(e.touches[0], e.touches[1]);
        const midpoint = touchMidpoint(e.touches[0], e.touches[1]);
        const coords = getCanvasCoords(midpoint.clientX, midpoint.clientY);
        engine.handleWheel((lastPinchDistance - nextDistance) * 2, coords.x, coords.y);
        lastPinchDistance = nextDistance;
        return;
      }

      if (e.touches.length !== 1 || !activeTouch) return;

      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const frameDx = (touch.clientX - activeTouch.lastClientX) * scaleX;
      const frameDy = (touch.clientY - activeTouch.lastClientY) * scaleY;
      const totalDx = touch.clientX - activeTouch.startClientX;
      const totalDy = touch.clientY - activeTouch.startClientY;

      if (Math.hypot(totalDx, totalDy) > 10) {
        activeTouch.moved = true;
      }

      if (activeTouch.moved) {
        engine.panBy(frameDx, frameDy);
      }

      activeTouch.lastClientX = touch.clientX;
      activeTouch.lastClientY = touch.clientY;
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      engine.handleMouseMove(coords.x, coords.y);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      lastPinchDistance = null;

      if (e.touches.length > 0) return;
      if (!activeTouch) return;

      const now = Date.now();
      const isTap = !activeTouch.moved && now - activeTouch.startedAt < 330;
      const isDoubleTap = !!lastTap &&
        now - lastTap.time < 340 &&
        Math.hypot(activeTouch.startCanvasX - lastTap.x, activeTouch.startCanvasY - lastTap.y) < 38;

      if (isTap && isDoubleTap) {
        if (pendingTapTimeout !== null) {
          window.clearTimeout(pendingTapTimeout);
          pendingTapTimeout = null;
        }
        engine.commandAtScreenPos(activeTouch.startCanvasX, activeTouch.startCanvasY);
        lastTap = null;
      } else if (isTap) {
        const tapX = activeTouch.startCanvasX;
        const tapY = activeTouch.startCanvasY;
        if (pendingTapTimeout !== null) {
          window.clearTimeout(pendingTapTimeout);
        }
        lastTap = {
          time: now,
          x: tapX,
          y: tapY
        };
        pendingTapTimeout = window.setTimeout(() => {
          engine.selectAtScreenPos(tapX, tapY, false);
          pendingTapTimeout = null;
        }, 340);
      }

      activeTouch = null;
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
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('auxclick', handleAuxClick);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvasForDisplay);
      if (pendingTapTimeout !== null) {
        window.clearTimeout(pendingTapTimeout);
      }
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('auxclick', handleAuxClick);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [engine, inputMode]);

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
