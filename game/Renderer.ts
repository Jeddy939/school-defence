



import { GameEngine } from './GameEngine';
import { TILE_SIZE, COLORS, GRID_W, GRID_H, UNIT_STATS } from '../constants';
import { Entity, EntityType, Faction, TileType, UnitState, UpgradeType, ResourceType, VisualEffect, Vector2 } from '../types';

type SpriteDirection = 'north' | 'north-east' | 'east' | 'south-east' | 'south';
type SpriteFrameCounts = Record<string, Record<SpriteDirection, number>>;

export class Renderer {
  engine: GameEngine;
  ctx: CanvasRenderingContext2D | null = null;
  
  grassPattern: CanvasPattern | null = null;
  tileImages: Partial<Record<TileType, HTMLImageElement[]>> = {};
  environmentImages: Map<string, HTMLImageElement> = new Map();
  structureImages: Map<string, HTMLImageElement> = new Map();
  transparentEntityIds: Set<number> = new Set();
  spriteImages: Map<string, HTMLImageElement> = new Map();
  spriteLoadStarted = false;
  teacherAideFrames = {
    idle: { north: 5, 'north-east': 5, east: 5, 'south-east': 5, south: 5 },
    walk: { north: 6, 'north-east': 6, east: 6, 'south-east': 6, south: 6 },
    work: { north: 5, 'north-east': 5, east: 5, 'south-east': 5, south: 5 },
    build: { north: 6, 'north-east': 6, east: 6, 'south-east': 6, south: 6 },
  } as const;
  subTeacherFrames = {
    idle: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    walk: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    attack: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
  } as const;
  mathTeacherFrames = {
    idle: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    walk: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    attack: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
  } as const;
  gymCoachFrames = {
    idle: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    walk: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    attack: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
  } as const;
  classClownFrames = {
    idle: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    walk: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    attack: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    death: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
  } as const;
  generatedEnemyFrames = {
    idle: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    walk: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    attack: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    death: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
  } as const;
  generatedMathTeacherFrames = {
    idle: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    attack: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    death: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
  } as const;
  meanGirlFrames = {
    idle: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    walk: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    attack: { north: 3, 'north-east': 3, east: 3, 'south-east': 3, south: 3 },
    death: { north: 4, 'north-east': 4, east: 3, 'south-east': 3, south: 3 },
  } as const;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.generateGrassPattern(ctx);
    this.preloadTileAssets();
    this.preloadStructureAssets();
    this.preloadSprites();
  }

  createImage(src: string) {
    const image = new Image();
    image.src = src;
    return image;
  }

  preloadTileAssets() {
    const base = '/tiles/schoolyard-textures-gameplay';
    const tileSources: Record<TileType, string[]> = {
      [TileType.OVAL]: ['grass-base.png', 'grass-base.png', 'grass-base.png', 'grass-base.png', 'grass-flowers.png'],
      [TileType.QUAD]: ['concrete-path.png', 'concrete-path.png', 'concrete-path.png', 'cracked-concrete.png'],
      [TileType.DIRT]: ['dry-dirt.png', 'dry-dirt.png', 'dry-dirt.png', 'grass-dirt-transition.png'],
      [TileType.BUSHES]: ['bushy-ground.png'],
      [TileType.ROCKS]: ['rocky-grass.png'],
    };

    for (const [type, files] of Object.entries(tileSources) as [TileType, string[]][]) {
      this.tileImages[type] = files.map(file => this.createImage(`${base}/${file}`));
    }

    const propsBase = '/tiles/schoolyard-iso';
    this.environmentImages.set('tree', this.createImage(`${propsBase}/medium-tree.png`));
    this.environmentImages.set('smallShrub', this.createImage(`${propsBase}/small-shrub.png`));
  }

  preloadStructureAssets() {
    const base = '/structures/schoolyard';
    const structures = {
      staffroom: 'staffroom-headquarters.png',
      admin: 'administration-office.png',
      bookshelf: 'bookshelf-resource.png',
      lockerWall: 'locker-wall-long.png',
      locker0: 'locker-single-star.png',
      locker1: 'locker-single-poster.png',
      locker2: 'locker-single-paper.png',
      locker3: 'locker-double.png',
      maths: 'maths-block.png',
      science: 'science-lab.png',
      sports: 'sports-centre.png',
      canteen: 'school-canteen.png',
      bowling: 'bowling-machine-tower.png',
      commonRoom: 'common-room.png',
      scaffold: 'construction-scaffold.png',
      noticeboard: 'upgrade-noticeboard.png',
      shrubHedge: 'small-shrub-hedge.png',
      binBarricade: 'bin-barricade.png',
    };

    for (const [key, file] of Object.entries(structures)) {
      this.structureImages.set(key, this.createImage(`${base}/${file}`));
    }
  }

  preloadSprites() {
    if (this.spriteLoadStarted) return;
    this.spriteLoadStarted = true;
    this.preloadTeacherAideSprites();
    this.preloadSubTeacherSprites();
    this.preloadMathTeacherSprites();
    this.preloadGymCoachSprites();
    this.preloadYear7Sprites();
    this.preloadClassClownSprites();
    this.preloadGeneratedSpriteSet('eshay', '/sprites/eshay', this.generatedEnemyFrames);
    this.preloadGeneratedSpriteSet('bully', '/sprites/bully', this.generatedEnemyFrames);
    this.preloadGeneratedSpriteSet('footyKid', '/sprites/footy-kid', this.generatedEnemyFrames);
    this.preloadGeneratedSpriteSet('bowlingMachine', '/sprites/bowling-machine', this.generatedEnemyFrames);
    this.preloadGeneratedSpriteSet('mathsTeacher', '/sprites/maths-teacher', this.generatedMathTeacherFrames);
    this.preloadGeneratedSpriteSet('meanGirl', '/sprites/mean-girl', this.meanGirlFrames);
    this.preloadGeneratedSpriteSet('substituteTeacher', '/sprites/substitute-teacher', this.generatedEnemyFrames);
    this.preloadGeneratedSpriteSet('peTeacher', '/sprites/pe-teacher', this.generatedEnemyFrames);
    this.preloadGeneratedSpriteSet('scienceTeacher', '/sprites/science-teacher', this.generatedEnemyFrames);
    this.preloadGeneratedSpriteSet('tuckshopLady', '/sprites/tuckshop-lady', this.generatedEnemyFrames);
    this.preloadGeneratedSpriteSet('ratKing', '/sprites/year-7-rat-king', this.generatedEnemyFrames);
  }

  preloadTeacherAideSprites() {
    const base = '/sprites/teacher-aide-rtspixel';

    for (const [animation, directions] of Object.entries(this.teacherAideFrames) as [keyof typeof this.teacherAideFrames, typeof this.teacherAideFrames[keyof typeof this.teacherAideFrames]][]) {
      for (const [direction, totalFrames] of Object.entries(directions)) {
        for (let frame = 0; frame < totalFrames; frame++) {
          const frameId = String(frame).padStart(3, '0');
          this.loadSprite(`teacherAide:${animation}:${direction}:${frame}`, `${base}/${animation}/${direction}/frame_${frameId}.png`);
        }
      }
    }
  }

  preloadYear7Sprites() {
    const year7Frames = {
      idle: { south: 4, 'south-east': 3, east: 3, 'north-east': 3, north: 3 },
      walk: { south: 6, 'south-east': 5, east: 4, 'north-east': 5, north: 5 },
      attack: { south: 3, 'south-east': 3, east: 3, 'north-east': 3, north: 3 },
      death: { south: 6, 'south-east': 6, east: 6, 'north-east': 6, north: 6 },
    } as const;
    const base = '/sprites/year-7';

    for (const [animation, directions] of Object.entries(year7Frames) as [keyof typeof year7Frames, typeof year7Frames[keyof typeof year7Frames]][]) {
      for (const [direction, totalFrames] of Object.entries(directions)) {
        for (let frame = 0; frame < totalFrames; frame++) {
          const frameId = String(frame).padStart(3, '0');
          this.loadSprite(`year7:${animation}:${direction}:${frame}`, `${base}/${animation}/${direction}/frame_${frameId}.png`);
        }
      }
    }
  }

  preloadSubTeacherSprites() {
    const base = '/sprites/sub-teacher-rtspixel';

    for (const [animation, directions] of Object.entries(this.subTeacherFrames) as [keyof typeof this.subTeacherFrames, typeof this.subTeacherFrames[keyof typeof this.subTeacherFrames]][]) {
      for (const [direction, totalFrames] of Object.entries(directions)) {
        for (let frame = 0; frame < totalFrames; frame++) {
          const frameId = String(frame).padStart(3, '0');
          this.loadSprite(`subTeacher:${animation}:${direction}:${frame}`, `${base}/${animation}/${direction}/frame_${frameId}.png`);
        }
      }
    }
  }

  preloadMathTeacherSprites() {
    const base = '/sprites/math-teacher-rtspixel';

    for (const [animation, directions] of Object.entries(this.mathTeacherFrames) as [keyof typeof this.mathTeacherFrames, typeof this.mathTeacherFrames[keyof typeof this.mathTeacherFrames]][]) {
      for (const [direction, totalFrames] of Object.entries(directions)) {
        for (let frame = 0; frame < totalFrames; frame++) {
          const frameId = String(frame).padStart(3, '0');
          this.loadSprite(`mathTeacher:${animation}:${direction}:${frame}`, `${base}/${animation}/${direction}/frame_${frameId}.png`);
        }
      }
    }
  }

  preloadGymCoachSprites() {
    const base = '/sprites/gym-coach-rtspixel';

    for (const [animation, directions] of Object.entries(this.gymCoachFrames) as [keyof typeof this.gymCoachFrames, typeof this.gymCoachFrames[keyof typeof this.gymCoachFrames]][]) {
      for (const [direction, totalFrames] of Object.entries(directions)) {
        for (let frame = 0; frame < totalFrames; frame++) {
          const frameId = String(frame).padStart(3, '0');
          this.loadSprite(`gymCoach:${animation}:${direction}:${frame}`, `${base}/${animation}/${direction}/frame_${frameId}.png`);
        }
      }
    }
  }

  preloadClassClownSprites() {
    const base = '/sprites/class-clown';

    for (const [animation, directions] of Object.entries(this.classClownFrames) as [keyof typeof this.classClownFrames, typeof this.classClownFrames[keyof typeof this.classClownFrames]][]) {
      for (const [direction, totalFrames] of Object.entries(directions)) {
        for (let frame = 0; frame < totalFrames; frame++) {
          const frameId = String(frame).padStart(3, '0');
          this.loadSprite(`classClown:${animation}:${direction}:${frame}`, `${base}/${animation}/${direction}/frame_${frameId}.png`);
        }
      }
    }
  }

  preloadGeneratedSpriteSet(keyPrefix: string, base: string, frames: SpriteFrameCounts) {
    for (const [animation, directions] of Object.entries(frames)) {
      for (const [direction, totalFrames] of Object.entries(directions)) {
        for (let frame = 0; frame < totalFrames; frame++) {
          const frameId = String(frame).padStart(3, '0');
          this.loadSprite(`${keyPrefix}:${animation}:${direction}:${frame}`, `${base}/${animation}/${direction}/frame_${frameId}.png`);
        }
      }
    }
  }

  loadSprite(key: string, src: string) {
    const image = this.createImage(src);
    this.spriteImages.set(key, image);
  }

  getTeacherAideDirection(facing: number) {
    const directions = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    const normalized = (((facing * 180) / Math.PI) % 360 + 360) % 360;
    const index = Math.round(normalized / 45) % directions.length;
    return directions[index];
  }

  getMirroredFiveDirectionPose(facing: number) {
    const octant = this.getTeacherAideDirection(facing);
    switch (octant) {
      case 'west':
        return { direction: 'east', flipX: true };
      case 'south-west':
        return { direction: 'south-east', flipX: true };
      case 'north-west':
        return { direction: 'north-east', flipX: true };
      default:
        return { direction: octant as 'south' | 'south-east' | 'east' | 'north-east' | 'north', flipX: false };
    }
  }

  getTeacherAideSpritePose(facing: number) {
    return this.getMirroredFiveDirectionPose(facing);
  }

  getTeacherAideSprite(ent: Entity, isMoving: boolean, time: number) {
    const { direction, flipX } = this.getTeacherAideSpritePose(ent.facing);
    const animation =
      ent.state === UnitState.BUILD || ent.state === UnitState.REPAIR ? 'build' :
      ent.state === UnitState.GATHER_WORK ? 'work' :
      'idle';
    const totalFrames = this.teacherAideFrames[animation][direction];
    const frameDuration = isMoving ? 90 : 160;
    const frame = Math.floor(time / frameDuration) % totalFrames;
    const image = this.spriteImages.get(`teacherAide:${animation}:${direction}:${frame}`) ?? null;
    return { image, flipX };
  }

  drawTeacherAideSprite(
    ctx: CanvasRenderingContext2D,
    sp: { x: number; y: number },
    ent: Entity,
    isMoving: boolean,
    time: number,
    bob: number
  ) {
    const { image, flipX } = this.getTeacherAideSprite(ent, isMoving, time);
    if (!image || !image.complete || image.naturalWidth === 0) {
      return false;
    }

    const z = this.engine.zoom;
    const spriteW = ent.size * 3.35 * z;
    const spriteH = ent.size * 3.35 * z;
    const drawY = sp.y - spriteH * 0.84 - bob;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(sp.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -spriteW / 2, drawY, spriteW, spriteH);
    } else {
      ctx.drawImage(image, sp.x - spriteW / 2, drawY, spriteW, spriteH);
    }
    ctx.restore();
    return true;
  }

  getSubTeacherSprite(ent: Entity, isMoving: boolean, time: number) {
    const { direction, flipX } = this.getMirroredFiveDirectionPose(ent.facing);
    const animation =
      ent.state === UnitState.ATTACK ? 'attack' :
      isMoving ? 'walk' :
      'idle';
    const totalFrames = this.subTeacherFrames[animation][direction];
    const frameDuration = animation === 'attack' ? 105 : isMoving ? 120 : 210;
    const frame = Math.floor(time / frameDuration) % totalFrames;
    const image = this.spriteImages.get(`subTeacher:${animation}:${direction}:${frame}`) ?? null;
    return { image, flipX };
  }

  drawSubTeacherSprite(
    ctx: CanvasRenderingContext2D,
    sp: { x: number; y: number },
    ent: Entity,
    isMoving: boolean,
    time: number,
    bob: number
  ) {
    const { image, flipX } = this.getSubTeacherSprite(ent, isMoving, time);
    if (!image || !image.complete || image.naturalWidth === 0) {
      return false;
    }

    const z = this.engine.zoom;
    const spriteW = ent.size * 4.05 * z;
    const spriteH = ent.size * 4.05 * z;
    const drawY = sp.y - spriteH * 0.88 - bob;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(sp.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -spriteW / 2, drawY, spriteW, spriteH);
    } else {
      ctx.drawImage(image, sp.x - spriteW / 2, drawY, spriteW, spriteH);
    }
    ctx.restore();
    return true;
  }

  getMathTeacherSprite(ent: Entity, isMoving: boolean, time: number) {
    const { direction, flipX } = this.getMirroredFiveDirectionPose(ent.facing);
    const useGeneratedVariant = this.pseudoRandom(ent.id * 97) >= 0.5;
    if (useGeneratedVariant) {
      const animation = ent.state === UnitState.ATTACK ? 'attack' : 'idle';
      const totalFrames = this.generatedMathTeacherFrames[animation][direction];
      const frameDuration = animation === 'attack' ? 105 : isMoving ? 150 : 210;
      const frame = Math.floor(time / frameDuration) % totalFrames;
      const image = this.spriteImages.get(`mathsTeacher:${animation}:${direction}:${frame}`) ?? null;
      return { image, flipX };
    }

    const animation =
      ent.state === UnitState.ATTACK ? 'attack' :
      isMoving ? 'walk' :
      'idle';
    const totalFrames = this.mathTeacherFrames[animation][direction];
    const frameDuration = animation === 'attack' ? 105 : isMoving ? 115 : 210;
    const frame = Math.floor(time / frameDuration) % totalFrames;
    const image = this.spriteImages.get(`mathTeacher:${animation}:${direction}:${frame}`) ?? null;
    return { image, flipX };
  }

  drawMathTeacherSprite(
    ctx: CanvasRenderingContext2D,
    sp: { x: number; y: number },
    ent: Entity,
    isMoving: boolean,
    time: number,
    bob: number
  ) {
    const { image, flipX } = this.getMathTeacherSprite(ent, isMoving, time);
    if (!image || !image.complete || image.naturalWidth === 0) {
      return false;
    }

    const z = this.engine.zoom;
    const spriteW = ent.size * 4.05 * z;
    const spriteH = ent.size * 4.05 * z;
    const drawY = sp.y - spriteH * 0.88 - bob;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(sp.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -spriteW / 2, drawY, spriteW, spriteH);
    } else {
      ctx.drawImage(image, sp.x - spriteW / 2, drawY, spriteW, spriteH);
    }
    ctx.restore();
    return true;
  }

  getGymCoachSprite(ent: Entity, isMoving: boolean, time: number) {
    const { direction, flipX } = this.getMirroredFiveDirectionPose(ent.facing);
    const animation =
      ent.state === UnitState.ATTACK ? 'attack' :
      isMoving ? 'walk' :
      'idle';
    const totalFrames = this.gymCoachFrames[animation][direction];
    const frameDuration = animation === 'attack' ? 110 : isMoving ? 125 : 220;
    const frame = Math.floor(time / frameDuration) % totalFrames;
    const image = this.spriteImages.get(`gymCoach:${animation}:${direction}:${frame}`) ?? null;
    return { image, flipX };
  }

  drawGymCoachSprite(
    ctx: CanvasRenderingContext2D,
    sp: { x: number; y: number },
    ent: Entity,
    isMoving: boolean,
    time: number,
    bob: number
  ) {
    const { image, flipX } = this.getGymCoachSprite(ent, isMoving, time);
    if (!image || !image.complete || image.naturalWidth === 0) {
      return false;
    }

    const z = this.engine.zoom;
    const spriteW = ent.size * 4.05 * z;
    const spriteH = ent.size * 4.05 * z;
    const drawY = sp.y - spriteH * 0.86 - bob;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(sp.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -spriteW / 2, drawY, spriteW, spriteH);
    } else {
      ctx.drawImage(image, sp.x - spriteW / 2, drawY, spriteW, spriteH);
    }
    ctx.restore();
    return true;
  }

  getYear7SpritePose(facing: number) {
    return this.getMirroredFiveDirectionPose(facing);
  }

  getYear7Sprite(ent: Entity, isMoving: boolean, time: number) {
    const counts = {
      idle: { south: 4, 'south-east': 3, east: 3, 'north-east': 3, north: 3 },
      walk: { south: 6, 'south-east': 5, east: 4, 'north-east': 5, north: 5 },
      attack: { south: 3, 'south-east': 3, east: 3, 'north-east': 3, north: 3 },
      death: { south: 6, 'south-east': 6, east: 6, 'north-east': 6, north: 6 },
    } as const;
    const { direction, flipX } = this.getYear7SpritePose(ent.facing);
    const animation = ent.hp <= 0 ? 'death' : ent.state === UnitState.ATTACK ? 'attack' : isMoving ? 'walk' : 'idle';
    const totalFrames = counts[animation][direction];
    const frameDuration = animation === 'death' ? 140 : animation === 'attack' ? 95 : isMoving ? 95 : 180;
    const frame = animation === 'death'
      ? Math.min(totalFrames - 1, Math.floor(((ent.deathAnimTime ?? 0) * 1000) / frameDuration))
      : Math.floor(time / frameDuration) % totalFrames;
    const image = this.spriteImages.get(`year7:${animation}:${direction}:${frame}`) ?? null;
    return { image, flipX };
  }

  drawYear7Sprite(
    ctx: CanvasRenderingContext2D,
    sp: { x: number; y: number },
    ent: Entity,
    isMoving: boolean,
    time: number,
    bob: number
  ) {
    const { image, flipX } = this.getYear7Sprite(ent, isMoving, time);
    if (!image || !image.complete || image.naturalWidth === 0) {
      return false;
    }

    const z = this.engine.zoom;
    const spriteW = ent.size * 3.55 * z;
    const spriteH = ent.size * 3.55 * z;
    const drawY = sp.y - spriteH * 0.86 - bob;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (flipX) {
      ctx.translate(sp.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -spriteW / 2, drawY, spriteW, spriteH);
    } else {
      ctx.drawImage(image, sp.x - spriteW / 2, drawY, spriteW, spriteH);
    }
    ctx.restore();
    return true;
  }

  getClassClownSprite(ent: Entity, isMoving: boolean, time: number) {
    const { direction, flipX } = this.getMirroredFiveDirectionPose(ent.facing);
    const animation = ent.hp <= 0 ? 'death' : ent.state === UnitState.ATTACK ? 'attack' : isMoving ? 'walk' : 'idle';
    const totalFrames = this.classClownFrames[animation][direction];
    const frameDuration = animation === 'death' ? 150 : animation === 'attack' ? 105 : isMoving ? 115 : 190;
    const frame = animation === 'death'
      ? Math.min(totalFrames - 1, Math.floor(((ent.deathAnimTime ?? 0) * 1000) / frameDuration))
      : Math.floor(time / frameDuration) % totalFrames;
    const image = this.spriteImages.get(`classClown:${animation}:${direction}:${frame}`) ?? null;
    return { image, flipX };
  }

  drawClassClownSprite(
    ctx: CanvasRenderingContext2D,
    sp: { x: number; y: number },
    ent: Entity,
    isMoving: boolean,
    time: number,
    bob: number
  ) {
    const { image, flipX } = this.getClassClownSprite(ent, isMoving, time);
    if (!image || !image.complete || image.naturalWidth === 0) {
      return false;
    }

    const z = this.engine.zoom;
    const spriteW = ent.size * 3.7 * z;
    const spriteH = ent.size * 3.7 * z;
    const drawY = sp.y - spriteH * 0.87 - bob;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(sp.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -spriteW / 2, drawY, spriteW, spriteH);
    } else {
      ctx.drawImage(image, sp.x - spriteW / 2, drawY, spriteW, spriteH);
    }
    ctx.restore();
    return true;
  }

  getGeneratedSprite(keyPrefix: string, frames: SpriteFrameCounts, ent: Entity, isMoving: boolean, time: number) {
    const { direction, flipX } = this.getMirroredFiveDirectionPose(ent.facing);
    const animation = ent.hp <= 0 ? 'death' : ent.state === UnitState.ATTACK ? 'attack' : isMoving ? 'walk' : 'idle';
    const totalFrames = frames[animation][direction];
    const frameDuration = animation === 'death' ? 150 : animation === 'attack' ? 105 : isMoving ? 105 : 190;
    const frame = animation === 'death'
      ? Math.min(totalFrames - 1, Math.floor(((ent.deathAnimTime ?? 0) * 1000) / frameDuration))
      : Math.floor(time / frameDuration) % totalFrames;
    const image = this.spriteImages.get(`${keyPrefix}:${animation}:${direction}:${frame}`) ?? null;
    return { image, flipX };
  }

  drawGeneratedEnemySprite(
    ctx: CanvasRenderingContext2D,
    keyPrefix: string,
    sp: { x: number; y: number },
    ent: Entity,
    isMoving: boolean,
    time: number,
    bob: number,
    scale = 3.7,
    anchor = 0.87,
    frames: SpriteFrameCounts = this.generatedEnemyFrames
  ) {
    const { image, flipX } = this.getGeneratedSprite(keyPrefix, frames, ent, isMoving, time);
    if (!image || !image.complete || image.naturalWidth === 0) {
      return false;
    }

    const z = this.engine.zoom;
    const spriteW = ent.size * scale * z;
    const spriteH = ent.size * scale * z;
    const drawY = sp.y - spriteH * anchor - bob;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(sp.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -spriteW / 2, drawY, spriteW, spriteH);
    } else {
      ctx.drawImage(image, sp.x - spriteW / 2, drawY, spriteW, spriteH);
    }
    ctx.restore();
    return true;
  }

  generateGrassPattern(ctx: CanvasRenderingContext2D) {
     const cvs = document.createElement('canvas');
     cvs.width = 100;
     cvs.height = 100;
     const c = cvs.getContext('2d')!;
     
     // Base Green
     c.fillStyle = COLORS.OVAL;
     c.fillRect(0,0,100,100);
     
     // Noise
     for(let i=0; i<400; i++) {
        c.fillStyle = Math.random() > 0.5 ? '#4d7c0f' : '#65a30d';
        c.globalAlpha = 0.3;
        c.fillRect(Math.random()*100, Math.random()*100, 2, 2);
     }
     this.grassPattern = ctx.createPattern(cvs, 'repeat');
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Clear Screen (Black Void)
    ctx.fillStyle = '#0f172a'; // Dark slate background
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.drawAtmosphere(ctx);

    const shake = this.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    this.drawIsoMap(ctx);
    
    // Calculate occlusions before drawing entities
    this.calculateOcclusions();
    
    this.drawEntities(ctx);
    this.drawRallyPointIndicators(ctx);
    this.drawProjectiles(ctx);
    this.drawEffects(ctx);
    this.drawPlacementGhost(ctx);
    this.drawSelectionBox(ctx);
    this.drawUIOverlay(ctx);
    ctx.restore();
  }

  drawRallyPointIndicators(ctx: CanvasRenderingContext2D) {
    const z = this.engine.zoom;
    const time = Date.now();
    const pulse = 1 + Math.sin(time * 0.006) * 0.08;

    this.engine.entities.forEach(entity => {
      if (!this.engine.selectedIds.includes(entity.id) || !entity.rallyPoint) return;

      const start = this.engine.worldToScreen(entity.pos.x, entity.pos.y);
      const end = this.engine.worldToScreen(entity.rallyPoint.x, entity.rallyPoint.y);

      ctx.save();
      ctx.strokeStyle = 'rgba(186, 255, 141, 0.74)';
      ctx.lineWidth = Math.max(1.5, 2 * z);
      ctx.setLineDash([8 * z, 6 * z]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
      ctx.strokeStyle = COLORS.SELECTION;
      ctx.beginPath();
      ctx.ellipse(end.x, end.y, 18 * z * pulse, 9 * z * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#baff8d';
      ctx.font = `${Math.max(9, 10 * z)}px monospace`;
      ctx.textAlign = 'center';
      const rallyTarget = entity.rallyTargetId
        ? this.engine.entities.find(target => target.id === entity.rallyTargetId)
        : null;
      const label = rallyTarget?.type === EntityType.BOOKSHELF || rallyTarget?.type === EntityType.ADMIN_OFFICE
        ? 'MINE'
        : 'RALLY';
      ctx.fillText(label, end.x, end.y - 14 * z);
      ctx.restore();
    });
  }

  getShakeOffset() {
    if (this.engine.screenShake <= 0) return { x: 0, y: 0 };

    return {
      x: (Math.random() - 0.5) * this.engine.screenShake,
      y: (Math.random() - 0.5) * this.engine.screenShake
    };
  }

  drawAtmosphere(ctx: CanvasRenderingContext2D) {
    const skyGlow = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    skyGlow.addColorStop(0, 'rgba(74, 222, 255, 0.12)');
    skyGlow.addColorStop(0.45, 'rgba(15, 23, 42, 0)');
    skyGlow.addColorStop(1, 'rgba(15, 23, 42, 0.28)');
    ctx.fillStyle = skyGlow;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const vignette = ctx.createRadialGradient(
      ctx.canvas.width / 2,
      ctx.canvas.height * 0.45,
      ctx.canvas.width * 0.18,
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
      ctx.canvas.width * 0.72
    );
    vignette.addColorStop(0, 'rgba(255,255,255,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  
  calculateOcclusions() {
    this.transparentEntityIds.clear();
    const zoom = this.engine.zoom;

    // Classify entities
    const occluders: Entity[] = [];
    const units: { pos: {x:number, y:number}, sortVal: number }[] = [];
    const structures: { id: number, bounds: { minX: number, maxX: number, minY: number, maxY: number }, sortVal: number }[] = [];

    // Helper to estimate visual height of buildings/props for hitbox
    const getVisualHeight = (type: EntityType) => {
        switch(type) {
            case EntityType.STAFFROOM: return 65 * zoom;
            case EntityType.SPORTS_CENTRE: return 116 * zoom;
            case EntityType.ADMIN_OFFICE: return 58 * zoom;
            case EntityType.TREE: return 98 * zoom; // Includes pixel-art canopy
            case EntityType.MATHS_DEPT: return 82 * zoom;
            case EntityType.SCIENCE_LAB: return 84 * zoom;
            case EntityType.COMMON_ROOM: return 101 * zoom;
            case EntityType.CANTEEN: return 86 * zoom;
            case EntityType.LOCKER:
            case EntityType.BOOKSHELF: return 36 * zoom;
            case EntityType.BOWLING_MACHINE: return 67 * zoom;
            default: return 40 * zoom;
        }
    };

    const getVisualWidth = (ent: Entity) => {
        switch(ent.type) {
            case EntityType.TREE: return 88 * zoom;
            case EntityType.ADMIN_OFFICE: return ent.size * 2.3 * zoom;
            case EntityType.STAFFROOM: return ent.size * 2.4 * zoom;
            case EntityType.SPORTS_CENTRE: return ent.size * 5.6 * zoom;
            case EntityType.MATHS_DEPT: return ent.size * 5.2 * zoom;
            case EntityType.SCIENCE_LAB: return ent.size * 5.4 * zoom;
            case EntityType.COMMON_ROOM: return ent.size * 5.0 * zoom;
            case EntityType.CANTEEN: return ent.size * 5.0 * zoom;
            case EntityType.LOCKER:
            case EntityType.BOOKSHELF:
            case EntityType.BOWLING_MACHINE: return ent.size * 4.2 * zoom;
            default: return ent.size * 2 * zoom;
        }
    };

    const isOccluder = (type: EntityType) => {
        return [
            EntityType.STAFFROOM, EntityType.SPORTS_CENTRE, EntityType.ADMIN_OFFICE, EntityType.TREE, 
            EntityType.MATHS_DEPT, EntityType.SCIENCE_LAB, EntityType.COMMON_ROOM, 
            EntityType.CANTEEN, EntityType.LOCKER, EntityType.BOOKSHELF,
            EntityType.BOWLING_MACHINE
        ].includes(type);
    };

    const isStructureTarget = (type: EntityType) => {
        return [
            EntityType.STAFFROOM, EntityType.SPORTS_CENTRE, EntityType.ADMIN_OFFICE,
            EntityType.MATHS_DEPT, EntityType.SCIENCE_LAB, EntityType.COMMON_ROOM,
            EntityType.CANTEEN, EntityType.LOCKER, EntityType.BOOKSHELF,
            EntityType.BOWLING_MACHINE
        ].includes(type);
    };

    const isUnit = (type: EntityType) => {
        return !isOccluder(type);
    };

    const getBounds = (ent: Entity) => {
        const sp = this.engine.worldToScreen(ent.pos.x, ent.pos.y);
        const w = getVisualWidth(ent);
        const h = getVisualHeight(ent.type);
        const bottomPadding = ent.type === EntityType.TREE ? 8 * zoom : 6 * zoom;
        return {
            minX: sp.x - w / 2,
            maxX: sp.x + w / 2,
            minY: sp.y - h,
            maxY: sp.y + bottomPadding
        };
    };

    const boundsIntersect = (
        a: { minX: number, maxX: number, minY: number, maxY: number },
        b: { minX: number, maxX: number, minY: number, maxY: number }
    ) => {
        return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
    };

    this.engine.entities.forEach(ent => {
        if (ent.hp <= 0 || ent.isHidden) return;

        if (isStructureTarget(ent.type)) {
            structures.push({
                id: ent.id,
                bounds: getBounds(ent),
                sortVal: ent.pos.x + ent.pos.y
            });
        }
        
        if (isOccluder(ent.type) && !ent.isUnderConstruction) { // Only finished buildings occlude
            occluders.push(ent);
        } else if (isUnit(ent.type)) {
            // Units need screen pos for check
            const sp = this.engine.worldToScreen(ent.pos.x, ent.pos.y);
            units.push({
                pos: sp,
                sortVal: ent.pos.x + ent.pos.y
            });
        }
    });

    // Check intersections
    occluders.forEach(occ => {
        const occBounds = getBounds(occ);
        const occSort = occ.pos.x + occ.pos.y;

        for (const u of units) {
            // 1. Depth Check: Is unit "behind" the building in isometric sorting?
            // "Behind" means drawn earlier, so smaller sortVal
            if (u.sortVal < occSort) {
                // 2. Screen Overlap Check: Is unit visually covered by the building?
                // We assume unit height is approx 20-30px, so we check if unit's feet or head is in box
                // Checking unit's feet position (u.pos)
                if (u.pos.x >= occBounds.minX && u.pos.x <= occBounds.maxX && u.pos.y >= occBounds.minY && u.pos.y <= occBounds.maxY) {
                    this.transparentEntityIds.add(occ.id);
                    break; // One unit is enough to trigger transparency
                }
            }
        }

        if (occ.type === EntityType.TREE && !this.transparentEntityIds.has(occ.id)) {
            for (const structure of structures) {
                if (structure.id === occ.id || structure.sortVal >= occSort) continue;
                if (boundsIntersect(occBounds, structure.bounds)) {
                    this.transparentEntityIds.add(occ.id);
                    break;
                }
            }
        }
    });
  }
  
  drawSelectionBox(ctx: CanvasRenderingContext2D) {
    if (this.engine.dragStart) {
       const x = this.engine.mousePos.x;
       const y = this.engine.mousePos.y;
       const startX = this.engine.dragStart.x;
       const startY = this.engine.dragStart.y;
       
       const w = x - startX;
       const h = y - startY;
       
       ctx.save();
       ctx.strokeStyle = '#22c55e'; 
       ctx.lineWidth = 1;
       ctx.setLineDash([8, 5]);
       ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
       
       // Screen space rect
       ctx.beginPath();
       ctx.rect(startX, startY, w, h);
       ctx.fill();
       ctx.stroke();
       ctx.restore();
    }
  }

  drawPlacementGhost(ctx: CanvasRenderingContext2D) {
    if (this.engine.pendingBuild) {
       const mx = this.engine.mousePos.x;
       const my = this.engine.mousePos.y;

       // Snap to world grid logic if needed, but smooth is fine for ghost
       const worldPos = this.engine.screenToWorld(mx, my);
       
       // Re-project to ensure it sits on the plane correctly
       const screenPos = this.engine.worldToScreen(worldPos.x, worldPos.y);

       ctx.save();
       const pulse = 0.45 + Math.sin(Date.now() * 0.006) * 0.12;
       ctx.globalAlpha = pulse;
       
       const stats = UNIT_STATS[this.engine.pendingBuild];
       const s = stats.size || 20;

       // Draw Ghost at Screen Pos
       ctx.fillStyle = COLORS.FACULTY_SHIRT;
       ctx.beginPath();
       ctx.ellipse(screenPos.x, screenPos.y - 10, s * this.engine.zoom, s*0.6 * this.engine.zoom, 0, 0, Math.PI*2);
       ctx.fill();

       // Range indicator (Projected Circle -> Ellipse)
       if (stats.range) {
           ctx.strokeStyle = '#fff';
           ctx.lineWidth = 1;
           ctx.setLineDash([8, 6]);
           ctx.beginPath();
           // Approximate isometric circle
           ctx.ellipse(screenPos.x, screenPos.y, stats.range * 0.8 * this.engine.zoom, stats.range * 0.4 * this.engine.zoom, 0, 0, Math.PI*2);
           ctx.stroke();
       }
       ctx.restore();
    }
  }

  // Draw the Diamond Grid
  drawIsoMap(ctx: CanvasRenderingContext2D) {
      // Draw from back to front
      const thickness = 15 * this.engine.zoom; // Dirt thickness scales with zoom
      
      for (let y = 0; y < GRID_H; y++) {
          for (let x = 0; x < GRID_W; x++) {
              this.drawTile(ctx, x, y, thickness);
          }
      }
  }

  traceTileTop(
    ctx: CanvasRenderingContext2D,
    p1: Vector2,
    p2: Vector2,
    p3: Vector2,
    p4: Vector2
  ) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
  }

  getTileSideColor(type: TileType) {
      switch (type) {
          case TileType.QUAD: return '#666e76';
          case TileType.DIRT: return '#4f2f18';
          case TileType.BUSHES: return '#315f2c';
          case TileType.ROCKS: return '#3f4a40';
          case TileType.OVAL:
          default: return '#3f2e18';
      }
  }

  getTileFallbackColor(type: TileType) {
      switch (type) {
          case TileType.QUAD: return COLORS.QUAD;
          case TileType.DIRT: return '#8b572a';
          case TileType.BUSHES: return '#3f8f33';
          case TileType.ROCKS: return '#6f777a';
          case TileType.OVAL:
          default: return COLORS.OVAL;
      }
  }

  getTileImage(type: TileType, gx: number, gy: number) {
      const images = this.tileImages[type];
      if (!images || images.length === 0) return null;

      const index = Math.floor(this.pseudoRandom((gx + 1) * 73 + (gy + 1) * 151 + type.length * 31) * images.length);
      const image = images[Math.min(index, images.length - 1)];
      return image && image.complete && image.naturalWidth > 0 ? image : null;
  }

  drawTileTexture(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    p1: Vector2,
    p2: Vector2,
    p3: Vector2,
    p4: Vector2
  ) {
      ctx.save();
      this.traceTileTop(ctx, p1, p2, p3, p4);
      ctx.clip();
      ctx.transform(
          (p2.x - p1.x) / image.naturalWidth,
          (p2.y - p1.y) / image.naturalWidth,
          (p4.x - p1.x) / image.naturalHeight,
          (p4.y - p1.y) / image.naturalHeight,
          p1.x,
          p1.y
      );
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = this.engine.zoom < 1 ? 'medium' : 'low';
      ctx.drawImage(image, 0, 0);
      ctx.restore();
  }

  drawTile(ctx: CanvasRenderingContext2D, gx: number, gy: number, thickness: number) {
      const wx = gx * TILE_SIZE;
      const wy = gy * TILE_SIZE;
      
      // 4 corners
      const p1 = this.engine.worldToScreen(wx, wy); // Top
      const p2 = this.engine.worldToScreen(wx + TILE_SIZE, wy); // Right
      const p3 = this.engine.worldToScreen(wx + TILE_SIZE, wy + TILE_SIZE); // Bottom
      const p4 = this.engine.worldToScreen(wx, wy + TILE_SIZE); // Left

      const type = this.engine.tiles[gy][gx] ?? TileType.OVAL;

      ctx.fillStyle = this.getTileSideColor(type);
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.lineTo(p4.x, p4.y + thickness);
      ctx.lineTo(p3.x, p3.y + thickness);
      ctx.lineTo(p2.x, p2.y + thickness);
      ctx.closePath();
      ctx.fill();

      this.traceTileTop(ctx, p1, p2, p3, p4);
      ctx.fillStyle = this.getTileFallbackColor(type);
      ctx.fill();

      const tileImage = this.getTileImage(type, gx, gy);
      if (tileImage) {
          this.drawTileTexture(ctx, tileImage, p1, p2, p3, p4);
      }

      if (!tileImage) {
          this.traceTileTop(ctx, p1, p2, p3, p4);
          ctx.strokeStyle = 'rgba(0,0,0,0.035)';
          ctx.lineWidth = Math.max(1, this.engine.zoom);
          ctx.stroke();
      }
  }

  drawEntities(ctx: CanvasRenderingContext2D) {
    // Z-Sort: Sort by (WorldX + WorldY) basically correlates to Screen Y depth in Iso
    const sorted = [...this.engine.entities].sort((a, b) => {
        return (a.pos.x + a.pos.y) - (b.pos.x + b.pos.y);
    });

    sorted.forEach(ent => {
      // Don't draw hidden entities (e.g. workers in mines)
      if (ent.isHidden) return;
      
      // Check Occlusion Transparency
      if (this.transparentEntityIds.has(ent.id)) {
          ctx.globalAlpha = 0.4;
      }

      const sp = this.engine.worldToScreen(ent.pos.x, ent.pos.y);
      const zoom = this.engine.zoom;
      
      const shadowSize =
        ent.type === EntityType.TEACHER_AIDE ? ent.size * 0.78 * zoom :
        ent.type === EntityType.YEAR_7 ? ent.size * 0.72 * zoom :
        ent.size * zoom;
      const shadowAlpha =
        ent.type === EntityType.TEACHER_AIDE ? 0.18 :
        ent.type === EntityType.YEAR_7 ? 0.16 :
        0.3;
      const shadowYOffset =
        ent.type === EntityType.TEACHER_AIDE ? 2 * zoom :
        ent.type === EntityType.YEAR_7 ? 1.5 * zoom :
        0;
      this.drawShadow(ctx, { x: sp.x, y: sp.y + shadowYOffset }, shadowSize, shadowAlpha);

      // Selection Indicator (Projected Circle)
      if (this.engine.selectedIds.includes(ent.id)) {
        const footprint = this.getSelectionFootprint(ent);
        const pulse = 1 + Math.sin(Date.now() * 0.007) * 0.08;
        ctx.strokeStyle = COLORS.SELECTION;
        ctx.lineWidth = 2 * zoom;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, footprint.radiusX * pulse, footprint.radiusY * pulse, 0, 0, Math.PI*2);
        ctx.stroke();
      }

      // Mean Girl Aura (Projected)
      if (ent.type === EntityType.MEAN_GIRL) {
         ctx.save();
         ctx.strokeStyle = COLORS.MEAN_GIRL_PINK;
         ctx.globalAlpha = 0.1;
         ctx.beginPath();
         // 150 radius world -> ~150 * 0.8 screen X, ~150 * 0.4 screen Y
         ctx.ellipse(sp.x, sp.y, 150 * 0.8 * zoom, 150 * 0.4 * zoom, 0, 0, Math.PI*2);
         ctx.fill();
         ctx.stroke();
         ctx.restore();
      }

      // STUNNED INDICATOR
      if (ent.state === UnitState.STUNNED) {
          ctx.save();
          const time = Date.now();
          const cx = sp.x;
          const cy = sp.y - 60 * zoom;
          ctx.translate(cx, cy);
          ctx.rotate(time * 0.005);
          ctx.fillStyle = '#facc15';
          for(let i=0; i<5; i++) {
              const ang = (i/5) * Math.PI * 2;
              ctx.beginPath();
              ctx.arc(Math.cos(ang) * 15 * zoom, Math.sin(ang) * 10 * zoom, 3 * zoom, 0, Math.PI*2);
              ctx.fill();
          }
          ctx.restore();
      }

      // Render Entity Type
      if (ent.type === EntityType.BOWLING_MACHINE) {
          this.drawBowlingMachine(ctx, sp, ent);
      } else if (ent.type === EntityType.YEAR_7_RAT_KING) {
          if (!this.drawGeneratedEnemySprite(ctx, 'ratKing', sp, ent, ent.state === UnitState.MOVE || ent.state === UnitState.CHASE, Date.now(), 0, 4.3, 0.86)) {
              this.drawRatKing(ctx, sp, ent);
          }
      } else if (['STAFFROOM','MATHS_DEPT','SCIENCE_LAB','COMMON_ROOM','CANTEEN', 'SPORTS_CENTRE'].includes(ent.type)) {
          this.drawIsoBuilding(ctx, sp, ent);
      } else if (ent.type === EntityType.LOCKER || ent.type === EntityType.BOOKSHELF || ent.type === EntityType.ADMIN_OFFICE) {
          this.drawIsoProp(ctx, sp, ent);
      } else if (ent.type === EntityType.TREE) {
          this.drawIsoTree(ctx, sp);
      } else {
          this.drawHumanoid(ctx, sp, ent);
      }
      
      // Reset Alpha
      ctx.globalAlpha = 1.0;

      // HP Bar (Floating above head)
      if ((ent.hp < ent.maxHp || this.engine.selectedIds.includes(ent.id)) && ent.hp > 0 && !ent.isUnderConstruction) {
        const barW = 24 * zoom;
        const barH = 4 * zoom;
        const pct = ent.hp / ent.maxHp;
        const isBuilding = ['STAFFROOM','MATHS_DEPT','SCIENCE_LAB','COMMON_ROOM','CANTEEN', 'SPORTS_CENTRE'].includes(ent.type);
        // Height depends on entity visual height
        let height = 40 * zoom;
        if (isBuilding) height = 60 * zoom;
        if (ent.type === EntityType.SPORTS_CENTRE) height = 70 * zoom;
        if (ent.type === EntityType.TREE) height = 80 * zoom;
        if (ent.type === EntityType.GYM_COACH) height = 76 * zoom;
        if (ent.type === EntityType.YEAR_7) height = 30 * zoom;
        
        const hpY = sp.y - height;
        
        ctx.fillStyle = COLORS.HP_BAR_BG;
        ctx.fillRect(sp.x - barW/2, hpY, barW, barH);
        ctx.fillStyle = COLORS.HP_BAR_FG;
        ctx.fillRect(sp.x - barW/2, hpY, barW * pct, barH);
      }
      
      // TRAINING PROGRESS BAR (Gold)
      if (ent.trainingQueue && ent.trainingQueue.length > 0 && !ent.isUnderConstruction) {
          const barW = 24 * zoom;
          const barH = 4 * zoom;
          const item = ent.trainingQueue[0];
          const pct = item.progress / 100;
          let height = 65 * zoom; // Slightly above HP bar
          if (ent.type === EntityType.SPORTS_CENTRE) height = 75 * zoom;
          
          const barY = sp.y - height;

          ctx.fillStyle = COLORS.HP_BAR_BG;
          ctx.fillRect(sp.x - barW/2, barY, barW, barH);
          ctx.fillStyle = '#f59e0b'; // Amber-500
          ctx.fillRect(sp.x - barW/2, barY, barW * pct, barH);
      }
    });
  }

  getSelectionFootprint(ent: Entity) {
    const z = this.engine.zoom;
    const unitRadius = (ent.size + 4) * z;

    switch (ent.type) {
      case EntityType.STAFFROOM:
        return { radiusX: ent.size * 2.9 * z, radiusY: ent.size * 1.15 * z };
      case EntityType.SPORTS_CENTRE:
        return { radiusX: ent.size * 2.8 * z, radiusY: ent.size * 1.12 * z };
      case EntityType.MATHS_DEPT:
        return { radiusX: ent.size * 2.6 * z, radiusY: ent.size * 1.05 * z };
      case EntityType.SCIENCE_LAB:
        return { radiusX: ent.size * 2.7 * z, radiusY: ent.size * 1.08 * z };
      case EntityType.COMMON_ROOM:
      case EntityType.CANTEEN:
      case EntityType.ADMIN_OFFICE:
        return { radiusX: ent.size * 2.5 * z, radiusY: ent.size * 1.0 * z };
      case EntityType.LOCKER:
        return { radiusX: ent.size * 1.55 * z, radiusY: ent.size * 0.65 * z };
      case EntityType.BOOKSHELF:
      case EntityType.BOWLING_MACHINE:
        return { radiusX: ent.size * 2.1 * z, radiusY: ent.size * 0.84 * z };
      default:
        return { radiusX: unitRadius, radiusY: unitRadius * 0.5 };
    }
  }

  drawShadow(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, size: number, alpha = 0.3) {
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.beginPath();
      // Shadow is an ellipse on the ground
      ctx.ellipse(sp.x, sp.y, size, size * 0.5, 0, 0, Math.PI*2);
      ctx.fill();
  }

  drawStructureSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    sp: {x: number, y: number},
    width: number,
    yOffset = 3
  ) {
      const image = this.structureImages.get(key);
      if (!image || !image.complete || image.naturalWidth === 0) return false;

      const height = width * (image.naturalHeight / image.naturalWidth);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(image, sp.x - width / 2, sp.y - height + yOffset * this.engine.zoom, width, height);
      ctx.restore();
      return true;
  }

  // --- ISOMETRIC PROPS ---
  
  drawIsoTree(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}) {
      const z = this.engine.zoom;
      const treeImage = this.environmentImages.get('tree');
      if (treeImage && treeImage.complete && treeImage.naturalWidth > 0) {
          const spriteW = 88 * z;
          const spriteH = spriteW * (treeImage.naturalHeight / treeImage.naturalWidth);
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(treeImage, sp.x - spriteW / 2, sp.y - spriteH + 8 * z, spriteW, spriteH);
          ctx.restore();
          return;
      }

      // Trunk
      ctx.fillStyle = COLORS.TREE_TRUNK;
      ctx.fillRect(sp.x - 4*z, sp.y - 20*z, 8*z, 20*z);
      
      // Leaves (3 layers of cones/circles)
      ctx.fillStyle = COLORS.TREE_LEAVES;
      
      const drawLayer = (yOff: number, r: number) => {
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y - 20*z - yOff*z, r*z, r * 0.8 * z, 0, 0, Math.PI*2);
          ctx.fill();
          // Lighting
          ctx.fillStyle = '#4ade80';
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.ellipse(sp.x - r/3*z, sp.y - 20*z - yOff*z - r/3*z, r/3*z, r/3*z, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = COLORS.TREE_LEAVES;
      };

      drawLayer(10, 20);
      drawLayer(25, 15);
      drawLayer(35, 10);
  }

  pseudoRandom(seed: number) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
  }

  drawIsoProp(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity) {
      const z = this.engine.zoom;
      if (ent.isUnderConstruction) {
          // Scaffolding for props like Locker
          const s = ent.size * z;
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 2;
          this.drawIsoBox(ctx, sp.x, sp.y, s, s, 20*z, undefined, true);
          this.drawBuildProgress(ctx, sp, ent);
          return;
      }

      if (ent.type === EntityType.LOCKER) {
          const lockerKey = `locker${Math.floor(this.pseudoRandom(ent.id * 31) * 4)}`;
          if (this.drawStructureSprite(ctx, lockerKey, sp, ent.size * 3.1 * z, 2)) return;

          // Grey Metallic Locker
          this.drawIsoBox(ctx, sp.x, sp.y, 15*z, 15*z, 45*z, '#9ca3af');
          // Front Detail (Vents)
          const face = this.getFaceCoords(sp.x, sp.y, 15*z, 15*z, 45*z).left;
          ctx.fillStyle = '#4b5563';
          
          // Draw vents as small lines on the face
          const lerp = (p1: any, p2: any, t: number) => ({ x: p1.x + (p2.x - p1.x)*t, y: p1.y + (p2.y - p1.y)*t });
          
          for(let i=0; i<3; i++) {
             const start = lerp(face.tl, face.bl, 0.1 + i*0.05);
             const end = lerp(face.tr, face.br, 0.1 + i*0.05);
             // Shorten horizontally
             const s = lerp(start, end, 0.2);
             const e = lerp(start, end, 0.8);
             ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); 
             ctx.lineWidth = 2*z; ctx.strokeStyle = '#374151'; ctx.stroke();
          }
      } else if (ent.type === EntityType.BOOKSHELF) {
          if (this.drawStructureSprite(ctx, 'bookshelf', sp, ent.size * 4.4 * z, 3)) return;

          // Draw Cabinet Frame
          const w = 20*z;
          const d = 10*z;
          const h = 40*z;
          
          // Main Box (Cabinet)
          this.drawIsoBox(ctx, sp.x, sp.y, w, d, h, '#78350f'); 
          
          // Inner Shelf Cavity (Darker)
          const faces = this.getFaceCoords(sp.x, sp.y, w, d, h);
          this.drawRectOnFace(ctx, faces.left, 0.1, 0.05, 0.8, 0.9, '#451a03');

          // Shelves
          const shelfCount = 3;
          const leftFace = faces.left;
          const lerp = (p1: any, p2: any, t: number) => ({ x: p1.x + (p2.x - p1.x)*t, y: p1.y + (p2.y - p1.y)*t });
          
          // Book Colors
          const bookColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#57534e'];

          for(let i=1; i<=shelfCount; i++) {
              // Draw Shelf Line
              const yPct = i / (shelfCount + 1);
              this.drawRectOnFace(ctx, leftFace, 0.1, yPct, 0.8, 0.02, '#a8a29e');
              
              // Draw Books on this shelf (Sitting on top of yPct)
              const bookYBase = yPct; // Bottom of books
              let currentX = 0.12;
              
              // Random seed based on entity ID + shelf index to stay consistent
              let rnd = this.pseudoRandom(ent.id * 100 + i);
              
              while(currentX < 0.85) {
                  // Next random
                  rnd = this.pseudoRandom(rnd * 1000);
                  
                  const bookW = 0.03 + (rnd * 0.04); // Varying width
                  const bookH = 0.15 + (this.pseudoRandom(rnd*2) * 0.05); // Varying height
                  const color = bookColors[Math.floor(this.pseudoRandom(rnd*3) * bookColors.length)];
                  
                  if (currentX + bookW > 0.88) break;

                  // Draw Book spine
                  this.drawRectOnFace(ctx, leftFace, currentX, bookYBase - bookH, bookW, bookH, color);
                  
                  // Small gap
                  currentX += bookW + 0.01;
                  
                  // Chance to skip space (leaning book or empty spot)
                  if (this.pseudoRandom(rnd*4) > 0.8) {
                      currentX += 0.05;
                  }
              }
          }

      } else if (ent.type === EntityType.ADMIN_OFFICE) {
          if (this.drawStructureSprite(ctx, 'admin', sp, ent.size * 5.0 * z, 4)) return;
          this.drawAdminBuilding(ctx, sp, ent);
      }
  }
  
  drawAdminBuilding(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity) {
      const z = this.engine.zoom;
      const s = ent.size * z; // ~40 * z
      const h = 50 * z;

      // Base Platform (Steps)
      this.drawIsoBox(ctx, sp.x, sp.y, s + 10*z, s + 10*z, 5*z, '#a8a29e'); // Stone grey

      // Main Block (Sandstone)
      const mainS = s;
      this.drawIsoBox(ctx, sp.x, sp.y - 5*z, mainS, mainS, h, '#d6d3d1'); 

      // Roof (Dark Slate Shingled)
      this.drawTexturedRoof(ctx, {x: sp.x, y: sp.y - 5*z}, mainS, h, '#475569', 'SHINGLES');

      const faces = this.getFaceCoords(sp.x, sp.y - 5*z, mainS, mainS, h);
      
      // Pillars
      const pillarColor = '#f5f5f4'; // White stone
      this.drawRectOnFace(ctx, faces.left, 0.1, 0.0, 0.1, 0.8, pillarColor);
      this.drawRectOnFace(ctx, faces.left, 0.3, 0.0, 0.1, 0.8, pillarColor);
      this.drawRectOnFace(ctx, faces.left, 0.6, 0.0, 0.1, 0.8, pillarColor);
      this.drawRectOnFace(ctx, faces.left, 0.8, 0.0, 0.1, 0.8, pillarColor);

      // Entrance Door
      this.drawRectOnFace(ctx, faces.left, 0.42, 0.4, 0.16, 0.4, '#451a03'); 

      // Windows on Right Face
      const winColor = '#38bdf8'; 
      this.drawRectOnFace(ctx, faces.right, 0.15, 0.2, 0.2, 0.4, winColor);
      this.drawRectOnFace(ctx, faces.right, 0.65, 0.2, 0.2, 0.4, winColor);
      
      // Sign "ADMIN"
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${10*z}px Arial`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText('ADMINISTRATION', sp.x - 20*z, sp.y - h - 15*z);
      ctx.shadowBlur = 0;
  }

  // --- BUILDING RENDERERS ---
  
  drawBuildProgress(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity) {
      const z = this.engine.zoom;
      const barW = 30 * z;
      const barH = 5 * z;
      const pct = ent.buildProgress / 100;
      
      const barY = sp.y - 70 * z;

      // Label "Constructing"
      ctx.fillStyle = '#fff';
      ctx.font = `${10*z}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Building...', sp.x, barY - 5*z);

      ctx.fillStyle = COLORS.HP_BAR_BG;
      ctx.fillRect(sp.x - barW/2, barY, barW, barH);
      ctx.fillStyle = '#3b82f6'; // Blue progress
      ctx.fillRect(sp.x - barW/2, barY, barW * pct, barH);
  }

  drawIsoBuilding(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity) {
      const z = this.engine.zoom;
      const time = Date.now();
      
      // Construction State
      if (ent.isUnderConstruction) {
          if (this.drawStructureSprite(ctx, 'scaffold', sp, ent.size * 5.0 * z, 4)) {
              this.drawBuildProgress(ctx, sp, ent);
              return;
          }

          const s = ent.size * z;
          const h = 40 * z;
          
          // Wireframe Scaffolding
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 2 * z;
          this.drawIsoBox(ctx, sp.x, sp.y, s, s, h, undefined, true);
          
          // Wooden Struts (Diagonal)
          const faces = this.getFaceCoords(sp.x, sp.y, s, s, h);
          ctx.beginPath();
          ctx.moveTo(faces.left.bl.x, faces.left.bl.y); ctx.lineTo(faces.left.tr.x, faces.left.tr.y);
          ctx.moveTo(faces.right.bl.x, faces.right.bl.y); ctx.lineTo(faces.right.tr.x, faces.right.tr.y);
          ctx.stroke();

          // Partially filled base (visual feedback of progress)
          const filledH = h * (ent.buildProgress / 100);
          if (filledH > 1) {
             this.drawIsoBox(ctx, sp.x, sp.y, s-2, s-2, filledH, 'rgba(120, 53, 15, 0.5)');
          }

          this.drawBuildProgress(ctx, sp, ent);
          return;
      }

      switch(ent.type) {
        case EntityType.STAFFROOM: this.drawStaffroom(ctx, sp, ent, z, time); break;
        case EntityType.SCIENCE_LAB: this.drawScienceLab(ctx, sp, ent, z, time); break;
        case EntityType.MATHS_DEPT: this.drawMathsDept(ctx, sp, ent, z, time); break;
        case EntityType.COMMON_ROOM: this.drawCommonRoom(ctx, sp, ent, z, time); break;
        case EntityType.CANTEEN: this.drawCanteen(ctx, sp, ent, z, time); break;
        case EntityType.SPORTS_CENTRE: this.drawSportsCentre(ctx, sp, ent, z, time); break;
        default: this.drawGenericBuilding(ctx, sp, ent, z); break;
      }
  }

  drawSportsCentre(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity, z: number, time: number) {
      if (this.drawStructureSprite(ctx, 'sports', sp, ent.size * 5.6 * z, 4)) return;

      const s = ent.size * z;
      const h = 60 * z;
      
      // Base: Light Stone/Concrete
      this.drawIsoBox(ctx, sp.x, sp.y, s, s, h, '#d1d5db'); 
      // Roof: Green Curved/Arch (Simulated with Corrugated)
      this.drawTexturedRoof(ctx, sp, s, h, '#15803d', 'CORRUGATED');

      const faces = this.getFaceCoords(sp.x, sp.y, s, s, h);
      
      // Gym Lines/Stripe on wall
      this.drawRectOnFace(ctx, faces.left, 0, 0.2, 1, 0.1, '#facc15'); // Yellow stripe
      this.drawRectOnFace(ctx, faces.right, 0, 0.2, 1, 0.1, '#facc15');
      
      // Large Double Doors
      this.drawRectOnFace(ctx, faces.left, 0.35, 0.5, 0.3, 0.5, '#1e3a8a');

      // Basketball Hoop (Abstract)
      const hoopX = sp.x + s; // Right corner
      const hoopY = sp.y - h*0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(hoopX, hoopY); ctx.lineTo(hoopX, hoopY+10*z); ctx.lineTo(hoopX+5*z, hoopY+5*z); ctx.fill(); // Backboard ish
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hoopX+3*z, hoopY+8*z, 2*z, 0, Math.PI*2); ctx.stroke();
  }

  drawStaffroom(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity, z: number, time: number) {
      if (this.drawStructureSprite(ctx, 'staffroom', sp, ent.size * 5.8 * z, 4)) return;

      const s = ent.size * z;
      const h = 55 * z;
      
      // Base: Red Brick
      this.drawIsoBox(ctx, sp.x, sp.y, s, s, h, '#7f1d1d'); 
      // Roof: Slate Peaked with Shingles
      this.drawTexturedRoof(ctx, sp, s, h, '#1e293b', 'SHINGLES');

      const faces = this.getFaceCoords(sp.x, sp.y, s, s, h);

      // Right Face: Entrance
      const doorColor = '#1e3a8a';
      this.drawRectOnFace(ctx, faces.right, 0.35, 0.0, 0.3, 0.45, doorColor);
      // Steps
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.moveTo(faces.right.bl.x, faces.right.bl.y);
      ctx.lineTo(faces.right.br.x, faces.right.br.y);
      ctx.lineTo(faces.right.br.x + 5*z, faces.right.br.y + 2*z);
      ctx.lineTo(faces.right.bl.x + 5*z, faces.right.bl.y + 2*z);
      ctx.fill();

      // Left Face: Windows (Warm Light)
      const winColor = '#fcd34d'; 
      this.drawRectOnFace(ctx, faces.left, 0.15, 0.4, 0.25, 0.3, winColor);
      this.drawRectOnFace(ctx, faces.left, 0.6, 0.4, 0.25, 0.3, winColor);
  }

  drawScienceLab(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity, z: number, time: number) {
      if (this.drawStructureSprite(ctx, 'science', sp, ent.size * 5.4 * z, 4)) return;

      const s = ent.size * z;
      const h = 50 * z;
      
      // Base: Concrete
      this.drawIsoBox(ctx, sp.x, sp.y, s, s, h, '#475569'); 
      
      // Roof: Flat with vent
      const vx = sp.x; 
      const vy = sp.y - h;
      this.drawIsoBox(ctx, vx, vy, s*0.4, s*0.4, 15*z, '#94a3b8'); // Vent box
      
      const faces = this.getFaceCoords(sp.x, sp.y, s, s, h);

      // Flashing Windows
      const colors = ['#84cc16', '#22d3ee', '#a855f7', '#10b981']; 
      
      const drawFlashWindow = (face: any, u: number, v: number, idx: number) => {
          const flash = Math.sin(time * 0.008 + idx * 2) > 0;
          const color = flash ? colors[idx % colors.length] : '#1e293b'; 
          this.drawRectOnFace(ctx, face, u, v, 0.25, 0.3, color);
          if(flash) {
              ctx.globalAlpha = 0.3;
              this.drawRectOnFace(ctx, face, u, v, 0.25, 0.3, '#fff');
              ctx.globalAlpha = 1.0;
          }
      };

      drawFlashWindow(faces.left, 0.15, 0.4, 0);
      drawFlashWindow(faces.left, 0.6, 0.4, 1);
      drawFlashWindow(faces.right, 0.15, 0.4, 2);
      drawFlashWindow(faces.right, 0.6, 0.4, 3);
  }

  drawMathsDept(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity, z: number, time: number) {
      if (this.drawStructureSprite(ctx, 'maths', sp, ent.size * 5.2 * z, 4)) return;

      const s = ent.size * z;
      const h = 45 * z;
      
      // Base: White/Blue clean
      this.drawIsoBox(ctx, sp.x, sp.y, s, s, h, '#bfdbfe'); 
      // Roof: Blue Panels
      this.drawTexturedRoof(ctx, sp, s, h, '#2563eb', 'PANELS');

      const faces = this.getFaceCoords(sp.x, sp.y, s, s, h);

      // Grid Lines on Walls
      const drawGrid = (face: any) => {
          ctx.strokeStyle = 'rgba(37, 99, 235, 0.2)'; 
          ctx.lineWidth = 1;
          const lerp = (p1: any, p2: any, t: number) => ({ x: p1.x + (p2.x - p1.x)*t, y: p1.y + (p2.y - p1.y)*t });
          
          for(let i=1; i<4; i++) {
              const t = i/4;
              let s = lerp(face.tl, face.tr, t);
              let e = lerp(face.bl, face.br, t);
              ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
              s = lerp(face.tl, face.bl, t);
              e = lerp(face.tr, face.br, t);
              ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
          }
      };
      
      drawGrid(faces.left);
      drawGrid(faces.right);

      // Windows
      this.drawRectOnFace(ctx, faces.left, 0.2, 0.3, 0.6, 0.4, '#60a5fa');
  }

  drawCanteen(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity, z: number, time: number) {
      if (this.drawStructureSprite(ctx, 'canteen', sp, ent.size * 5.0 * z, 4)) return;

      const s = ent.size * z;
      const h = 40 * z;
      
      // Base: Beige
      this.drawIsoBox(ctx, sp.x, sp.y, s, s, h, '#fef3c7'); 
      // Roof: Red Flat-ish
      this.drawTexturedRoof(ctx, sp, s, h, '#ef4444', 'FLAT');
      
      const faces = this.getFaceCoords(sp.x, sp.y, s, s, h);

      // Serving Window (Right Face)
      this.drawRectOnFace(ctx, faces.right, 0.2, 0.3, 0.6, 0.3, '#1f2937'); 

      // Awning (Striped Red/White)
      const winTopL = this.lerp2(faces.right.tl, faces.right.tr, faces.right.bl, faces.right.br, 0.15, 0.6); 
      const winTopR = this.lerp2(faces.right.tl, faces.right.tr, faces.right.bl, faces.right.br, 0.85, 0.6);
      
      const normal = { x: 20*z, y: 10*z }; 
      
      const p1 = this.lerp2(faces.right.tl, faces.right.tr, faces.right.bl, faces.right.br, 0.15, 0.6);
      const p2 = this.lerp2(faces.right.tl, faces.right.tr, faces.right.bl, faces.right.br, 0.85, 0.6);
      const p3 = { x: p2.x + normal.x, y: p2.y + normal.y };
      const p4 = { x: p1.x + normal.x, y: p1.y + normal.y };
      
      const stripes = 5;
      for(let i=0; i<stripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#ffffff';
          const t1 = i/stripes;
          const t2 = (i+1)/stripes;
          
          const s1 = this.lerp(p1, p2, t1);
          const s2 = this.lerp(p1, p2, t2);
          const e1 = this.lerp(p4, p3, t1);
          const e2 = this.lerp(p4, p3, t2);
          
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.lineTo(e2.x, e2.y); ctx.lineTo(e1.x, e1.y);
          ctx.fill();
      }
  }

  drawCommonRoom(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity, z: number, time: number) {
      if (this.drawStructureSprite(ctx, 'commonRoom', sp, ent.size * 5.0 * z, 4)) return;

      const s = ent.size * z;
      const h = 40 * z;
      
      // Base: Wood
      this.drawIsoBox(ctx, sp.x, sp.y, s, s, h, '#78350f'); 
      
      // Roof: Silver Corrugated
      this.drawTexturedRoof(ctx, sp, s, h, '#cbd5e1', 'CORRUGATED');

      const faces = this.getFaceCoords(sp.x, sp.y, s, s, h);
      // Large open door/garage
      this.drawRectOnFace(ctx, faces.left, 0.2, 0.0, 0.6, 0.7, '#0f172a');
  }

  drawGenericBuilding(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity, z: number) {
      const s = ent.size * z;
      const h = 40 * z;
      this.drawIsoBox(ctx, sp.x, sp.y, s, s, h, '#f3f4f6');
      this.drawTexturedRoof(ctx, sp, s, h, '#374151', 'FLAT');
      const faces = this.getFaceCoords(sp.x, sp.y, s, s, h);
      this.drawRectOnFace(ctx, faces.right, 0.3, 0.0, 0.4, 0.5, '#1f2937');
  }

  // --- HELPERS ---

  // Calculates the 4 corners of the Left and Right vertical faces
  getFaceCoords(cx: number, cy: number, w: number, d: number, h: number) {
      // Base Points (Bottom)
      const b_mid = { x: cx, y: cy + d*0.5 };
      const b_left = { x: cx - w, y: cy };
      const b_right = { x: cx + w, y: cy };
      // Top Points
      const t_mid = { x: cx, y: cy - h + d*0.5 };
      const t_left = { x: cx - w, y: cy - h };
      const t_right = { x: cx + w, y: cy - h };

      return {
          left: { tl: t_left, tr: t_mid, bl: b_left, br: b_mid },
          right: { tl: t_mid, tr: t_right, bl: b_mid, br: b_right }
      };
  }

  // Draw a rectangle on a defined face using UV coordinates (0..1)
  drawRectOnFace(ctx: CanvasRenderingContext2D, face: any, u: number, v: number, w: number, h: number, color: string) {
      const t1 = this.lerp(face.tl, face.tr, u);
      const t2 = this.lerp(face.tl, face.tr, u + w);
      const b1 = this.lerp(face.bl, face.br, u);
      const b2 = this.lerp(face.bl, face.br, u + w);
      
      const p1 = this.lerp(t1, b1, v);         // Top-Left
      const p2 = this.lerp(t2, b2, v);         // Top-Right
      const p3 = this.lerp(t2, b2, v + h);     // Bottom-Right
      const p4 = this.lerp(t1, b1, v + h);     // Bottom-Left

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.fill();
  }
  
  lerp(p1: {x:number, y:number}, p2: {x:number, y:number}, t: number) {
      return { x: p1.x + (p2.x - p1.x)*t, y: p1.y + (p2.y - p1.y)*t };
  }

  lerp2(tl: any, tr: any, bl: any, br: any, u: number, v: number) {
      const top = this.lerp(tl, tr, u);
      const bot = this.lerp(bl, br, u);
      return this.lerp(top, bot, v);
  }

  drawTexturedRoof(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, s: number, h: number, color: string, style: 'SHINGLES' | 'CORRUGATED' | 'PANELS' | 'FLAT' = 'FLAT') {
      const roofY = sp.y - h;
      const z = this.engine.zoom;
      const peak = { x: sp.x, y: roofY - 15*z };
      const right = { x: sp.x + s, y: roofY };
      const front = { x: sp.x, y: roofY + s*0.5 };
      const left = { x: sp.x - s, y: roofY };

      const drawFace = (p1: any, p2: any, p3: any, c: string, texture: boolean) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fill();

          if (texture) {
              ctx.strokeStyle = 'rgba(0,0,0,0.2)';
              ctx.lineWidth = 1;
              
              if (style === 'SHINGLES') {
                  const rows = 6;
                  for(let i=1; i<rows; i++) {
                      const t = i/rows;
                      const l = this.lerp(p1, p3, t);
                      const r = this.lerp(p1, p2, t);
                      ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke();
                      // Vertical dashes
                      const dashes = 4 + i;
                      for(let j=0; j<=dashes; j++) {
                          const dt = j/dashes;
                          const dStart = this.lerp(l, r, dt);
                          const prevL = this.lerp(p1, p3, (i-1)/rows);
                          const prevR = this.lerp(p1, p2, (i-1)/rows);
                          const dEnd = this.lerp(prevL, prevR, dt);
                          // Shift dashes every row
                          if (i%2 === 0) {
                              const shift = (this.lerp(l,r,0.5).x - l.x) / dashes * 0.5;
                              dStart.x += shift; dEnd.x += shift;
                          }
                          ctx.beginPath(); ctx.moveTo(dStart.x, dStart.y); ctx.lineTo(dEnd.x, dEnd.y); ctx.stroke();
                      }
                  }
              } else if (style === 'CORRUGATED') {
                  const ridges = 8;
                  for(let i=0; i<=ridges; i++) {
                      const t = i/ridges;
                      const s = this.lerp(p3, p2, t); // Bottom edge
                      const e = p1; // Peak
                      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
                  }
              } else if (style === 'PANELS') {
                  const panels = 3;
                  // Vertical seams
                  for(let i=1; i<panels; i++) {
                      const t = i/panels;
                      const s = this.lerp(p3, p2, t);
                      const e = p1;
                      ctx.lineWidth = 2;
                      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
                      ctx.lineWidth = 1;
                      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                      ctx.beginPath(); ctx.moveTo(s.x+1, s.y); ctx.lineTo(e.x+1, e.y); ctx.stroke();
                  }
              }
          }
      };

      // Right Face (Lit)
      drawFace(peak, right, front, color, true);

      // Left Face (Shadowed)
      drawFace(peak, front, left, this.shadeColor(color, -20), true);
  }
  
  // Replaces old drawIsoRoof
  drawIsoRoof(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, s: number, h: number, color: string) {
      this.drawTexturedRoof(ctx, sp, s, h, color, 'FLAT');
  }

  // Helper to draw an isometric cube/prism
  drawIsoBox(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, d: number, h: number, color?: string, wireframe = false) {
      // Dimensions are approximate screen pixels for width/depth visual
      // Left Face
      const p1 = { x: cx, y: cy + d*0.5 }; // Bottom Center
      const p2 = { x: cx - w, y: cy };     // Left Corner
      const p3 = { x: cx - w, y: cy - h }; // Top Left
      const p4 = { x: cx, y: cy - h + d*0.5 }; // Top Center
      
      // Right Face
      const p5 = { x: cx + w, y: cy };     // Right Corner
      const p6 = { x: cx + w, y: cy - h }; // Top Right

      if (wireframe) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath();
          ctx.moveTo(p4.x, p4.y); ctx.lineTo(p6.x, p6.y); ctx.lineTo(p5.x, p5.y); ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          return;
      }
      
      if (!color) return;

      // Left Face (Shadowed)
      ctx.fillStyle = this.shadeColor(color, -20); 
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();

      // Right Face (Lit)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p5.x, p5.y); ctx.lineTo(p6.x, p6.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
      
      // Top Face (Brightest) if visible (for flat tops)
      ctx.fillStyle = this.shadeColor(color, 20);
      ctx.beginPath();
      ctx.moveTo(p4.x, p4.y); ctx.lineTo(p3.x, p3.y); 
      ctx.lineTo(cx, cy - h - d*0.5); // Back corner
      ctx.lineTo(p6.x, p6.y);
      ctx.closePath();
      ctx.fill();
  }
  
  shadeColor(color: string, percent: number) {
      return color; 
  }

  // --- CHARACTERS ---

  drawHumanoid(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity) {
    const x = sp.x;
    const y = sp.y;
    const z = this.engine.zoom;
    const isMoving = ent.state === UnitState.MOVE || ent.state === UnitState.CHASE || ent.state === UnitState.GATHER_GO || ent.state === UnitState.GATHER_RETURN;
    const time = Date.now();
    const drawCarriedResource = () => {
      if (ent.carriedResource <= 0) return;

      ctx.save();
      ctx.translate(x, y - 45 * z - bob);
      ctx.fillStyle = ent.resourceType === ResourceType.GRANTS ? '#16a34a' : '#f59e0b';
      ctx.fillRect(-4 * z, -6 * z, 8 * z, 12 * z);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-4 * z, -6 * z, 8 * z, 12 * z);
      ctx.restore();
    };
    
    // Animation States
    const walkSpeed = ent.type === EntityType.YEAR_7 || ent.type === EntityType.ESHAY ? 250 : 150;
    const walkCycle = Math.sin(time / walkSpeed); // -1 to 1
    
    // Attack Animation Progress (1.0 = just fired, 0.0 = ready)
    let attackAnim = 0;
    if (ent.state === UnitState.ATTACK || ent.state === UnitState.HEAL || ent.state === UnitState.GATHER_WORK || ent.state === UnitState.BUILD) {
        if (ent.attackCooldown > 0 && ent.state !== UnitState.BUILD) {
            const progress = ent.attackTimer / ent.attackCooldown;
            attackAnim = progress; 
        } else if (ent.state === UnitState.BUILD) {
            // Hammering speed
            attackAnim = (Math.sin(time / 100) + 1) / 2;
        }
    }

    // Determine Facing Angle (0-360)
    let deg = ent.facing * 180 / Math.PI;
    while (deg < 0) deg += 360;
    while (deg >= 360) deg -= 360;

    let isBack = false;
    let isLeft = false;
    const bob = isMoving ? Math.abs(walkCycle) * 1.5 : 0;

    if (ent.type === EntityType.TEACHER_AIDE && this.drawTeacherAideSprite(ctx, sp, ent, isMoving, time, bob)) {
      drawCarriedResource();
      return;
    }
    if (ent.type === EntityType.SUB_TEACHER && this.drawGeneratedEnemySprite(ctx, 'substituteTeacher', sp, ent, isMoving, time, bob, 4.05, 0.88)) {
      return;
    }
    if (ent.type === EntityType.MATH_TEACHER && this.drawMathTeacherSprite(ctx, sp, ent, isMoving, time, bob)) {
      return;
    }
    if (ent.type === EntityType.GYM_COACH && this.drawGeneratedEnemySprite(ctx, 'peTeacher', sp, ent, isMoving, time, bob, 4.05, 0.86)) {
      return;
    }
    if (ent.type === EntityType.SCIENCE_TEACHER && this.drawGeneratedEnemySprite(ctx, 'scienceTeacher', sp, ent, isMoving, time, bob, 4.05, 0.88)) {
      return;
    }
    if (ent.type === EntityType.TUCKSHOP_LADY && this.drawGeneratedEnemySprite(ctx, 'tuckshopLady', sp, ent, isMoving, time, bob, 4.05, 0.88)) {
      return;
    }
    if (ent.type === EntityType.YEAR_7 && this.drawYear7Sprite(ctx, sp, ent, isMoving, time, bob)) {
      return;
    }
    if (ent.type === EntityType.MEAN_GIRL && this.drawGeneratedEnemySprite(ctx, 'meanGirl', sp, ent, isMoving, time, bob, 3.75, 0.87, this.meanGirlFrames)) {
      return;
    }
    if (ent.type === EntityType.ESHAY && this.drawGeneratedEnemySprite(ctx, 'eshay', sp, ent, isMoving, time, bob, 3.65, 0.87)) {
      return;
    }
    if (ent.type === EntityType.FOOTY_KID && this.drawGeneratedEnemySprite(ctx, 'footyKid', sp, ent, isMoving, time, bob, 3.9, 0.87)) {
      return;
    }
    if (ent.type === EntityType.BULLY && this.drawGeneratedEnemySprite(ctx, 'bully', sp, ent, isMoving, time, bob, 4.0, 0.87)) {
      return;
    }
    if (ent.type === EntityType.CLASS_CLOWN && this.drawClassClownSprite(ctx, sp, ent, isMoving, time, bob)) {
      return;
    }

    // Divide 360 into 4 quadrants
    if (deg >= 45 && deg < 135) {
        isLeft = true; isBack = false;
    } else if (deg >= 135 && deg < 225) {
        isLeft = true; isBack = true;
    } else if (deg >= 225 && deg < 315) {
        isLeft = false; isBack = true;
    } else {
        isLeft = false; isBack = false;
    }

    ctx.save();
    ctx.translate(x, y);
    if (isLeft) ctx.scale(-1, 1);
    
    const s = 1.2 * z;
    ctx.scale(s, s);

    // Bobbing body
    ctx.translate(0, -bob);

    // Common Params
    const animParams = { isMoving, walkCycle, attackAnim, isBack, time };

    switch(ent.type) {
        case EntityType.TEACHER_AIDE: this.drawTeacherAide(ctx, animParams, ent); break;
        case EntityType.SUB_TEACHER: this.drawSubTeacher(ctx, animParams); break;
        case EntityType.GYM_COACH: this.drawGymCoach(ctx, animParams); break;
        case EntityType.MATH_TEACHER: this.drawMathTeacher(ctx, animParams); break;
        case EntityType.SCIENCE_TEACHER: this.drawScienceTeacher(ctx, animParams); break;
        case EntityType.TUCKSHOP_LADY: this.drawTuckshopLady(ctx, animParams); break;
        case EntityType.YEAR_7: this.drawYear7(ctx, animParams); break;
        case EntityType.FOOTY_KID: this.drawFootyKid(ctx, animParams); break;
        case EntityType.BULLY: this.drawBully(ctx, animParams); break;
        case EntityType.MEAN_GIRL: this.drawMeanGirl(ctx, animParams); break;
        case EntityType.ESHAY: this.drawEshay(ctx, animParams); break;
        case EntityType.CLASS_CLOWN: this.drawClassClown(ctx, animParams); break;
        default: this.drawGeneric(ctx, ent.faction); break;
    }
    
    // Vest Overlay (Visible Front and Back)
    if (ent.faction === Faction.FACULTY && this.engine.state.upgrades.includes(UpgradeType.YARD_DUTY_VEST)) {
       ctx.fillStyle = COLORS.VEST_YELLOW;
       if (isBack) {
           ctx.fillRect(-4, -18, 8, 8); // Vest back
       } else {
           ctx.fillRect(-4, -18, 8, 8); // Vest front
           ctx.fillStyle = '#ccff00'; // Lighter strip
           ctx.fillRect(-1, -18, 2, 8);
       }
    }

    ctx.restore();

    drawCarriedResource();
  }

  // --- ANIMATED DRAWING HELPERS ---

  drawLegs(ctx: CanvasRenderingContext2D, color: string, height: number, walkCycle: number, isMoving: boolean) {
      const hipY = -height;
      const legW = 3;
      
      // Swing calc
      const swing = isMoving ? 0.6 : 0;
      const rAngle = -walkCycle * swing; // Right leg
      const lAngle = walkCycle * swing; // Left leg (opposite)

      // Right Leg (Behind)
      ctx.save();
      ctx.translate(0, hipY);
      ctx.rotate(rAngle);
      ctx.fillStyle = this.shadeColor(color, -20); 
      ctx.fillRect(-legW/2 + 2, 0, legW, height); // Offset slightly
      ctx.restore();

      // Left Leg (Front)
      ctx.save();
      ctx.translate(0, hipY);
      ctx.rotate(lAngle);
      ctx.fillStyle = color;
      ctx.fillRect(-legW/2 - 2, 0, legW, height);
      ctx.restore();
  }

  drawHead(ctx: CanvasRenderingContext2D, color: string, yOff: number, size=5) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, yOff, size, 0, Math.PI*2); ctx.fill();
  }

  // --- UNIT RENDERERS ---

  drawTeacherAide(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any, ent: Entity) {
      // Legs
      this.drawLegs(ctx, '#374151', 10, walkCycle, isMoving);
      
      // Body
      if (isBack) {
          ctx.fillStyle = COLORS.FACULTY_PANTS; ctx.fillRect(-4, -16, 8, 8);
          ctx.fillStyle = '#93c5fd'; ctx.fillRect(-4, -22, 8, 10);
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -24);
          // Bun
          ctx.fillStyle = COLORS.HAIR_BROWN;
          ctx.beginPath(); ctx.arc(0, -25, 6, Math.PI, 0); ctx.fill();
          ctx.beginPath(); ctx.arc(0, -27, 4, 0, Math.PI*2); ctx.fill(); 
      } else {
          ctx.fillStyle = COLORS.FACULTY_PANTS; ctx.fillRect(-4, -16, 8, 8);
          ctx.fillStyle = '#93c5fd'; ctx.fillRect(-4, -22, 8, 10);
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -24);
          ctx.fillStyle = COLORS.HAIR_BROWN;
          ctx.beginPath(); ctx.arc(0, -25, 5.5, Math.PI, 0); ctx.fill();

          // Arms
          ctx.save();
          ctx.translate(4, -20); // Shoulder
          
          if (ent.state === UnitState.BUILD) {
             // Hammering animation
             // Rotate arm up and down
             const hammerRot = (Math.sin(attackAnim * Math.PI * 4) + 1) * 0.5; // fast wave
             ctx.rotate(hammerRot * -1.5);
             ctx.fillStyle = '#93c5fd'; ctx.fillRect(-1.5, 0, 3, 8); 
             // Hammer
             ctx.translate(0, 8);
             ctx.rotate(-1.5); // Hand perpendicular
             ctx.fillStyle = '#78350f'; ctx.fillRect(-1, -1, 2, 6);
             ctx.fillStyle = '#94a3b8'; ctx.fillRect(-2, -2, 4, 3);
          } else {
             // Carry papers (Idle/Move)
             const armAngle = isMoving ? Math.sin(walkCycle) * 0.2 : 0;
             ctx.rotate(armAngle - 0.5); 
             ctx.fillStyle = '#93c5fd';
             ctx.fillRect(-1.5, 0, 3, 8); 
             // Paper stack
             ctx.fillStyle = '#fff';
             ctx.fillRect(-3, 6, 8, 5);
          }
          ctx.restore();
      }
  }

  drawSubTeacher(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
    this.drawLegs(ctx, '#4b5563', 10, walkCycle * 0.8, isMoving); // Slower walk
    
    // Cardigan body
    ctx.fillStyle = COLORS.SUB_CARDIGAN; 
    ctx.fillRect(-5, -23, 10, 13);

    if (isBack) {
        this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
        ctx.fillStyle = '#57534e'; // Greying hair
        ctx.beginPath(); ctx.arc(0, -26, 6, Math.PI, 0); ctx.fill();
    } else {
        // Open Cardigan look
        ctx.fillStyle = '#fff'; ctx.fillRect(-1, -23, 2, 13); // Shirt underneath
        this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
        ctx.fillStyle = '#57534e'; 
        ctx.beginPath(); ctx.arc(0, -26, 5.5, Math.PI, 0); ctx.fill();

        // Holding Coffee Mug
        ctx.save();
        ctx.translate(5, -20);
        
        let armRot = isMoving ? Math.sin(walkCycle) * 0.2 : 0;
        if (attackAnim > 0) armRot = -1.0 * Math.sin(attackAnim * Math.PI); // Lazy swing
        else armRot = -1.2; // Sipping position

        ctx.rotate(armRot);
        ctx.fillStyle = COLORS.SUB_CARDIGAN; ctx.fillRect(-1.5, 0, 3, 8);
        
        // Mug
        ctx.translate(0, 8);
        ctx.fillStyle = '#fff'; ctx.fillRect(-2, -2, 4, 5);
        ctx.strokeStyle = '#fff'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(2, -1); ctx.quadraticCurveTo(4, 0, 2, 2); ctx.stroke();
        ctx.restore();
    }
}

  drawGymCoach(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      // Legs
      this.drawLegs(ctx, COLORS.SKIN_DARK, 8, walkCycle, isMoving);
      
      // Shorts overlay
      ctx.fillStyle = '#1d4ed8'; ctx.fillRect(-5, -14, 10, 6);
      // Shirt
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-6, -24, 12, 11);

      if (isBack) {
          // Arms
          ctx.fillStyle = COLORS.SKIN_DARK; ctx.fillRect(-7, -22, 3, 8); ctx.fillRect(4, -22, 3, 8);
          
          this.drawHead(ctx, COLORS.SKIN_DARK, -26, 5.5);
          // Backwards Cap
          ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(0, -27, 5.8, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.fillRect(-2, -26, 4, 1);
      } else {
          this.drawHead(ctx, COLORS.SKIN_DARK, -26, 5.5);
          // Cap
          ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(0, -27, 5.6, Math.PI, 0); ctx.fill();
          ctx.fillRect(2, -28, 6, 2);
          // Whistle
          ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(2, -22, 1.5, 0, Math.PI*2); ctx.fill();

          // Arms - Jogging or Punching
          const armLen = 8;
          
          // Right Arm (Front)
          ctx.save();
          ctx.translate(5, -22);
          if (attackAnim > 0.1) {
              // PUNCH
              const punchExt = Math.sin(attackAnim * Math.PI) * 10;
              ctx.rotate(-1.5); // Point forward
              ctx.translate(0, punchExt);
          } else {
              // Jog
              const armRot = isMoving ? Math.sin(walkCycle) * 1.0 : 0.2;
              ctx.rotate(armRot);
          }
          ctx.fillStyle = COLORS.SKIN_DARK;
          ctx.fillRect(-1.5, 0, 3, armLen);
          // Fist
          ctx.beginPath(); ctx.arc(0, armLen, 2.5, 0, Math.PI*2); ctx.fill();
          ctx.restore();

          // Left Arm (Behind body visually, but drawn here for simplicity)
          // ... 
      }
  }

  drawMathTeacher(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      this.drawLegs(ctx, '#78350f', 10, walkCycle, isMoving);
      ctx.fillStyle = '#bfdbfe'; ctx.fillRect(-4, -24, 8, 14); // Shirt

      if (isBack) {
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
          ctx.fillStyle = COLORS.HAIR_BLACK; ctx.beginPath(); ctx.arc(0, -27, 6, Math.PI, 0); ctx.fill();
          // Arms Idle
          ctx.fillStyle = '#bfdbfe'; ctx.fillRect(-6, -22, 2, 8); ctx.fillRect(4, -22, 2, 8);
      } else {
          ctx.fillStyle = '#b91c1c'; ctx.fillRect(-1, -22, 2, 8); // Tie
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
          ctx.fillStyle = COLORS.HAIR_BLACK; ctx.beginPath(); ctx.arc(0, -27, 5.5, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#334155'; ctx.fillRect(1, -27, 4, 1.5); // Glasses

          // Arm with Ruler
          ctx.save();
          ctx.translate(4, -22); // Shoulder
          
          let armRot = isMoving ? Math.sin(walkCycle) * 0.5 : 0;
          if (attackAnim > 0) {
              // Attack Swipe: Start high, swing down
              if (attackAnim > 0.8) armRot = -2.5; 
              else if (attackAnim > 0.4) armRot = 1.0; 
              else armRot = 0;
          } else {
              armRot -= 0.5; // Idle holding ruler up
          }

          ctx.rotate(armRot);
          ctx.fillStyle = '#bfdbfe'; ctx.fillRect(-1.5, 0, 3, 9); // Arm
          
          // Ruler in hand
          ctx.translate(0, 9);
          ctx.rotate(-0.5); // Angle relative to arm
          ctx.fillStyle = COLORS.RULER;
          ctx.fillRect(-1, -2, 2, 14);
          ctx.restore();
      }
  }

  drawScienceTeacher(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      this.drawLegs(ctx, '#374151', 10, walkCycle, isMoving);
      
      // Coat Body
      ctx.fillStyle = COLORS.LAB_COAT;
      if (isBack) {
          ctx.fillRect(-6, -28, 12, 18);
      } else {
          ctx.beginPath();
          ctx.moveTo(-5, -28); ctx.lineTo(5, -28);
          ctx.lineTo(6, -10); ctx.lineTo(-6, -10);
          ctx.fill();
      }
      
      this.drawHead(ctx, COLORS.SKIN_LIGHT, -29);
      // Hair
      ctx.fillStyle = COLORS.HAIR_GRAY;
      ctx.beginPath(); ctx.arc(0, -30, 7, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, -28, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -28, 3, 0, Math.PI*2); ctx.fill();

      if (!isBack) {
          // Throwing Arm
          ctx.save();
          ctx.translate(5, -26);
          
          let armRot = isMoving ? Math.sin(walkCycle) * 0.5 : 0;
          if (attackAnim > 0) {
              // Throw: Wind up (back), then snap forward
              if (attackAnim > 0.7) armRot = -2.5; // Back
              else if (attackAnim > 0.3) armRot = -1.0; // Forward release
              else armRot = 0;
          }
          
          ctx.rotate(armRot);
          ctx.fillStyle = COLORS.LAB_COAT; ctx.fillRect(-1.5, 0, 3, 9);

          // Flask
          ctx.translate(0, 9);
          if (attackAnim > 0.3) { // Only draw flask before release
             ctx.fillStyle = '#10b981';
             ctx.beginPath(); ctx.arc(0, 2, 3, 0, Math.PI*2); ctx.fill();
          }
          ctx.restore();
      }
  }

  drawTuckshopLady(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      this.drawLegs(ctx, '#fff', 9, walkCycle, isMoving);
      
      ctx.fillStyle = '#fce7f3'; ctx.fillRect(-5, -24, 10, 15); // Body
      
      if (isBack) {
          ctx.fillStyle = '#fff'; ctx.fillRect(-2, -20, 4, 2); ctx.fillRect(-2, -20, 1, 8); ctx.fillRect(1, -20, 1, 8);
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
          ctx.fillStyle = COLORS.TUCKSHOP_HAT; ctx.beginPath(); ctx.arc(0, -29, 6.2, Math.PI, 0); ctx.fill();
      } else {
          ctx.fillStyle = COLORS.TUCKSHOP_APRON; ctx.fillRect(-4, -20, 8, 12);
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
          ctx.fillStyle = COLORS.TUCKSHOP_HAT; 
          ctx.beginPath(); ctx.arc(0, -29, 6, Math.PI, 0); ctx.fill();
          ctx.fillRect(-6, -29, 12, 3);
          
          // Arm with Pie
          ctx.save();
          ctx.translate(5, -22);
          
          let armRot = isMoving ? Math.sin(walkCycle) * 0.3 : 0;
          if (attackAnim > 0) {
              if (attackAnim > 0.6) armRot = -2.0; // Wind up
              else if (attackAnim > 0.2) armRot = -0.5; // Toss
              else armRot = 0;
          } else {
             armRot = -1.5; // Carrying Tray pose
          }

          ctx.rotate(armRot);
          ctx.fillStyle = '#fce7f3'; ctx.fillRect(-1.5, 0, 3, 8);
          
          // Pie
          if (attackAnim > 0.2 || attackAnim === 0) {
              ctx.translate(0, 8);
              ctx.rotate(1.5); // Flat palm
              ctx.fillStyle = COLORS.PIE_CRUST; ctx.beginPath(); ctx.arc(0, -2, 3.5, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = COLORS.PIE_MEAT; ctx.beginPath(); ctx.arc(0, -2, 1.5, 0, Math.PI*2); ctx.fill();
          }
          ctx.restore();
      }
  }

  drawYear7(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      // Fast legs
      this.drawLegs(ctx, '#374151', 6, walkCycle * 1.5, isMoving);

      // Leaning body for run
      const lean = isMoving ? 5 : 0;
      
      if (isBack) {
          ctx.save();
          ctx.rotate(isMoving ? 0.2 : 0); // Forward lean
          
          // Huge Backpack
          ctx.fillStyle = COLORS.BACKPACK_BLUE;
          ctx.fillRect(-8, -18, 16, 14); 
          ctx.fillStyle = '#1e40af'; ctx.fillRect(-6, -14, 12, 8);
          
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -19, 4);
          ctx.fillStyle = COLORS.STUDENT_TIE; ctx.beginPath(); ctx.arc(0, -20, 4.5, Math.PI, 0); ctx.fill();
          ctx.restore();
      } else {
          ctx.save();
          ctx.rotate(isMoving ? 0.2 : 0);
          
          ctx.fillStyle = COLORS.BACKPACK_BLUE; ctx.fillRect(-10, -18, 6, 14); // Bag side
          ctx.fillStyle = '#fff'; ctx.fillRect(-3, -16, 6, 10); // Shirt
          ctx.fillStyle = '#374151'; ctx.fillRect(-3, -10, 6, 4); // Shorts
          
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -19, 4);
          ctx.fillStyle = COLORS.STUDENT_TIE; ctx.beginPath(); ctx.arc(0, -20, 4.5, Math.PI, 0); ctx.fill();
          ctx.fillRect(1, -21, 5, 1.5);

          // Flailing Arms
          if (isMoving) {
              // Naruto run? Arms back
              ctx.save();
              ctx.translate(0, -16);
              ctx.rotate(1.2 + Math.sin(walkCycle)*0.2);
              ctx.fillStyle = '#fff'; ctx.fillRect(-1, 0, 2, 8);
              ctx.restore();
          } else {
              // Idle/Attack Arms
              ctx.save();
              ctx.translate(2, -16);
              if (attackAnim > 0) ctx.rotate(Math.sin(attackAnim*Math.PI*2));
              ctx.fillStyle = '#fff'; ctx.fillRect(-1, 0, 2, 8);
              ctx.restore();
          }
          ctx.restore();
      }
  }
  
  drawEshay(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      // Fast legs (Red Shoes)
      this.drawLegs(ctx, COLORS.ESHAY_RED, 8, walkCycle * 1.8, isMoving);

      ctx.save();
      if (isMoving) ctx.rotate(0.3); // Heavy forward lean

      // Tracksuit (Striped)
      ctx.fillStyle = '#fff'; ctx.fillRect(-5, -22, 10, 12);
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-3, -22, 6, 12); // Blue stripe
      
      if (isBack) {
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
          // Mullet / Rat tail
          ctx.fillStyle = COLORS.HAIR_BROWN;
          ctx.beginPath(); ctx.arc(0, -27, 5.5, Math.PI, 0); ctx.fill();
          ctx.fillRect(-2, -26, 4, 8); // Rat tail
      } else {
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
          // Cap
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, -28, 5.6, Math.PI, 0); ctx.fill();
          ctx.fillRect(2, -29, 5, 1.5); // Brim

          // Bum Bag (Fanny Pack) across chest
          ctx.rotate(-0.2);
          ctx.fillStyle = '#000'; ctx.fillRect(-5, -20, 10, 4);
          ctx.fillStyle = '#333'; ctx.fillRect(-2, -19, 4, 2); // Zipper
          ctx.rotate(0.2);

          // Arms - Aggressive
          ctx.save();
          ctx.translate(5, -20);
          if (attackAnim > 0) {
              const punch = Math.sin(attackAnim * Math.PI) * 5;
              ctx.translate(punch, 0);
          }
          ctx.rotate(isMoving ? Math.sin(walkCycle)*1.5 : 0.5);
          ctx.fillStyle = '#fff'; ctx.fillRect(-1.5, 0, 3, 8);
          ctx.restore();
      }
      ctx.restore();
  }

  drawClassClown(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      // Big Shoes
      ctx.fillStyle = '#ef4444';
      if (isMoving) {
          const lY = Math.sin(walkCycle) * 3;
          ctx.fillRect(-6, -2 + lY, 5, 4); // Left Shoe
          ctx.fillRect(2, -2 - lY, 5, 4); // Right Shoe
      } else {
          ctx.fillRect(-7, -2, 5, 4);
          ctx.fillRect(2, -2, 5, 4);
      }
      
      // Baggy Pants
      ctx.fillStyle = '#374151'; ctx.fillRect(-6, -10, 12, 8);

      // Shirt (Polka dot attempt?)
      ctx.fillStyle = '#fff'; ctx.fillRect(-5, -22, 10, 12);
      ctx.fillStyle = '#ef4444'; 
      ctx.beginPath(); ctx.arc(-2, -18, 1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -15, 1, 0, Math.PI*2); ctx.fill();

      if (isBack) {
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
          // Messy Hair
          ctx.fillStyle = COLORS.HAIR_GINGER;
          ctx.beginPath(); ctx.arc(0, -27, 7, Math.PI, 0); ctx.fill();
      } else {
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -26);
          // Hair
          ctx.fillStyle = COLORS.HAIR_GINGER;
          ctx.beginPath(); ctx.arc(0, -27, 7, Math.PI, 0); ctx.fill();
          ctx.beginPath(); ctx.arc(-7, -27, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(7, -27, 3, 0, Math.PI*2); ctx.fill();

          // Red Nose
          ctx.fillStyle = COLORS.CLOWN_NOSE;
          ctx.beginPath(); ctx.arc(0, -26, 2.5, 0, Math.PI*2); ctx.fill();
          
          // Throwing Arm
          ctx.save();
          ctx.translate(5, -20);
          if (attackAnim > 0) ctx.rotate(-2.0 * Math.sin(attackAnim * Math.PI));
          else ctx.rotate(0.5);

          ctx.fillStyle = '#fff'; ctx.fillRect(-1.5, 0, 3, 8);
          // Holding Water Bomb
          if (attackAnim < 0.5) {
              ctx.translate(0, 8);
              ctx.fillStyle = COLORS.WATER_BOMB; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
          }
          ctx.restore();
      }
  }

  drawFootyKid(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      this.drawLegs(ctx, COLORS.SKIN_DARK, 8, walkCycle, isMoving);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(-5, -14, 10, 6); // Shorts
      
      const lean = (attackAnim > 0) ? 0.4 : (isMoving ? 0.1 : 0); // Charge!

      ctx.save();
      ctx.rotate(lean);

      // Jersey
      ctx.fillStyle = COLORS.FOOTY_JERSEY; ctx.fillRect(-6, -26, 12, 12);
      
      if (isBack) {
          ctx.fillStyle = '#facc15'; ctx.font = '8px Arial'; ctx.fillText('18', -4, -18);
          this.drawHead(ctx, COLORS.SKIN_DARK, -28);
          ctx.fillStyle = COLORS.HAIR_GINGER; ctx.fillRect(-5, -28, 10, 10); 
      } else {
          ctx.fillStyle = '#facc15'; 
          ctx.beginPath(); ctx.moveTo(6, -26); ctx.lineTo(-6, -14); ctx.lineTo(-2, -14); ctx.lineTo(6, -22); ctx.fill();
          
          this.drawHead(ctx, COLORS.SKIN_DARK, -28);
          ctx.fillStyle = COLORS.HAIR_GINGER; ctx.fillRect(-5, -28, 2, 8); ctx.beginPath(); ctx.arc(0, -30, 5, Math.PI, 0); ctx.fill();

          // Holding Ball (Tucked under arm)
          ctx.fillStyle = COLORS.FOOTBALL;
          ctx.beginPath(); ctx.ellipse(4, -18, 3, 5, 0.2, 0, Math.PI*2); ctx.fill();
          
          // Arm over ball
          ctx.fillStyle = COLORS.SKIN_DARK;
          ctx.fillRect(4, -24, 3, 8);
      }
      ctx.restore();
  }

  drawBully(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      this.drawLegs(ctx, '#1f2937', 11, walkCycle * 0.8, isMoving); // Slow heavy walk
      
      ctx.fillStyle = COLORS.BULLY_HOODIE;
      if (isBack) {
          ctx.beginPath(); ctx.moveTo(-6, -28); ctx.lineTo(6, -26); ctx.lineTo(5, -12); ctx.lineTo(-7, -12); ctx.fill();
          ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.arc(0, -30, 7, Math.PI, 0); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-7, -30); ctx.lineTo(0, -20); ctx.lineTo(7, -30); ctx.fill();
      } else {
          ctx.beginPath(); ctx.moveTo(-6, -28); ctx.lineTo(6, -26); ctx.lineTo(5, -12); ctx.lineTo(-7, -12); ctx.fill();
          ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.arc(0, -30, 6, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#000'; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(1, -29, 3, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0;

          // Arms - Crossed or Punching
          if (attackAnim > 0) {
              ctx.save();
              ctx.translate(5, -24);
              ctx.rotate(-1.0 * Math.sin(attackAnim * Math.PI)); 
              ctx.fillStyle = COLORS.BULLY_HOODIE; ctx.fillRect(-2, 0, 4, 10);
              ctx.restore();
          } else {
              // Crossed arms look
              ctx.fillStyle = '#1e293b'; ctx.fillRect(-6, -20, 12, 4);
          }
      }
  }

  drawMeanGirl(ctx: CanvasRenderingContext2D, { isMoving, walkCycle, isBack, attackAnim }: any) {
      this.drawLegs(ctx, '#000', 10, walkCycle, isMoving);
      
      // Skirt
      ctx.fillStyle = '#374151';
      ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(4, -18); ctx.lineTo(6, -10); ctx.lineTo(-6, -10); ctx.fill();
      // Shirt
      ctx.fillStyle = '#fff'; ctx.fillRect(-4, -26, 8, 8);

      if (isBack) {
          ctx.fillStyle = COLORS.HAIR_BLONDE;
          ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(6, -30); ctx.lineTo(8, -10); ctx.lineTo(-8, -10); ctx.fill();
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -29);
          ctx.fillStyle = COLORS.HAIR_BLONDE; ctx.beginPath(); ctx.arc(0, -30, 6.2, Math.PI, 0); ctx.fill();
      } else {
          ctx.fillStyle = COLORS.MEAN_GIRL_PINK; ctx.fillRect(-2, -24, 6, 6); // Bag strap?
          this.drawHead(ctx, COLORS.SKIN_LIGHT, -29);
          ctx.fillStyle = COLORS.HAIR_BLONDE; ctx.beginPath(); ctx.arc(0, -30, 6, Math.PI, 0); ctx.fill(); ctx.fillRect(-5, -30, 3, 15);
          
          // Arm Holding Phone
          ctx.save();
          ctx.translate(4, -22);
          if (attackAnim > 0) {
              // Pointing / Recording
              ctx.rotate(-1.5);
          } else {
              // Looking at phone
              ctx.rotate(-0.5); // Bent upward
          }
          ctx.fillStyle = '#fff'; ctx.fillRect(-1, 0, 2, 8); // Arm
          
          // Phone
          ctx.translate(0, 8);
          ctx.fillStyle = '#ec4899'; ctx.fillRect(-1, -1, 3, 5);
          ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; // Screen glow
          ctx.restore();
      }
  }

  drawGeneric(ctx: CanvasRenderingContext2D, faction: Faction) {
      this.drawLegs(ctx, '#000', 10, 0, false);
      ctx.fillStyle = faction === Faction.FACULTY ? COLORS.FACULTY_SHIRT : COLORS.STUDENT_SHIRT;
      ctx.fillRect(-5, -22, 10, 12);
      this.drawHead(ctx, COLORS.SKIN_LIGHT, -25);
  }

  drawRatKing(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity) {
      const z = this.engine.zoom;
      const time = Date.now();
      ctx.save();
      ctx.translate(sp.x, sp.y - 20*z);
      
      // Giant rolling ball mass
      // Rotate entire body based on movement
      const roll = ent.pos.x / 20; 
      ctx.rotate(roll);

      ctx.fillStyle = '#334155'; // Dark backpack color
      ctx.beginPath(); ctx.arc(0, 0, 25*z, 0, Math.PI*2); ctx.fill();
      
      // Rotating items sticking out
      for(let i=0; i<8; i++) {
          const a = (i * Math.PI * 2 / 8);
          const rx = Math.cos(a) * 22 * z;
          const ry = Math.sin(a) * 22 * z;
          
          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(a + Math.PI/2);
          
          if (i % 2 === 0) {
              // Limb
              ctx.fillStyle = COLORS.SKIN_LIGHT;
              ctx.fillRect(0, 0, 4*z, 10*z);
          } else {
              // Head
              ctx.fillStyle = COLORS.SKIN_LIGHT;
              ctx.beginPath(); ctx.arc(0, 0, 6*z, 0, Math.PI*2); ctx.fill();
              // Cap
              ctx.fillStyle = COLORS.STUDENT_TIE;
              ctx.beginPath(); ctx.arc(0, -2*z, 6.2*z, Math.PI, 0); ctx.fill();
          }
          ctx.restore();
      }
      ctx.restore();
  }

  drawBowlingMachine(ctx: CanvasRenderingContext2D, sp: {x: number, y: number}, ent: Entity) {
      const z = this.engine.zoom;
      const time = Date.now();
      const { direction } = this.getMirroredFiveDirectionPose(ent.facing);
      const animation = ent.hp <= 0 ? 'death' : ent.state === UnitState.ATTACK ? 'attack' : 'idle';
      const totalFrames = this.generatedEnemyFrames[animation][direction];
      const frameDuration = animation === 'attack' ? 105 : 180;
      const frame = Math.floor(time / frameDuration) % totalFrames;
      const sprite = this.spriteImages.get(`bowlingMachine:${animation}:${direction}:${frame}`);
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          const spriteW = ent.size * 4.45 * z;
          const spriteH = ent.size * 4.45 * z;
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sprite, sp.x - spriteW / 2, sp.y - spriteH * 0.85, spriteW, spriteH);
          ctx.restore();
          return;
      }
      if (this.drawStructureSprite(ctx, 'bowling', sp, ent.size * 4.2 * z, 4)) return;

      // Tripod Legs
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2 * z;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - 15*z); ctx.lineTo(sp.x - 10*z, sp.y);
      ctx.moveTo(sp.x, sp.y - 15*z); ctx.lineTo(sp.x + 10*z, sp.y);
      ctx.moveTo(sp.x, sp.y - 15*z); ctx.lineTo(sp.x, sp.y + 5*z);
      ctx.stroke();
      
      // Machine Body
      ctx.fillStyle = '#facc15'; // Yellow body
      ctx.beginPath(); ctx.arc(sp.x, sp.y - 20*z, 8*z, 0, Math.PI*2); ctx.fill();
      // Wheel
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(sp.x + 2*z, sp.y - 20*z, 4*z, 0, Math.PI*2); ctx.fill();
  }

  // --- PROJECTILES ---

  drawProjectiles(ctx: CanvasRenderingContext2D) {
    const z = this.engine.zoom;
    this.engine.projectiles.forEach(p => {
       // Project position to screen
       const sp = this.engine.worldToScreen(p.pos.x, p.pos.y);

       ctx.save();
       ctx.globalAlpha = 0.18;
       ctx.strokeStyle = '#ffffff';
       ctx.lineWidth = 2 * z;
       ctx.beginPath();
       ctx.moveTo(sp.x, sp.y - 4*z);
       ctx.lineTo(sp.x - 10*z, sp.y + 4*z);
       ctx.stroke();
       ctx.restore();
       
       if (p.type === 'CHEMICAL') {
           ctx.fillStyle = '#84cc16';
           ctx.beginPath(); ctx.arc(sp.x, sp.y - 10*z, 5*z, 0, Math.PI*2); ctx.fill();
           // Bubbles
           ctx.fillStyle = '#fff';
           ctx.beginPath(); ctx.arc(sp.x - 2, sp.y - 12*z, 1.5*z, 0, Math.PI*2); ctx.fill();
       } else if (p.type === 'PHONE') {
           ctx.fillStyle = '#db2777';
           ctx.fillRect(sp.x - 3*z, sp.y - 12*z, 6*z, 9*z);
           ctx.fillStyle = '#fff'; // Screen
           ctx.fillRect(sp.x - 2*z, sp.y - 11*z, 4*z, 7*z);
       } else if (p.type === 'HOT_PIE') {
           ctx.fillStyle = COLORS.PIE_CRUST;
           ctx.beginPath(); ctx.arc(sp.x, sp.y - 10*z, 4*z, 0, Math.PI*2); ctx.fill();
           ctx.fillStyle = COLORS.PIE_MEAT;
           ctx.beginPath(); ctx.arc(sp.x, sp.y - 10*z, 2*z, 0, Math.PI*2); ctx.fill();
       } else if (p.type === 'CRICKET_BALL') {
           ctx.fillStyle = '#b91c1c'; // Red
           ctx.beginPath(); ctx.arc(sp.x, sp.y - 10*z, 3*z, 0, Math.PI*2); ctx.fill();
           ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; 
           ctx.beginPath(); ctx.arc(sp.x, sp.y - 10*z, 3*z, 0, Math.PI*2); ctx.stroke(); // Seam
       } else if (p.type === 'WATER_BOMB') {
           ctx.fillStyle = COLORS.WATER_BOMB;
           ctx.beginPath(); ctx.arc(sp.x, sp.y - 10*z, 4*z, 0, Math.PI*2); ctx.fill();
           ctx.fillStyle = 'rgba(255,255,255,0.4)';
           ctx.beginPath(); ctx.arc(sp.x - z, sp.y - 12*z, 2*z, 0, Math.PI*2); ctx.fill();
       } else {
           // Chalk / Generic
           ctx.fillStyle = '#fff';
           ctx.fillRect(sp.x - 2*z, sp.y - 10*z, 4*z, 2*z);
       }
    });
  }

  drawEffects(ctx: CanvasRenderingContext2D) {
    this.engine.effects.forEach((effect: VisualEffect) => {
      const sp = this.engine.worldToScreen(effect.pos.x, effect.pos.y);
      const t = effect.duration / effect.maxDuration;
      const inv = 1 - t;
      const z = this.engine.zoom;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, t));

      if (effect.type === 'WARNING') {
        const pulse = 1 + Math.sin(Date.now() * 0.01 + effect.id) * 0.2;
        const size = effect.size * z * pulse;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3 * z;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y - size * 0.7);
        ctx.lineTo(sp.x + size * 0.5, sp.y);
        ctx.lineTo(sp.x, sp.y + size * 0.7);
        ctx.stroke();

        ctx.globalAlpha *= 0.25;
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, size * 0.55, size * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.type === 'HEAL') {
        const size = (effect.size + inv * 10) * z;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 2 * z;
        ctx.beginPath();
        ctx.moveTo(sp.x - size * 0.4, sp.y - size);
        ctx.lineTo(sp.x + size * 0.4, sp.y - size);
        ctx.moveTo(sp.x, sp.y - size * 1.4);
        ctx.lineTo(sp.x, sp.y - size * 0.6);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y - size * 1.2, 2.5 * z, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const radius = (effect.size + inv * 16) * z;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3 * z;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 10 * z, radius, radius * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (effect.type === 'BURST') {
          ctx.globalAlpha *= 0.45;
          ctx.fillStyle = effect.color;
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y - 10 * z, radius * 0.8, radius * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });
  }

  drawUIOverlay(ctx: CanvasRenderingContext2D) {
    if (this.engine.state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = '40px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SCHOOL CLOSED', ctx.canvas.width/2, ctx.canvas.height/2);
    } else if (this.engine.state.nextWaveTime <= 10 && !this.engine.paused) {
      const warning = ctx.createLinearGradient(0, 0, 0, 140);
      warning.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
      warning.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = warning;
      ctx.fillRect(0, 0, ctx.canvas.width, 140);
    }
  }
}
