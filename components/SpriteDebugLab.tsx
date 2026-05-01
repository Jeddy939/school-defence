import React, { useEffect, useMemo, useRef, useState } from 'react';

type SpriteSetId =
  | 'gym-coach-rtspixel'
  | 'math-teacher-rtspixel'
  | 'sub-teacher-rtspixel'
  | 'teacher-aide-rtspixel'
  | 'teacher-aide'
  | 'year-7'
  | 'class-clown'
  | 'eshay'
  | 'bully'
  | 'footy-kid'
  | 'bowling-machine'
  | 'maths-teacher'
  | 'mean-girl'
  | 'substitute-teacher'
  | 'pe-teacher'
  | 'science-teacher'
  | 'tuckshop-lady'
  | 'year-7-rat-king';

interface SpriteSetConfig {
  id: SpriteSetId;
  label: string;
  root: string;
}

interface SpriteMetadata {
  frame_size?: number;
  portrait_frame_size?: number;
  directions?: string[];
  animations?: Record<string, Record<string, number>>;
  portraits?: Record<string, number>;
}

interface FrameMetric {
  path: string;
  flags: string[];
  bbox?: number[] | null;
  bbox_size?: number[];
}

interface AuditSet {
  sprite_set: string;
  frame_count: number;
  flagged_count: number;
  flagged_frames: FrameMetric[];
}

const SPRITE_SETS: SpriteSetConfig[] = [
  { id: 'gym-coach-rtspixel', label: 'P.E. Teacher / Coach', root: '/sprites/gym-coach-rtspixel' },
  { id: 'math-teacher-rtspixel', label: 'Maths Teacher', root: '/sprites/math-teacher-rtspixel' },
  { id: 'sub-teacher-rtspixel', label: 'Substitute Teacher', root: '/sprites/sub-teacher-rtspixel' },
  { id: 'teacher-aide-rtspixel', label: "Teacher's Aide RTS", root: '/sprites/teacher-aide-rtspixel' },
  { id: 'teacher-aide', label: "Teacher's Aide Legacy", root: '/sprites/teacher-aide' },
  { id: 'year-7', label: 'Year 7', root: '/sprites/year-7' },
  { id: 'class-clown', label: 'Class Clown', root: '/sprites/class-clown' },
  { id: 'eshay', label: 'Eshay', root: '/sprites/eshay' },
  { id: 'bully', label: 'Bully', root: '/sprites/bully' },
  { id: 'footy-kid', label: 'Footy Kid', root: '/sprites/footy-kid' },
  { id: 'bowling-machine', label: 'Bowling Machine', root: '/sprites/bowling-machine' },
  { id: 'maths-teacher', label: 'Maths Teacher Candidate', root: '/sprites/maths-teacher' },
  { id: 'mean-girl', label: 'Mean Girl', root: '/sprites/mean-girl' },
  { id: 'substitute-teacher', label: 'Substitute Teacher Candidate', root: '/sprites/substitute-teacher' },
  { id: 'pe-teacher', label: 'P.E. Teacher Candidate', root: '/sprites/pe-teacher' },
  { id: 'science-teacher', label: 'Science Teacher', root: '/sprites/science-teacher' },
  { id: 'tuckshop-lady', label: 'Tuckshop Lady', root: '/sprites/tuckshop-lady' },
  { id: 'year-7-rat-king', label: 'Year 7 Rat King', root: '/sprites/year-7-rat-king' },
];

const DEFAULT_DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north'];
const ALL_RUNTIME_DIRECTIONS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export const SpriteDebugLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metadataBySet, setMetadataBySet] = useState<Record<string, SpriteMetadata>>({});
  const [auditBySet, setAuditBySet] = useState<Record<string, AuditSet>>({});
  const [selectedSetId, setSelectedSetId] = useState<SpriteSetId>('gym-coach-rtspixel');
  const [selectedAction, setSelectedAction] = useState('walk');
  const [selectedDirection, setSelectedDirection] = useState('north-east');
  const [scale, setScale] = useState(4);
  const [showGuides, setShowGuides] = useState(true);
  const [paused, setPaused] = useState(false);

  const selectedSet = SPRITE_SETS.find((set) => set.id === selectedSetId) ?? SPRITE_SETS[0];
  const metadata = metadataBySet[selectedSetId];

  const actionOptions = useMemo(() => {
    if (!metadata) return [];
    const gameplay = Object.keys(metadata.animations ?? {});
    const portraits = Object.keys(metadata.portraits ?? {}).map((name) => `portrait/${name}`);
    return [...gameplay, ...portraits];
  }, [metadata]);

  const isPortrait = selectedAction.startsWith('portrait/');
  const sourcePose = getMirroredFiveDirectionPose(selectedDirection);
  const sourceDirection = sourcePose.direction;
  const sourceDirections = metadata?.directions?.length ? metadata.directions : DEFAULT_DIRECTIONS;
  const directionOptions = isPortrait ? sourceDirections : ALL_RUNTIME_DIRECTIONS;
  const frameCount = getFrameCount(metadata, selectedAction, sourceDirection);
  const frameUrls = useMemo(
    () => Array.from({ length: frameCount }, (_, index) => getFrameUrl(selectedSet.root, selectedAction, sourceDirection, index)),
    [frameCount, selectedAction, selectedSet.root, sourceDirection],
  );
  const selectedAudit = auditBySet[selectedSetId];
  const selectedFlags = useMemo(() => {
    return (selectedAudit?.flagged_frames ?? []).filter((frame) => {
      const normalized = frame.path.replace(/\\/g, '/');
      const target = isPortrait
        ? `${selectedSetId}/${selectedAction}`
        : `${selectedSetId}/${selectedAction}/${sourceDirection}`;
      return normalized.includes(target);
    });
  }, [isPortrait, selectedAction, selectedAudit, selectedSetId, sourceDirection]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const entries = await Promise.all(
        SPRITE_SETS.map(async (set) => {
          try {
            const response = await fetch(`${set.root}/metadata.json`);
            if (!response.ok) return [set.id, null] as const;
            return [set.id, await response.json() as SpriteMetadata] as const;
          } catch {
            return [set.id, null] as const;
          }
        }),
      );

      if (cancelled) return;
      setMetadataBySet(Object.fromEntries(entries.filter((entry): entry is [SpriteSetId, SpriteMetadata] => Boolean(entry[1]))));

      try {
        const auditResponse = await fetch('/sprite-audit/sprite-audit-report.json');
        if (auditResponse.ok) {
          const reports = await auditResponse.json() as AuditSet[];
          if (!cancelled) {
            setAuditBySet(Object.fromEntries(reports.map((report) => [report.sprite_set, report])));
          }
        }
      } catch {
        // The audit report is copied into dist for QA builds, but the lab still works without it.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!metadata || actionOptions.includes(selectedAction)) return;
    setSelectedAction(actionOptions[0] ?? 'idle');
  }, [actionOptions, metadata, selectedAction]);

  useEffect(() => {
    if (isPortrait || directionOptions.includes(selectedDirection)) return;
    setSelectedDirection(directionOptions[0] ?? 'south');
  }, [directionOptions, isPortrait, selectedDirection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || frameUrls.length === 0) return;

    let raf = 0;
    let currentImage: HTMLImageElement | null = null;
    const loadedImages = frameUrls.map((url) => {
      const image = new Image();
      image.src = url;
      return image;
    });

    const draw = (time: number) => {
      const frameIndex = paused ? 0 : Math.floor(time / 150) % loadedImages.length;
      currentImage = loadedImages[frameIndex] ?? null;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawDebugScene(ctx, canvas, currentImage, scale, showGuides, isPortrait, sourcePose.flipX);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [frameUrls, isPortrait, paused, scale, showGuides, sourcePose.flipX]);

  return (
    <div className="min-h-screen overflow-auto bg-slate-950 p-5 text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-xl border border-sky-400/20 bg-slate-900/90 p-4 shadow-2xl">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">Sprite QA Mode</div>
          <h1 className="mt-2 text-2xl font-black uppercase">Animation Inspector</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use this to review every extracted sprite set in the same browser pipeline as the game.
          </p>

          <label className="mt-5 block text-xs font-bold uppercase text-slate-400">Unit Catalogue</label>
          <select
            value={selectedSetId}
            onChange={(event) => setSelectedSetId(event.target.value as SpriteSetId)}
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
          >
            {SPRITE_SETS.map((set) => (
              <option key={set.id} value={set.id}>{set.label}</option>
            ))}
          </select>

          <label className="mt-4 block text-xs font-bold uppercase text-slate-400">Action</label>
          <select
            value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
          >
            {actionOptions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          <label className="mt-4 block text-xs font-bold uppercase text-slate-400">Direction</label>
          <select
            value={selectedDirection}
            onChange={(event) => setSelectedDirection(event.target.value)}
            disabled={isPortrait}
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 disabled:opacity-40"
          >
            {directionOptions.map((direction) => (
              <option key={direction} value={direction}>{direction}</option>
            ))}
          </select>
          {!isPortrait && sourcePose.flipX && (
            <div className="mt-2 rounded-lg border border-sky-400/25 bg-sky-950/40 px-3 py-2 text-xs text-sky-100">
              Runtime mirror: {selectedDirection} uses flipped {sourceDirection} frames.
            </div>
          )}

          <label className="mt-4 block text-xs font-bold uppercase text-slate-400">Preview Scale: {scale.toFixed(1)}x</label>
          <input
            type="range"
            min="2"
            max="7"
            step="0.25"
            value={scale}
            onChange={(event) => setScale(Number(event.target.value))}
            className="mt-2 w-full"
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold uppercase hover:bg-slate-700"
            >
              {paused ? 'Play' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => setShowGuides((value) => !value)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold uppercase hover:bg-slate-700"
            >
              Guides
            </button>
          </div>

          <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
            <div className="font-bold text-sky-200">Audit Snapshot</div>
            <div className="mt-2 text-slate-400">
              {selectedAudit ? `${selectedAudit.flagged_count} flagged of ${selectedAudit.frame_count} frames` : 'No audit report loaded'}
            </div>
            <div className={selectedFlags.length ? 'mt-2 text-amber-300' : 'mt-2 text-emerald-300'}>
              Current selection: {selectedFlags.length ? `${selectedFlags.length} flagged frame(s)` : 'no automated flags'}
            </div>
          </div>
        </aside>

        <main className="min-w-0 rounded-xl border border-sky-400/20 bg-slate-900/80 p-4 shadow-2xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">{selectedSet.label}</div>
              <h2 className="mt-1 text-3xl font-black uppercase">{selectedAction} {isPortrait ? '' : selectedDirection}</h2>
              {!isPortrait && (
                <div className="mt-1 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                  Source folder: {sourceDirection}{sourcePose.flipX ? ' mirrored' : ''}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-lime-300">
              {frameCount} frames
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-700 bg-black">
            <canvas ref={canvasRef} width={920} height={520} className="h-auto w-full" data-testid="sprite-debug-canvas" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {frameUrls.map((url, index) => (
              <div key={url} className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                <img
                  src={url}
                  alt={`${selectedAction} frame ${index}`}
                  className="mx-auto h-24 w-24 object-contain [image-rendering:pixelated]"
                  style={{ transform: sourcePose.flipX ? 'scaleX(-1)' : undefined }}
                />
                <div className="mt-1 truncate text-center font-mono text-xs text-slate-400">frame_{String(index).padStart(3, '0')}</div>
              </div>
            ))}
          </div>

          {selectedFlags.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-950/40 p-4">
              <div className="font-bold uppercase text-amber-200">Automated Flags For This Selection</div>
              <ul className="mt-2 space-y-1 text-sm text-amber-100">
                {selectedFlags.slice(0, 8).map((frame) => (
                  <li key={frame.path}>{frame.path.replace(/\\/g, '/')} - {frame.flags.join(', ')}</li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

function getFrameCount(metadata: SpriteMetadata | undefined, action: string, direction: string) {
  if (!metadata) return 0;
  if (action.startsWith('portrait/')) {
    const portraitAction = action.split('/')[1];
    return metadata.portraits?.[portraitAction] ?? 0;
  }

  return metadata.animations?.[action]?.[direction] ?? 0;
}

function getMirroredFiveDirectionPose(direction: string) {
  switch (direction) {
    case 'west':
      return { direction: 'east', flipX: true };
    case 'south-west':
      return { direction: 'south-east', flipX: true };
    case 'north-west':
      return { direction: 'north-east', flipX: true };
    default:
      return { direction, flipX: false };
  }
}

function getFrameUrl(root: string, action: string, direction: string, index: number) {
  const frameId = String(index).padStart(3, '0');
  if (action.startsWith('portrait/')) {
    const portraitAction = action.split('/')[1];
    return `${root}/portrait/${portraitAction}/frame_${frameId}.png`;
  }

  return `${root}/${action}/${direction}/frame_${frameId}.png`;
}

function drawDebugScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  scale: number,
  showGuides: boolean,
  isPortrait: boolean,
  flipX: boolean,
) {
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const baselineY = height * 0.72;

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#14253b');
  background.addColorStop(1, '#050a12');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  if (!isPortrait) {
    ctx.save();
    ctx.translate(centerX, baselineY + 12);
    ctx.fillStyle = '#4d7c0f';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(146, 0);
    ctx.lineTo(0, 58);
    ctx.lineTo(-146, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 90, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (image?.complete && image.naturalWidth > 0) {
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    const drawX = centerX - drawW / 2;
    const drawY = isPortrait ? height / 2 - drawH / 2 : baselineY - drawH;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -drawW / 2, drawY, drawW, drawH);
    } else {
      ctx.drawImage(image, drawX, drawY, drawW, drawH);
    }

    if (showGuides) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(flipX ? -drawW / 2 : drawX, drawY, drawW, drawH);
      if (flipX) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(width, baselineY);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(centerX - 5, baselineY - 5, 10, 10);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Loading sprite frame...', centerX, height / 2);
  }

  if (showGuides) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(20, 20, 290, 74);
    ctx.fillStyle = '#dbeafe';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Blue box = normalized frame', 36, 50);
    ctx.fillText('Yellow line = ground anchor', 36, 76);
  }
}
