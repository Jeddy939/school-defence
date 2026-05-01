

import { 
  Entity, EntityType, Faction, GameState, TileType, UnitState, Vector2, ResourceType, Projectile, UpgradeType, Difficulty, VisualEffect
} from '../types';
import { 
  TILE_SIZE, GRID_W, GRID_H, UNIT_STATS, WAVE_INTERVAL, CANVAS_WIDTH, CANVAS_HEIGHT, ABILITY_STATS, UPGRADE_STATS,
  ISO_OFFSET_X, ISO_OFFSET_Y, ISO_SCALE_X, ISO_SCALE_Y, FOLLOWUP_WAVE_INTERVAL
} from '../constants';

const YEAR_7_CORPSE_DURATION = 30;
const SPRITE_DEATH_ANIMATION_TYPES = new Set<EntityType>([
  EntityType.YEAR_7,
  EntityType.SUB_TEACHER,
  EntityType.GYM_COACH,
  EntityType.SCIENCE_TEACHER,
  EntityType.TUCKSHOP_LADY,
  EntityType.FOOTY_KID,
  EntityType.BULLY,
  EntityType.MEAN_GIRL,
  EntityType.ESHAY,
  EntityType.CLASS_CLOWN,
  EntityType.YEAR_7_RAT_KING,
]);
const SAVE_KEY = 'schoolyard_save';
const SAVE_VERSION = 2;
const AUTOSAVE_INTERVAL = 12;
const FORMATION_SPACING = 30;

type ScreenBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type SaveData = {
  version?: number;
  entities: Entity[];
  tiles?: TileType[][];
  state: GameState;
  seenEntityTypes?: EntityType[];
  lastId?: number;
  lastProjId?: number;
  lastEffectId?: number;
  panOffset?: Vector2;
  zoom?: number;
  pendingWaveSide?: 0 | 1 | 2;
  warningIssuedForWave?: number;
  savedAt?: number;
};

export class GameEngine {
  entities: Entity[] = [];
  tiles: TileType[][] = [];
  selectedIds: number[] = [];
  projectiles: Projectile[] = [];
  effects: VisualEffect[] = [];
  
  // Placement Mode State
  pendingBuild: EntityType | null = null;
  
  // Input State
  mousePos: Vector2 = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }; // Center default
  dragStart: Vector2 | null = null;   // Screen Coordinates
  keys: Record<string, boolean> = {}; // Track held keys
  mouseInsideCanvas: boolean = false; // Track if mouse is active for edge panning
  
  // View State (Zoom & Pan)
  zoom: number = 1.0;
  panOffset: Vector2 = { x: 0, y: 0 };
  isPanning: boolean = false;
  lastPanPos: Vector2 | null = null;
  screenShake: number = 0;
  pendingWaveSide: 0 | 1 | 2 = Math.floor(Math.random() * 3) as 0 | 1 | 2;
  warningIssuedForWave = 0;
  
  // Game Loop State
  paused: boolean = false;
  seenEntityTypes: Set<EntityType> = new Set();
  onNewUnitDiscovered?: (type: EntityType) => void;

  state: GameState = {
    resources: { grants: 150, curriculum: 0 },
    wave: 0,
    nextWaveTime: WAVE_INTERVAL,
    gameOver: false,
    victory: false,
    upgrades: [],
    difficulty: Difficulty.NORMAL,
    settings: { edgePanning: false }
  };

  private lastId = 0;
  private lastProjId = 0;
  private lastEffectId = 0;
  private autosaveElapsed = 0;
  private onStateChange?: (state: GameState) => void;
  private uiRefreshElapsed = 0;
  private uiRefreshRequested = false;

  constructor() {
    this.initWorld();
  }

  // --- ISOMETRIC PROJECTION HELPERS ---
  
  // Convert World (Grid) Coordinates to Screen Coordinates
  // Now an instance method to access this.zoom and this.panOffset
  worldToScreen(wx: number, wy: number): Vector2 {
    const isoX = (wx - wy) * ISO_SCALE_X;
    const isoY = (wx + wy) * ISO_SCALE_Y;
    
    const sx = (isoX * this.zoom) + ISO_OFFSET_X + this.panOffset.x;
    const sy = (isoY * this.zoom) + ISO_OFFSET_Y + this.panOffset.y;
    return { x: sx, y: sy };
  }

  // Convert Screen Coordinates to World (Grid) Coordinates
  screenToWorld(sx: number, sy: number): Vector2 {
    // Inverse of worldToScreen
    
    // Step 1: Remove offsets
    const adjX = (sx - ISO_OFFSET_X - this.panOffset.x) / this.zoom;
    const adjY = (sy - ISO_OFFSET_Y - this.panOffset.y) / this.zoom;
    
    // Step 2: Inverse Iso Math
    // (wx - wy) = adjX / ISO_SCALE_X
    // (wx + wy) = adjY / ISO_SCALE_Y
    
    const A = adjX / ISO_SCALE_X;
    const B = adjY / ISO_SCALE_Y;
    
    // 2*wx = A + B  => wx = (A + B) / 2
    // 2*wy = B - A  => wy = (B - A) / 2
    
    return {
      x: (A + B) / 2,
      y: (B - A) / 2
    };
  }
  
  getEntityScreenBounds(ent: Entity): ScreenBounds {
      const z = this.zoom;
      const sp = this.worldToScreen(ent.pos.x, ent.pos.y);
      let width = ent.size * 2.4 * z;
      let height = 40 * z;
      let bottomPadding = 8 * z;

      switch(ent.type) {
          case EntityType.STAFFROOM:
              width = ent.size * 5.8 * z;
              height = width * (534 / 616);
              bottomPadding = 4 * z;
              break;
          case EntityType.ADMIN_OFFICE:
              width = ent.size * 5.0 * z;
              height = width * (539 / 677);
              bottomPadding = 4 * z;
              break;
          case EntityType.BOOKSHELF:
              width = ent.size * 4.4 * z;
              height = width * (464 / 551);
              bottomPadding = 3 * z;
              break;
          case EntityType.LOCKER:
              width = ent.size * 3.1 * z;
              height = width * 1.12;
              bottomPadding = 2 * z;
              break;
          case EntityType.TREE:
              width = 88 * z;
              height = 98 * z;
              bottomPadding = 8 * z;
              break;
          case EntityType.SPORTS_CENTRE:
              width = ent.size * 5.6 * z;
              height = width * (416 / 703);
              bottomPadding = 4 * z;
              break;
          case EntityType.MATHS_DEPT:
              width = ent.size * 5.2 * z;
              height = width * (407 / 649);
              bottomPadding = 4 * z;
              break;
          case EntityType.SCIENCE_LAB:
              width = ent.size * 5.4 * z;
              height = width * (428 / 692);
              bottomPadding = 4 * z;
              break;
          case EntityType.CANTEEN:
              width = ent.size * 5.0 * z;
              height = width * (412 / 599);
              bottomPadding = 4 * z;
              break;
          case EntityType.COMMON_ROOM:
              width = ent.size * 5.0 * z;
              height = width * (367 / 544);
              bottomPadding = 4 * z;
              break;
          case EntityType.BOWLING_MACHINE:
              width = ent.size * 4.2 * z;
              height = width * (357 / 335);
              bottomPadding = 4 * z;
              break;
          case EntityType.TEACHER_AIDE:
              width = ent.size * 3.35 * z;
              height = ent.size * 3.35 * z;
              bottomPadding = height * 0.16;
              height *= 0.84;
              break;
          case EntityType.SUB_TEACHER:
          case EntityType.MATH_TEACHER:
          case EntityType.SCIENCE_TEACHER:
              width = ent.size * 4.05 * z;
              height = ent.size * 4.05 * z;
              bottomPadding = height * 0.12;
              height *= 0.88;
              break;
          case EntityType.GYM_COACH:
              width = ent.size * 4.05 * z;
              height = ent.size * 4.05 * z;
              bottomPadding = height * 0.14;
              height *= 0.86;
              break;
          case EntityType.YEAR_7:
              width = ent.size * 3.55 * z;
              height = ent.size * 3.55 * z;
              bottomPadding = height * 0.14;
              height *= 0.86;
              break;
          case EntityType.YEAR_7_RAT_KING:
              width = ent.size * 2.4 * z;
              height = 72 * z;
              break;
          default:
              width = Math.max(ent.size * 2.8 * z, 28 * z);
              height = Math.max(ent.size * 3.2 * z, 36 * z);
              bottomPadding = Math.max(6 * z, height * 0.12);
              break;
      }

      return {
          minX: sp.x - width / 2,
          maxX: sp.x + width / 2,
          minY: sp.y - height,
          maxY: sp.y + bottomPadding
      };
  }

  screenBoundsContain(bounds: ScreenBounds, sx: number, sy: number) {
      return sx >= bounds.minX && sx <= bounds.maxX && sy >= bounds.minY && sy <= bounds.maxY;
  }

  screenBoundsIntersect(a: ScreenBounds, b: ScreenBounds) {
      return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
  }

  // Screen Space Target Detection
  findTargetAtScreenPos(sx: number, sy: number, selectableOnly = false): Entity | null {
      const candidates = this.entities.filter(ent => {
          if (ent.hp <= 0 || ent.isHidden) return false;
          if (selectableOnly && ent.faction === Faction.STUDENTS) return false;
          return this.screenBoundsContain(this.getEntityScreenBounds(ent), sx, sy);
      });

      if (candidates.length === 0) return null;

      // Sort by Priority then by depth
      candidates.sort((a, b) => {
          const pA = this.getTargetPriority(a);
          const pB = this.getTargetPriority(b);
          
          // Higher priority first (e.g. Enemy > Unit > Building)
          if (pA !== pB) return pB - pA; 
          
          // If priorities equal, select the one visually "in front" (higher X+Y world coord)
          return (b.pos.x + b.pos.y) - (a.pos.x + a.pos.y);
      });

      return candidates[0];
  }
  // ------------------------------------

  setStateCallback(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }
  
  setNewUnitCallback(cb: (type: EntityType) => void) {
    this.onNewUnitDiscovered = cb;
  }

  private notifyState() {
    this.uiRefreshRequested = false;
    this.uiRefreshElapsed = 0;
    if (this.onStateChange) this.onStateChange({ ...this.state });
  }

  private requestUiRefresh() {
    this.uiRefreshRequested = true;
  }

  private flushQueuedUiRefresh(force = false) {
    if (!this.uiRefreshRequested) return;
    if (!force && this.uiRefreshElapsed < 0.15) return;
    this.notifyState();
  }

  private getWaveDelay(nextWaveNumber: number, difficulty = this.state.difficulty) {
    const baseDelay = nextWaveNumber <= 2 ? WAVE_INTERVAL : FOLLOWUP_WAVE_INTERVAL;
    if (difficulty === Difficulty.EASY) return baseDelay + 20;
    if (difficulty === Difficulty.HARD) return Math.max(45, baseDelay - 15);
    return baseDelay;
  }

  getSelectedEntities() {
    return this.selectedIds
      .map((id) => this.entities.find((entity) => entity.id === id))
      .filter((entity): entity is Entity => !!entity && entity.hp > 0 && !entity.isHidden);
  }

  getPrimarySelectedEntity() {
    return this.getSelectedEntities()[0] ?? null;
  }

  setSelection(ids: number[]) {
    this.selectedIds = ids.filter((id) =>
      this.entities.some((entity) => entity.id === id && entity.hp > 0 && !entity.isHidden)
    );
    this.notifyState();
  }

  selectEntity(id: number) {
    this.setSelection([id]);
  }
  
  setPaused(isPaused: boolean) {
    this.paused = isPaused;
    this.notifyState(); 
  }
  
  togglePause() {
    this.paused = !this.paused;
    this.notifyState();
  }

  updateSettings(newSettings: Partial<GameState['settings']>) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.notifyState();
    this.saveGame();
  }

  resetGame(difficulty: Difficulty = Difficulty.NORMAL) {
    const previousSettings = this.state.settings;

    this.entities = [];
    this.projectiles = [];
    this.effects = [];
    this.selectedIds = [];
    this.seenEntityTypes = new Set();
    this.lastId = 0;
    this.lastProjId = 0;
    this.lastEffectId = 0;
    this.zoom = 1.0;
    this.panOffset = { x: 0, y: 0 };
    this.screenShake = 0;
    this.pendingBuild = null;
    this.autosaveElapsed = 0;
    this.pendingWaveSide = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    this.warningIssuedForWave = 0;
    
    let initialGrants = 150;
    let initialCurriculum = 0;

    if (difficulty === Difficulty.EASY) {
      initialGrants = 300;
      initialCurriculum = 100;
    } else if (difficulty === Difficulty.HARD) {
      initialGrants = 100;
    }

    this.state = {
      resources: { grants: initialGrants, curriculum: initialCurriculum },
      wave: 0,
      nextWaveTime: this.getWaveDelay(1, difficulty),
      gameOver: false,
      victory: false,
      upgrades: [],
      difficulty: difficulty,
      settings: previousSettings || { edgePanning: false }
    };
    this.paused = false;
    this.initWorld();
    this.centerViewOnStaffroom();
    this.notifyState();
  }

  saveGame() {
    if (this.state.gameOver || !this.entities.some(e => e.type === EntityType.STAFFROOM && e.hp > 0)) return;

    const saveData: SaveData = {
      version: SAVE_VERSION,
      entities: this.entities,
      tiles: this.tiles,
      state: this.state,
      seenEntityTypes: Array.from(this.seenEntityTypes),
      lastId: this.lastId,
      lastProjId: this.lastProjId,
      lastEffectId: this.lastEffectId,
      panOffset: this.panOffset,
      zoom: this.zoom,
      pendingWaveSide: this.pendingWaveSide,
      warningIssuedForWave: this.warningIssuedForWave,
      savedAt: Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }

  loadGame() {
    const data = this.parseSaveData(localStorage.getItem(SAVE_KEY));
    if (!data) return false;

    try {
      this.entities = data.entities.map(entity => this.normalizeLoadedEntity(entity));
      if (data.tiles && this.isValidTileGrid(data.tiles)) {
        this.tiles = data.tiles;
      }
      this.state = data.state;
      if (!this.state.difficulty) this.state.difficulty = Difficulty.NORMAL;
      if (!this.state.settings) this.state.settings = { edgePanning: false }; // Compat
      
        this.seenEntityTypes = new Set(data.seenEntityTypes || []);
        this.lastId = data.lastId ?? Math.max(0, ...this.entities.map(e => e.id));
        this.lastProjId = data.lastProjId ?? 0;
        this.lastEffectId = data.lastEffectId ?? 0;
        const shouldCenterView = !data.panOffset;
        if (data.panOffset) this.panOffset = data.panOffset;
        if (data.zoom) this.zoom = data.zoom;
        this.pendingWaveSide = data.pendingWaveSide ?? this.pendingWaveSide;
        if (shouldCenterView) this.centerViewOnStaffroom();
      
        this.projectiles = [];
        this.effects = [];
        this.selectedIds = [];
        this.pendingBuild = null;
        this.paused = true; 
        this.screenShake = 0;
        this.autosaveElapsed = 0;
        this.warningIssuedForWave = data.warningIssuedForWave ?? this.state.wave + 1;
        this.notifyState();
      return true;
    } catch (e) {
      console.error("Failed to load save", e);
      localStorage.removeItem(SAVE_KEY);
      return false;
    }
  }

  hasSave() {
    const save = this.parseSaveData(localStorage.getItem(SAVE_KEY));
    if (!save) {
      localStorage.removeItem(SAVE_KEY);
      return false;
    }
    return true;
  }

  private parseSaveData(saveString: string | null): SaveData | null {
    if (!saveString) return null;

    try {
      const data = JSON.parse(saveString) as Partial<SaveData>;
      const hasEntities = Array.isArray(data.entities) && data.entities.some(entity => entity?.type === EntityType.STAFFROOM);
      const hasState = !!data.state?.resources && Number.isFinite(data.state.resources.grants) && Number.isFinite(data.state.resources.curriculum);
      if (!hasEntities || !hasState) return null;
      return data as SaveData;
    } catch {
      return null;
    }
  }

  private isValidTileGrid(tiles: TileType[][]) {
    return Array.isArray(tiles) && tiles.length === GRID_H && tiles.every(row => Array.isArray(row) && row.length === GRID_W);
  }

  private normalizeLoadedEntity(entity: Entity): Entity {
    const stats = UNIT_STATS[entity.type] || {};
    const pos = entity.pos || { x: 0, y: 0 };
    const targetPos = entity.targetPos ? { x: Number(entity.targetPos.x) || 0, y: Number(entity.targetPos.y) || 0 } : null;
    const trainingQueue = Array.isArray(entity.trainingQueue)
      ? entity.trainingQueue
          .filter(item => item && item.type)
          .map(item => ({
            type: item.type,
            progress: Number(item.progress) || 0,
            totalTime: Number(item.totalTime) || UNIT_STATS[item.type]?.buildTime || 5
          }))
      : [];

    return {
      ...entity,
      pos: { x: Number(pos.x) || 0, y: Number(pos.y) || 0 },
      targetId: entity.targetId ?? null,
      targetPos,
      speed: entity.speed ?? stats.speed ?? 0,
      damage: entity.damage ?? stats.damage ?? 0,
      range: entity.range ?? stats.range ?? 0,
      attackCooldown: entity.attackCooldown ?? stats.cooldown ?? 0,
      attackTimer: entity.attackTimer ?? 0,
      carriedResource: entity.carriedResource ?? 0,
      maxCarry: entity.maxCarry ?? stats.carry ?? 0,
      baseSpeed: entity.baseSpeed ?? entity.speed ?? stats.speed ?? 0,
      baseDamage: entity.baseDamage ?? entity.damage ?? stats.damage ?? 0,
      abilityCooldown: entity.abilityCooldown ?? 0,
      abilityDuration: entity.abilityDuration ?? 0,
      isHidden: entity.isHidden ?? false,
      occupiedBy: entity.occupiedBy ?? null,
      isUnderConstruction: entity.isUnderConstruction ?? false,
      buildProgress: entity.buildProgress ?? 100,
      totalBuildTime: entity.totalBuildTime ?? stats.buildTime ?? 5,
      trainingQueue,
      rallyPoint: entity.rallyPoint ? { x: Number(entity.rallyPoint.x) || 0, y: Number(entity.rallyPoint.y) || 0 } : null,
      stunTimer: entity.stunTimer ?? 0
    };
  }

  private initWorld() {
    this.entities = [];
    this.tiles = [];

    // Initialize Grid with Grass
    for (let y = 0; y < GRID_H; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < GRID_W; x++) {
        row.push(TileType.OVAL);
      }
      this.tiles.push(row);
    }

    // Draw "The Oval Track" 
    const trackPadding = 2;
    const left = trackPadding;
    const right = GRID_W - trackPadding - 1;
    const top = trackPadding;
    const bottom = GRID_H - trackPadding - 1;

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        let isPath = false;

        // Horizontal Edges
        if ((y === top || y === bottom) && (x >= left && x <= right)) isPath = true;
        // Vertical Edges
        if ((x === left || x === right) && (y >= top && y <= bottom)) isPath = true;
        
        // Cross path
        if (y === Math.floor(GRID_H / 2) && x > left && x < right) isPath = true;
        
        // Path to Admin
        if (x === right && y > bottom - 2) isPath = true;
        if (y === bottom && x > right - 2) isPath = true;

        if (isPath) {
          this.tiles[y][x] = TileType.QUAD;
        }
      }
    }

    const midY = (GRID_H * TILE_SIZE) / 2;
    const mapW = GRID_W * TILE_SIZE;
    const mapH = GRID_H * TILE_SIZE;
    const adminPos = { x: mapW - 100, y: mapH - 100 };

    this.scatterTerrain(midY, adminPos);

    // Spawn Staffroom - Center
    this.spawnEntity(EntityType.STAFFROOM, Faction.FACULTY, { x: 140, y: midY });

    // Spawn Initial Worker
    this.spawnEntity(EntityType.TEACHER_AIDE, Faction.FACULTY, { x: 180, y: midY + 40 });

    // Resources
    this.spawnEntity(EntityType.BOOKSHELF, Faction.NEUTRAL, { x: 80, y: 80 });
    this.spawnEntity(EntityType.BOOKSHELF, Faction.NEUTRAL, { x: 120, y: 60 });
    this.spawnEntity(EntityType.BOOKSHELF, Faction.NEUTRAL, { x: 40, y: 100 });
    
    // Spawn Admin - Bottom Right corner area (Moved in to avoid edge)
    this.spawnEntity(EntityType.ADMIN_OFFICE, Faction.NEUTRAL, adminPos);
    
    // Trees and Obstacles
    for(let i=0; i<15; i++) {
       const rx = Math.floor(Math.random() * (GRID_W - 2)) + 1;
       const ry = Math.floor(Math.random() * (GRID_H - 2)) + 1;
       
       if (this.tiles[ry][rx] !== TileType.OVAL && this.tiles[ry][rx] !== TileType.DIRT) continue;

       const px = rx * TILE_SIZE + TILE_SIZE/2;
       const py = ry * TILE_SIZE + TILE_SIZE/2;
       
       const distToBase = Math.abs(px - 140) + Math.abs(py - midY);
       
       // Exclude admin area
       const distToAdmin = Math.sqrt(Math.pow(px - adminPos.x, 2) + Math.pow(py - adminPos.y, 2));

       if (distToBase > 150 && distToAdmin > 130) {
          if (Math.random() > 0.3) {
            this.spawnEntity(EntityType.TREE, Faction.NEUTRAL, { x: px, y: py });
          } else {
            const locker = this.spawnEntity(EntityType.LOCKER, Faction.NEUTRAL, { x: px, y: py });
            locker.hp = 9999; 
          }
       }
    }
  }

  private scatterTerrain(midY: number, adminPos: Vector2) {
    const dirtPatches = Array.from({ length: 7 }, () => ({
      x: Math.floor(Math.random() * GRID_W),
      y: Math.floor(Math.random() * GRID_H),
      radius: 1 + Math.floor(Math.random() * 3)
    }));

    const isProtectedTile = (x: number, y: number) => {
      const px = x * TILE_SIZE + TILE_SIZE / 2;
      const py = y * TILE_SIZE + TILE_SIZE / 2;
      const nearStaffroom = Math.abs(px - 140) + Math.abs(py - midY) < 140;
      const nearAdmin = Math.sqrt(Math.pow(px - adminPos.x, 2) + Math.pow(py - adminPos.y, 2)) < 145;
      const nearStartingBookshelves = px < 170 && py < 145;
      return nearStaffroom || nearAdmin || nearStartingBookshelves;
    };

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.tiles[y][x] === TileType.QUAD || isProtectedTile(x, y)) continue;

        const inDirtPatch = dirtPatches.some(patch => {
          const dx = x - patch.x;
          const dy = y - patch.y;
          return Math.sqrt(dx * dx + dy * dy) <= patch.radius;
        });

        if (inDirtPatch && Math.random() < 0.72) {
          this.tiles[y][x] = TileType.DIRT;
          continue;
        }

        const roll = Math.random();
        if (roll < 0.045) {
          this.tiles[y][x] = TileType.BUSHES;
        } else if (roll < 0.085) {
          this.tiles[y][x] = TileType.ROCKS;
        } else if (roll < 0.14) {
          this.tiles[y][x] = TileType.DIRT;
        }
      }
    }
  }

  spawnEntity(type: EntityType, faction: Faction, pos: Vector2, isConstruction = false): Entity {
    const stats = UNIT_STATS[type];
    let maxHp = stats.hp;
    let damage = stats.damage;
    let speed = stats.speed;
    let range = stats.range || 0;
    let attackCooldown = stats.cooldown || 0;
    let maxCarry = stats.carry || 0;
    
    if (faction === Faction.FACULTY) {
        if (this.state.upgrades.includes(UpgradeType.YARD_DUTY_VEST)) maxHp = Math.floor(maxHp * 1.5);
        if (type === EntityType.TEACHER_AIDE) {
            if (this.state.upgrades.includes(UpgradeType.TEA_BREWING)) speed *= 1.3;
            if (this.state.upgrades.includes(UpgradeType.FILING_SYSTEM)) maxCarry += 10;
        }
        if (type === EntityType.MATH_TEACHER) {
            if (this.state.upgrades.includes(UpgradeType.GRAPHING_CALC)) range += 50;
            if (this.state.upgrades.includes(UpgradeType.PURE_MATHS)) damage += 5;
        }
        if (type === EntityType.SCIENCE_TEACHER) {
            if (this.state.upgrades.includes(UpgradeType.BUNSEN_BURNER)) attackCooldown *= 0.8;
        }
        if (type === EntityType.TUCKSHOP_LADY) {
            if (this.state.upgrades.includes(UpgradeType.INDUSTRIAL_OVEN)) attackCooldown *= 0.8;
            if (this.state.upgrades.includes(UpgradeType.EXTRA_SAUCE)) damage -= 15;
        }
        if (type === EntityType.GYM_COACH) {
            if (this.state.upgrades.includes(UpgradeType.PROTEIN_POWDER)) damage += 10;
        }
    }
    
    if (faction === Faction.STUDENTS) {
      if (this.state.difficulty === Difficulty.EASY) {
        maxHp = Math.floor(maxHp * 0.7);
        damage = Math.floor(damage * 0.7);
      } else if (this.state.difficulty === Difficulty.HARD) {
        maxHp = Math.floor(maxHp * 1.3);
        damage = Math.floor(damage * 1.3);
      }
    }

    const hp = isConstruction ? Math.max(1, Math.floor(maxHp * 0.1)) : maxHp;

    const entity: Entity = {
      id: ++this.lastId,
      type,
      faction,
      pos: { ...pos },
      facing: Math.PI / 2,
      size: stats.size || 12,
      hp: hp,
      maxHp: maxHp,
      state: UnitState.IDLE,
      targetId: null,
      targetPos: null,
      speed: speed,
      damage: damage,
      range: range,
      attackCooldown: attackCooldown,
      attackTimer: 0,
      carriedResource: 0,
      maxCarry: maxCarry,
      resourceType: type === EntityType.BOOKSHELF ? ResourceType.CURRICULUM : type === EntityType.ADMIN_OFFICE ? ResourceType.GRANTS : undefined,
      baseSpeed: speed,
      baseDamage: damage,
      abilityCooldown: 0,
      abilityDuration: 0,
      isHidden: false,
      occupiedBy: null,
      isUnderConstruction: isConstruction,
      buildProgress: isConstruction ? 0 : 100,
      totalBuildTime: stats.buildTime || 5,
      trainingQueue: [],
      rallyPoint: null,
      stunTimer: 0
    };

    this.entities.push(entity);
    return entity;
  }

  checkNewDiscovery(type: EntityType) {
    if (!this.seenEntityTypes.has(type) && (
      type === EntityType.YEAR_7 || 
      type === EntityType.FOOTY_KID || 
      type === EntityType.BULLY || 
      type === EntityType.MEAN_GIRL || 
      type === EntityType.ESHAY ||
      type === EntityType.CLASS_CLOWN ||
      type === EntityType.YEAR_7_RAT_KING)) {
      this.seenEntityTypes.add(type);
      this.paused = true;
      if (this.onNewUnitDiscovered) {
        this.onNewUnitDiscovered(type);
      }
    }
  }

  queueEffect(type: VisualEffect['type'], pos: Vector2, size: number, color: string, duration: number) {
    this.effects.push({
      id: ++this.lastEffectId,
      type,
      pos: { ...pos },
      duration,
      maxDuration: duration,
      size,
      color
    });
  }

  addScreenShake(amount: number) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  applyDamage(target: Entity, amount: number, hitPos: Vector2, effectColor = '#f87171') {
    target.hp -= amount;
    this.queueEffect('IMPACT', hitPos, Math.max(12, target.size * 0.9), effectColor, 0.35);
    this.requestUiRefresh();

    if (amount >= 20 || target.type === EntityType.YEAR_7_RAT_KING) {
      this.addScreenShake(target.type === EntityType.YEAR_7_RAT_KING ? 10 : 4);
    }

    if (target.hp <= 0) {
      this.queueEffect('BURST', target.pos, Math.max(18, target.size * 1.5), effectColor, 0.55);
      if (target.size >= 25) this.addScreenShake(8);
      if (SPRITE_DEATH_ANIMATION_TYPES.has(target.type) && target.deathTimer === undefined) {
        target.deathTimer = YEAR_7_CORPSE_DURATION;
        target.deathAnimTime = 0;
        target.state = UnitState.IDLE;
        target.targetId = null;
        target.targetPos = null;
      }
    }
  }

  applyHealing(target: Entity, amount: number) {
    target.hp = Math.min(target.maxHp, target.hp + amount);
    this.queueEffect('HEAL', target.pos, Math.max(14, target.size), '#86efac', 0.45);
    this.requestUiRefresh();
  }

  issueWaveWarning() {
    const mapW = GRID_W * TILE_SIZE;
    const mapH = GRID_H * TILE_SIZE;
    const markers = 5;

    for (let i = 0; i < markers; i++) {
      const t = (i + 1) / (markers + 1);
      let pos: Vector2;

      if (this.pendingWaveSide === 0) {
        pos = { x: mapW * t, y: 20 };
      } else if (this.pendingWaveSide === 1) {
        pos = { x: mapW - 20, y: mapH * t };
      } else {
        pos = { x: mapW * t, y: mapH - 20 };
      }

      this.queueEffect('WARNING', pos, 24, '#fb7185', 5.5);
    }
  }

  spawnWave() {
    this.state.wave++;
    const waveIndex = this.state.wave; 

    const mapW = GRID_W * TILE_SIZE;
    const mapH = GRID_H * TILE_SIZE;

    // BOSS WAVE
    if (waveIndex === 10) {
      const boss = this.spawnEntity(EntityType.YEAR_7_RAT_KING, Faction.STUDENTS, { x: mapW + 30, y: mapH / 2 });
      boss.state = UnitState.CHASE;
      boss.targetId = this.findNearestEnemy(boss)?.id || null;
      this.checkNewDiscovery(EntityType.YEAR_7_RAT_KING);
      this.addScreenShake(12);
      this.pendingWaveSide = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      this.warningIssuedForWave = 0;
      return;
    }

    let count = 3 + Math.floor(waveIndex * 1.5);
    
    if (this.state.difficulty === Difficulty.EASY) count = Math.max(1, count - 1);
    else if (this.state.difficulty === Difficulty.HARD) count += 2;

    const side = this.pendingWaveSide; // 0: Top, 1: Right, 2: Bottom
    
    const typesInWave = new Set<EntityType>();
    
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0;
      const offset = (Math.random() - 0.5) * 300;
      
      if (side === 0) { x = mapW/2 + offset; y = -20; } 
      if (side === 1) { x = mapW + 20; y = mapH/2 + offset; } 
      if (side === 2) { x = mapW/2 + offset; y = mapH + 20; } 

      let type = EntityType.YEAR_7;
      const rand = Math.random();
      
      // Wave Progression Logic
      if (waveIndex > 10) {
          if (waveIndex >= 15 && rand < 0.12) {
             type = EntityType.CLASS_CLOWN;
          } else if (waveIndex >= 12 && rand < 0.25) {
             type = EntityType.ESHAY;
          } else if (rand < 0.40) {
             type = EntityType.MEAN_GIRL;
          } else if (rand < 0.60) {
             type = EntityType.BULLY;
          } else if (rand < 0.75) {
             type = EntityType.FOOTY_KID;
          }
      } else {
          if (waveIndex >= 5 && rand < 0.2) type = EntityType.MEAN_GIRL;
          else if (waveIndex >= 4 && (i === 0 || rand < 0.3)) type = EntityType.BULLY;
          else if (waveIndex >= 3 && rand < 0.5) type = EntityType.FOOTY_KID;
      }

      typesInWave.add(type);
      const enemy = this.spawnEntity(type, Faction.STUDENTS, { x, y });
      
      const target = this.findNearestEnemy(enemy);
      if (target) {
        enemy.state = UnitState.CHASE;
        enemy.targetId = target.id;
      }
    }

    if (typesInWave.has(EntityType.MEAN_GIRL)) this.checkNewDiscovery(EntityType.MEAN_GIRL);
    if (typesInWave.has(EntityType.BULLY)) this.checkNewDiscovery(EntityType.BULLY);
    if (typesInWave.has(EntityType.FOOTY_KID)) this.checkNewDiscovery(EntityType.FOOTY_KID);
    if (typesInWave.has(EntityType.YEAR_7)) this.checkNewDiscovery(EntityType.YEAR_7);
    if (typesInWave.has(EntityType.ESHAY)) this.checkNewDiscovery(EntityType.ESHAY);
    if (typesInWave.has(EntityType.CLASS_CLOWN)) this.checkNewDiscovery(EntityType.CLASS_CLOWN);
    this.pendingWaveSide = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    this.warningIssuedForWave = 0;
  }

  getDistance(a: Entity | Vector2, b: Entity | Vector2): number {
    const p1 = 'pos' in a ? a.pos : a;
    const p2 = 'pos' in b ? b.pos : b;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  findNearestEnemy(source: Entity): Entity | null {
    let nearest: Entity | null = null;
    let minDst = Infinity;

    for (const ent of this.entities) {
      if (ent.hp <= 0) continue;
      if (ent === source) continue;
      if (ent.isHidden) continue; // Cannot see hidden units

      let isEnemy = false;
      if (source.faction === Faction.STUDENTS && ent.faction === Faction.FACULTY) isEnemy = true;
      if (source.faction === Faction.FACULTY && ent.faction === Faction.STUDENTS) isEnemy = true;

      if (isEnemy) {
        const dist = this.getDistance(source, ent);
        if (dist < minDst) {
          minDst = dist;
          nearest = ent;
        }
      }
    }
    
    if (!nearest && source.faction === Faction.STUDENTS) {
        return this.entities.find(e => e.type === EntityType.STAFFROOM) || null;
    }
    return nearest;
  }

  isCombatUnit(type: EntityType) {
    return [
      EntityType.SUB_TEACHER,
      EntityType.GYM_COACH,
      EntityType.MATH_TEACHER,
      EntityType.SCIENCE_TEACHER,
      EntityType.TUCKSHOP_LADY,
    ].includes(type);
  }

  isProductionBuilding(type: EntityType) {
    return this.getProducerOutputTypes(type).length > 0;
  }

  getProducerOutputTypes(type: EntityType): EntityType[] {
    switch (type) {
      case EntityType.STAFFROOM: return [EntityType.TEACHER_AIDE, EntityType.SUB_TEACHER];
      case EntityType.SPORTS_CENTRE: return [EntityType.GYM_COACH];
      case EntityType.MATHS_DEPT: return [EntityType.MATH_TEACHER];
      case EntityType.SCIENCE_LAB: return [EntityType.SCIENCE_TEACHER];
      case EntityType.CANTEEN: return [EntityType.TUCKSHOP_LADY];
      default: return [];
    }
  }

  selectAllCombatUnits() {
    this.selectedIds = this.entities
      .filter(entity =>
        entity.hp > 0 &&
        entity.faction === Faction.FACULTY &&
        !entity.isHidden &&
        !entity.isUnderConstruction &&
        this.isCombatUnit(entity.type)
      )
      .map(entity => entity.id);
    this.notifyState();
  }

  private isMeleeCombatant(type: EntityType) {
    return [
      EntityType.TEACHER_AIDE,
      EntityType.SUB_TEACHER,
      EntityType.GYM_COACH,
      EntityType.YEAR_7,
      EntityType.FOOTY_KID,
      EntityType.BULLY,
      EntityType.ESHAY,
      EntityType.YEAR_7_RAT_KING,
    ].includes(type);
  }

  private getEffectiveAttackRange(attacker: Entity, target: Entity) {
    const bodyAllowance = this.isMeleeCombatant(attacker.type)
      ? target.size * 0.85 + attacker.size * 0.35
      : target.size * 0.25;
    return attacker.range + bodyAllowance;
  }

  update(dt: number) {
    // --- PANNING LOGIC ---
    if (!this.paused) {
      const PAN_SPEED = 600 * dt;
      const EDGE_THRESHOLD = 20;

      let panX = 0;
      let panY = 0;

      // Keyboard Panning
      if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) panX += 1;
      if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) panX -= 1;
      if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) panY += 1;
      if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) panY -= 1;

      // Edge Panning (Only if not Middle-Mouse Panning and mouse is inside canvas AND setting enabled)
      if (this.state.settings.edgePanning && this.mouseInsideCanvas && !this.isPanning) {
         if (this.mousePos.x < EDGE_THRESHOLD) panX += 1;
         if (this.mousePos.x > CANVAS_WIDTH - EDGE_THRESHOLD) panX -= 1;
         if (this.mousePos.y < EDGE_THRESHOLD) panY += 1;
         if (this.mousePos.y > CANVAS_HEIGHT - EDGE_THRESHOLD) panY -= 1;
      }

      // Apply Pan
      if (panX !== 0 || panY !== 0) {
          this.panOffset.x += panX * PAN_SPEED;
          this.panOffset.y += panY * PAN_SPEED;
      }
    }

    if (this.state.gameOver || this.paused) return;
    this.uiRefreshElapsed += dt;

    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].duration -= dt;
      if (this.effects[i].duration <= 0) this.effects.splice(i, 1);
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 20);
    }

    this.state.nextWaveTime -= dt;
    if (this.state.nextWaveTime <= 5 && this.warningIssuedForWave !== this.state.wave + 1) {
      this.warningIssuedForWave = this.state.wave + 1;
      this.issueWaveWarning();
    }
    if (this.state.nextWaveTime <= 0) {
      this.spawnWave();
      this.state.nextWaveTime = this.getWaveDelay(this.state.wave + 1);
      this.notifyState();
    }

    // Clean up dead units and handle resource release
    this.entities = this.entities.filter(e => {
        if (e.hp <= 0) {
            if (SPRITE_DEATH_ANIMATION_TYPES.has(e.type) && (e.deathTimer ?? 0) > 0) {
                e.deathTimer = Math.max(0, (e.deathTimer ?? 0) - dt);
                e.deathAnimTime = (e.deathAnimTime ?? 0) + dt;
                return true;
            }
            // If a worker dies while inside, free the mine
            if (e.isHidden && e.state === UnitState.GATHER_WORK) {
                const mine = this.entities.find(m => m.occupiedBy === e.id);
                if (mine) mine.occupiedBy = null;
            }
            // If a mine dies while occupied, show the worker? 
            // Simplified: Worker inside dies if mine dies.
            if (e.occupiedBy) {
                const worker = this.entities.find(w => w.id === e.occupiedBy);
                if (worker) {
                     // Eject worker
                     worker.isHidden = false;
                     worker.state = UnitState.IDLE;
                }
            }
            return false;
        }
        return true;
    });
    
    if (!this.entities.some(e => e.type === EntityType.STAFFROOM)) {
      this.state.gameOver = true;
      this.notifyState();
      return;
    }

    this.entities.forEach(ent => {
       if (ent.hp <= 0) return;

       // --- UNIT TRAINING QUEUE LOGIC ---
       if (ent.trainingQueue && ent.trainingQueue.length > 0 && !ent.isUnderConstruction) {
           const queueItem = ent.trainingQueue[0];
           queueItem.progress += (dt / queueItem.totalTime) * 100;
           this.requestUiRefresh();
           
           if (queueItem.progress >= 100) {
               // Finished training
               const type = queueItem.type;
               ent.trainingQueue.shift(); // Remove from queue
               
               // Spawn
               const spawnPos = this.findProductionSpawnPos(ent, type);
               const trainedUnit = this.spawnEntity(type, Faction.FACULTY, spawnPos);
               if (ent.rallyPoint) {
                   trainedUnit.state = UnitState.MOVE;
                   trainedUnit.targetPos = { ...ent.rallyPoint };
                   trainedUnit.targetId = null;
               }
               this.notifyState();
           }
       }

      // Stun Logic
      if (ent.stunTimer && ent.stunTimer > 0) {
          ent.stunTimer -= dt;
          ent.state = UnitState.STUNNED;
          if (ent.stunTimer <= 0) {
              ent.stunTimer = 0;
              ent.state = UnitState.IDLE; // Recover
          }
          return; // Skip other updates if stunned
      }

      if (ent.faction === Faction.FACULTY) {
        ent.speed = ent.baseSpeed;
        if (ent.abilityDuration > 0) ent.speed *= 2.5; 
      }
    });

    const meanGirls = this.entities.filter(e => e.type === EntityType.MEAN_GIRL && e.hp > 0);
    if (meanGirls.length > 0) {
      this.entities.forEach(ent => {
        if (ent.hp > 0 && ent.faction === Faction.FACULTY && !ent.isHidden) {
           const isAffected = meanGirls.some(mg => this.getDistance(ent, mg) < 150);
           if (isAffected) ent.speed *= 0.6;
        }
      });
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const dx = p.target.x - p.pos.x;
      const dy = p.target.y - p.pos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const speed = 5; 
      
      if (dist < speed) {
        if (p.type === 'CHEMICAL' && p.aoeRadius) {
          this.entities.forEach(ent => {
             if (ent.hp > 0 && ent.faction === Faction.STUDENTS) {
                const ex = ent.pos.x - p.target.x;
                const ey = ent.pos.y - p.target.y;
                const eDist = Math.sqrt(ex*ex + ey*ey);
                if (eDist <= p.aoeRadius!) {
                   this.applyDamage(ent, p.damage, ent.pos, '#a3e635');
                    if (ent.type === EntityType.YEAR_7_RAT_KING && ent.hp > 0) {
                       if (Math.random() < 0.2) {
                         const offset = (Math.random() - 0.5) * 50;
                         const minion = this.spawnEntity(EntityType.YEAR_7, Faction.STUDENTS, { x: ent.pos.x + offset, y: ent.pos.y + offset });
                         minion.state = UnitState.CHASE;
                         minion.targetId = ent.targetId;
                      }
                   }
                }
             }
           });
          this.queueEffect('BURST', p.target, 28, '#bef264', 0.5);
          this.addScreenShake(4);
        } else if (p.type === 'HOT_PIE') {
            const target = this.entities.find(e => e.id === p.targetId);
            if (target && target.hp > 0 && !target.isHidden) {
                 this.applyHealing(target, Math.abs(p.damage));
             }
        } else if (p.type === 'WATER_BOMB') {
            const target = this.entities.find(e => e.id === p.targetId);
            if (target && target.hp > 0 && !target.isHidden) {
                // Apply Stun
                target.stunTimer = 3; // 3 Seconds Stun
                target.state = UnitState.STUNNED;
                target.targetId = null; // Drop aggro
                this.queueEffect('BURST', target.pos, 22, '#60a5fa', 0.45);
            }
        } else {
            const target = this.entities.find(e => e.id === p.targetId);
            if (target && target.hp > 0 && !target.isHidden) {
                 this.applyDamage(target, p.damage, target.pos, p.type === 'PHONE' ? '#f472b6' : '#f8fafc');
                  if (target.type === EntityType.YEAR_7_RAT_KING && target.hp > 0) {
                    if (Math.random() < 0.3) {
                        const offsetX = (Math.random() - 0.5) * 60;
                        const offsetY = (Math.random() - 0.5) * 60;
                        const minion = this.spawnEntity(EntityType.YEAR_7, Faction.STUDENTS, { x: target.pos.x + offsetX, y: target.pos.y + offsetY });
                        minion.state = UnitState.CHASE;
                        minion.targetId = target.targetId; 
                    }
                 }
            }
        }
        
        this.projectiles.splice(i, 1);
        continue;
      }

      const moveX = (dx / dist) * speed;
      const moveY = (dy / dist) * speed;
      p.pos.x += moveX;
      p.pos.y += moveY;
    }

    this.entities.forEach(ent => {
       if (ent.hp <= 0) return;

       if (ent.attackTimer > 0) ent.attackTimer -= 1; 
       if (ent.abilityDuration > 0) ent.abilityDuration -= dt;
       if (ent.abilityCooldown > 0) ent.abilityCooldown -= dt;

       // If building is under construction, do nothing
       if (ent.isUnderConstruction) return;
       // If stunned, do nothing
       if (ent.state === UnitState.STUNNED) return;

       if (ent.faction !== Faction.NEUTRAL && !this.isWorkerBusy(ent)) {
           if (!ent.targetId) {
               const target = this.findNearestEnemy(ent);
               if (target) {
                   const dist = this.getDistance(ent, target);
                   const attackRange = this.getEffectiveAttackRange(ent, target);
                   // Auto-attack logic
                   if (dist < 250 || ent.faction === Faction.STUDENTS) {
                       ent.targetId = target.id;
                       if (ent.faction === Faction.STUDENTS) {
                           ent.state = UnitState.CHASE;
                       } else {
                           if (dist <= attackRange) {
                               ent.state = UnitState.ATTACK;
                           } else if (this.isCombatUnit(ent.type)) {
                               // Chase if out of range but within aggro
                               ent.state = UnitState.CHASE;
                           }
                       }
                   }
               }
           } 
           else if (ent.state === UnitState.IDLE && ent.targetId) {
               const target = this.entities.find(e => e.id === ent.targetId);
               if (target && target.hp > 0 && !target.isHidden) {
                   if (this.getDistance(ent, target) <= this.getEffectiveAttackRange(ent, target)) {
                       ent.state = UnitState.ATTACK;
                   } else {
                       // Resume chase if target moved away?
                       if (ent.faction === Faction.STUDENTS) ent.state = UnitState.CHASE;
                       // Faculty:
                       if (ent.faction === Faction.FACULTY && ent.type !== EntityType.TEACHER_AIDE && ent.type !== EntityType.TUCKSHOP_LADY) {
                          ent.state = UnitState.CHASE;
                       }
                   }
               } else {
                   ent.targetId = null; 
               }
           }
       }

       if (ent.state === UnitState.CHASE && ent.targetId) {
           const target = this.entities.find(e => e.id === ent.targetId);
           if (target && !target.isHidden) {
               const dist = this.getDistance(ent, target);
               if (dist <= this.getEffectiveAttackRange(ent, target)) {
                   ent.state = UnitState.ATTACK;
               } else {
                   this.moveEntity(ent, target.pos, dt, target.id);
               }
           } else {
               ent.state = UnitState.IDLE;
               ent.targetId = null;
           }
       } else if (ent.state === UnitState.ATTACK && ent.targetId) {
           const target = this.entities.find(e => e.id === ent.targetId);
           if (target && target.hp > 0 && !target.isHidden) {
               const dist = this.getDistance(ent, target);
               const attackRange = this.getEffectiveAttackRange(ent, target);
               if (dist > attackRange + 14) {
                   if (ent.faction === Faction.STUDENTS) ent.state = UnitState.CHASE;
                   else {
                       // Faculty chase logic
                       if (ent.faction === Faction.FACULTY && ent.type !== EntityType.TEACHER_AIDE && ent.type !== EntityType.TUCKSHOP_LADY && ent.type !== EntityType.BOWLING_MACHINE) {
                            ent.state = UnitState.CHASE;
                       } else {
                            ent.state = UnitState.IDLE;
                       }
                   }
               } else {
                   ent.facing = Math.atan2(target.pos.y - ent.pos.y, target.pos.x - ent.pos.x);
                   if (ent.attackTimer <= 0) {
                       this.fireProjectile(ent, target);
                       ent.attackTimer = ent.attackCooldown;
                   }
               }
           } else {
               ent.state = UnitState.IDLE;
               ent.targetId = null;
           }
       } else if (ent.state === UnitState.MOVE && ent.targetPos) {
           const dist = this.getDistance(ent, ent.targetPos);
           if (dist < 5) {
               ent.state = UnitState.IDLE;
               ent.targetPos = null;
           } else {
               this.moveEntity(ent, ent.targetPos, dt);
           }
       } else if (ent.state === UnitState.BUILD && ent.targetId) {
           const target = this.entities.find(e => e.id === ent.targetId);
           if (target && target.isUnderConstruction) {
               const dist = this.getDistance(ent, target);
               if (dist < 40) { // Build range
                   // Increase progress
                   const buildSpeed = 20; // % per second per builder (5 sec to build roughly)
                   const progressInc = (dt / target.totalBuildTime) * 100;
                   target.buildProgress += progressInc;
                   this.requestUiRefresh();
                   
                   // Increase HP proportionally
                   if (target.buildProgress < 100) {
                      const hpPercent = 0.1 + (target.buildProgress / 100) * 0.9;
                      target.hp = Math.min(target.maxHp, Math.floor(target.maxHp * hpPercent));
                   }

                   if (target.buildProgress >= 100) {
                       target.buildProgress = 100;
                       target.isUnderConstruction = false;
                       target.hp = target.maxHp;
                       // Worker is done
                       ent.state = UnitState.IDLE;
                       ent.targetId = null;
                   }
               } else {
                   this.moveEntity(ent, target.pos, dt, target.id);
               }
           } else {
               ent.state = UnitState.IDLE;
               ent.targetId = null;
           }
       } else if (ent.state === UnitState.GATHER_GO && ent.targetId) {
           const res = this.entities.find(e => e.id === ent.targetId);
           if (res) {
               const dist = this.getDistance(ent, res);
               // Arrival at Resource
               if (dist < 30) {
                   // Mining logic change: Enter the mine
                   if (!res.occupiedBy) {
                       // Mine is free, enter
                       res.occupiedBy = ent.id;
                       ent.isHidden = true;
                       ent.state = UnitState.GATHER_WORK;
                       ent.attackTimer = 100;
                       ent.resourceType = res.resourceType;
                   } else if (res.occupiedBy !== ent.id) {
                       // Mine is occupied, wait here (Unit stays in GATHER_GO, acts as queue)
                       // Effectively does nothing but stand at the door
                   }
               } else {
                   this.moveEntity(ent, res.pos, dt, res.id);
               }
           } else {
               ent.state = UnitState.IDLE;
           }
       } else if (ent.state === UnitState.GATHER_WORK) {
           if (ent.attackTimer <= 0) {
               const res = this.entities.find(e => e.id === ent.targetId);
               // Finished mining, exit
               ent.isHidden = false;
               if (res && res.occupiedBy === ent.id) {
                   res.occupiedBy = null;
               }

               if (res && res.resourceType) {
                   ent.carriedResource = ent.maxCarry;
                   ent.resourceType = res.resourceType;
                   ent.state = UnitState.GATHER_RETURN;
                   // Nudge position slightly towards base so they don't clip instantly if multiple waiting
                   const staffroom = this.entities.find(e => e.type === EntityType.STAFFROOM);
                   if (staffroom) {
                        const angle = Math.atan2(staffroom.pos.y - ent.pos.y, staffroom.pos.x - ent.pos.x);
                        ent.pos.x += Math.cos(angle) * 10;
                        ent.pos.y += Math.sin(angle) * 10;
                   }
               } else {
                   ent.state = UnitState.IDLE;
               }
           } else {
               ent.attackTimer -= 1;
           }
       } else if (ent.state === UnitState.GATHER_RETURN) {
           const staffroom = this.entities.find(e => e.type === EntityType.STAFFROOM);
           if (staffroom) {
               const dist = this.getDistance(ent, staffroom);
               if (dist < 40) {
                   if (ent.resourceType === ResourceType.GRANTS) this.state.resources.grants += ent.carriedResource;
                   else if (ent.resourceType === ResourceType.CURRICULUM) this.state.resources.curriculum += ent.carriedResource;
                   ent.carriedResource = 0;
                   this.notifyState();
                   ent.state = UnitState.GATHER_GO; 
               } else {
                   this.moveEntity(ent, staffroom.pos, dt, staffroom.id);
               }
           }
       } else if (ent.type === EntityType.TUCKSHOP_LADY && ent.state !== UnitState.MOVE) {
           const injured = this.entities.find(e => e.faction === Faction.FACULTY && e.hp < e.maxHp && this.getDistance(ent, e) <= ent.range && !e.isHidden && !e.isUnderConstruction);
           if (injured) {
               ent.facing = Math.atan2(injured.pos.y - ent.pos.y, injured.pos.x - ent.pos.x);
               if (ent.attackTimer <= 0) {
                   this.projectiles.push({
                       id: ++this.lastProjId,
                       type: 'HOT_PIE',
                       pos: { ...ent.pos },
                       target: { ...injured.pos },
                       targetId: injured.id,
                       damage: ent.damage
                   });
                   ent.attackTimer = ent.attackCooldown;
               }
           }
       }
    });

    this.resolveMovementCollisions();
    this.flushQueuedUiRefresh();
    this.autosaveElapsed += dt;
    if (this.autosaveElapsed >= AUTOSAVE_INTERVAL) {
      this.autosaveElapsed = 0;
      this.saveGame();
    }
  }
  
  isWorkerBusy(ent: Entity) {
      return ent.state === UnitState.GATHER_GO || 
             ent.state === UnitState.GATHER_RETURN || 
             ent.state === UnitState.GATHER_WORK ||
             ent.state === UnitState.BUILD;
  }

  private clampToMap(pos: Vector2): Vector2 {
      const margin = 8;
      return {
          x: Math.min(Math.max(pos.x, margin), GRID_W * TILE_SIZE - margin),
          y: Math.min(Math.max(pos.y, margin), GRID_H * TILE_SIZE - margin)
      };
  }

  private getCollisionRadius(ent: Entity) {
      if (ent.type === EntityType.STAFFROOM || ent.type === EntityType.ADMIN_OFFICE) return ent.size + 18;
      if (this.isBuilding(ent.type)) return ent.size + 10;
      if (ent.type === EntityType.TREE || ent.type === EntityType.BOOKSHELF) return ent.size + 6;
      return Math.max(10, ent.size * 0.9);
  }

  private getMobileSeparationRadius(ent: Entity) {
      if (ent.type === EntityType.TEACHER_AIDE) return 5;
      return this.getCollisionRadius(ent);
  }

  private getIgnoredMovementObstacleId(ent: Entity): number | undefined {
      if (ent.state === UnitState.GATHER_RETURN) {
          return this.entities.find(entity => entity.type === EntityType.STAFFROOM)?.id;
      }
      if (
          ent.state === UnitState.GATHER_GO ||
          ent.state === UnitState.BUILD ||
          ent.state === UnitState.CHASE ||
          ent.state === UnitState.ATTACK
      ) {
          return ent.targetId ?? undefined;
      }
      return undefined;
  }

  private isMobileUnit(ent: Entity) {
      return ent.hp > 0 && !ent.isHidden && !ent.isUnderConstruction && ent.faction !== Faction.NEUTRAL && !this.isBuilding(ent.type);
  }

  private isPathObstacle(mover: Entity, other: Entity, ignoredObstacleId?: number) {
      if (mover.id === other.id || other.hp <= 0 || other.isHidden) return false;
      if (ignoredObstacleId !== undefined && other.id === ignoredObstacleId) return false;
      if (other.id === mover.targetId) return false;
      return other.faction === Faction.NEUTRAL || this.isBuilding(other.type);
  }

  private collidesWithObstacle(mover: Entity, pos: Vector2, ignoredObstacleId?: number) {
      const moverRadius = this.getCollisionRadius(mover);
      return this.entities.some(other => {
          if (!this.isPathObstacle(mover, other, ignoredObstacleId)) return false;
          const minDist = moverRadius + this.getCollisionRadius(other) + 3;
          const dx = pos.x - other.pos.x;
          const dy = pos.y - other.pos.y;
          return dx * dx + dy * dy < minDist * minDist;
      });
  }

  private getAvoidanceVector(ent: Entity, ignoredObstacleId?: number) {
      const avoid: Vector2 = { x: 0, y: 0 };
      const entRadius = this.getCollisionRadius(ent);

      this.entities.forEach(other => {
          if (other.id === ent.id || other.hp <= 0 || other.isHidden) return;
          if (ignoredObstacleId !== undefined && other.id === ignoredObstacleId) return;
          const isObstacle = this.isPathObstacle(ent, other, ignoredObstacleId);
          const isMobile = this.isMobileUnit(other);
          if (!isObstacle && !isMobile) return;

          const dx = ent.pos.x - other.pos.x;
          const dy = ent.pos.y - other.pos.y;
          const distSq = dx * dx + dy * dy;
          const isWorkerCrossing = ent.type === EntityType.TEACHER_AIDE || other.type === EntityType.TEACHER_AIDE;
          const otherRadius = isMobile ? this.getMobileSeparationRadius(other) : this.getCollisionRadius(other);
          const influence = entRadius + otherRadius + (isObstacle ? 34 : isWorkerCrossing ? 4 : 18);
          if (distSq <= 0.001 || distSq > influence * influence) return;

          const dist = Math.sqrt(distSq);
          const weight = (influence - dist) / influence;
          avoid.x += (dx / dist) * weight * influence;
          avoid.y += (dy / dist) * weight * influence;
      });

      return avoid;
  }

  moveEntity(ent: Entity, target: Vector2, dt: number, ignoredObstacleId?: number) {
      const dx = target.x - ent.pos.x;
      const dy = target.y - ent.pos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= 0.001) return;

      const directAngle = Math.atan2(dy, dx);
      const avoidance = this.getAvoidanceVector(ent, ignoredObstacleId);
      const steerX = dx + avoidance.x;
      const steerY = dy + avoidance.y;
      const steerAngle = Math.atan2(steerY, steerX);
      const moveDist = Math.min(dist, ent.speed * dt * 60);
      const candidateAngles = [steerAngle, directAngle, steerAngle + 0.45, steerAngle - 0.45, steerAngle + 0.9, steerAngle - 0.9, steerAngle + 1.45, steerAngle - 1.45];
      let bestPos: Vector2 | null = null;
      let bestScore = Infinity;
      
      for (const angle of candidateAngles) {
          const candidate = this.clampToMap({
              x: ent.pos.x + Math.cos(angle) * moveDist,
              y: ent.pos.y + Math.sin(angle) * moveDist
          });

          if (this.collidesWithObstacle(ent, candidate, ignoredObstacleId)) continue;

          const score = Math.hypot(target.x - candidate.x, target.y - candidate.y);
          if (score < bestScore) {
              bestScore = score;
              bestPos = candidate;
              ent.facing = angle;
          }
      }

      if (!bestPos) {
          const halfStep = this.clampToMap({
              x: ent.pos.x + Math.cos(steerAngle) * moveDist * 0.5,
              y: ent.pos.y + Math.sin(steerAngle) * moveDist * 0.5
          });
          if (!this.collidesWithObstacle(ent, halfStep, ignoredObstacleId)) {
              bestPos = halfStep;
              ent.facing = steerAngle;
          }
      }
      
      if (bestPos) {
          ent.pos.x = bestPos.x;
          ent.pos.y = bestPos.y;
      } else {
          ent.facing = directAngle;
      }
  }

  private resolveMovementCollisions() {
      const mobiles = this.entities.filter(ent => this.isMobileUnit(ent));

      for (let i = 0; i < mobiles.length; i++) {
          for (let j = i + 1; j < mobiles.length; j++) {
              const a = mobiles[i];
              const b = mobiles[j];
              const isCombatPair = a.targetId === b.id || b.targetId === a.id;
              const minDist = (this.getMobileSeparationRadius(a) + this.getMobileSeparationRadius(b) + 3) * (isCombatPair ? 0.45 : 1);
              const dx = b.pos.x - a.pos.x;
              const dy = b.pos.y - a.pos.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
              if (dist >= minDist) continue;

              const push = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;
              a.pos = this.clampToMap({ x: a.pos.x - nx * push, y: a.pos.y - ny * push });
              b.pos = this.clampToMap({ x: b.pos.x + nx * push, y: b.pos.y + ny * push });
          }
      }

      mobiles.forEach(mobile => {
          const ignoredObstacleId = this.getIgnoredMovementObstacleId(mobile);
          this.entities.forEach(obstacle => {
              if (!this.isPathObstacle(mobile, obstacle, ignoredObstacleId)) return;
              const minDist = this.getCollisionRadius(mobile) + this.getCollisionRadius(obstacle) + 3;
              const dx = mobile.pos.x - obstacle.pos.x;
              const dy = mobile.pos.y - obstacle.pos.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
              if (dist >= minDist) return;

              const push = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              mobile.pos = this.clampToMap({ x: mobile.pos.x + nx * push, y: mobile.pos.y + ny * push });
          });
      });
  }

  fireProjectile(ent: Entity, target: Entity) {
      let type: Projectile['type'] = 'NORMAL';
      if (ent.type === EntityType.MATH_TEACHER) type = 'NORMAL'; 
      if (ent.type === EntityType.SCIENCE_TEACHER) type = 'CHEMICAL';
      if (ent.type === EntityType.MEAN_GIRL) type = 'PHONE';
      if (ent.type === EntityType.BOWLING_MACHINE) type = 'CRICKET_BALL';
      if (ent.type === EntityType.CLASS_CLOWN) type = 'WATER_BOMB';
      
      if (ent.type === EntityType.YEAR_7 || ent.type === EntityType.FOOTY_KID || ent.type === EntityType.GYM_COACH || ent.type === EntityType.SUB_TEACHER || ent.type === EntityType.TEACHER_AIDE || ent.type === EntityType.BULLY || ent.type === EntityType.YEAR_7_RAT_KING || ent.type === EntityType.ESHAY) {
          if (target && target.hp > 0) {
              this.applyDamage(target, ent.damage, target.pos, ent.faction === Faction.FACULTY ? '#fbbf24' : '#f87171');
          }
          return;
      }
      
      let aoeRadius = undefined;
      if (ent.type === EntityType.SCIENCE_TEACHER) {
         aoeRadius = 60;
         if (this.state.upgrades.includes(UpgradeType.REACTIVE_CHEMS)) aoeRadius = 90;
      }

      this.projectiles.push({
          id: ++this.lastProjId,
          type,
          pos: { ...ent.pos },
          target: { ...target.pos },
          targetId: target.id,
          damage: ent.damage,
          aoeRadius: aoeRadius
      });
  }

  // Input Handling
  
  handleKeyDown(key: string) {
      if (key === 'Escape') {
          if (this.pendingBuild) {
              this.pendingBuild = null;
              this.notifyState();
          }
          return;
      }
      if (key === 'c' || key === 'C') {
          this.centerViewOnStaffroom();
      }
      if (key === 'f' || key === 'F') {
          this.selectAllCombatUnits();
      }
      this.keys[key] = true;
  }
  
  handleKeyUp(key: string) {
      this.keys[key] = false;
  }

  setMouseInsideCanvas(inside: boolean) {
      this.mouseInsideCanvas = inside;
      if (!inside) {
          // Reset mouse pos to center to prevent sticky edge panning
          this.mousePos = { x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2 };
      }
  }

  centerViewOnStaffroom() {
      const staffroom = this.entities.find(e => e.type === EntityType.STAFFROOM);
      if (!staffroom) return;

      const isoX = (staffroom.pos.x - staffroom.pos.y) * ISO_SCALE_X;
      const isoY = (staffroom.pos.x + staffroom.pos.y) * ISO_SCALE_Y;
      const targetScreen = { x: CANVAS_WIDTH * 0.44, y: CANVAS_HEIGHT * 0.56 };

      this.panOffset.x = targetScreen.x - (isoX * this.zoom) - ISO_OFFSET_X;
      this.panOffset.y = targetScreen.y - (isoY * this.zoom) - ISO_OFFSET_Y;
  }

  handleMouseDown(btn: string, sx: number, sy: number) {
    this.mousePos = { x: sx, y: sy };

    // MIDDLE MOUSE for PANNING
    if (btn === 'MIDDLE') {
        this.isPanning = true;
        this.lastPanPos = { x: sx, y: sy };
        return;
    }
    
    // Convert Screen to World for Logic
    const worldPos = this.screenToWorld(sx, sy);

    if (btn === 'LEFT') {
        if (this.pendingBuild) {
            this.tryBuild(worldPos.x, worldPos.y);
        } else {
            this.dragStart = { x: sx, y: sy }; // Drag start in SCREEN coords
            this.selectedIds = [];
            this.notifyState();
        }
    } else if (btn === 'RIGHT') {
        // Try to hit a unit in screen space first (for occluded units)
        const screenTarget = this.findTargetAtScreenPos(sx, sy);
        this.issueCommand(worldPos.x, worldPos.y, screenTarget?.id);
    }
  }

  handleMouseMove(sx: number, sy: number) {
      this.mousePos = { x: sx, y: sy };
      
      if (this.isPanning && this.lastPanPos) {
          const dx = sx - this.lastPanPos.x;
          const dy = sy - this.lastPanPos.y;
          this.panOffset.x += dx;
          this.panOffset.y += dy;
          this.lastPanPos = { x: sx, y: sy };
      }
  }

  handleMouseUp(btn: string, sx: number, sy: number) {
      if (btn === 'MIDDLE') {
          this.isPanning = false;
          this.lastPanPos = null;
          return;
      }

      if (btn === 'LEFT' && this.dragStart) {
          // Screen Space Selection Box
          const minX = Math.min(this.dragStart.x, sx);
          const maxX = Math.max(this.dragStart.x, sx);
          const minY = Math.min(this.dragStart.y, sy);
          const maxY = Math.max(this.dragStart.y, sy);
          
          // Point selection if box is small
          if (maxX - minX < 5 && maxY - minY < 5) {
             // Use Screen Space targeting for point selection to handle occlusion better
             const clicked = this.findTargetAtScreenPos(sx, sy, true);
             if (clicked && clicked.faction !== Faction.STUDENTS) {
                 this.selectedIds = [clicked.id];
             }
          } else {
             // Box selection in SCREEN SPACE
             // We must project all entities to screen space to check if they are inside
             const selectionBounds = { minX, maxX, minY, maxY };
             this.selectedIds = this.entities
                .filter(e => {
                    if (e.faction !== Faction.FACULTY) return false;
                    if (e.isHidden) return false;
                    return this.screenBoundsIntersect(selectionBounds, this.getEntityScreenBounds(e));
                })
                .map(e => e.id);
          }
          this.dragStart = null;
          this.notifyState();
      }
  }

  selectAtScreenPos(sx: number, sy: number, clearEmpty = true) {
      this.mousePos = { x: sx, y: sy };

      if (this.pendingBuild) {
          const worldPos = this.screenToWorld(sx, sy);
          this.tryBuild(worldPos.x, worldPos.y);
          return;
      }

      const clicked = this.findTargetAtScreenPos(sx, sy, true);
      if (clicked && clicked.faction !== Faction.STUDENTS) {
          this.selectedIds = [clicked.id];
      } else if (clearEmpty) {
          this.selectedIds = [];
      }
      this.notifyState();
  }

  commandAtScreenPos(sx: number, sy: number) {
      this.mousePos = { x: sx, y: sy };
      const worldPos = this.screenToWorld(sx, sy);
      const screenTarget = this.findTargetAtScreenPos(sx, sy);
      this.issueCommand(worldPos.x, worldPos.y, screenTarget?.id);
  }

  handleWheel(deltaY: number, mx: number, my: number) {
      // Zoom Logic
      // 1. Get world position under mouse BEFORE zoom
      const worldBefore = this.screenToWorld(mx, my);

      // 2. Apply Zoom
      const zoomSensitivity = 0.001;
      const prevZoom = this.zoom;
      this.zoom -= deltaY * zoomSensitivity;
      this.zoom = Math.min(Math.max(this.zoom, 0.5), 3.0); // Clamp zoom

      // 3. Adjust Pan so that worldBefore is still under mx, my
      // screenX = (isoX * zoom) + OFFSET + pan
      // pan = screenX - (isoX * zoom) - OFFSET
      
      const isoX = (worldBefore.x - worldBefore.y) * ISO_SCALE_X;
      const isoY = (worldBefore.x + worldBefore.y) * ISO_SCALE_Y;

      this.panOffset.x = mx - (isoX * this.zoom) - ISO_OFFSET_X;
      this.panOffset.y = my - (isoY * this.zoom) - ISO_OFFSET_Y;
  }

  getTargetPriority(e: Entity) {
      if (e.faction === Faction.STUDENTS) return 4;
      if (e.type === EntityType.BOOKSHELF || e.type === EntityType.ADMIN_OFFICE) return 3;
      if (e.faction === Faction.FACULTY && !this.isBuilding(e.type)) return 2;
      return 1;
  }

  isBuilding(type: EntityType) {
    return ['STAFFROOM','MATHS_DEPT','SCIENCE_LAB','COMMON_ROOM','CANTEEN', 'LOCKER', 'BOWLING_MACHINE', 'SPORTS_CENTRE'].includes(type);
  }

  forceExitMine(ent: Entity) {
      if (ent.isHidden && ent.state === UnitState.GATHER_WORK) {
          ent.isHidden = false;
          // Find mine to release
          const mine = this.entities.find(e => e.occupiedBy === ent.id);
          if (mine) mine.occupiedBy = null;
      }
  }

  private getFormationPositions(center: Vector2, units: Entity[]) {
      if (units.length <= 1) return [this.clampToMap(center)];

      const avg = units.reduce(
          (acc, ent) => ({ x: acc.x + ent.pos.x / units.length, y: acc.y + ent.pos.y / units.length }),
          { x: 0, y: 0 }
      );
      const heading = Math.atan2(center.y - avg.y, center.x - avg.x);
      const right = { x: Math.cos(heading + Math.PI / 2), y: Math.sin(heading + Math.PI / 2) };
      const forward = { x: Math.cos(heading), y: Math.sin(heading) };
      const cols = Math.ceil(Math.sqrt(units.length));
      const rows = Math.ceil(units.length / cols);

      return units.map((_, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const sideOffset = (col - (cols - 1) / 2) * FORMATION_SPACING;
          const depthOffset = (row - (rows - 1) / 2) * FORMATION_SPACING;
          return this.clampToMap({
              x: center.x + right.x * sideOffset - forward.x * depthOffset,
              y: center.y + right.y * sideOffset - forward.y * depthOffset
          });
      });
  }

  issueCommand(wx: number, wy: number, targetId?: number) {
      let target: Entity | undefined;
      
      if (targetId) {
          target = this.entities.find(e => e.id === targetId);
      } else {
          // Fallback spatial lookup (e.g. clicking on ground or object)
          const potentialTargets = this.entities.filter(e => e.hp > 0 && this.getDistance(e, {x: wx, y: wy}) < e.size + 15 && !e.isHidden);
          potentialTargets.sort((a, b) => {
              return this.getTargetPriority(b) - this.getTargetPriority(a);
          });
          target = potentialTargets[0];
      }

      const selectedEntities = this.selectedIds
          .map(id => this.entities.find(e => e.id === id))
          .filter((ent): ent is Entity => !!ent && ent.hp > 0);
      const selectedUnits = selectedEntities
          .filter((ent): ent is Entity => !ent.isUnderConstruction && !this.isBuilding(ent.type));
      const selectedProducers = selectedEntities.filter(ent =>
          this.isProductionBuilding(ent.type) && !ent.isUnderConstruction
      );

      if (selectedProducers.length > 0 && selectedUnits.length === 0) {
          const rallyPoint = this.clampToMap({ x: wx, y: wy });
          selectedProducers.forEach(producer => {
              producer.rallyPoint = { ...rallyPoint };
          });
          this.notifyState();
          this.saveGame();
          return;
      }

      const formationPositions = !target ? this.getFormationPositions({ x: wx, y: wy }, selectedUnits) : [];

      selectedUnits.forEach((ent, index) => {
          if (ent.state === UnitState.STUNNED) return;

          // If unit was mining inside, force them out
          this.forceExitMine(ent);

          if (target) {
              if (target.faction === Faction.STUDENTS) {
                  ent.state = UnitState.ATTACK;
                  ent.targetId = target.id;
              } else if (target.isUnderConstruction && ent.type === EntityType.TEACHER_AIDE) {
                  ent.state = UnitState.BUILD;
                  ent.targetId = target.id;
              } else if ((target.type === EntityType.BOOKSHELF || target.type === EntityType.ADMIN_OFFICE) && ent.type === EntityType.TEACHER_AIDE) {
                  ent.state = UnitState.GATHER_GO;
                  ent.targetId = target.id;
              }
          } else {
              ent.state = UnitState.MOVE;
              ent.targetPos = formationPositions[index] || { x: wx, y: wy };
              ent.targetId = null;
          }
      });
  }

  tryBuild(wx: number, wy: number) {
      if (!this.pendingBuild) return;
      
      const stats = UNIT_STATS[this.pendingBuild];
      if (this.isBuildUnlocked(this.pendingBuild) && this.canAffordEntity(this.pendingBuild)) {
          this.state.resources.grants -= stats.cost.grants;
          this.state.resources.curriculum -= stats.cost.curriculum;
          
          const building = this.spawnEntity(this.pendingBuild, Faction.FACULTY, { x: wx, y: wy }, true);
          
          // Auto-assign currently selected builders to this new construction
          this.selectedIds.forEach(id => {
              const ent = this.entities.find(e => e.id === id);
              if (ent && ent.type === EntityType.TEACHER_AIDE) {
                  ent.state = UnitState.BUILD;
                  ent.targetId = building.id;
              }
          });

          this.pendingBuild = null;
          this.notifyState();
          this.saveGame();
      }
  }

  isCrowded(pos: Vector2): boolean {
    // Check if any non-building entity is too close
    return this.entities.some(e => {
        if (e.isHidden) return false;
        if (this.isBuilding(e.type)) return false; 
        // Use radius ~15 for checking
        return this.getDistance(pos, e.pos) < 15; 
    });
  }

  private isProductionSpawnInBounds(pos: Vector2): boolean {
      const edgeMargin = 22;
      const mapW = GRID_W * TILE_SIZE;
      const mapH = GRID_H * TILE_SIZE;
      return pos.x >= edgeMargin && pos.x <= mapW - edgeMargin && pos.y >= edgeMargin && pos.y <= mapH - edgeMargin;
  }

  private productionSpawnHitsObstacle(pos: Vector2, unitType: EntityType, producer: Entity): boolean {
      const stats = UNIT_STATS[unitType];
      const unitRadius = Math.max(10, stats.size * 0.9);

      return this.entities.some(other => {
          if (other.hp <= 0 || other.isHidden) return false;
          const isBlockingObstacle = other.id === producer.id || this.isBuilding(other.type) || other.faction === Faction.NEUTRAL;
          if (!isBlockingObstacle) return false;

          const clearance = unitRadius + this.getCollisionRadius(other) + 8;
          const dx = pos.x - other.pos.x;
          const dy = pos.y - other.pos.y;

          return dx * dx + dy * dy < clearance * clearance;
      });
  }

  private isValidProductionSpawnPos(pos: Vector2, unitType: EntityType, producer: Entity): boolean {
      if (!this.isProductionSpawnInBounds(pos)) {
          return false;
      }

      if (this.productionSpawnHitsObstacle(pos, unitType, producer)) {
          return false;
      }

      const stats = UNIT_STATS[unitType];
      const unitRadius = Math.max(10, stats.size * 0.9);

      return !this.entities.some(other => {
          if (other.hp <= 0 || other.isHidden) return false;

          if (other.id === producer.id || this.isBuilding(other.type) || other.faction === Faction.NEUTRAL) return false;

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
          { x: -42, y: 42 }
      ];

      for (const offset of preferredOffsets) {
          const candidate = this.clampToMap({
              x: producer.pos.x + offset.x,
              y: producer.pos.y + offset.y
          });
          if (this.isValidProductionSpawnPos(candidate, unitType, producer)) {
              return candidate;
          }
      }

      const STEP_RADIUS = 20;
      const MAX_RADIUS = 180;
      const POINTS_PER_RING = 20;
      let fallback: Vector2 | null = null;
      let fallbackScore = Infinity;

      for (let radius = 70; radius <= MAX_RADIUS; radius += STEP_RADIUS) {
          for (let i = 0; i < POINTS_PER_RING; i++) {
              const angle = (Math.PI * 2 * i) / POINTS_PER_RING;
              const candidate = this.clampToMap({
                  x: producer.pos.x + Math.cos(angle) * radius,
                  y: producer.pos.y + Math.sin(angle) * radius
              });

              const clampedDistance = Math.hypot(
                  candidate.x - (producer.pos.x + Math.cos(angle) * radius),
                  candidate.y - (producer.pos.y + Math.sin(angle) * radius)
              );
              if (clampedDistance > 2) continue;

              if (this.isValidProductionSpawnPos(candidate, unitType, producer)) {
                  return candidate;
              }

              const score = Math.hypot(candidate.x - producer.pos.x, candidate.y - producer.pos.y) + clampedDistance * 10;
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

      return fallback || this.clampToMap({
          x: producer.pos.x + 70,
          y: producer.pos.y - 70
      });
  }

  findSpawnPos(basePos: Vector2): Vector2 {
      const MAX_RADIUS = 80;
      const STEP = 15;
      
      if (!this.isCrowded(basePos)) return basePos;

      for (let r = STEP; r <= MAX_RADIUS; r += STEP) {
          const items = Math.floor((2 * Math.PI * r) / STEP);
          for (let i = 0; i < items; i++) {
              const angle = (Math.PI * 2 * i) / items;
              const x = basePos.x + Math.cos(angle) * r;
              const y = basePos.y + Math.sin(angle) * r;
              
              if (x < 20 || x > (GRID_W * TILE_SIZE - 20) || y < 20 || y > (GRID_H * TILE_SIZE - 20)) continue;

              if (!this.isCrowded({x, y})) {
                  return {x, y};
              }
          }
      }
      // Fallback
      return { 
          x: basePos.x + (Math.random() - 0.5) * 20,
          y: basePos.y + (Math.random() - 0.5) * 20
      };
  }
  
  getProducerBuilding(unitType: EntityType): EntityType | null {
      switch(unitType) {
          case EntityType.TEACHER_AIDE: return EntityType.STAFFROOM;
          case EntityType.SUB_TEACHER: return EntityType.STAFFROOM;
          case EntityType.GYM_COACH: return EntityType.SPORTS_CENTRE;
          case EntityType.MATH_TEACHER: return EntityType.MATHS_DEPT;
          case EntityType.SCIENCE_TEACHER: return EntityType.SCIENCE_LAB;
          case EntityType.TUCKSHOP_LADY: return EntityType.CANTEEN;
          default: return null;
      }
  }
  
  purchaseUnit(type: EntityType) {
      const stats = UNIT_STATS[type];
      if (this.state.resources.grants >= stats.cost.grants && this.state.resources.curriculum >= stats.cost.curriculum) {
          
          // Find appropriate building
          const producerType = this.getProducerBuilding(type);
          if (!producerType) return; // Should not happen

          // Find specific instance of building (prefer selected one, or just first available)
          let producer = this.entities.find(e => this.selectedIds.includes(e.id) && e.type === producerType && !e.isUnderConstruction && e.hp > 0);
          if (!producer) {
              producer = this.entities.find(e => e.type === producerType && !e.isUnderConstruction && e.hp > 0);
          }

          if (producer) {
              this.state.resources.grants -= stats.cost.grants;
              this.state.resources.curriculum -= stats.cost.curriculum;
              
              producer.trainingQueue.push({
                  type: type,
                  progress: 0,
                  totalTime: stats.buildTime || 5
              });

              this.notifyState();
              this.saveGame();
          }
      }
  }

  setPlacementMode(type: EntityType) {
      if (!this.canAffordEntity(type) || !this.isBuildUnlocked(type)) return;
      this.pendingBuild = type;
      this.notifyState();
  }

  canAffordEntity(type: EntityType) {
      const cost = UNIT_STATS[type]?.cost;
      if (!cost) return true;
      return this.state.resources.grants >= (cost.grants ?? 0) &&
             this.state.resources.curriculum >= (cost.curriculum ?? 0);
  }

  hasCompletedEntity(type: EntityType) {
      return this.entities.some(entity => entity.type === type && entity.hp > 0 && !entity.isUnderConstruction);
  }

  isBuildUnlocked(type: EntityType) {
      if (type === EntityType.BOWLING_MACHINE) return this.hasCompletedEntity(EntityType.COMMON_ROOM);
      return true;
  }

  researchUpgrade(type: UpgradeType) {
      if (this.state.upgrades.includes(type)) return;
      const stats = UPGRADE_STATS[type];
      if (this.state.resources.grants >= stats.cost.grants && this.state.resources.curriculum >= stats.cost.curriculum) {
          this.state.resources.grants -= stats.cost.grants;
          this.state.resources.curriculum -= stats.cost.curriculum;
          this.state.upgrades.push(type);
          
          if (type === UpgradeType.YARD_DUTY_VEST) {
              this.entities.forEach(e => {
                  if (e.faction === Faction.FACULTY) {
                      const oldMax = e.maxHp;
                      e.maxHp = Math.floor(e.maxHp * 1.5);
                      e.hp += (e.maxHp - oldMax);
                  }
              });
          }
          if (type === UpgradeType.FILING_SYSTEM) {
              this.entities.forEach(e => {
                  if (e.type === EntityType.TEACHER_AIDE) e.maxCarry += 10;
              });
          }

          this.notifyState();
          this.saveGame();
      }
  }

  triggerAbility(type: EntityType) {
      if (type === EntityType.GYM_COACH) {
          this.entities.forEach(e => {
              if (e.type === EntityType.GYM_COACH && this.selectedIds.includes(e.id) && e.abilityCooldown <= 0) {
                  e.abilityDuration = ABILITY_STATS[EntityType.GYM_COACH]!.duration;
                  e.abilityCooldown = ABILITY_STATS[EntityType.GYM_COACH]!.cooldown;
              }
          });
      }
  }
}
