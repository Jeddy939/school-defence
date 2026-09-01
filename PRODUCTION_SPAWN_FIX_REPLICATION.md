# Production Spawn Fix Replication Guide

## Goal

Fix production-unit spawning so units do not get stuck when a structure is built near the bottom-left edge, or any other edge of the map.

## Problem

The broken pattern is a fixed spawn offset from the producing building:

```ts
const spawnPos = { x: producer.pos.x, y: producer.pos.y + 40 };
spawnEntity(trainedUnitType, producer.faction, spawnPos);
```

This works in open space but fails near map edges. A unit can be spawned outside the usable map area, inside the producing building's collision radius, against another building, or in a blocked corner where movement collision cannot recover.

The fix is to replace fixed-offset spawning with a production spawn search that checks several possible exit points and validates each one against map bounds and collision.

## Implementation Summary

Replace production-completion spawning with:

```ts
const spawnPos = this.findProductionSpawnPos(producer, trainedUnitType);
const trainedUnit = this.spawnEntity(trainedUnitType, producer.faction, spawnPos);
```

Then add helpers that:

- Try multiple preferred exits around the producing structure.
- Reject positions too close to the map edge.
- Reject positions overlapping the producer, buildings, neutral obstacles, or other units.
- Search wider rings around the producer if the preferred exits are blocked.
- Use a final clamped fallback only after attempting valid positions.

## Required Game Helpers

Adapt the names to the target repo, but the game should already have equivalents for most of these:

```ts
type Vector2 = { x: number; y: number };

private clampToMap(pos: Vector2): Vector2;
private isBuilding(type: EntityType): boolean;
private getCollisionRadius(entity: Entity): number;
private getMobileSeparationRadius(entity: Entity): number;
private isCrowded(pos: Vector2): boolean;
```

You also need map dimensions, such as:

```ts
const mapW = GRID_W * TILE_SIZE;
const mapH = GRID_H * TILE_SIZE;
```

## Example Implementation

```ts
private isProductionSpawnInBounds(pos: Vector2): boolean {
  const edgeMargin = 22;
  const mapW = GRID_W * TILE_SIZE;
  const mapH = GRID_H * TILE_SIZE;

  return (
    pos.x >= edgeMargin &&
    pos.x <= mapW - edgeMargin &&
    pos.y >= edgeMargin &&
    pos.y <= mapH - edgeMargin
  );
}

private productionSpawnHitsObstacle(
  pos: Vector2,
  unitType: EntityType,
  producer: Entity
): boolean {
  const stats = UNIT_STATS[unitType];
  const unitRadius = Math.max(10, stats.size * 0.9);

  return this.entities.some(other => {
    if (other.hp <= 0 || other.isHidden) return false;

    const isBlockingObstacle =
      other.id === producer.id ||
      this.isBuilding(other.type) ||
      other.faction === Faction.NEUTRAL;

    if (!isBlockingObstacle) return false;

    const clearance = unitRadius + this.getCollisionRadius(other) + 8;
    const dx = pos.x - other.pos.x;
    const dy = pos.y - other.pos.y;

    return dx * dx + dy * dy < clearance * clearance;
  });
}

private isValidProductionSpawnPos(
  pos: Vector2,
  unitType: EntityType,
  producer: Entity
): boolean {
  if (!this.isProductionSpawnInBounds(pos)) return false;
  if (this.productionSpawnHitsObstacle(pos, unitType, producer)) return false;

  const stats = UNIT_STATS[unitType];
  const unitRadius = Math.max(10, stats.size * 0.9);

  return !this.entities.some(other => {
    if (other.hp <= 0 || other.isHidden) return false;
    if (
      other.id === producer.id ||
      this.isBuilding(other.type) ||
      other.faction === Faction.NEUTRAL
    ) {
      return false;
    }

    const clearance = unitRadius + this.getMobileSeparationRadius(other) + 4;
    const dx = pos.x - other.pos.x;
    const dy = pos.y - other.pos.y;

    return dx * dx + dy * dy < clearance * clearance;
  });
}

private findProductionSpawnPos(producer: Entity, unitType: EntityType): Vector2 {
  const preferredOffsets = [
    { x: 0, y: 56 },
    { x: 56, y: 0 },
    { x: 0, y: -56 },
    { x: -56, y: 0 },
    { x: 42, y: 42 },
    { x: 42, y: -42 },
    { x: -42, y: -42 },
    { x: -42, y: 42 },
  ];

  for (const offset of preferredOffsets) {
    const candidate = this.clampToMap({
      x: producer.pos.x + offset.x,
      y: producer.pos.y + offset.y,
    });

    if (this.isValidProductionSpawnPos(candidate, unitType, producer)) {
      return candidate;
    }
  }

  const stepRadius = 20;
  const maxRadius = 180;
  const pointsPerRing = 20;
  let fallback: Vector2 | null = null;
  let fallbackScore = Infinity;

  for (let radius = 70; radius <= maxRadius; radius += stepRadius) {
    for (let i = 0; i < pointsPerRing; i++) {
      const angle = (Math.PI * 2 * i) / pointsPerRing;
      const rawCandidate = {
        x: producer.pos.x + Math.cos(angle) * radius,
        y: producer.pos.y + Math.sin(angle) * radius,
      };
      const candidate = this.clampToMap(rawCandidate);

      const clampedDistance = Math.hypot(
        candidate.x - rawCandidate.x,
        candidate.y - rawCandidate.y
      );

      if (clampedDistance > 2) continue;

      if (this.isValidProductionSpawnPos(candidate, unitType, producer)) {
        return candidate;
      }

      const score =
        Math.hypot(candidate.x - producer.pos.x, candidate.y - producer.pos.y) +
        clampedDistance * 10;

      if (
        this.isProductionSpawnInBounds(candidate) &&
        !this.productionSpawnHitsObstacle(candidate, unitType, producer) &&
        !this.isCrowded(candidate) &&
        score < fallbackScore
      ) {
        fallback = candidate;
        fallbackScore = score;
      }
    }
  }

  return (
    fallback ||
    this.clampToMap({
      x: producer.pos.x + 70,
      y: producer.pos.y - 70,
    })
  );
}
```

## Where To Call It

Find the code that runs when a production queue item finishes. It may look like this:

```ts
const type = queueItem.type;
producer.trainingQueue.shift();

const spawnPos = this.findSpawnPos({
  x: producer.pos.x,
  y: producer.pos.y + 40,
});

const trainedUnit = this.spawnEntity(type, Faction.FACULTY, spawnPos);
```

Change it to:

```ts
const type = queueItem.type;
producer.trainingQueue.shift();

const spawnPos = this.findProductionSpawnPos(producer, type);
const trainedUnit = this.spawnEntity(type, Faction.FACULTY, spawnPos);
```

Keep any existing rally-point logic after the unit is spawned.

## Tuning Values

Use these as starting values:

- `edgeMargin`: `22`
- preferred cardinal offsets: `56`
- preferred diagonal offsets: `42`
- ring search start radius: `70`
- ring search max radius: `180`
- ring search step: `20`
- points per ring: `20`
- obstacle clearance padding: `8`
- mobile-unit clearance padding: `4`

If the target repo uses larger buildings or larger unit collision radii, increase the offsets and max radius.

## Verification Checklist

1. Build a production structure near the bottom-left edge.
2. Queue several units from that structure.
3. Confirm units spawn to a free side of the building instead of underneath it or outside the map.
4. Repeat near the bottom, left, top, and right edges.
5. Queue multiple units quickly and confirm they do not stack into the same blocked spot.
6. Set a rally point and confirm newly trained units can immediately move to it.
7. Build another structure close to the producer and confirm units choose a different free exit.
8. Run the repo's normal build/test command.

## Notes

The important part is not the exact numbers. The important part is that production spawning uses the same collision knowledge as movement: map bounds, building radii, neutral obstacle radii, and mobile-unit separation. A fixed offset is fragile because the correct exit direction depends on where the building sits on the map.
