import React, { useEffect, useRef, useState } from 'react';
import { EntityType, Faction, UnitState } from '../types';
import { GameEngine } from '../game/GameEngine';

interface Props {
  engine: GameEngine;
  isTouchMode?: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const TUTORIAL_DONE_KEY = 'schoolyard_tutorial_done';

const PRODUCERS: EntityType[] = [
  EntityType.STAFFROOM,
  EntityType.SPORTS_CENTRE,
  EntityType.MATHS_DEPT,
  EntityType.SCIENCE_LAB,
  EntityType.CANTEEN,
];

const NEW_BUILDINGS: EntityType[] = [
  EntityType.LOCKER,
  EntityType.SPORTS_CENTRE,
  EntityType.MATHS_DEPT,
  EntityType.SCIENCE_LAB,
  EntityType.COMMON_ROOM,
  EntityType.CANTEEN,
  EntityType.BOWLING_MACHINE,
];

const GATHER_STATES = new Set([
  UnitState.GATHER_GO,
  UnitState.GATHER_WORK,
  UnitState.GATHER_RETURN,
]);

interface StepDef {
  id: string;
  title: string;
  mouse: string;
  touch: string;
}

const STEPS: StepDef[] = [
  {
    id: 'select',
    title: 'Select your Teacher Aide',
    mouse: 'Left-click the Teacher Aide near the staffroom. They are your worker: gathering and building.',
    touch: 'Tap the Teacher Aide near the staffroom. They are your worker: gathering and building.',
  },
  {
    id: 'gather',
    title: 'Collect resources',
    mouse: 'With the Aide selected, right-click a bookshelf (curriculum) or the admin office (grants).',
    touch: 'With the Aide selected, double-tap a bookshelf (curriculum) or the admin office (grants).',
  },
  {
    id: 'rally',
    title: 'Set a rally point',
    mouse: 'Select the staffroom, then right-click the schoolyard (or a resource) so new staff walk straight to work.',
    touch: 'Select the staffroom, then double-tap the schoolyard (or a resource) so new staff walk straight to work.',
  },
  {
    id: 'train',
    title: 'Recruit a Sub Teacher',
    mouse: 'Select the staffroom and click SUB in the command card. Subs hold the line early.',
    touch: 'Select the staffroom and tap SUB in the command card. Subs hold the line early.',
  },
  {
    id: 'build',
    title: 'Build a structure',
    mouse: 'Select the Aide, pick a building in the command card, then left-click the schoolyard to place it.',
    touch: 'Select the Aide, pick a building in the command card, then tap the schoolyard to place it.',
  },
  {
    id: 'defend',
    title: 'Defend Wave 1',
    mouse: 'Wave 1 is coming. Move your Sub between the students and the staffroom and fight.',
    touch: 'Wave 1 is coming. Move your Sub between the students and the staffroom and fight.',
  },
];

export const TutorialOverlay: React.FC<Props> = ({ engine, isTouchMode = false, onComplete, onSkip }) => {
  const [done, setDone] = useState<boolean[]>(() => STEPS.map(() => false));
  const doneRef = useRef(done);
  doneRef.current = done;
  const releasedRef = useRef(false);
  const maxTotalRef = useRef<number | null>(null);
  const baselineRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const callbacksRef = useRef({ onComplete, onSkip });
  callbacksRef.current = { onComplete, onSkip };

  useEffect(() => {
    const poll = () => {
      if (completedRef.current) return;
      const entities = engine.entities;
      const total = engine.state.resources.grants + engine.state.resources.curriculum;
      if (maxTotalRef.current === null || total > maxTotalRef.current) maxTotalRef.current = total;
      if (baselineRef.current === null || total < baselineRef.current) baselineRef.current = total;
      // A big resource drop means a fresh run (retry): reset tracking.
      if (maxTotalRef.current !== null && total < maxTotalRef.current - 50) {
        maxTotalRef.current = total;
        baselineRef.current = total;
        releasedRef.current = false;
        setDone(STEPS.map(() => false));
        return;
      }

      const selected = engine.getSelectedEntities();
      const aides = entities.filter((e) => e.type === EntityType.TEACHER_AIDE && e.faction === Faction.FACULTY);
      const selectDone = doneRef.current[0] || selected.some((e) => e.type === EntityType.TEACHER_AIDE);
      const gatherDone =
        doneRef.current[1] ||
        (baselineRef.current !== null && maxTotalRef.current !== null && maxTotalRef.current - baselineRef.current >= 15) ||
        aides.some((e) => e.carriedResource > 0 || GATHER_STATES.has(e.state));
      const rallyDone =
        doneRef.current[2] ||
        entities.some((e) => PRODUCERS.includes(e.type) && (e.rallyPoint !== null || e.rallyTargetId !== null));
      const staffroom = entities.find((e) => e.type === EntityType.STAFFROOM && e.faction === Faction.FACULTY);
      const trainDone =
        doneRef.current[3] ||
        entities.some((e) => e.type === EntityType.SUB_TEACHER && e.faction === Faction.FACULTY) ||
        (staffroom?.trainingQueue.some((q) => q.type === EntityType.SUB_TEACHER) ?? false);
      const buildDone =
        doneRef.current[4] ||
        entities.some((e) => NEW_BUILDINGS.includes(e.type) && e.faction === Faction.FACULTY);

      const next = [selectDone, gatherDone, rallyDone, trainDone, buildDone, doneRef.current[5]];

      // Hold the first wave back while the player learns the basics.
      const basicsDone = next.slice(0, 5).every(Boolean);
      if (!basicsDone && engine.state.nextWaveTime < 45) {
        engine.state.nextWaveTime = 45;
      }
      if (basicsDone && !releasedRef.current) {
        releasedRef.current = true;
        if (engine.state.nextWaveTime > 20) engine.state.nextWaveTime = 20;
      }

      // Defend step: wave 1 arrived and was cleared (or wave 2 began).
      if (basicsDone) {
        const studentsAlive = entities.filter((e) => e.faction === Faction.STUDENTS && e.hp > 0).length;
        if (engine.state.wave >= 2 || (engine.state.wave >= 1 && studentsAlive === 0)) {
          next[5] = true;
        }
      }

      const changed = next.some((v, i) => v !== doneRef.current[i]);
      if (changed) setDone(next);

      if (next.every(Boolean) && !completedRef.current) {
        completedRef.current = true;
        try {
          localStorage.setItem(TUTORIAL_DONE_KEY, '1');
        } catch {
          // Storage unavailable: tutorial simply shows again next run.
        }
        window.setTimeout(() => callbacksRef.current.onComplete(), 1200);
      }
    };

    const id = window.setInterval(poll, 400);
    poll();
    return () => window.clearInterval(id);
  }, [engine]);

  const currentIndex = done.findIndex((v) => !v);
  const allDone = done.every(Boolean);
  const hint = !allDone && currentIndex >= 0 ? STEPS[currentIndex] : null;

  return (
    <div className="tutorial-overlay" aria-label="Tutorial">
      <div className="tutorial-card glass-panel">
        <div className="tutorial-header">
          <div>
            <div className="tutorial-kicker">First Day on Duty</div>
            <h2>{allDone ? 'School Secure' : `Step ${Math.min(currentIndex + 1, STEPS.length)} of ${STEPS.length}`}</h2>
          </div>
          {!allDone && (
            <button type="button" onClick={onSkip} className="tutorial-skip">
              Skip
            </button>
          )}
        </div>
        {hint && <p className="tutorial-hint">{hint.title}: {isTouchMode ? hint.touch : hint.mouse}</p>}
        {allDone && <p className="tutorial-hint">Wave 1 repelled. The schoolyard is yours, teacher.</p>}
        <ol className="tutorial-steps">
          {STEPS.map((step, i) => (
            <li key={step.id} className={done[i] ? 'is-done' : i === currentIndex ? 'is-current' : ''}>
              <span className="tutorial-check" aria-hidden="true">{done[i] ? '✓' : `${i + 1}`}</span>
              <span>{step.title}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
