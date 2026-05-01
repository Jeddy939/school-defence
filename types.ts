

export enum Faction {
  FACULTY = 'FACULTY',
  STUDENTS = 'STUDENTS',
  NEUTRAL = 'NEUTRAL'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum EntityType {
  // Faculty Units
  TEACHER_AIDE = 'TEACHER_AIDE', // Worker
  SUB_TEACHER = 'SUB_TEACHER',    // Basic Melee (New)
  GYM_COACH = 'GYM_COACH',        // Elite Melee (Buffed)
  MATH_TEACHER = 'MATH_TEACHER',  // Ranged
  SCIENCE_TEACHER = 'SCIENCE_TEACHER', // AOE Ranged
  TUCKSHOP_LADY = 'TUCKSHOP_LADY', // Healer

  // Faculty Buildings
  STAFFROOM = 'STAFFROOM',        // Base
  SPORTS_CENTRE = 'SPORTS_CENTRE', // Unlocks Gym Coach
  MATHS_DEPT = 'MATHS_DEPT',      // Unlocks Math Teacher
  SCIENCE_LAB = 'SCIENCE_LAB',    // Unlocks Science Teacher
  COMMON_ROOM = 'COMMON_ROOM',    // Unlocks Upgrades & Towers
  CANTEEN = 'CANTEEN',            // Unlocks Tuckshop Lady
  BOWLING_MACHINE = 'BOWLING_MACHINE', // Tower
  LOCKER = 'LOCKER',             // Wall

  // Enemy Units
  YEAR_7 = 'YEAR_7',             // Zergling
  FOOTY_KID = 'FOOTY_KID',       // Tank
  BULLY = 'BULLY',               // Boss/Heavy
  MEAN_GIRL = 'MEAN_GIRL',       // Ranged Debuffer
  ESHAY = 'ESHAY',               // Fast, High DPS (Wave 12+)
  CLASS_CLOWN = 'CLASS_CLOWN',   // Stunner (Wave 15+)
  YEAR_7_RAT_KING = 'YEAR_7_RAT_KING', // BOSS: Wave 10

  // Resources/Environment
  BOOKSHELF = 'BOOKSHELF',       // Wood/Tree
  ADMIN_OFFICE = 'ADMIN_OFFICE', // Gold/Mine
  TREE = 'TREE'                  // Obstacle/Decoration
}

export enum UnitState {
  IDLE = 'IDLE',
  MOVE = 'MOVE',
  GATHER_GO = 'GATHER_GO',
  GATHER_WORK = 'GATHER_WORK',
  GATHER_RETURN = 'GATHER_RETURN',
  ATTACK = 'ATTACK',
  HEAL = 'HEAL', // New state for healer
  CHASE = 'CHASE',
  REPAIR = 'REPAIR',
  BUILD = 'BUILD', // Construction state
  STUNNED = 'STUNNED' // Debuff state
}

export enum TileType {
  OVAL = 'OVAL',       // Grass
  QUAD = 'QUAD',       // Concrete/Path
  DIRT = 'DIRT',
  BUSHES = 'BUSHES',
  ROCKS = 'ROCKS'
}

export enum ResourceType {
  GRANTS = 'GRANTS',      // Gold
  CURRICULUM = 'CURRICULUM' // Wood
}

export enum UpgradeType {
  // Global / Common Room
  YARD_DUTY_VEST = 'YARD_DUTY_VEST',    // Max HP / Armor
  PROTEIN_POWDER = 'PROTEIN_POWDER',    // Gym Coach Damage
  
  // Staffroom
  TEA_BREWING = 'TEA_BREWING',          // TA Speed
  FILING_SYSTEM = 'FILING_SYSTEM',      // TA Carry Cap

  // Maths
  GRAPHING_CALC = 'GRAPHING_CALC',      // Math Range
  PURE_MATHS = 'PURE_MATHS',            // Math Damage

  // Science
  BUNSEN_BURNER = 'BUNSEN_BURNER',      // Science Atk Spd
  REACTIVE_CHEMS = 'REACTIVE_CHEMS',    // Science AoE

  // Canteen
  INDUSTRIAL_OVEN = 'INDUSTRIAL_OVEN',  // Healer Cooldown
  EXTRA_SAUCE = 'EXTRA_SAUCE'           // Heal Amount
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Projectile {
  id: number;
  type: 'NORMAL' | 'CHEMICAL' | 'PHONE' | 'CRICKET_BALL' | 'HOT_PIE' | 'WATER_BOMB';
  pos: Vector2;
  target: Vector2; // Snapshot target pos
  targetId: number;
  damage: number;
  aoeRadius?: number;
}

export interface VisualEffect {
  id: number;
  type: 'IMPACT' | 'HEAL' | 'BURST' | 'WARNING';
  pos: Vector2;
  duration: number;
  maxDuration: number;
  size: number;
  color: string;
}

export interface QueuedUnit {
  type: EntityType;
  progress: number; // 0 to 100
  totalTime: number; // Seconds
}

export interface Entity {
  id: number;
  type: EntityType;
  faction: Faction;
  pos: Vector2;
  facing: number; // Angle in radians
  size: number; // Radius or half-width
  hp: number;
  maxHp: number;
  state: UnitState;
  targetId: number | null;
  targetPos: Vector2 | null;
  
  // Stats
  speed: number;
  damage: number;
  range: number;
  attackCooldown: number;
  attackTimer: number;
  
  // Buffs / Abilities
  baseSpeed: number;
  baseDamage: number;
  abilityCooldown: number;
  abilityDuration: number;

  // Resource gathering
  resourceType?: ResourceType;
  carriedResource: number;
  maxCarry: number;
  
  // Mining Logic
  isHidden?: boolean;       // For workers inside mines
  occupiedBy?: number | null; // For mines tracking who is inside

  // Construction & Training
  isUnderConstruction: boolean;
  buildProgress: number; // 0 to 100
  totalBuildTime: number; // Seconds required to build
  trainingQueue: QueuedUnit[]; // For buildings producing units
  rallyPoint?: Vector2 | null; // For production buildings
  
  // Debuffs
  stunTimer?: number;
  deathTimer?: number;
  deathAnimTime?: number;
}

export interface GameSettings {
  edgePanning: boolean;
}

export interface GameState {
  resources: {
    grants: number;
    curriculum: number;
  };
  wave: number;
  nextWaveTime: number;
  gameOver: boolean;
  victory: boolean;
  upgrades: UpgradeType[];
  difficulty: Difficulty;
  settings: GameSettings;
}
