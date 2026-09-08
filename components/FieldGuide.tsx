import React, { useState } from 'react';
import { EntityType, UpgradeType } from '../types';
import { UNIT_INFO, UNIT_STATS, UPGRADE_STATS, BUILDING_PRODUCTION } from '../constants';
import { UnitPortrait } from './UnitPortrait';

interface Props {
  onClose: () => void;
}

type GuideTab = 'STAFF' | 'BUILDINGS' | 'STUDENTS' | 'UPGRADES';

const STAFF: EntityType[] = [
  EntityType.TEACHER_AIDE,
  EntityType.SUB_TEACHER,
  EntityType.GYM_COACH,
  EntityType.MATH_TEACHER,
  EntityType.SCIENCE_TEACHER,
  EntityType.TUCKSHOP_LADY,
];

const BUILDINGS: EntityType[] = [
  EntityType.STAFFROOM,
  EntityType.SPORTS_CENTRE,
  EntityType.MATHS_DEPT,
  EntityType.SCIENCE_LAB,
  EntityType.COMMON_ROOM,
  EntityType.CANTEEN,
  EntityType.BOWLING_MACHINE,
  EntityType.LOCKER,
];

const STUDENTS: EntityType[] = [
  EntityType.YEAR_7,
  EntityType.FOOTY_KID,
  EntityType.BULLY,
  EntityType.MEAN_GIRL,
  EntityType.ESHAY,
  EntityType.CLASS_CLOWN,
  EntityType.YEAR_7_RAT_KING,
];

const TABS: { id: GuideTab; label: string }[] = [
  { id: 'STAFF', label: 'Staff' },
  { id: 'BUILDINGS', label: 'Buildings' },
  { id: 'STUDENTS', label: 'Students' },
  { id: 'UPGRADES', label: 'Upgrades' },
];

const formatCost = (type: EntityType): string => {
  const cost = UNIT_STATS[type]?.cost;
  if (!cost || (!cost.grants && !cost.curriculum)) return 'Free';
  const parts: string[] = [];
  if (cost.grants) parts.push(`${cost.grants} grants`);
  if (cost.curriculum) parts.push(`${cost.curriculum} curriculum`);
  return parts.join(' + ');
};

const statLine = (type: EntityType): string => {
  const stats = UNIT_STATS[type];
  if (!stats) return '';
  const parts: string[] = [];
  if (stats.hp) parts.push(`HP ${stats.hp}`);
  if (stats.damage > 0) parts.push(`DMG ${stats.damage}`);
  if (stats.damage < 0) parts.push(`HEAL ${Math.abs(stats.damage)}`);
  if (stats.range > 0) parts.push(`RNG ${stats.range}`);
  if (stats.buildTime > 0) parts.push(`BUILD ${stats.buildTime}s`);
  return parts.join(' | ');
};

const unlockLine = (type: EntityType): string | null => {
  const produced = BUILDING_PRODUCTION[type];
  if (produced && produced.length > 0) {
    const names = produced.map((t) => UNIT_INFO[t]?.name || t).join(', ');
    return `Trains: ${names}`;
  }
  if (type === EntityType.COMMON_ROOM) return 'Unlocks Bowling Machine + Coach upgrades';
  if (type === EntityType.BOWLING_MACHINE) return 'Requires Common Room';
  if (type === EntityType.GYM_COACH) return 'Requires Sports Centre';
  if (type === EntityType.MATH_TEACHER) return 'Requires Maths Block';
  if (type === EntityType.SCIENCE_TEACHER) return 'Requires Science Lab';
  if (type === EntityType.TUCKSHOP_LADY) return 'Requires Canteen';
  return null;
};

export const FieldGuide: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<GuideTab>('STAFF');
  const upgrades = (Object.keys(UPGRADE_STATS) as UpgradeType[]);

  return (
    <div className="field-guide-backdrop" role="dialog" aria-modal="true" aria-label="Field guide">
      <div className="field-guide-panel glass-panel">
        <div className="field-guide-header">
          <div>
            <div className="field-guide-kicker">Field Manual</div>
            <h2>Know the Schoolyard</h2>
            <p>Every unit, building, threat, and upgrade in one place.</p>
          </div>
          <button type="button" onClick={onClose} className="field-guide-close">
            Back to duty
          </button>
        </div>

        <div className="field-guide-tabs" role="tablist" aria-label="Guide sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'field-guide-tab is-active' : 'field-guide-tab'}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== 'UPGRADES' ? (
          <div className="field-guide-grid">
            {(tab === 'STAFF' ? STAFF : tab === 'BUILDINGS' ? BUILDINGS : STUDENTS).map((type) => {
              const info = UNIT_INFO[type];
              if (!info) return null;
              const unlock = unlockLine(type);
              return (
                <article key={type} className="field-guide-card">
                  <UnitPortrait type={type} size={64} />
                  <div className="field-guide-card-body">
                    <div className="field-guide-card-role">{info.role}</div>
                    <h3>{info.name}</h3>
                    <p>{info.description}</p>
                    {unlock && <div className="field-guide-unlock">{unlock}</div>}
                    <div className="field-guide-meta">
                      <span>{formatCost(type)}</span>
                      <span>{statLine(type)}</span>
                    </div>
                    <div className="field-guide-flavor">"{info.flavor}"</div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="field-guide-grid">
            {upgrades.map((upgrade) => {
              const stats = UPGRADE_STATS[upgrade];
              const building = UNIT_INFO[stats.building]?.name || stats.building;
              return (
                <article key={upgrade} className="field-guide-card">
                  <div className="field-guide-card-body">
                    <div className="field-guide-card-role">Upgrade - {building}</div>
                    <h3>{stats.name}</h3>
                    <p>{stats.desc}</p>
                    <div className="field-guide-meta">
                      <span>{stats.cost.grants} grants + {stats.cost.curriculum} curriculum</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
