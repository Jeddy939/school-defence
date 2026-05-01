


import React, { useRef, useEffect } from 'react';
import { EntityType } from '../types';

interface Props {
  type: EntityType;
  size?: number;
  entityId?: number;
}

// Internal Types for the Renderer
interface PortraitState {
  blinkOpen: boolean;
  nextBlinkTime: number;
  talking: boolean;
  mouthOpen: number; // 0 to 1
  nextMouthTime: number;
  idlePhase: number;
  eyeDart: number; // X offset for eyes looking around
}

export const UnitPortrait: React.FC<Props> = ({ type, size = 120, entityId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  
  // Initialize random starting state
  const stateRef = useRef<PortraitState>({
    blinkOpen: true,
    nextBlinkTime: Math.random() * 3000 + 1000,
    talking: false,
    mouthOpen: 0,
    nextMouthTime: 0,
    idlePhase: Math.random() * 100,
    eyeDart: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const assetFrames = getAssetPortraitFrames(type, entityId);
    const spritePortraitSrc = getSpritePortraitSrc(type);
    const structurePortraitSrc = getStructurePortraitSrc(type);
    const loadedAssets = assetFrames
      ? Object.fromEntries(
          Object.entries(assetFrames).map(([key, sources]) => [
            key,
            sources.map((src) => {
              const image = new Image();
              image.src = src;
              return image;
            })
          ])
        ) as Record<string, HTMLImageElement[]>
      : null;
    const spritePortrait = spritePortraitSrc ? new Image() : null;
    if (spritePortrait && spritePortraitSrc) {
      spritePortrait.src = spritePortraitSrc;
    }
    const structurePortrait = structurePortraitSrc ? new Image() : null;
    if (structurePortrait && structurePortraitSrc) {
      structurePortrait.src = structurePortraitSrc;
    }

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      const state = stateRef.current;

      // --- Animation Logic ---
      state.idlePhase += dt * 0.0015;

      // Blinking
      state.nextBlinkTime -= dt;
      if (state.nextBlinkTime <= 0) {
        if (state.blinkOpen) {
          state.blinkOpen = false; // Close eyes
          state.nextBlinkTime = 150; // Fast blink
        } else {
          state.blinkOpen = true; // Open eyes
          state.nextBlinkTime = Math.random() * 3000 + 2000;
          
          // Occasionally look around when opening eyes
          if (Math.random() < 0.3) {
             state.eyeDart = (Math.random() - 0.5) * 6;
          } else {
             state.eyeDart = 0;
          }
        }
      }

      // Talking Logic (Random chatter simulation)
      if (Math.random() < 0.01) state.talking = true;
      if (Math.random() < 0.01) state.talking = false;

      if (state.talking) {
         state.nextMouthTime -= dt;
         if (state.nextMouthTime <= 0) {
            state.mouthOpen = 0.2 + Math.random() * 0.8; 
            state.nextMouthTime = 50 + Math.random() * 100;
         }
      } else {
         // Smoothly close mouth
         state.mouthOpen = Math.max(0, state.mouthOpen - (dt * 0.015));
      }

      // --- Rendering ---
      // Use a fixed logical resolution of 200x200 for drawing commands
      const LOGICAL_SIZE = 200;
      const scale = size / LOGICAL_SIZE;
      
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      
      // Clear
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

      if (loadedAssets) {
          const activeSet = state.talking ? loadedAssets.talk : loadedAssets.idle;
          const frame = activeSet[Math.floor(time / 180) % activeSet.length];
          if (frame?.complete && frame.naturalWidth > 0) {
              ctx.imageSmoothingEnabled = true;
              ctx.drawImage(frame, 0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
          }
      } else if (spritePortrait?.complete && spritePortrait.naturalWidth > 0) {
          ctx.imageSmoothingEnabled = false;
          drawContainedImage(ctx, spritePortrait, LOGICAL_SIZE);
      } else if (structurePortrait?.complete && structurePortrait.naturalWidth > 0) {
          ctx.imageSmoothingEnabled = true;
          drawContainedImage(ctx, structurePortrait, LOGICAL_SIZE);
      } else if (type === EntityType.YEAR_7_RAT_KING) {
          drawRatKingPortrait(ctx, state, LOGICAL_SIZE);
      } else {
          drawPortrait(ctx, type, state, LOGICAL_SIZE);
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [type, size, entityId]);

  return <canvas ref={canvasRef} width={size} height={size} className="bg-slate-900 border-2 border-slate-600 rounded shadow-inner" />;
};

function getAssetPortraitFrames(type: EntityType, entityId?: number) {
  if (type === EntityType.TEACHER_AIDE) {
    return createAssetPortraitFrames('/sprites/teacher-aide-rtspixel/portrait');
  }

  if (type === EntityType.SUB_TEACHER) {
    return createAssetPortraitFrames('/sprites/substitute-teacher/portrait');
  }

  if (type === EntityType.GYM_COACH) {
    return null;
  }

  if (type === EntityType.MATH_TEACHER) {
    if (entityId !== undefined && !usesGeneratedMathsTeacherVariant(entityId)) {
      return createAssetPortraitFrames('/sprites/maths-teacher/portrait');
    }
    return createAssetPortraitFrames('/sprites/maths-teacher/portrait');
  }

  if (type === EntityType.SCIENCE_TEACHER) {
    return createAssetPortraitFrames('/sprites/science-teacher/portrait');
  }

  if (type === EntityType.TUCKSHOP_LADY) {
    return createAssetPortraitFrames('/sprites/tuckshop-lady/portrait');
  }

  if (type === EntityType.YEAR_7) {
    return createAssetPortraitFrames('/sprites/year-7/portrait');
  }

  if (type === EntityType.FOOTY_KID) {
    return createAssetPortraitFrames('/sprites/footy-kid/portrait');
  }

  if (type === EntityType.YEAR_7_RAT_KING) {
    return createAssetPortraitFrames('/sprites/year-7-rat-king/portrait');
  }

  if (type === EntityType.BOWLING_MACHINE) {
    return createAssetPortraitFrames('/sprites/bowling-machine/portrait');
  }

  return null;
}

function usesGeneratedMathsTeacherVariant(entityId: number) {
  const x = Math.sin(entityId * 97) * 10000;
  return x - Math.floor(x) >= 0.5;
}

function getSpritePortraitSrc(type: EntityType) {
  switch (type) {
    case EntityType.GYM_COACH:
      return '/sprites/pe-teacher/idle/south/frame_000.png';
    case EntityType.BULLY:
      return '/sprites/bully/idle/south/frame_000.png';
    case EntityType.MEAN_GIRL:
      return '/sprites/mean-girl/idle/south/frame_000.png';
    case EntityType.ESHAY:
      return '/sprites/eshay/idle/south/frame_000.png';
    case EntityType.CLASS_CLOWN:
      return '/sprites/class-clown/idle/south/frame_000.png';
    default:
      return null;
  }
}

function getStructurePortraitSrc(type: EntityType) {
  switch (type) {
    case EntityType.STAFFROOM:
      return '/portraits/structures/staffroom/headquarters-02.png';
    case EntityType.ADMIN_OFFICE:
      return '/portraits/structures/admin-office/office-02.png';
    case EntityType.BOOKSHELF:
      return '/portraits/structures/bookshelf/resource-02.png';
    case EntityType.LOCKER:
      return '/portraits/structures/locker/defense-02.png';
    case EntityType.MATHS_DEPT:
      return '/portraits/structures/maths-block/classroom-02.png';
    case EntityType.SCIENCE_LAB:
      return '/portraits/structures/science-lab/lab-02.png';
    case EntityType.SPORTS_CENTRE:
      return '/portraits/structures/sports-centre/gym-02.png';
    case EntityType.CANTEEN:
      return '/portraits/structures/canteen/counter-02.png';
    case EntityType.BOWLING_MACHINE:
      return '/portraits/structures/bowling-machine/tower-02.png';
    case EntityType.COMMON_ROOM:
      return '/portraits/structures/common-room/lounge-02.png';
    default:
      return null;
  }
}

function drawContainedImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, size: number) {
  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, x, y, width, height);
}

function createAssetPortraitFrames(base: string) {
  const frameIds = ['000', '001', '002', '003'];
  return {
    idle: frameIds.map((id) => `${base}/idle/frame_${id}.png`),
    talk: frameIds.map((id) => `${base}/talk/frame_${id}.png`),
  };
}

// ==========================================
// ART ASSETS & PALETTES
// ==========================================

// Warmer, more vibrant skin tones to avoid the "grey" look
const SKIN_TONES = {
  LIGHT: { base: '#ffdfc4', shadow: '#d69c85', highlight: '#fff5eb', nose: '#eab6a4' },
  TAN:   { base: '#eab676', shadow: '#b37840', highlight: '#f7d4a6', nose: '#cc8e56' },
  DARK:  { base: '#8d5524', shadow: '#593110', highlight: '#b87844', nose: '#704019' },
  PALE:  { base: '#f3e5dc', shadow: '#cbbcb6', highlight: '#faf4f0', nose: '#dccfc9' } // For tired TA
};

const HAIR_COLORS = {
  BLONDE: { base: '#facc15', shadow: '#b45309' },
  BROWN:  { base: '#5c2e0c', shadow: '#321503' },
  BLACK:  { base: '#1e1b4b', shadow: '#020617' },
  WHITE:  { base: '#e5e7eb', shadow: '#9ca3af' },
  GINGER: { base: '#ea580c', shadow: '#9a3412' },
  GREY:   { base: '#9ca3af', shadow: '#4b5563' }
};

function getPalette(type: EntityType) {
  switch (type) {
    case EntityType.GYM_COACH: 
        return { skin: SKIN_TONES.TAN, hair: HAIR_COLORS.BROWN, shirt: '#1e3a8a', bg: '#1d4ed8' };
    case EntityType.SCIENCE_TEACHER: 
        return { skin: SKIN_TONES.LIGHT, hair: HAIR_COLORS.WHITE, shirt: '#f3f4f6', bg: '#06b6d4' };
    case EntityType.MATH_TEACHER: 
        return { skin: SKIN_TONES.LIGHT, hair: HAIR_COLORS.BROWN, shirt: '#bfdbfe', bg: '#3b82f6' };
    case EntityType.TEACHER_AIDE: 
        return { skin: SKIN_TONES.PALE, hair: HAIR_COLORS.BROWN, shirt: '#60a5fa', bg: '#64748b' };
    case EntityType.SUB_TEACHER: 
        return { skin: SKIN_TONES.PALE, hair: HAIR_COLORS.GREY, shirt: '#d6d3d1', bg: '#a8a29e' };
    case EntityType.BULLY: 
        return { skin: SKIN_TONES.TAN, hair: HAIR_COLORS.BLACK, shirt: '#0f172a', bg: '#dc2626' };
    case EntityType.MEAN_GIRL: 
        return { skin: SKIN_TONES.LIGHT, hair: HAIR_COLORS.BLONDE, shirt: '#db2777', bg: '#ec4899' };
    case EntityType.FOOTY_KID: 
        return { skin: SKIN_TONES.TAN, hair: HAIR_COLORS.GINGER, shirt: '#1d4ed8', bg: '#ef4444' };
    case EntityType.ESHAY:
        return { skin: SKIN_TONES.LIGHT, hair: HAIR_COLORS.BROWN, shirt: '#fff', bg: '#333' };
    case EntityType.CLASS_CLOWN:
        return { skin: SKIN_TONES.LIGHT, hair: HAIR_COLORS.GINGER, shirt: '#fff', bg: '#ef4444' };
    case EntityType.YEAR_7: 
    case EntityType.YEAR_7_RAT_KING:
        return { skin: SKIN_TONES.LIGHT, hair: HAIR_COLORS.BROWN, shirt: '#9f1239', bg: '#f87171' };
    default: 
        return { skin: SKIN_TONES.LIGHT, hair: HAIR_COLORS.BROWN, shirt: '#64748b', bg: '#94a3b8' };
  }
}

// ==========================================
// DRAWING FUNCTIONS
// ==========================================

function drawRatKingPortrait(ctx: CanvasRenderingContext2D, state: PortraitState, dim: number) {
   // Background
   const grad = ctx.createLinearGradient(0, 0, 0, dim);
   grad.addColorStop(0, '#334155');
   grad.addColorStop(1, '#0f172a');
   ctx.fillStyle = grad;
   ctx.fillRect(0, 0, dim, dim);

   // Draw 3 heads in a cluster
   const cx = dim / 2;
   const cy = dim * 0.55;

   // Head 1 (Left Back)
   ctx.save();
   ctx.translate(-40, -20);
   ctx.scale(0.8, 0.8);
   drawPortraitComponents(ctx, cx, cy, EntityType.YEAR_7, state, false);
   ctx.restore();

   // Head 2 (Right Back)
   ctx.save();
   ctx.translate(40, -10);
   ctx.scale(0.8, 0.8);
   drawPortraitComponents(ctx, cx, cy, EntityType.YEAR_7, state, false);
   ctx.restore();

   // Head 3 (Front Center)
   drawPortraitComponents(ctx, cx, cy + 20, EntityType.YEAR_7, state, true);
   
   drawOverlay(ctx, dim);
}

function drawPortrait(ctx: CanvasRenderingContext2D, type: EntityType, state: PortraitState, dim: number) {
  const palette = getPalette(type);
  const cx = dim / 2;
  
  // ZOOM LEVEL: Position the head center. 
  // Higher cy = lower in frame. Lower cy = higher in frame.
  // For a headshot, we want the eyes around 40-45% down the canvas.
  const cy = dim * 0.55; 

  // 1. Background (Vibrant gradient)
  const grad = ctx.createLinearGradient(0, 0, 0, dim);
  grad.addColorStop(0, palette.bg);
  grad.addColorStop(1, '#0f172a'); // Fade to dark at bottom
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dim, dim);

  // Decorative background elements
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffffff';
  if (type === EntityType.MATH_TEACHER) {
      ctx.font = '40px Arial';
      ctx.fillText('∑', 20, 60);
      ctx.fillText('π', 160, 150);
      ctx.fillText('√', 150, 50);
  } else if (type === EntityType.CLASS_CLOWN) {
      ctx.font = '40px Arial';
      ctx.fillText('?', 20, 60);
      ctx.fillText('!', 160, 150);
      ctx.fillText('HA', 150, 50);
  }
  ctx.restore();

  // Idle Animation - Subtle breathing/bobbing
  const bob = Math.sin(state.idlePhase) * 2;
  ctx.translate(0, bob);

  drawPortraitComponents(ctx, cx, cy, type, state, true);

  ctx.translate(0, -bob); // Reset bob for overlay

  // 7. Retro Overlay (Reduced intensity to prevent greying)
  drawOverlay(ctx, dim);
}

function drawPortraitComponents(ctx: CanvasRenderingContext2D, cx: number, cy: number, type: EntityType, state: PortraitState, main: boolean) {
  const palette = getPalette(type);
  // 2. Neck & Shoulders (Base layer)
  drawShoulders(ctx, cx, cy, type, palette);

  // 3. Head Shape
  drawHeadBase(ctx, cx, cy, type, palette);

  // 4. Facial Features
  drawFace(ctx, cx, cy, type, palette, state);

  // 5. Hair (Behind and In Front layers handled inside)
  drawHair(ctx, cx, cy, type, palette);
  
  // 6. Accessories
  drawAccessories(ctx, cx, cy, type, palette, state);
}

function drawShoulders(ctx: CanvasRenderingContext2D, x: number, y: number, type: EntityType, palette: any) {
  // Zoomed in -> Shoulders are wider and lower
  const shoulderY = y + 90;
  
  ctx.fillStyle = palette.shirt;
  ctx.beginPath();
  // Draw a large curve for shoulders
  if (type === EntityType.BULLY || type === EntityType.GYM_COACH) {
     // Broad
     ctx.ellipse(x, shoulderY, 140, 70, 0, Math.PI, 0);
  } else if (type === EntityType.YEAR_7 || type === EntityType.MEAN_GIRL || type === EntityType.ESHAY) {
     // Narrow
     ctx.ellipse(x, shoulderY, 100, 60, 0, Math.PI, 0);
  } else {
     ctx.ellipse(x, shoulderY, 120, 65, 0, Math.PI, 0);
  }
  ctx.fill();

  // Collar Details
  if (type === EntityType.MATH_TEACHER || type === EntityType.TEACHER_AIDE || type === EntityType.SUB_TEACHER) {
     ctx.fillStyle = type === EntityType.SUB_TEACHER ? '#fff' : '#fff'; // White collar
     ctx.beginPath();
     ctx.moveTo(x, shoulderY - 10);
     ctx.lineTo(x - 35, shoulderY - 20); // Left point
     ctx.lineTo(x + 35, shoulderY - 20); // Right point
     ctx.lineTo(x, shoulderY + 20); // V
     ctx.fill();
     
     if (type === EntityType.MATH_TEACHER) {
        ctx.fillStyle = '#b91c1c'; // Tie
        ctx.beginPath();
        ctx.moveTo(x, shoulderY - 5);
        ctx.lineTo(x - 10, dim(200)); // Down off screen
        ctx.lineTo(x + 10, dim(200));
        ctx.fill();
     }
  }

  // Eshay Stripe
  if (type === EntityType.ESHAY) {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(x - 10, shoulderY - 40, 20, 100);
      
      // Bum bag strap
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x - 80, shoulderY - 40);
      ctx.lineTo(x + 80, shoulderY + 20);
      ctx.stroke();
  }
  
  // Clown Spots
  if (type === EntityType.CLASS_CLOWN) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(x - 30, shoulderY, 10, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 40, shoulderY - 10, 8, 0, Math.PI*2); ctx.fill();
  }
}

function drawHeadBase(ctx: CanvasRenderingContext2D, x: number, y: number, type: EntityType, palette: any) {
  // Neck
  ctx.fillStyle = palette.skin.shadow;
  const neckW = (type === EntityType.BULLY || type === EntityType.GYM_COACH) ? 70 : 50;
  ctx.fillRect(x - neckW/2, y, neckW, 100);

  // Face Shape
  ctx.fillStyle = palette.skin.base;
  ctx.beginPath();

  if (type === EntityType.BULLY || type === EntityType.GYM_COACH) {
     // Square Jaw
     ctx.moveTo(x - 65, y - 70);
     ctx.lineTo(x + 65, y - 70);
     ctx.lineTo(x + 60, y + 50); // Jaw corner
     ctx.quadraticCurveTo(x, y + 85, x - 60, y + 50); // Chin
     ctx.lineTo(x - 65, y - 70);
  } else if (type === EntityType.MEAN_GIRL || type === EntityType.ESHAY) {
     // Pointy
     ctx.moveTo(x - 55, y - 60);
     ctx.lineTo(x + 55, y - 60);
     ctx.quadraticCurveTo(x + 45, y + 20, x, y + 70);
     ctx.quadraticCurveTo(x - 45, y + 20, x - 55, y - 60);
  } else if (type === EntityType.YEAR_7 || type === EntityType.CLASS_CLOWN) {
     // Round
     ctx.arc(x, y, 60, 0, Math.PI*2);
  } else {
     // Oval (Standard)
     ctx.ellipse(x, y, 60, 75, 0, 0, Math.PI*2);
  }
  ctx.fill();

  // Ear bumps
  ctx.fillStyle = palette.skin.base;
  const earY = y + 5;
  ctx.beginPath(); ctx.arc(x - 65, earY, 12, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 65, earY, 12, 0, Math.PI*2); ctx.fill();

  // 3D Shading Gradient (Subtle to avoid grey)
  const grad = ctx.createRadialGradient(x - 20, y - 20, 10, x, y, 90);
  grad.addColorStop(0, palette.skin.highlight); 
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.globalAlpha = 1.0;
  
  // Chin Shadow
  ctx.fillStyle = palette.skin.shadow;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(x, y + 90, 30, 0, Math.PI * 2); // Fake shadow under chin
  ctx.fill();
  ctx.globalAlpha = 1.0;
}

function drawFace(ctx: CanvasRenderingContext2D, x: number, y: number, type: EntityType, palette: any, state: PortraitState) {
  
  // Proportions for zoomed view
  const eyeY = y - 5;
  const eyeSpacing = 45;
  const noseY = y + 25;
  const mouthY = y + 50;

  // 1. NOSE
  ctx.fillStyle = type === EntityType.CLASS_CLOWN ? '#ef4444' : palette.skin.nose; // Darker skin tone
  ctx.beginPath();
  if (type === EntityType.BULLY) {
     // Broad nose
     ctx.moveTo(x - 10, noseY + 10);
     ctx.lineTo(x + 10, noseY + 10);
     ctx.lineTo(x, noseY - 15);
  } else if (type === EntityType.MEAN_GIRL) {
     // Tiny button nose
     ctx.arc(x, noseY, 6, 0, Math.PI*2);
  } else if (type === EntityType.CLASS_CLOWN) {
     // Clown nose
     ctx.arc(x, noseY, 15, 0, Math.PI*2);
  } else {
     // Standard
     ctx.moveTo(x - 8, noseY + 8);
     ctx.lineTo(x + 8, noseY + 8);
     ctx.quadraticCurveTo(x, noseY - 2, x - 8, noseY + 8);
  }
  ctx.fill();
  
  // Nose Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.arc(x, noseY - 2, 3, 0, Math.PI*2); ctx.fill();

  // 2. EYES
  // Eye whites
  ctx.fillStyle = '#fff';
  const drawEyeBase = (ex: number) => {
     ctx.beginPath();
     if (type === EntityType.YEAR_7 || type === EntityType.CLASS_CLOWN) {
        ctx.arc(ex, eyeY, 16, 0, Math.PI*2); // Big anime eyes for kid
     } else {
        ctx.ellipse(ex, eyeY, 14, 10, 0, 0, Math.PI*2);
     }
     ctx.fill();
  };
  
  drawEyeBase(x - eyeSpacing/2);
  drawEyeBase(x + eyeSpacing/2);

  // Dark circles for TA
  if (type === EntityType.TEACHER_AIDE || type === EntityType.SUB_TEACHER) {
     ctx.fillStyle = 'rgba(50, 20, 20, 0.15)';
     ctx.beginPath(); ctx.arc(x - eyeSpacing/2, eyeY + 8, 14, 0, Math.PI); ctx.fill();
     ctx.beginPath(); ctx.arc(x + eyeSpacing/2, eyeY + 8, 14, 0, Math.PI); ctx.fill();
  }

  if (state.blinkOpen) {
     // Iris
     const eyeColor = getEyeColor(type);
     ctx.fillStyle = eyeColor;
     const exOff = state.eyeDart;
     
     const irisSize = type === EntityType.YEAR_7 ? 8 : 6;
     ctx.beginPath(); ctx.arc(x - eyeSpacing/2 + exOff, eyeY, irisSize, 0, Math.PI*2); ctx.fill();
     ctx.beginPath(); ctx.arc(x + eyeSpacing/2 + exOff, eyeY, irisSize, 0, Math.PI*2); ctx.fill();

     // Pupil
     ctx.fillStyle = '#000';
     ctx.beginPath(); ctx.arc(x - eyeSpacing/2 + exOff, eyeY, irisSize/2, 0, Math.PI*2); ctx.fill();
     ctx.beginPath(); ctx.arc(x + eyeSpacing/2 + exOff, eyeY, irisSize/2, 0, Math.PI*2); ctx.fill();

     // Highlight
     ctx.fillStyle = '#fff';
     ctx.beginPath(); ctx.arc(x - eyeSpacing/2 + exOff - 2, eyeY - 2, 2, 0, Math.PI*2); ctx.fill();
     ctx.beginPath(); ctx.arc(x + eyeSpacing/2 + exOff - 2, eyeY - 2, 2, 0, Math.PI*2); ctx.fill();
  } else {
     // Closed Eyelid
     ctx.strokeStyle = palette.skin.shadow;
     ctx.lineWidth = 3;
     ctx.beginPath();
     ctx.moveTo(x - eyeSpacing/2 - 10, eyeY + 2); ctx.lineTo(x - eyeSpacing/2 + 10, eyeY + 2);
     ctx.moveTo(x + eyeSpacing/2 - 10, eyeY + 2); ctx.lineTo(x + eyeSpacing/2 + 10, eyeY + 2);
     ctx.stroke();
  }

  // Brows
  ctx.strokeStyle = palette.hair.base;
  ctx.lineWidth = type === EntityType.MEAN_GIRL ? 2 : 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  
  const browY = eyeY - 18;
  const browW = 15;
  
  if (type === EntityType.BULLY || type === EntityType.ESHAY) {
     // Angry
     ctx.moveTo(x - eyeSpacing/2 - browW, browY - 5); ctx.lineTo(x - eyeSpacing/2 + browW, browY + 5);
     ctx.moveTo(x + eyeSpacing/2 + browW, browY - 5); ctx.lineTo(x + eyeSpacing/2 - browW, browY + 5);
  } else if (type === EntityType.TEACHER_AIDE || type === EntityType.SUB_TEACHER) {
     // Sad / Worried / Tired
     ctx.moveTo(x - eyeSpacing/2 - browW, browY + 5); ctx.lineTo(x - eyeSpacing/2 + browW, browY - 5);
     ctx.moveTo(x + eyeSpacing/2 + browW, browY + 5); ctx.lineTo(x + eyeSpacing/2 - browW, browY - 5);
  } else if (type === EntityType.SCIENCE_TEACHER || type === EntityType.CLASS_CLOWN) {
     // Crazy arch
     ctx.moveTo(x - eyeSpacing/2 - browW, browY); ctx.quadraticCurveTo(x - eyeSpacing/2, browY - 15, x - eyeSpacing/2 + browW, browY);
     ctx.moveTo(x + eyeSpacing/2 + browW, browY); ctx.quadraticCurveTo(x + eyeSpacing/2, browY - 15, x + eyeSpacing/2 - browW, browY);
  } else {
     // Normal
     ctx.moveTo(x - eyeSpacing/2 - browW, browY); ctx.quadraticCurveTo(x - eyeSpacing/2, browY - 5, x - eyeSpacing/2 + browW, browY);
     ctx.moveTo(x + eyeSpacing/2 + browW, browY); ctx.quadraticCurveTo(x + eyeSpacing/2, browY - 5, x + eyeSpacing/2 - browW, browY);
  }
  ctx.stroke();

  // 3. MOUTH
  ctx.fillStyle = '#5c2e0c'; // Mouth interior
  if (state.talking) {
      const h = state.mouthOpen * 15 + 5;
      ctx.beginPath();
      ctx.ellipse(x, mouthY, 12, h/2, 0, 0, Math.PI*2);
      ctx.fill();
      // Teeth
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 6, mouthY - h/2, 12, 4);
  } else {
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (type === EntityType.BULLY || type === EntityType.ESHAY) {
         ctx.arc(x, mouthY + 8, 10, Math.PI + 0.5, -0.5); // Grump
      } else if (type === EntityType.MEAN_GIRL) {
         ctx.strokeStyle = '#db2777'; // Lipstick
         ctx.moveTo(x-6, mouthY); ctx.lineTo(x+6, mouthY);
      } else if (type === EntityType.TEACHER_AIDE || type === EntityType.SUB_TEACHER) {
         // Squiggly tired mouth
         ctx.moveTo(x-8, mouthY); 
         ctx.bezierCurveTo(x-4, mouthY+4, x+4, mouthY-4, x+8, mouthY);
      } else if (type === EntityType.CLASS_CLOWN) {
         // Big smile
         ctx.arc(x, mouthY - 5, 20, 0.2, Math.PI - 0.2);
      } else {
         ctx.arc(x, mouthY - 5, 12, 0.5, Math.PI - 0.5); // Smile
      }
      ctx.stroke();
  }
}

function drawHair(ctx: CanvasRenderingContext2D, x: number, y: number, type: EntityType, palette: any) {
  ctx.fillStyle = palette.hair.base;
  
  // Hair Back (Behind head)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over'; // Draw behind everything
  ctx.beginPath();
  if (type === EntityType.MEAN_GIRL) {
     // Long Blonde
     ctx.moveTo(x, y - 50);
     ctx.bezierCurveTo(x - 90, y, x - 80, y + 150, x - 60, y + 150);
     ctx.lineTo(x + 60, y + 150);
     ctx.bezierCurveTo(x + 80, y + 150, x + 90, y, x, y - 50);
     ctx.fill();
  }
  if (type === EntityType.ESHAY) {
      // Rat tail
      ctx.moveTo(x - 20, y + 50);
      ctx.lineTo(x + 20, y + 50);
      ctx.lineTo(x, y + 100);
      ctx.fill();
  }
  ctx.restore();

  // Hair Front (On top of head)
  ctx.beginPath();
  if (type === EntityType.GYM_COACH || type === EntityType.ESHAY) {
     // Hat instead of hair
     ctx.fillStyle = type === EntityType.ESHAY ? '#111' : '#1e3a8a';
     ctx.arc(x, y - 20, 62, Math.PI, 0); // Dome
     ctx.fill();
     // Brim
     ctx.fillStyle = type === EntityType.ESHAY ? '#000' : '#172554';
     ctx.fillRect(x - 70, y - 25, 140, 15);
     return;
  }

  if (type === EntityType.SCIENCE_TEACHER || type === EntityType.CLASS_CLOWN) {
     // Crazy Scientist Hair / Clown Hair
     const points = 12;
     ctx.moveTo(x - 60, y);
     for(let i=0; i<=points; i++) {
        const ang = Math.PI + (i/points) * Math.PI;
        const r = 75 + (i%2===0 ? 10 : 0);
        ctx.lineTo(x + Math.cos(ang) * r, (y - 10) + Math.sin(ang) * r);
     }
     ctx.lineTo(x + 60, y);
     ctx.lineTo(x, y - 60);
     ctx.fill();
     return;
  }

  if (type === EntityType.TEACHER_AIDE) {
     // Messy Bun
     ctx.arc(x, y - 30, 65, Math.PI, 0);
     ctx.lineTo(x + 65, y + 20);
     ctx.lineTo(x + 55, y - 10); 
     ctx.lineTo(x - 55, y - 10);
     ctx.lineTo(x - 65, y + 20);
     ctx.fill();
     // Loose strands
     ctx.strokeStyle = palette.hair.base;
     ctx.lineWidth = 2;
     ctx.beginPath();
     ctx.moveTo(x - 60, y - 20); ctx.quadraticCurveTo(x - 75, y, x - 70, y + 30);
     ctx.stroke();
     return;
  }

  // Default Short/Medium Hair
  ctx.arc(x, y - 20, 65, Math.PI, 0); // Top curve
  ctx.lineTo(x + 65, y + 30);
  ctx.lineTo(x + 50, y - 10); // Sideburns
  ctx.lineTo(x - 50, y - 10);
  ctx.lineTo(x - 65, y + 30);
  ctx.fill();
}

function drawAccessories(ctx: CanvasRenderingContext2D, x: number, y: number, type: EntityType, palette: any, state: PortraitState) {
  // 1. Glasses
  if (type === EntityType.MATH_TEACHER || type === EntityType.SCIENCE_TEACHER) {
      const glassesColor = type === EntityType.MATH_TEACHER ? '#334155' : '#0891b2';
      ctx.strokeStyle = glassesColor;
      ctx.lineWidth = 5;
      const eyeY = y - 5;
      const spacing = 45;
      
      // Rims
      ctx.beginPath(); ctx.arc(x - spacing/2, eyeY, 18, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + spacing/2, eyeY, 18, 0, Math.PI*2); ctx.stroke();
      // Bridge
      ctx.beginPath(); ctx.moveTo(x - spacing/2 + 18, eyeY); ctx.lineTo(x + spacing/2 - 18, eyeY); ctx.stroke();
      
      // Reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath(); ctx.arc(x - spacing/2, eyeY, 15, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + spacing/2, eyeY, 15, 0, Math.PI*2); ctx.fill();
  }

  // 2. Mean Girl Phone Glow
  if (type === EntityType.MEAN_GIRL) {
      const grad = ctx.createRadialGradient(x + 60, y + 80, 10, x + 60, y + 80, 80);
      grad.addColorStop(0, 'rgba(236, 72, 153, 0.4)');
      grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 200, 200);
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, dim: number) {
  // Reduced opacity scanlines to avoid greying out the image
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
  for (let i = 0; i < dim; i += 2) {
    ctx.fillRect(0, i, dim, 1);
  }

  // Vignette
  const grad = ctx.createRadialGradient(dim/2, dim/2, dim * 0.6, dim/2, dim/2, dim * 0.9);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dim, dim);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, dim-2, dim-2);
}

function dim(val: number) { return val; } // Helper to keep syntax clean if we add scaling later

function getEyeColor(type: EntityType) {
  switch (type) {
      case EntityType.MEAN_GIRL: return '#3b82f6'; // Blue
      case EntityType.SCIENCE_TEACHER: return '#10b981'; // Green
      case EntityType.BULLY: return '#451a03'; // Dark Brown
      case EntityType.ESHAY: return '#111'; 
      default: return '#78350f'; // Brown
  }
}
