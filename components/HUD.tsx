import React, { useState } from 'react';
import { GameState, EntityType, UpgradeType, Faction } from '../types';
import { GameEngine } from '../game/GameEngine';
import { UNIT_STATS, UNIT_INFO, UPGRADE_STATS, BUILDING_PRODUCTION } from '../constants';
import { UnitPortrait } from './UnitPortrait';

interface Props {
  state: GameState;
  engine: GameEngine;
}

export const HUD: React.FC<Props> = ({ state, engine }) => {
  const [hoveredType, setHoveredType] = useState<EntityType | null>(null);
  const [hoveredUpgrade, setHoveredUpgrade] = useState<UpgradeType | null>(null);

  const selectedEntities = engine.getSelectedEntities();
  const selectedUnit = engine.getPrimarySelectedEntity();
  const hasMultiSelection = selectedEntities.length > 1;
  const isBuilder = selectedUnit?.type === EntityType.TEACHER_AIDE;
  const isConstructing = selectedUnit?.isUnderConstruction;
  const productionList = selectedUnit && BUILDING_PRODUCTION[selectedUnit.type] ? BUILDING_PRODUCTION[selectedUnit.type] : [];
  const hasCoachSelected = selectedEntities.some((entity) => entity.type === EntityType.GYM_COACH);
  const availableUpgrades = selectedUnit
    ? (Object.keys(UPGRADE_STATS) as UpgradeType[]).filter((key) => UPGRADE_STATS[key].building === selectedUnit.type)
    : [];
  const buildOptions = [
    EntityType.LOCKER,
    EntityType.SPORTS_CENTRE,
    EntityType.MATHS_DEPT,
    EntityType.SCIENCE_LAB,
    EntityType.COMMON_ROOM,
    EntityType.CANTEEN,
    EntityType.BOWLING_MACHINE,
  ];

  const tooltipType = hoveredType;
  const tooltipUpgrade = hoveredUpgrade;

  return (
    <div className="rts-hud">
      {(tooltipType || tooltipUpgrade) && (
        <div className="rts-tooltip">
          {tooltipType && UNIT_INFO[tooltipType] ? (
            <>
              <div className="rts-tooltip-title">{UNIT_INFO[tooltipType]?.name}</div>
              <div className="rts-tooltip-role">{UNIT_INFO[tooltipType]?.role}</div>
              <p>{UNIT_INFO[tooltipType]?.description}</p>
              <div className="rts-tooltip-cost">
                {UNIT_STATS[tooltipType].cost?.grants ? `${UNIT_STATS[tooltipType].cost.grants} grants` : ''}
                {UNIT_STATS[tooltipType].cost?.curriculum ? ` ${UNIT_STATS[tooltipType].cost.curriculum} curriculum` : ''}
              </div>
            </>
          ) : tooltipUpgrade && UPGRADE_STATS[tooltipUpgrade] ? (
            <>
              <div className="rts-tooltip-title">{UPGRADE_STATS[tooltipUpgrade].name}</div>
              <div className="rts-tooltip-role">Upgrade</div>
              <p>{UPGRADE_STATS[tooltipUpgrade].desc}</p>
              <div className="rts-tooltip-cost">
                {UPGRADE_STATS[tooltipUpgrade].cost.grants} grants {UPGRADE_STATS[tooltipUpgrade].cost.curriculum} curriculum
              </div>
            </>
          ) : null}
        </div>
      )}

      <section className="rts-minimap">
        <div className="rts-panel-label">Campus</div>
        <div className="rts-minimap-grid">
          <span className="rts-minimap-base" />
          <span className="rts-minimap-admin" />
          <span className="rts-minimap-path path-one" />
          <span className="rts-minimap-path path-two" />
          <span className="rts-minimap-path path-three" />
        </div>
      </section>

      <section className={hasMultiSelection ? 'rts-selection is-multi' : 'rts-selection'}>
        {hasMultiSelection ? (
          <>
            <div className="rts-selection-summary">
              <div className="rts-panel-label">Selected</div>
              <strong>{selectedEntities.length}</strong>
              <span>Units</span>
            </div>
            <div className="rts-selected-roster">
              {selectedEntities.map((entity) => {
                const hpPct = Math.max(0, Math.min(1, entity.hp / entity.maxHp));
                return (
                  <button
                    key={entity.id}
                    type="button"
                    className="rts-selected-card"
                    onClick={() => engine.selectEntity(entity.id)}
                    title={UNIT_INFO[entity.type]?.name || entity.type}
                  >
                    <UnitPortrait type={entity.type} size={38} entityId={entity.id} />
                    <span>{UNIT_STATS[entity.type]?.label || entity.type.slice(0, 3)}</span>
                    <div className="rts-selected-health">
                      <i style={{ width: `${hpPct * 100}%` }} />
                    </div>
                    <small>{Math.floor(entity.hp)}/{entity.maxHp}</small>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="rts-portrait-frame">
              {selectedUnit ? <UnitPortrait type={selectedUnit.type} size={112} entityId={selectedUnit.id} /> : <div className="rts-empty-portrait">?</div>}
            </div>

            <div className="rts-selection-copy">
              <div className="rts-panel-label">{selectedUnit ? 'Selected' : 'Awaiting Orders'}</div>
              <h2>{selectedUnit ? UNIT_INFO[selectedUnit.type]?.name || selectedUnit.type : 'No Unit Selected'}</h2>
              <p>
                {selectedUnit
                  ? UNIT_INFO[selectedUnit.type]?.description || 'No description available.'
                  : 'Left click a staff member, student, building, or resource to inspect it.'}
              </p>

              {selectedUnit && (
                <>
                  <div className="rts-vitals">
                    <div className="rts-vitals-bar">
                      <i style={{ width: `${Math.max(0, Math.min(100, (selectedUnit.hp / selectedUnit.maxHp) * 100))}%` }} />
                    </div>
                    <span>
                      {selectedUnit.isUnderConstruction
                        ? `Building ${Math.floor(selectedUnit.buildProgress)}%`
                        : selectedUnit.trainingQueue.length > 0
                          ? `Training ${UNIT_INFO[selectedUnit.trainingQueue[0].type]?.name || selectedUnit.trainingQueue[0].type} ${Math.floor(selectedUnit.trainingQueue[0].progress)}%`
                          : selectedUnit.carriedResource > 0
                            ? `Carrying ${selectedUnit.carriedResource} ${selectedUnit.resourceType === 'GRANTS' ? 'grants' : 'curriculum'}`
                            : selectedUnit.state.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <div className="rts-stat-row">
                    <div>
                      <span>Integrity</span>
                      <strong>{Math.floor(selectedUnit.hp)}/{selectedUnit.maxHp}</strong>
                    </div>
                    <div>
                      <span>Damage</span>
                      <strong>{selectedUnit.damage || 0}</strong>
                    </div>
                    <div>
                      <span>Range</span>
                      <strong>{selectedUnit.range || '-'}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>

      <section className="rts-actions">
        <div className="rts-panel-label">Command Card</div>
        <div className="rts-action-grid">
          {selectedUnit && isBuilder && (
            <>
              {buildOptions.map((type) => (
                <BuildButton
                  key={type}
                  type={type}
                  active={engine.pendingBuild === type}
                  onClick={() => engine.setPlacementMode(type)}
                  canAfford={engine.canAffordEntity(type)}
                  unlocked={engine.isBuildUnlocked(type)}
                  onHover={setHoveredType}
                  onLeave={() => setHoveredType(null)}
                />
              ))}
            </>
          )}

          {selectedUnit && !isConstructing && productionList.map((unitType) => (
            <UnitButton
              key={unitType}
              type={unitType}
              queuedCount={selectedUnit.trainingQueue.filter((queued) => queued.type === unitType).length}
              state={state}
              onClick={() => engine.purchaseUnit(unitType)}
              onHover={setHoveredType}
              onLeave={() => setHoveredType(null)}
            />
          ))}

          {selectedUnit && !isConstructing && availableUpgrades.map((upgradeType) => (
            <UpgradeButton
              key={upgradeType}
              type={upgradeType}
              state={state}
              onClick={() => engine.researchUpgrade(upgradeType)}
              onHover={setHoveredUpgrade}
              onLeave={() => setHoveredUpgrade(null)}
            />
          ))}

          {selectedUnit?.type === EntityType.GYM_COACH && (
            <CommandButton label="Charge" disabled={!hasCoachSelected} onClick={() => engine.triggerAbility(EntityType.GYM_COACH)} />
          )}

          {(!selectedUnit || (selectedUnit.faction === Faction.FACULTY && !isBuilder && productionList.length === 0 && availableUpgrades.length === 0 && selectedUnit.type !== EntityType.GYM_COACH)) && (
            <div className="rts-action-empty">No commands</div>
          )}
        </div>
      </section>
    </div>
  );
};

const CommandButton: React.FC<{ label: string; disabled?: boolean; onClick: () => void }> = ({ label, disabled, onClick }) => (
  <button disabled={disabled} onClick={onClick} className={['rts-command-button', disabled ? 'is-disabled' : ''].join(' ')}>
    <span>{label}</span>
  </button>
);

const UnitButton: React.FC<{
  type: EntityType;
  queuedCount: number;
  state: GameState;
  onClick: () => void;
  onHover: (type: EntityType) => void;
  onLeave: () => void;
}> = ({ type, queuedCount, state, onClick, onHover, onLeave }) => {
  const stats = UNIT_STATS[type];
  const canAfford = state.resources.grants >= stats.cost.grants && state.resources.curriculum >= stats.cost.curriculum;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(type)}
      onMouseLeave={onLeave}
      disabled={!canAfford}
      className={['rts-command-button has-portrait', !canAfford ? 'is-disabled' : ''].join(' ')}
    >
      {queuedCount > 0 && <strong className="rts-queue-count">{queuedCount}</strong>}
      <UnitPortrait type={type} size={52} />
      <span>{stats.label}</span>
    </button>
  );
};

const BuildButton: React.FC<{
  type: EntityType;
  active?: boolean;
  unlocked?: boolean;
  onClick: () => void;
  canAfford: boolean;
  onHover: (type: EntityType) => void;
  onLeave: () => void;
}> = ({ type, active = false, unlocked = true, onClick, canAfford, onHover, onLeave }) => {
  const stats = UNIT_STATS[type];
  const isLocked = !canAfford || !unlocked;
  const costText = formatCost(type);
  const label = UNIT_INFO[type]?.name || stats.label || type;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(type)}
      onMouseLeave={onLeave}
      disabled={isLocked}
      title={UNIT_INFO[type]?.name || type}
      className={['rts-command-button', active ? 'is-active' : '', isLocked ? 'is-disabled' : ''].join(' ')}
    >
      <span>{label}</span>
      <small>{unlocked ? costText : 'Needs common room'}</small>
    </button>
  );
};

const UpgradeButton: React.FC<{
  type: UpgradeType;
  state: GameState;
  onClick: () => void;
  onHover: (type: UpgradeType) => void;
  onLeave: () => void;
}> = ({ type, state, onClick, onHover, onLeave }) => {
  const stats = UPGRADE_STATS[type];
  const purchased = state.upgrades.includes(type);
  const canAfford = state.resources.grants >= stats.cost.grants && state.resources.curriculum >= stats.cost.curriculum;

  return (
    <button
      onClick={() => {
        if (!purchased && canAfford) onClick();
      }}
      onMouseEnter={() => onHover(type)}
      onMouseLeave={onLeave}
      aria-disabled={purchased || !canAfford}
      className={['rts-command-button', purchased || !canAfford ? 'is-disabled' : ''].join(' ')}
    >
      <span>{purchased ? 'Done' : stats.name}</span>
    </button>
  );
};

const formatCost = (type: EntityType) => {
  const cost = UNIT_STATS[type]?.cost;
  if (!cost) return '';

  const parts = [];
  if (cost.grants) parts.push(`${cost.grants}G`);
  if (cost.curriculum) parts.push(`${cost.curriculum}C`);
  return parts.join(' ') || 'Free';
};
