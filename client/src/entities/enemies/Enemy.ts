import Phaser from 'phaser';
import { LOOT } from '../../config';
import { XPOrb } from '../pickups/XPOrb';
import { GoldCoin } from '../pickups/GoldCoin';
import type { Player } from '../Player';

export type EnemyTier = 'melee' | 'ranged' | 'boss';

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  contactDamage: number;
  tier: EnemyTier;
  protected contactCdMs = 0;
  protected hitFlashMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, hp: number, atk: number, tier: EnemyTier) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.hp = hp;
    this.contactDamage = atk;
    this.tier = tier;
    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setBounce(0);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    this.hitFlashMs = 80;
    this.setTint(0xffffff);
    if (this.hp <= 0) this.die();
  }

  protected die(): void {
    // XP orb (always 1) + gold range
    const xpScene = this.scene;
    const xpAmount = LOOT.xpPerKill[this.tier];
    const orb = new XPOrb(xpScene, this.x, this.y, xpAmount);
    (xpScene.registry.get('pickups') as Phaser.GameObjects.Group).add(orb);

    const [min, max] = LOOT.goldRange[this.tier];
    const coins = Phaser.Math.Between(min, max);
    for (let i = 0; i < coins; i++) {
      const jitter = () => Phaser.Math.Between(-10, 10);
      const c = new GoldCoin(xpScene, this.x + jitter(), this.y + jitter(), 1);
      (xpScene.registry.get('pickups') as Phaser.GameObjects.Group).add(c);
    }

    if (this.tier === 'boss') xpScene.events.emit('boss:dead');
    else xpScene.events.emit('enemy:dead', this);
    this.destroy();
  }

  abstract override update(time: number, delta: number): void;

  protected updateCommon(delta: number): void {
    this.contactCdMs = Math.max(0, this.contactCdMs - delta);
    this.hitFlashMs  = Math.max(0, this.hitFlashMs  - delta);
    if (this.hitFlashMs === 0) this.clearTint();
  }

  protected getPlayer(): Player {
    return this.scene.registry.get('player') as Player;
  }
}
