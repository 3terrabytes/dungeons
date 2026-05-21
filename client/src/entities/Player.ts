import Phaser from 'phaser';
import { PLAYER } from '../config';
import { Inventory, getItem, type EquipSlot } from '../systems/Inventory';
import { Projectile } from './Projectile';
import type { InputState } from '../systems/InputController';

export interface PlayerStats {
  hp: number; maxHp: number;
  atk: number; def: number; spd: number;
  xp: number; level: number; gold: number;
}

/**
 * Player is a Container holding stacked sprite layers (body → armor → weapon → hat).
 * Arcade physics body lives on the container itself.
 */
export class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  bodySprite!: Phaser.GameObjects.Image;
  armorLayer!: Phaser.GameObjects.Image;
  weaponLayer!: Phaser.GameObjects.Image;
  hatLayer!: Phaser.GameObjects.Image;
  bootsLayer!: Phaser.GameObjects.Image;

  stats: PlayerStats;
  inventory: Inventory;

  private attackCdMs = 0;
  private iFramesMs = 0;
  private flipped = false;
  meleeFx?: Phaser.GameObjects.Arc;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    inventory: Inventory,
    permanentBoosts: { maxHpBonus: number; atkBonus: number },
  ) {
    super(scene, x, y);

    this.bodySprite  = scene.add.image(0, 0, 'player-body');
    this.armorLayer  = scene.add.image(0, 0, 'empty');
    this.bootsLayer  = scene.add.image(0, 0, 'empty');
    this.weaponLayer = scene.add.image(0, 0, 'empty');
    this.hatLayer    = scene.add.image(0, 0, 'empty');
    this.add([this.bodySprite, this.armorLayer, this.bootsLayer, this.weaponLayer, this.hatLayer]);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(10, 10).setOffset(-5, -3);
    this.body.setCollideWorldBounds(true);

    this.inventory = inventory;

    const baseMaxHp = PLAYER.baseHp + permanentBoosts.maxHpBonus;
    this.stats = {
      hp: baseMaxHp, maxHp: baseMaxHp,
      atk: PLAYER.baseAtk + permanentBoosts.atkBonus,
      def: PLAYER.baseDef,
      spd: PLAYER.baseSpd,
      xp: 0, level: 1, gold: 0,
    };

    this.applyInventory();
  }

  /** Recompute stats and refresh visual layers. Call after equipping. */
  applyInventory(): void {
    const m = this.inventory.modifiers();
    const baseMaxHp = PLAYER.baseHp + this.inventory.permanent.maxHpBonus + m.maxHp;
    const ratio = this.stats.hp / this.stats.maxHp;
    this.stats.maxHp = baseMaxHp + (this.stats.level - 1) * 10;
    this.stats.hp = Math.min(this.stats.maxHp, Math.round(this.stats.maxHp * ratio));
    this.stats.atk = PLAYER.baseAtk + this.inventory.permanent.atkBonus + m.atk + (this.stats.level - 1) * 2;
    this.stats.def = PLAYER.baseDef + m.def + (this.stats.level - 1);
    this.stats.spd = PLAYER.baseSpd + m.spd;

    this.setLayer('weapon', this.inventory.equipped.weapon);
    this.setLayer('armor',  this.inventory.equipped.armor);
    this.setLayer('hat',    this.inventory.equipped.hat);
    this.setLayer('boots',  this.inventory.equipped.boots);
  }

  private setLayer(slot: EquipSlot, itemId: string | undefined): void {
    const layer =
      slot === 'weapon' ? this.weaponLayer :
      slot === 'armor'  ? this.armorLayer  :
      slot === 'hat'    ? this.hatLayer    :
                          this.bootsLayer;
    if (!itemId) { layer.setTexture('empty'); return; }
    const tex = getItem(itemId)?.sprite ?? 'empty';
    layer.setTexture(tex);
  }

  override update(delta: number, input: InputState, pointer: Phaser.Input.Pointer): void {
    // 8-way normalised
    const vx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vy = (input.down  ? 1 : 0) - (input.up   ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    this.body.setVelocity((vx / len) * this.stats.spd, (vy / len) * this.stats.spd);

    // Face cursor
    const wantFlip = pointer.worldX < this.x;
    if (wantFlip !== this.flipped) {
      this.flipped = wantFlip;
      [this.bodySprite, this.armorLayer, this.weaponLayer, this.hatLayer, this.bootsLayer]
        .forEach((s) => s.setFlipX(wantFlip));
    }

    this.attackCdMs = Math.max(0, this.attackCdMs - delta);
    this.iFramesMs  = Math.max(0, this.iFramesMs  - delta);
    // i-frame blink
    this.setAlpha(this.iFramesMs > 0 ? (Math.floor(this.iFramesMs / 80) % 2 === 0 ? 0.4 : 1) : 1);

    if (input.usePotion) {
      const heal = this.inventory.usePotion();
      if (heal > 0) {
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + heal);
        this.scene.events.emit('stats:changed');
      }
    }

    if (this.attackCdMs === 0) {
      if (input.attackRanged) this.fireProjectile(pointer);
      else if (input.attackMelee) this.swingMelee(pointer);
    }
  }

  private fireProjectile(pointer: Phaser.Input.Pointer): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    const group = this.scene.registry.get('playerProjectiles') as Phaser.Physics.Arcade.Group;
    const proj = group.get(this.x, this.y, 'proj-player') as Projectile | null;
    if (proj) proj.fire(this.x, this.y, angle, PLAYER.projectileSpeed, this.stats.atk, PLAYER.projectileLifeMs, 'player');
    this.attackCdMs = PLAYER.rangedCooldownMs;
  }

  private swingMelee(pointer: Phaser.Input.Pointer): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    const range = PLAYER.meleeRange;
    const tx = this.x + Math.cos(angle) * range * 0.6;
    const ty = this.y + Math.sin(angle) * range * 0.6;

    // Visual arc — short-lived
    this.meleeFx?.destroy();
    this.meleeFx = this.scene.add.circle(tx, ty, range * 0.7, 0xffffff, 0.25);
    this.scene.tweens.add({ targets: this.meleeFx, alpha: 0, duration: 120, onComplete: () => this.meleeFx?.destroy() });

    // Damage all enemies within arc
    const arc = Phaser.Math.DegToRad(PLAYER.meleeArcDeg / 2);
    const enemies = this.scene.registry.get('enemies') as Phaser.Physics.Arcade.Group;
    enemies.getChildren().forEach((child) => {
      const e = child as Phaser.GameObjects.GameObject & { x: number; y: number; takeDamage?: (n: number) => void };
      const dx = e.x - this.x, dy = e.y - this.y;
      if (Math.hypot(dx, dy) > range) return;
      const a = Math.atan2(dy, dx);
      const da = Math.abs(Phaser.Math.Angle.Wrap(a - angle));
      if (da <= arc && e.takeDamage) e.takeDamage(this.stats.atk);
    });

    this.attackCdMs = PLAYER.meleeCooldownMs;
  }

  takeDamage(raw: number): void {
    if (this.iFramesMs > 0) return;
    const dmg = Math.max(1, raw - this.stats.def);
    this.stats.hp -= dmg;
    this.iFramesMs = PLAYER.iFramesMs;
    this.scene.cameras.main.shake(80, 0.005);
    this.scene.events.emit('stats:changed');
    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      this.scene.events.emit('player:dead');
    }
  }
}
