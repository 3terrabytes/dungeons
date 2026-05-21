import Phaser from 'phaser';
import { COLORS, TILE_SIZE } from '../config';

/**
 * Generates pixel-art textures procedurally so the game runs with zero asset files.
 * Replace any of these with real sprite sheets later by editing preload() / asset keys.
 */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    // 1x1 transparent placeholder
    this.makeRectTexture('empty', 1, 1, 0x000000, 0);

    // Floor / wall tiles
    this.makeFloorTile('floor', COLORS.floor);
    this.makeWallTile('wall', COLORS.wall);

    // Player body (yellow blob with darker outline)
    this.makeCharTexture('player-body', COLORS.player);

    // Enemies
    this.makeCharTexture('enemy-melee', COLORS.enemyMelee);
    this.makeCharTexture('enemy-ranged', COLORS.enemyRanged);
    this.makeCharTexture('enemy-boss', COLORS.boss, 24);

    // Projectiles
    this.makeOrbTexture('proj-player', COLORS.projectilePlayer, 5);
    this.makeOrbTexture('proj-enemy',  COLORS.projectileEnemy,  5);

    // Pickups
    this.makeOrbTexture('xp-orb',   COLORS.xp,   4);
    this.makeOrbTexture('gold',     COLORS.gold, 4);

    // Equipment layers (above body sprite)
    this.makeEquipTexture('weapon-fist',   0xcccccc, 'sword');
    this.makeEquipTexture('weapon-sword',  0xe0e0ff, 'sword');
    this.makeEquipTexture('weapon-bow',    0x9d6b3f, 'bow');
    this.makeEquipTexture('weapon-staff',  0x9b59b6, 'staff');
    this.makeEquipTexture('armor-cloth',   0x6b4f2a, 'armor');
    this.makeEquipTexture('armor-leather', 0x8b5a2b, 'armor');
    this.makeEquipTexture('armor-iron',    0xbdc3c7, 'armor');
    this.makeEquipTexture('hat-none',      0x000000, 'hat-empty');
    this.makeEquipTexture('hat-cap',       0xc0392b, 'hat');
    this.makeEquipTexture('hat-crown',     0xf1c40f, 'crown');
    this.makeEquipTexture('boots-none',    0x000000, 'hat-empty');
    this.makeEquipTexture('boots-swift',   0x16a085, 'boots');

    // Door
    this.makeRectTexture('door-closed', TILE_SIZE, TILE_SIZE, 0x5a3a1a);
    this.makeRectTexture('door-open',   TILE_SIZE, TILE_SIZE, 0x2a1a0a);
  }

  create(): void {
    this.scene.start('Login');
  }

  // --- Procedural texture helpers --------------------------------------------------

  private makeRectTexture(key: string, w: number, h: number, color: number, alpha = 1): void {
    const g = this.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options);
    g.fillStyle(color, alpha);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFloorTile(key: string, base: number): void {
    const g = this.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options);
    g.fillStyle(base, 1).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // subtle speckle
    g.fillStyle(0xffffff, 0.04);
    g.fillRect(2, 3, 1, 1);
    g.fillRect(11, 9, 1, 1);
    g.fillRect(6, 13, 1, 1);
    g.fillStyle(0x000000, 0.15);
    g.fillRect(0, TILE_SIZE - 1, TILE_SIZE, 1);
    g.fillRect(TILE_SIZE - 1, 0, 1, TILE_SIZE);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  private makeWallTile(key: string, base: number): void {
    const g = this.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options);
    g.fillStyle(base, 1).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xffffff, 0.07).fillRect(0, 0, TILE_SIZE, 2);
    g.fillStyle(0x000000, 0.3).fillRect(0, TILE_SIZE - 2, TILE_SIZE, 2);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  private makeCharTexture(key: string, color: number, size = 16): void {
    const g = this.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options);
    const r = size / 2;
    // shadow
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(r, size - 2, r * 1.4, 3);
    // body (rounded square)
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 2, size - 4, size - 4, 3);
    // outline
    g.lineStyle(1, 0x000000, 0.7);
    g.strokeRoundedRect(2, 2, size - 4, size - 4, 3);
    // eyes
    g.fillStyle(0x000000, 1);
    g.fillRect(r - 3, r - 2, 2, 2);
    g.fillRect(r + 1, r - 2, 2, 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeOrbTexture(key: string, color: number, radius: number): void {
    const size = radius * 2 + 2;
    const g = this.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options);
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, radius);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(size / 2 - 1, size / 2 - 1, Math.max(1, radius - 2));
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeEquipTexture(key: string, color: number, shape: string): void {
    const size = 16;
    const g = this.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options);
    switch (shape) {
      case 'sword':
        g.fillStyle(color, 1);
        g.fillRect(11, 3, 2, 8);          // blade
        g.fillStyle(0x6b3f1a, 1);
        g.fillRect(10, 11, 4, 1);         // crossguard
        g.fillRect(11, 12, 2, 2);         // grip
        break;
      case 'bow':
        g.lineStyle(1, color, 1);
        g.strokeCircle(13, 8, 4);
        g.lineStyle(1, 0xeeeeee, 1);
        g.lineBetween(13, 4, 13, 12);
        break;
      case 'staff':
        g.fillStyle(0x6b3f1a, 1).fillRect(11, 4, 1, 10);
        g.fillStyle(color, 1).fillCircle(11, 4, 2);
        break;
      case 'armor':
        g.fillStyle(color, 1);
        g.fillRect(4, 6, 8, 6);
        g.lineStyle(1, 0x000000, 0.5);
        g.strokeRect(4, 6, 8, 6);
        break;
      case 'hat':
        g.fillStyle(color, 1);
        g.fillRect(3, 1, 10, 3);
        g.fillRect(4, 0, 8, 1);
        break;
      case 'crown':
        g.fillStyle(color, 1);
        g.fillRect(4, 2, 8, 2);
        g.fillRect(4, 0, 2, 2);
        g.fillRect(7, 0, 2, 2);
        g.fillRect(10, 0, 2, 2);
        break;
      case 'boots':
        g.fillStyle(color, 1);
        g.fillRect(4, 13, 3, 2);
        g.fillRect(9, 13, 3, 2);
        break;
      case 'hat-empty':
      default:
        // fully transparent
        break;
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
