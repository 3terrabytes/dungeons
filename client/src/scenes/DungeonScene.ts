import Phaser from 'phaser';
import { COLORS, DUNGEON, TILE_SIZE } from '../config';
import { generateDungeon, TILE, type DungeonMap } from '../systems/DungeonGenerator';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { MeleeGrunt } from '../entities/enemies/MeleeGrunt';
import { RangedShooter } from '../entities/enemies/RangedShooter';
import { Boss } from '../entities/enemies/Boss';
import type { Enemy } from '../entities/enemies/Enemy';
import { Inventory } from '../systems/Inventory';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { InputController } from '../systems/InputController';
import type { SaveData } from '../api/client';

interface DungeonSceneData {
  floor: number;
  save: SaveData;
  inventorySnapshot?: ReturnType<Inventory['snapshot']>;
  carryStats?: { hp: number; xp: number; level: number; gold: number };
}

export class DungeonScene extends Phaser.Scene {
  private floor!: number;
  private save!: SaveData;
  private dungeon!: DungeonMap;
  private player!: Player;
  private input2!: InputController;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.GameObjects.Group;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private exitMarker?: Phaser.GameObjects.Rectangle;
  private floorCleared = false;

  constructor() { super('Dungeon'); }

  init(data: DungeonSceneData): void {
    this.floor = data.floor;
    this.save = data.save;
    this.floorCleared = false;
    this.registry.set('inventorySnapshot', data.inventorySnapshot);
    this.registry.set('carryStats', data.carryStats);
  }

  create(): void {
    const isBossFloor = this.floor % DUNGEON.floorsBeforeBoss === 0;
    this.dungeon = generateDungeon(this.floor * 1000 + Date.now() % 1000, isBossFloor);

    this.buildTilemap();
    this.spawnPlayer();
    this.setupGroups();
    this.spawnEnemies();
    this.setupExitMarker();
    this.setupCollisions();
    this.setupEvents();

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setBounds(0, 0, DUNGEON.width * TILE_SIZE, DUNGEON.height * TILE_SIZE);
    this.cameras.main.setZoom(2);

    this.input2 = new InputController(this);

    // Launch HUD overlay
    if (!this.scene.isActive('HUD')) this.scene.launch('HUD');

    this.events.emit('stats:changed');
  }

  update(time: number, delta: number): void {
    if (!this.player.active) return;

    const { state, pointer } = this.input2.sample();
    this.player.update(delta, state, pointer);

    this.enemies.getChildren().forEach((e) => (e as Enemy).update(time, delta));
    this.playerProjectiles.getChildren().forEach((p) => (p as Projectile).update(time, delta));
    this.enemyProjectiles.getChildren().forEach((p) => (p as Projectile).update(time, delta));
    this.pickups.getChildren().forEach((p) => (p as Phaser.GameObjects.GameObject & { update: (t: number, d: number) => void }).update(time, delta));

    if (state.interact && this.exitMarker
        && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitMarker.x, this.exitMarker.y) < 24
        && this.enemies.countActive() === 0) {
      this.transitionToNextFloor();
    }

    // Auto-transition once boss dies (set by event)
    if (this.floorCleared) {
      // exit marker now interactive
    }
  }

  // ---- Setup helpers ---------------------------------------------------------

  private buildTilemap(): void {
    const map = this.make.tilemap({
      data: this.dungeon.tiles,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    // Two named tiles in the dataset map to two textures we generated in BootScene
    const floorTs = map.addTilesetImage('floor', undefined, TILE_SIZE, TILE_SIZE, 0, 0, TILE.FLOOR)!;
    const wallTs  = map.addTilesetImage('wall',  undefined, TILE_SIZE, TILE_SIZE, 0, 0, TILE.WALL)!;
    const layer = map.createLayer(0, [floorTs, wallTs], 0, 0)!;
    layer.setCollision([TILE.WALL]);
    this.wallLayer = layer;
  }

  private spawnPlayer(): void {
    const snap = this.registry.get('inventorySnapshot') as ReturnType<Inventory['snapshot']> | undefined;
    const inventory = new Inventory(snap);

    const spawnPx = this.tileToWorld(this.dungeon.spawn);
    this.player = new Player(this, spawnPx.x, spawnPx.y, inventory, this.save.permanentBoosts);

    const carry = this.registry.get('carryStats') as DungeonSceneData['carryStats'];
    if (carry) {
      this.player.stats.hp    = carry.hp;
      this.player.stats.xp    = carry.xp;
      this.player.stats.level = carry.level;
      this.player.stats.gold  = carry.gold;
      this.player.applyInventory();
    }

    this.registry.set('player', this.player);
    new ProgressionSystem(this, this.player);
  }

  private setupGroups(): void {
    this.enemies = this.physics.add.group();
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: 80, runChildUpdate: false });
    this.enemyProjectiles  = this.physics.add.group({ classType: Projectile, maxSize: 200, runChildUpdate: false });
    this.pickups = this.add.group();

    this.registry.set('enemies', this.enemies);
    this.registry.set('playerProjectiles', this.playerProjectiles);
    this.registry.set('enemyProjectiles',  this.enemyProjectiles);
    this.registry.set('pickups', this.pickups);
  }

  private spawnEnemies(): void {
    if (this.dungeon.bossRoom) {
      const c = {
        x: this.dungeon.bossRoom.x + this.dungeon.bossRoom.w / 2,
        y: this.dungeon.bossRoom.y + this.dungeon.bossRoom.h / 2,
      };
      const px = this.tileToWorld(c);
      this.enemies.add(new Boss(this, px.x, px.y, this.floor));
    }
    this.dungeon.enemySpawns.forEach((s) => {
      const px = this.tileToWorld(s);
      const e = s.tier === 'melee'
        ? new MeleeGrunt(this, px.x, px.y)
        : new RangedShooter(this, px.x, px.y);
      this.enemies.add(e);
    });
  }

  private setupExitMarker(): void {
    const px = this.tileToWorld(this.dungeon.exit);
    this.exitMarker = this.add.rectangle(px.x, px.y, 20, 20, 0x4cc9f0, 0.5);
    this.tweens.add({ targets: this.exitMarker, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
    this.add.text(px.x, px.y - 18, 'E', {
      fontFamily: 'monospace', fontSize: '10px', color: '#fff',
    }).setOrigin(0.5);
  }

  private setupCollisions(): void {
    // Player vs walls
    this.physics.add.collider(this.player, this.wallLayer);
    // Enemies vs walls
    this.physics.add.collider(this.enemies, this.wallLayer);
    // Projectiles vs walls (destroy on hit)
    this.physics.add.collider(this.playerProjectiles, this.wallLayer, (proj) => (proj as Projectile).deactivate());
    this.physics.add.collider(this.enemyProjectiles,  this.wallLayer, (proj) => (proj as Projectile).deactivate());

    // Player projectiles hit enemies
    this.physics.add.overlap(this.playerProjectiles, this.enemies, (projObj, enemyObj) => {
      const proj = projObj as Projectile;
      if (!proj.active) return;
      (enemyObj as Enemy).takeDamage(proj.damage);
      proj.deactivate();
    });
    // Enemy projectiles hit player
    this.physics.add.overlap(this.enemyProjectiles, this.player, (projObj) => {
      const proj = projObj as Projectile;
      if (!proj.active) return;
      this.player.takeDamage(proj.damage);
      proj.deactivate();
    });
    // Enemy contact damage
    this.physics.add.overlap(this.enemies, this.player, (enemyObj) => {
      this.player.takeDamage((enemyObj as Enemy).contactDamage);
    });
  }

  private setupEvents(): void {
    this.events.on('player:dead', () => {
      this.scene.stop('HUD');
      this.scene.start('GameOver', { floor: this.floor, save: this.save, won: false, gold: this.player.stats.gold });
    });
    this.events.on('boss:dead', () => {
      this.floorCleared = true;
    });
  }

  private transitionToNextFloor(): void {
    const inventorySnapshot = this.player.inventory.snapshot();
    const carryStats = {
      hp: this.player.stats.hp,
      xp: this.player.stats.xp,
      level: this.player.stats.level,
      gold: this.player.stats.gold,
    };
    this.scene.stop('HUD');
    // Pop to shop between every floor
    this.scene.start('Shop', {
      floor: this.floor,
      save: this.save,
      inventorySnapshot,
      carryStats,
    });
  }

  private tileToWorld(t: { x: number; y: number }): { x: number; y: number } {
    return { x: t.x * TILE_SIZE + TILE_SIZE / 2, y: t.y * TILE_SIZE + TILE_SIZE / 2 };
  }
}
