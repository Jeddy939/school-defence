

import { EntityType, UpgradeType } from './types';

export const TILE_SIZE = 40;
export const GRID_W = 20;
export const GRID_H = 15;
export const CANVAS_WIDTH = 800; // Explicitly set for projection math
export const CANVAS_HEIGHT = 600;

// Isometric Projection Constants
// Adjust these to center the 800x600 (20x15 tile) world on the screen
export const ISO_OFFSET_X = CANVAS_WIDTH / 2;
export const ISO_OFFSET_Y = 100;
export const ISO_SCALE_X = 0.8; // Horizontal spread
export const ISO_SCALE_Y = 0.4; // Vertical compression (2:1 ratio standard)

export const COLORS = {
  OVAL: '#65a30d', // Green-600 
  OVAL_LIGHT: '#84cc16', // Green-500 
  QUAD: '#9ca3af', // Gray-400
  QUAD_DARK: '#6b7280', // Gray-500
  LOCKER: '#4b5563', // Gray-600
  BOOKSHELF: '#92400e', // Amber-800
  ADMIN: '#fbbf24', // Gold
  TREE_TRUNK: '#451a03', // Brown-950
  TREE_LEAVES: '#15803d', // Green-700
  CHEMICAL_BLOB: '#84cc16', // Lime green
  
  // Skin & Hair
  SKIN_LIGHT: '#ffdbac',
  SKIN_DARK: '#8d5524',
  HAIR_BLACK: '#09090b',
  HAIR_BROWN: '#3f200b',
  HAIR_BLONDE: '#facc15',
  HAIR_GINGER: '#ea580c',
  HAIR_GRAY: '#9ca3af',

  // Faculty
  FACULTY_SHIRT: '#60a5fa', // Blue-400
  FACULTY_PANTS: '#1e3a8a', // Blue-900
  LAB_COAT: '#f3f4f6', // White/Gray-100
  VEST_YELLOW: '#ccff00', // Safety Yellow
  TUCKSHOP_APRON: '#ffffff',
  TUCKSHOP_HAT: '#ffffff',
  SUB_CARDIGAN: '#d6d3d1', // Stone-300
  
  // Students
  STUDENT_SHIRT: '#ffffff', 
  STUDENT_PANTS: '#374151', // Gray-700
  STUDENT_TIE: '#9f1239', // Maroon
  BACKPACK_BLUE: '#1e3a8a',
  FOOTY_JERSEY: '#1d4ed8', // Blue/Yellow stripes handled in render
  BULLY_HOODIE: '#0f172a', // Slate-950
  MEAN_GIRL_PINK: '#db2777', // Pink-600
  ESHAY_RED: '#ef4444', 
  CLOWN_NOSE: '#dc2626',
  
  // Items
  FOOTBALL: '#ef4444',
  PIE_CRUST: '#d97706',
  PIE_MEAT: '#78350f',
  RULER: '#fcd34d',
  WATER_BOMB: '#3b82f6',
  
  SELECTION: '#22c55e', // Green selection ring
  HP_BAR_BG: '#1f2937',
  HP_BAR_FG: '#ef4444'
};

export const UNIT_STATS: Record<EntityType, any> = {
  [EntityType.TEACHER_AIDE]: {
    hp: 50, speed: 2.5, damage: 3, range: 30, cooldown: 60, cost: { grants: 50, curriculum: 0 }, carry: 10, label: 'TA', size: 12, buildTime: 5
  },
  [EntityType.SUB_TEACHER]: {
    hp: 120, speed: 2.2, damage: 8, range: 30, cooldown: 50, cost: { grants: 75, curriculum: 0 }, label: 'SUB', size: 13, buildTime: 8
  },
  [EntityType.GYM_COACH]: {
    hp: 350, speed: 2.0, damage: 30, range: 35, cooldown: 45, cost: { grants: 200, curriculum: 50 }, label: 'PE', size: 15, buildTime: 12
  },
  [EntityType.MATH_TEACHER]: {
    hp: 60, speed: 2.2, damage: 12, range: 150, cooldown: 80, cost: { grants: 75, curriculum: 50 }, label: 'MATH', size: 12, buildTime: 10
  },
  [EntityType.SCIENCE_TEACHER]: {
    hp: 80, speed: 1.8, damage: 25, range: 130, cooldown: 120, cost: { grants: 150, curriculum: 100 }, label: 'SCI', aoe: 60, size: 12, buildTime: 15
  },
  [EntityType.TUCKSHOP_LADY]: {
    hp: 70, speed: 1.5, damage: -15, range: 120, cooldown: 90, cost: { grants: 100, curriculum: 100 }, label: 'TUCK', size: 13, buildTime: 10
  },
  // Buildings
  [EntityType.STAFFROOM]: {
    hp: 1500, speed: 0, damage: 0, range: 0, cooldown: 0, size: 30, label: 'STAFF', buildTime: 0
  },
  [EntityType.SPORTS_CENTRE]: {
    hp: 1000, speed: 0, damage: 0, range: 0, cooldown: 0, size: 35, label: 'GYM', cost: { grants: 200, curriculum: 100 }, buildTime: 25
  },
  [EntityType.MATHS_DEPT]: {
    hp: 600, speed: 0, damage: 0, range: 0, cooldown: 0, size: 25, label: 'MATHS', cost: { grants: 100, curriculum: 50 }, buildTime: 15
  },
  [EntityType.SCIENCE_LAB]: {
    hp: 600, speed: 0, damage: 0, range: 0, cooldown: 0, size: 25, label: 'LAB', cost: { grants: 150, curriculum: 150 }, buildTime: 20
  },
  [EntityType.COMMON_ROOM]: { // Was Manual Arts
    hp: 800, speed: 0, damage: 0, range: 0, cooldown: 0, size: 30, label: 'REST', cost: { grants: 200, curriculum: 200 }, buildTime: 20
  },
  [EntityType.CANTEEN]: {
    hp: 600, speed: 0, damage: 0, range: 0, cooldown: 0, size: 25, label: 'PIES', cost: { grants: 150, curriculum: 100 }, buildTime: 15
  },
  [EntityType.BOWLING_MACHINE]: {
    hp: 300, speed: 0, damage: 8, range: 180, cooldown: 15, size: 15, label: 'BOWL', cost: { grants: 150, curriculum: 50 }, buildTime: 10
  },
  [EntityType.LOCKER]: {
    hp: 2500, speed: 0, size: 22, label: '', cost: { grants: 0, curriculum: 20 }, buildTime: 5
  },
  // Enemies
  [EntityType.YEAR_7]: {
    hp: 40, speed: 3.0, damage: 5, range: 25, cooldown: 30, label: 'Yr7', size: 10
  },
  [EntityType.FOOTY_KID]: {
    hp: 150, speed: 1.5, damage: 10, range: 30, cooldown: 90, label: 'TANK', size: 15
  },
  [EntityType.BULLY]: {
    hp: 450, speed: 1.7, damage: 35, range: 35, cooldown: 70, size: 16, label: 'BULLY'
  },
  [EntityType.MEAN_GIRL]: {
    hp: 90, speed: 2.6, damage: 8, range: 140, cooldown: 60, size: 11, label: 'MEAN'
  },
  [EntityType.ESHAY]: {
    hp: 120, speed: 4.5, damage: 20, range: 25, cooldown: 20, size: 12, label: 'ESHAY'
  },
  [EntityType.CLASS_CLOWN]: {
    hp: 180, speed: 2.0, damage: 5, range: 140, cooldown: 150, size: 14, label: 'CLOWN'
  },
  [EntityType.YEAR_7_RAT_KING]: {
    hp: 3000, speed: 0.8, damage: 50, range: 40, cooldown: 45, size: 40, label: 'KING'
  },
  // Environment
  [EntityType.BOOKSHELF]: {
    hp: 9999, speed: 0, size: 20, label: ''
  },
  [EntityType.TREE]: {
    hp: 500, speed: 0, size: 25, label: ''
  },
  [EntityType.ADMIN_OFFICE]: {
    hp: 9999, speed: 0, size: 45, label: 'ADMIN BLDG'
  }
};

export const UPGRADE_STATS: Record<UpgradeType, { cost: { grants: number, curriculum: number }, name: string, desc: string, building: EntityType }> = {
  // Staffroom (TAs)
  [UpgradeType.TEA_BREWING]: {
    cost: { grants: 100, curriculum: 50 },
    name: "Tea Brewing Mastery",
    desc: "Teacher's Aides move 30% faster.",
    building: EntityType.STAFFROOM
  },
  [UpgradeType.FILING_SYSTEM]: {
    cost: { grants: 150, curriculum: 100 },
    name: "Efficient Filing",
    desc: "Teacher's Aides carry +10 more resources.",
    building: EntityType.STAFFROOM
  },
  
  // Maths (Math Teacher)
  [UpgradeType.GRAPHING_CALC]: {
    cost: { grants: 150, curriculum: 150 },
    name: "Graphing Calculator",
    desc: "Maths Teachers +50 Range.",
    building: EntityType.MATHS_DEPT
  },
  [UpgradeType.PURE_MATHS]: {
    cost: { grants: 200, curriculum: 200 },
    name: "Pure Mathematics",
    desc: "Maths Teachers +5 Base Damage.",
    building: EntityType.MATHS_DEPT
  },

  // Science (Science Teacher)
  [UpgradeType.BUNSEN_BURNER]: {
    cost: { grants: 200, curriculum: 150 },
    name: "Bunsen Burner Tech",
    desc: "Science Teachers attack 20% faster.",
    building: EntityType.SCIENCE_LAB
  },
  [UpgradeType.REACTIVE_CHEMS]: {
    cost: { grants: 250, curriculum: 250 },
    name: "Reactive Chemicals",
    desc: "Science Flasks have +30% Explosion Radius.",
    building: EntityType.SCIENCE_LAB
  },

  // Canteen (Tuckshop Lady)
  [UpgradeType.INDUSTRIAL_OVEN]: {
    cost: { grants: 150, curriculum: 150 },
    name: "Industrial Oven",
    desc: "Healing Pies cool down 20% faster.",
    building: EntityType.CANTEEN
  },
  [UpgradeType.EXTRA_SAUCE]: {
    cost: { grants: 200, curriculum: 200 },
    name: "Extra Tomato Sauce",
    desc: "Healing Pies heal +15 HP.",
    building: EntityType.CANTEEN
  },

  // Common Room (Coach & Global)
  [UpgradeType.PROTEIN_POWDER]: {
    cost: { grants: 300, curriculum: 100 },
    name: "Protein Powder",
    desc: "Gym Coaches deal +10 Damage.",
    building: EntityType.COMMON_ROOM
  },
  [UpgradeType.YARD_DUTY_VEST]: {
    cost: { grants: 100, curriculum: 300 },
    name: "Playground Duty Vest",
    desc: "All Staff +50% Max HP.",
    building: EntityType.COMMON_ROOM
  }
};

export const ABILITY_STATS: Partial<Record<EntityType, { duration: number, cooldown: number, speedMult: number, damageMult: number }>> = {
  [EntityType.GYM_COACH]: {
    duration: 5, // Seconds active
    cooldown: 20, // Seconds cooldown
    speedMult: 2.5,
    damageMult: 1.5
  }
};

export const WAVE_INTERVAL = 90; // Normal opening build time before the first waves.
export const FOLLOWUP_WAVE_INTERVAL = 60;

export interface UnitInfo {
  name: string;
  role: string;
  description: string;
  flavor: string;
}

export const UNIT_INFO: Partial<Record<EntityType, UnitInfo>> = {
  [EntityType.TEACHER_AIDE]: {
    name: "Teacher's Aide",
    role: "Worker / Gatherer",
    description: "Collects Curriculum from shelves and Gov Grants from Admin. Builds structures.",
    flavor: "Overworked, underpaid, and the only one who knows how to fix the photocopier."
  },
  [EntityType.SUB_TEACHER]: {
    name: "Substitute Teacher",
    role: "Basic Melee",
    description: "Cheap, disposable melee unit. Good for early defense.",
    flavor: "Has no idea what the lesson plan is. Just put on a DVD."
  },
  [EntityType.GYM_COACH]: {
    name: "P.E. Teacher",
    role: "Elite Shock Troop",
    description: "Heavy melee unit. High health and damage. Has a 'Charge' ability. Requires Sports Centre.",
    flavor: "Believes that 90% of life's problems can be solved by running a lap of the oval."
  },
  [EntityType.MATH_TEACHER]: {
    name: "Maths Teacher",
    role: "Ranged DPS",
    description: "Throws chalk from a distance. Good consistent damage. Requires Maths Dept.",
    flavor: "Calculates the trajectory of a piece of chalk with terrifying precision."
  },
  [EntityType.SCIENCE_TEACHER]: {
    name: "Science Teacher",
    role: "Area of Effect",
    description: "Throws volatile chemical flasks that damage groups of students. Requires Science Lab.",
    flavor: "Hasn't updated the safety manual since 1998. Loves a good explosion."
  },
  [EntityType.TUCKSHOP_LADY]: {
    name: "Tuckshop Lady",
    role: "Healer",
    description: "Throws hot meat pies at staff to heal them. Requires Canteen.",
    flavor: "Love, it costs 50 cents for sauce."
  },
  [EntityType.BOWLING_MACHINE]: {
    name: "Bowling Machine",
    role: "Defense Tower",
    description: "Rapidly fires cricket balls at oncoming students. Requires Common Room.",
    flavor: "Set to 'Fast Bowler' mode. It doesn't understand pity."
  },
  // Buildings
  [EntityType.STAFFROOM]: {
    name: "Staffroom",
    role: "Headquarters",
    description: "The heart of the school. Upgrades Teacher's Aides.",
    flavor: "Contains the sacred coffee machine."
  },
  [EntityType.SPORTS_CENTRE]: {
    name: "Sports Centre",
    role: "Military Building",
    description: "Unlocks the elite P.E. Teacher.",
    flavor: "Smells like rubber mats and victory."
  },
  [EntityType.MATHS_DEPT]: {
    name: "Maths Block",
    role: "Tech Building",
    description: "Unlocks Maths Teachers and their upgrades.",
    flavor: "The smell of whiteboard markers is overwhelming."
  },
  [EntityType.SCIENCE_LAB]: {
    name: "Science Lab",
    role: "Tech Building",
    description: "Unlocks Science Teachers and their upgrades.",
    flavor: "Bunsen burners are left on unsupervised."
  },
  [EntityType.COMMON_ROOM]: { // Was Manual Arts
    name: "Common Room",
    role: "Tech & Upgrades",
    description: "Unlocks Bowling Machine and Gym Coach upgrades.",
    flavor: "A place to complain about students away from students."
  },
  [EntityType.CANTEEN]: {
    name: "School Canteen",
    role: "Support Building",
    description: "Unlocks Tuckshop Ladies and healing upgrades.",
    flavor: "Home of the legendary meat pie."
  },
  [EntityType.LOCKER]: {
    name: "School Locker",
    role: "Wall / Defense",
    description: "A heavy duty barrier. High HP. Blocks movement.",
    flavor: "Smells like old sandwiches and Lynx Africa."
  },
  // Enemies
  [EntityType.YEAR_7]: {
    name: "The Year 7",
    role: "Swarmer",
    description: "Fast, weak, and numerous. They rush the nearest staff member.",
    flavor: "Their backpacks are bigger than they are. They run on pure sugar and confusion."
  },
  [EntityType.FOOTY_KID]: {
    name: "Footy Kid",
    role: "Tank",
    description: "Slower but has high health. Absorbs a lot of damage.",
    flavor: "Has been practicing his drop punt since birth. Will tackle anything that moves."
  },
  [EntityType.BULLY]: {
    name: " The Bully",
    role: "Heavy Hitter",
    description: "Very high health and damage. Requires focused fire to take down.",
    flavor: "Has been in Year 10 for three years. Has a mustache and drives a ute to school."
  },
  [EntityType.MEAN_GIRL]: {
    name: "The Mean Girl",
    role: "Ranged Support",
    description: "Throws projectiles. Her 'Toxic Gossip' aura slows nearby Faculty.",
    flavor: "Her phone is a weapon of mass destruction. Can ruin your reputation in 30 seconds."
  },
  [EntityType.ESHAY]: {
    name: "The Eshay",
    role: "Fast Striker",
    description: "Extremely fast movement and attack speed. Wears a bum bag.",
    flavor: "Eetswa, lad. Asking everyone for a spare cigarette at the train station."
  },
  [EntityType.CLASS_CLOWN]: {
    name: "Class Clown",
    role: "Disruptor",
    description: "Throws water bombs that STUN staff members, making them spin and unable to attack.",
    flavor: "Disruptive behavior is his love language. Anything for a laugh."
  },
  [EntityType.YEAR_7_RAT_KING]: {
    name: "The Year 7 Rat King",
    role: "BOSS",
    description: "A giant, rolling ball of Year 7s whose backpacks have tangled together. Spits out loose Year 7s when hit.",
    flavor: "A horrifying monument to poor locker organization."
  }
};

export const BUILDING_PRODUCTION: Partial<Record<EntityType, EntityType[]>> = {
  [EntityType.STAFFROOM]: [EntityType.TEACHER_AIDE, EntityType.SUB_TEACHER],
  [EntityType.SPORTS_CENTRE]: [EntityType.GYM_COACH],
  [EntityType.MATHS_DEPT]: [EntityType.MATH_TEACHER],
  [EntityType.SCIENCE_LAB]: [EntityType.SCIENCE_TEACHER],
  [EntityType.CANTEEN]: [EntityType.TUCKSHOP_LADY]
};
