import React, { useEffect, useRef, useState } from 'react';
import { GameState } from '../types';
import { GameEngine } from '../game/GameEngine';

type ControlMode = 'auto' | 'mouse' | 'touch';

interface Props {
  state: GameState;
  engine: GameEngine;
  isTouchMode?: boolean;
  controlMode: ControlMode;
  detectedTouchMode: boolean;
  onControlModeChange: (mode: ControlMode) => void;
  onOpenBriefing: () => void;
  suppressPauseMenu?: boolean;
}

interface WaveBannerState {
  title: string;
  subtitle: string;
}

export const GameOverlay: React.FC<Props> = ({
  state,
  engine,
  isTouchMode = false,
  controlMode,
  detectedTouchMode,
  onControlModeChange,
  onOpenBriefing,
  suppressPauseMenu = false
}) => {
  const [saveLabel, setSaveLabel] = useState('SAVE');
  const [activeTab, setActiveTab] = useState<'MENU' | 'OPTIONS'>('MENU');
  const [waveBanner, setWaveBanner] = useState<WaveBannerState | null>(null);
  const previousWaveRef = useRef(state.wave);

  const isPaused = engine.paused;
  const incomingWave = !isPaused && state.nextWaveTime <= 10 && state.nextWaveTime > 0;
  const controlLabel =
    controlMode === 'auto'
      ? `Auto ${isTouchMode ? 'Touch' : 'Click'}`
      : controlMode === 'touch'
        ? 'Touch'
        : 'Click';

  const handleQuickControlToggle = () => {
    onControlModeChange(isTouchMode ? 'mouse' : 'touch');
  };

  useEffect(() => {
    if (state.wave > previousWaveRef.current) {
      const nextBanner =
        state.wave === 10
          ? { title: 'Boss Wave', subtitle: 'The Rat King has rolled onto campus.' }
          : { title: `Wave ${state.wave}`, subtitle: 'Students are charging the staffroom.' };

      setWaveBanner(nextBanner);
      const timeoutId = window.setTimeout(() => setWaveBanner(null), 3200);
      previousWaveRef.current = state.wave;
      return () => window.clearTimeout(timeoutId);
    }

    previousWaveRef.current = state.wave;
    return undefined;
  }, [state.wave]);

  const handleSave = () => {
    engine.saveGame();
    setSaveLabel('SAVED!');
    setTimeout(() => setSaveLabel('SAVE'), 2000);
  };

  const handleRetry = () => {
    if (confirm('Are you sure you want to restart the school year?')) {
      engine.resetGame(state.difficulty);
      engine.setPaused(false);
    }
  };

  return (
    <>
      {isPaused && !suppressPauseMenu && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="glass-panel animate-fade-in w-full max-w-sm rounded-[28px] border border-sky-300/15 p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">Pause Menu</div>
              <h2 className="mt-2 text-3xl font-bold text-white">School Paused</h2>
            </div>

            <div className="mb-6 flex border-b border-slate-600">
              <button
                onClick={() => setActiveTab('MENU')}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${activeTab === 'MENU' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                MENU
              </button>
              <button
                onClick={() => setActiveTab('OPTIONS')}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${activeTab === 'OPTIONS' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                OPTIONS
              </button>
            </div>

            <div className="flex min-h-[150px] flex-col justify-center">
              {activeTab === 'MENU' && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => engine.setPaused(false)}
                    className="arcade-button w-full rounded-2xl border border-sky-300/20 bg-sky-600 py-3 font-bold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-sky-500"
                  >
                    Resume
                  </button>
                  <button
                    onClick={onOpenBriefing}
                    className="arcade-button w-full rounded-2xl border border-white/10 bg-slate-700 py-3 font-bold uppercase tracking-[0.18em] text-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-600"
                  >
                    Mission Briefing
                  </button>
                  <button
                    onClick={handleRetry}
                    className="arcade-button w-full rounded-2xl border border-rose-300/20 bg-rose-600 py-3 font-bold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
                  >
                    Retry Level
                  </button>
                  <button
                    onClick={handleSave}
                    className="arcade-button w-full rounded-2xl border border-white/10 bg-slate-700 py-3 font-bold uppercase tracking-[0.18em] text-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-600"
                  >
                    {saveLabel}
                  </button>
                </div>
              )}

              {activeTab === 'OPTIONS' && (
                <div className="flex flex-col gap-4">
                  <div className="rounded border border-slate-700 bg-slate-900 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="font-bold text-slate-300">Controls</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Auto: {detectedTouchMode ? 'Touch' : 'Click'}
                      </span>
                    </div>
                    <div className="control-mode-grid">
                      {(['auto', 'mouse', 'touch'] as ControlMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onControlModeChange(mode)}
                          className={controlMode === mode ? 'control-mode-button is-active' : 'control-mode-button'}
                        >
                          {mode === 'mouse' ? 'Click' : mode === 'touch' ? 'Touch' : 'Auto'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] leading-tight text-slate-500">
                      Click mode uses left and right mouse controls. Touch mode shows tap and double-tap prompts.
                    </p>
                  </div>

                  <div className="rounded border border-slate-700 bg-slate-900 p-4">
                    <label className="group flex cursor-pointer items-center justify-between">
                      <span className="font-bold text-slate-300 transition-colors group-hover:text-white">Edge Panning</span>
                      <div className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={state.settings.edgePanning}
                          onChange={(event) => engine.updateSettings({ edgePanning: event.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                      </div>
                    </label>
                    <p className="mt-2 text-[10px] leading-tight text-slate-500">
                      {isTouchMode
                        ? 'Touch mode uses drag panning on the playfield. Edge panning is mainly for desktop mouse control.'
                        : 'Move the camera by pushing the mouse to the edge of the canvas.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {waveBanner && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4">
          <div className="glass-panel animate-bounce-in rounded-[26px] border border-rose-300/20 px-6 py-4 text-center shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-rose-300">{waveBanner.title}</div>
            <div className="mt-2 text-xl font-bold text-white">{waveBanner.subtitle}</div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
        <div className="rts-topbar">
          <div className="rts-top-chip">
            <span>Wave</span>
            <strong>{state.wave + 1}</strong>
          </div>
          <div className="rts-top-chip">
            <span>Next</span>
            <strong>{Math.ceil(state.nextWaveTime)}s</strong>
          </div>
          <div className="rts-top-chip">
            <span>Grants</span>
            <strong>${Math.floor(state.resources.grants)}</strong>
          </div>
          <div className="rts-top-chip">
            <span>Curriculum</span>
            <strong>{Math.floor(state.resources.curriculum)}</strong>
          </div>
          {incomingWave && (
            <div className="rts-top-warning">Incoming wave in {Math.ceil(state.nextWaveTime)}s</div>
          )}
          {engine.pendingBuild && (
            <div className="rts-top-warning is-build">{isTouchMode ? 'Tap to place structure' : 'Click to place structure'}</div>
          )}
          {isTouchMode && (
            <div className="rts-top-warning is-touch-hint">Tap select - double tap command</div>
          )}
          <button onClick={handleQuickControlToggle} className="rts-top-button">Controls: {controlLabel}</button>
          <button onClick={() => engine.centerViewOnStaffroom()} className="rts-top-button">Center</button>
          <button onClick={onOpenBriefing} className="rts-top-button">Briefing</button>
          <button onClick={() => engine.togglePause()} className="rts-top-button">{isPaused ? 'Resume' : 'Pause'}</button>
        </div>
      </div>
    </>
  );
};
