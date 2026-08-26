
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { GameOverlay } from './components/GameOverlay';
import { GameState, EntityType, Difficulty } from './types';
import { UnitDiscoveryModal } from './components/UnitDiscoveryModal';
import { MissionBriefing } from './components/MissionBriefing';
import { SpriteDebugLab } from './components/SpriteDebugLab';

declare const __SMOKE_TEST__: boolean;

type SmokeTestWindow = Window & {
  __schoolyardEngine?: GameEngine;
  __schoolyardStartNormal?: () => void;
};

const difficultyDescriptions: Record<Difficulty, string> = {
  [Difficulty.EASY]: 'More grants, weaker students',
  [Difficulty.NORMAL]: 'Standard Australian public school experience',
  [Difficulty.HARD]: 'Budget cuts and extra large intakes'
};

const SPRITE_DEBUG_LAUNCH_KEY = 'schoolyard_allow_sprite_debug';
const CONTROL_MODE_KEY = 'schoolyard_control_mode';

type ControlMode = 'auto' | 'mouse' | 'touch';

const isControlMode = (value: string | null): value is ControlMode =>
  value === 'auto' || value === 'mouse' || value === 'touch';

const getSavedControlMode = (): ControlMode => {
  const savedMode = localStorage.getItem(CONTROL_MODE_KEY);
  return isControlMode(savedMode) ? savedMode : 'auto';
};

const detectTouchMode = () => {
  const hasCoarsePrimaryPointer = window.matchMedia('(pointer: coarse)').matches;
  const compactViewport = window.innerWidth <= 720;
  const tabletViewport = window.innerWidth <= 1024;
  const hasFinePointer = window.matchMedia('(any-pointer: fine)').matches;
  const canHover = window.matchMedia('(any-hover: hover)').matches;

  if (compactViewport) return true;
  if (!tabletViewport) return false;

  return hasCoarsePrimaryPointer && !hasFinePointer && !canHover;
};

export default function App() {
  const engineRef = useRef<GameEngine>(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(engineRef.current.state);
  const [newDiscovery, setNewDiscovery] = useState<EntityType | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [detectedTouchMode, setDetectedTouchMode] = useState(detectTouchMode);
  const [controlMode, setControlMode] = useState<ControlMode>(getSavedControlMode);
  const requestedSpriteDebugMode = new URLSearchParams(window.location.search).has('spriteDebug');
  const [spriteDebugAuthorized] = useState(() => {
    const debugLaunchExpires = Number(sessionStorage.getItem(SPRITE_DEBUG_LAUNCH_KEY) || 0);
    return requestedSpriteDebugMode && debugLaunchExpires > Date.now();
  });
  const isSpriteDebugMode = requestedSpriteDebugMode && spriteDebugAuthorized;

  if (requestedSpriteDebugMode && !isSpriteDebugMode) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
  }

  useEffect(() => {
    // Subscribe React to engine updates for UI
    engineRef.current.setStateCallback((newState) => {
      setGameState(newState);
    });

    // Subscribe to new unit discoveries
    engineRef.current.setNewUnitCallback((type) => {
       setNewDiscovery(type);
    });

    // Initial pause until game starts
    engineRef.current.setPaused(true);
    
    // Check for save
    setHasSave(engineRef.current.hasSave());

  }, []);

  useEffect(() => {
    if (!__SMOKE_TEST__) return undefined;
    const smokeWindow = window as SmokeTestWindow;
    smokeWindow.__schoolyardEngine = engineRef.current;
    smokeWindow.__schoolyardStartNormal = () => {
      engineRef.current.resetGame(Difficulty.NORMAL);
      setGameStarted(true);
      setShowBriefing(false);
      engineRef.current.setPaused(false);
      engineRef.current.centerViewOnStaffroom();
    };
    return () => {
      delete smokeWindow.__schoolyardEngine;
      delete smokeWindow.__schoolyardStartNormal;
    };
  }, []);

  useEffect(() => {
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    const anyPointerQuery = window.matchMedia('(any-pointer: fine)');
    const hoverQuery = window.matchMedia('(hover: none)');
    const anyHoverQuery = window.matchMedia('(any-hover: hover)');
    const updateTouchMode = () => setDetectedTouchMode(detectTouchMode());

    pointerQuery.addEventListener('change', updateTouchMode);
    anyPointerQuery.addEventListener('change', updateTouchMode);
    hoverQuery.addEventListener('change', updateTouchMode);
    anyHoverQuery.addEventListener('change', updateTouchMode);
    window.addEventListener('resize', updateTouchMode);

    return () => {
      pointerQuery.removeEventListener('change', updateTouchMode);
      anyPointerQuery.removeEventListener('change', updateTouchMode);
      hoverQuery.removeEventListener('change', updateTouchMode);
      anyHoverQuery.removeEventListener('change', updateTouchMode);
      window.removeEventListener('resize', updateTouchMode);
    };
  }, []);

  const handleControlModeChange = (mode: ControlMode) => {
    setControlMode(mode);
    localStorage.setItem(CONTROL_MODE_KEY, mode);
  };

  useEffect(() => {
    const blockBrowserMouseNavigation = (event: MouseEvent) => {
      if (event.button !== 3 && event.button !== 4) return;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('mousedown', blockBrowserMouseNavigation, true);
    window.addEventListener('mouseup', blockBrowserMouseNavigation, true);
    window.addEventListener('auxclick', blockBrowserMouseNavigation, true);

    return () => {
      window.removeEventListener('mousedown', blockBrowserMouseNavigation, true);
      window.removeEventListener('mouseup', blockBrowserMouseNavigation, true);
      window.removeEventListener('auxclick', blockBrowserMouseNavigation, true);
    };
  }, []);

  useEffect(() => {
    if (!gameStarted) return undefined;

    const saveBeforeUnload = () => {
      engineRef.current.saveGame();
    };

    window.addEventListener('beforeunload', saveBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', saveBeforeUnload);
    };
  }, [gameStarted]);

  const handleCloseModal = () => {
    setNewDiscovery(null);
    engineRef.current.setPaused(false);
  };

  const handleCloseBriefing = () => {
    setShowBriefing(false);
    engineRef.current.setPaused(false);
  };

  const handleStartGame = (load: boolean, difficulty: Difficulty = Difficulty.NORMAL) => {
    if (load) {
      const success = engineRef.current.loadGame();
      if (!success) {
        setHasSave(false);
        engineRef.current.resetGame(difficulty);
      }
    } else {
      engineRef.current.resetGame(difficulty);
    }
    setGameStarted(true);
    if (load) {
      setShowBriefing(false);
      engineRef.current.setPaused(false);
    } else {
      setShowBriefing(true);
      engineRef.current.setPaused(true);
      engineRef.current.centerViewOnStaffroom();
    }
  };

  const handleRetry = () => {
    engineRef.current.resetGame(gameState.difficulty);
    engineRef.current.setPaused(false);
  };

  const handleOpenSpriteDebug = () => {
    sessionStorage.setItem(SPRITE_DEBUG_LAUNCH_KEY, String(Date.now() + 3000));
    window.history.replaceState(null, '', '?spriteDebug=1');
    window.location.reload();
  };

  if (isSpriteDebugMode) {
    return <SpriteDebugLab />;
  }

  const isTouchMode = controlMode === 'auto' ? detectedTouchMode : controlMode === 'touch';
  const commandBriefText = isTouchMode
    ? 'Touch controls are tuned for mobile: tap a staff member or building to select it, double tap the schoolyard to move or command, drag the field to pan, and use the Center button to snap back to the staffroom.'
    : 'Faculty units are controlled like a classic RTS: left click to select, right click to issue orders, middle mouse to pan, and the wheel to zoom around the school grounds.';

  if (!gameStarted) {
    return (
      <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-12%] top-[-6%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-8%] h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
          <div className="absolute inset-x-0 top-[12%] mx-auto h-px max-w-5xl bg-white/10" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <section className="space-y-6">
            <span className="ink-badge">Oval Defense Strategy</span>

            <div className="space-y-4">
              <h1 className="font-display text-5xl uppercase leading-none text-white sm:text-6xl lg:text-7xl">
                Schoolyard
                <span className="mt-2 block text-sky-300">Defence</span>
              </h1>
              <p className="max-w-xl text-lg text-slate-200 sm:text-xl">
                Hold the staffroom together, stretch every grant dollar, and stop the student stampede before the term collapses.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="ink-badge">Build departments and defenses</span>
              <span className="ink-badge">Harvest grants and curriculum</span>
              <span className="ink-badge">Survive escalating waves</span>
            </div>

            <div className="glass-panel max-w-2xl rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.3em] text-sky-200/80">
                    Command Brief
                  </div>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                    {commandBriefText}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-right shadow-lg">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Campaign Tagline</div>
                  <div className="mt-2 max-w-[14rem] text-sm font-medium text-amber-200">
                    Protect the staffroom. Manage the budget. Survive the students.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-[32px] p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">Australian Edition</div>
                <h2 className="mt-2 text-2xl font-bold text-white">Start or Continue</h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Version 2</span>
                {hasSave && !showDifficulty && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
                    Save Ready
                  </span>
                )}
              </div>
            </div>

            {!showDifficulty ? (
              <div className="space-y-4">
                {hasSave && (
                  <button
                    onClick={() => handleStartGame(true)}
                    className="arcade-button w-full rounded-2xl border border-emerald-300/20 bg-emerald-600 px-6 py-4 text-left transition hover:-translate-y-0.5 hover:bg-emerald-500"
                  >
                    <div className="text-lg font-bold uppercase tracking-[0.18em] text-white">Continue Game</div>
                    <div className="mt-1 text-sm text-emerald-50/90">Jump back into your last defended campus.</div>
                  </button>
                )}

                <button
                  onClick={() => setShowDifficulty(true)}
                  className="arcade-button w-full rounded-2xl border border-sky-300/20 bg-sky-600 px-6 py-4 text-left transition hover:-translate-y-0.5 hover:bg-sky-500"
                >
                  <div className="text-lg font-bold uppercase tracking-[0.18em] text-white">New Game</div>
                  <div className="mt-1 text-sm text-sky-50/90">Start fresh and pick the pressure level you want to face.</div>
                </button>

                <button
                  onClick={handleOpenSpriteDebug}
                  className="arcade-button w-full rounded-2xl border border-amber-300/20 bg-amber-600 px-6 py-4 text-left transition hover:-translate-y-0.5 hover:bg-amber-500"
                >
                  <div className="text-lg font-bold uppercase tracking-[0.18em] text-white">Sprite Debug Lab</div>
                  <div className="mt-1 text-sm text-amber-50/90">Inspect unit sprites, directions, actions, mirrored frames, and audit flags.</div>
                </button>
              </div>
            ) : (
              <div className="animate-fade-in space-y-3">
                {(Object.values(Difficulty) as Difficulty[]).map((difficulty) => {
                  const accent =
                    difficulty === Difficulty.EASY
                      ? 'border-emerald-300/20 bg-emerald-600 hover:bg-emerald-500'
                      : difficulty === Difficulty.HARD
                        ? 'border-rose-300/20 bg-rose-600 hover:bg-rose-500'
                        : 'border-sky-300/20 bg-sky-600 hover:bg-sky-500';

                  return (
                    <button
                      key={difficulty}
                      onClick={() => handleStartGame(false, difficulty)}
                      className={`arcade-button w-full rounded-2xl px-5 py-4 text-left transition hover:-translate-y-0.5 ${accent}`}
                    >
                      <div className="text-lg font-bold uppercase tracking-[0.18em] text-white">{difficulty}</div>
                      <div className="mt-1 text-sm text-white/85">{difficultyDescriptions[difficulty]}</div>
                    </button>
                  );
                })}

                <button
                  onClick={() => setShowDifficulty(false)}
                  className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:text-white"
                >
                  Back to menu
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={`game-screen ${isTouchMode ? 'is-touch-mode' : 'is-pointer-mode'}`}>
      <main className="game-playfield">
        <div className="stage-shell rts-stage">
          <div className="game-viewport">
            <GameCanvas engine={engineRef.current} inputMode={isTouchMode ? 'touch' : 'mouse'} />
            <GameOverlay
              state={gameState}
              engine={engineRef.current}
              isTouchMode={isTouchMode}
              controlMode={controlMode}
              detectedTouchMode={detectedTouchMode}
              onControlModeChange={handleControlModeChange}
              suppressPauseMenu={showBriefing || !!newDiscovery}
              onOpenBriefing={() => {
                setShowBriefing(true);
                engineRef.current.setPaused(true);
              }}
            />
          </div>
        </div>
      </main>

      <HUD state={gameState} engine={engineRef.current} isTouchMode={isTouchMode} />

      {gameState.gameOver && (
        <div className="fixed bottom-[196px] left-1/2 z-50 -translate-x-1/2">
          <button 
            onClick={handleRetry}
            className="arcade-button rounded-full border border-rose-300/20 bg-rose-600 px-8 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-rose-500"
          >
            Retry School Year
          </button>
        </div>
      )}

      {newDiscovery && (
        <UnitDiscoveryModal 
          type={newDiscovery} 
          onClose={handleCloseModal} 
        />
      )}

      {showBriefing && !newDiscovery && (
        <MissionBriefing
          isTouchMode={isTouchMode}
          onClose={handleCloseBriefing}
          onCenterView={() => engineRef.current.centerViewOnStaffroom()}
        />
      )}
    </div>
  );
}
