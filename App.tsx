
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
  const [menuIntro, setMenuIntro] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const dialogAnchorRef = useRef<'desktop' | 'mobile' | null>(null);
  const desktopNewGameRef = useRef<HTMLButtonElement>(null);
  const mobileNewGameRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstDifficultyRef = useRef<HTMLButtonElement>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [detectedTouchMode, setDetectedTouchMode] = useState(detectTouchMode);
  const [controlMode, setControlMode] = useState<ControlMode>(getSavedControlMode);
  const [menuNotice, setMenuNotice] = useState<string | null>(null);
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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;
    const timer = window.setTimeout(() => setMenuIntro(true), 1500);
    return () => window.clearTimeout(timer);
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
      engineRef.current.clearIncompatibleSave();
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

  const handleOpenNewGame = (event: React.MouseEvent<HTMLButtonElement>) => {
    dialogAnchorRef.current = event.currentTarget.classList.contains('menu-hotspot') ? 'desktop' : 'mobile';
    setShowDifficulty(true);
  };

  const handleCloseDifficulty = () => {
    setShowDifficulty(false);
  };

  useEffect(() => {
    if (showDifficulty || !dialogAnchorRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = dialogAnchorRef.current === 'desktop' ? desktopNewGameRef.current : mobileNewGameRef.current;
      target?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showDifficulty]);

  useEffect(() => {
    if (!showDifficulty) return undefined;
    firstDifficultyRef.current?.focus();
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseDifficulty();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll('button:not(:disabled)')
      ) as HTMLButtonElement[];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
    };
  }, [showDifficulty]);

  if (isSpriteDebugMode) {
    return <SpriteDebugLab />;
  }

  const isTouchMode = controlMode === 'auto' ? detectedTouchMode : controlMode === 'touch';
  const commandBriefText = isTouchMode
    ? 'Touch controls are tuned for mobile: tap a staff member or building to select it, double tap the schoolyard to move or command, drag the field to pan, and use the Center button to snap back to the staffroom.'
    : 'Faculty units are controlled like a classic RTS: left click to select, right click to issue orders, middle mouse to pan, and the wheel to zoom around the school grounds.';

  if (!gameStarted) {
    return (
      <div className="menu-hotspot-root">
        <span className="menu-test-label" aria-hidden="true">Schoolyard Defence — Australian Edition — VERSION 2</span>
        <img
          className="menu-hotspot-art"
          src="/menu/schoolyard-defence-menu.png"
          alt="Schoolyard Defence main menu showing the staffroom war table and campaign controls"
          draggable={false}
        />

        {!showDifficulty ? (
          <div
            className={`menu-hotspot-stage ${menuIntro ? 'is-ready' : ''}`}
            inert={!menuIntro}
          >
            <button
              ref={desktopNewGameRef}
              type="button"
              onClick={handleOpenNewGame}
              className="menu-hotspot is-new-game"
              style={{ left: '73.45%', top: '24.8%', width: '21.4%', height: '18.4%' }}
              aria-label="New Game"
            >
              <span className="sr-only">New Game</span>
            </button>

            {hasSave && (
              <button
                type="button"
                onClick={() => handleStartGame(true)}
                className="menu-hotspot is-continue"
                style={{ left: '72.9%', top: '44.0%', width: '22.0%', height: '16.7%' }}
              >
                <span className="sr-only">Continue Campaign</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenSpriteDebug}
              className="menu-hotspot is-debug"
              style={{ left: '72.2%', top: '62.0%', width: '22.7%', height: '17.9%' }}
            >
              <span className="sr-only">Sprite Debug Lab</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuNotice('Options are coming in the next briefing.')}
              className="menu-hotspot is-options"
              style={{ left: '67.2%', top: '85.5%', width: '6.4%', height: '10.2%' }}
            >
              <span className="sr-only">Options</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuNotice('The field manual is still being written.')}
              className="menu-hotspot is-manual"
              style={{ left: '74.7%', top: '85.5%', width: '6.4%', height: '10.2%' }}
            >
              <span className="sr-only">Manual</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuNotice('Achievements are not available yet.')}
              className="menu-hotspot is-achievements"
              style={{ left: '82.2%', top: '85.5%', width: '7.5%', height: '10.2%' }}
            >
              <span className="sr-only">Achievements</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuNotice('Close this browser tab to exit.')}
              className="menu-hotspot is-exit"
              style={{ left: '91.2%', top: '85.5%', width: '6.1%', height: '10.2%' }}
            >
              <span className="sr-only">Exit</span>
            </button>

            <div className="menu-mobile-actions" aria-label="Main menu actions">
              <button ref={mobileNewGameRef} type="button" onClick={handleOpenNewGame}>New Game</button>
              {hasSave && <button type="button" onClick={() => handleStartGame(true)}>Continue</button>}
              <button type="button" onClick={handleOpenSpriteDebug}>Sprite Debug</button>
              <button type="button" onClick={() => setMenuNotice('Options are coming in the next briefing.')}>Options</button>
              <button type="button" onClick={() => setMenuNotice('The field manual is still being written.')}>Manual</button>
              <button type="button" onClick={() => setMenuNotice('Achievements are not available yet.')}>Achievements</button>
              <button type="button" onClick={() => setMenuNotice('Close this browser tab to exit.')}>Exit</button>
            </div>

            {menuNotice && (
              <div className="menu-notice" role="status">
                <span>{menuNotice}</span>
                <button type="button" onClick={() => setMenuNotice(null)} aria-label="Dismiss message">×</button>
              </div>
            )}
          </div>
        ) : (
          <div
            ref={dialogRef}
            className="menu-difficulty-dossier"
            role="dialog"
            aria-modal="true"
            aria-label="Choose starting difficulty"
          >
            <div className="menu-difficulty-header">
              <span>New Game</span>
              <span>Australian Edition / Version 2</span>
            </div>
            {(Object.values(Difficulty) as Difficulty[]).map((difficulty) => (
              <button
                ref={difficulty === Difficulty.EASY ? firstDifficultyRef : undefined}
                key={difficulty}
                type="button"
                onClick={() => handleStartGame(false, difficulty)}
                className={`menu-difficulty-row ${difficulty.toLowerCase()}`}
              >
                <span className="menu-difficulty-name">{difficulty}</span>
                <span className="menu-difficulty-desc">{difficultyDescriptions[difficulty]}</span>
              </button>
            ))}
            <button type="button" onClick={handleCloseDifficulty} className="menu-difficulty-back">
              Back to menu
            </button>
          </div>
        )}
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
