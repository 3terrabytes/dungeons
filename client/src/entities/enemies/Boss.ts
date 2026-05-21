import Phaser from 'phaser';
import { ENEMY } from '../../config';
import { Enemy } from './Enemy';
import type { Projectile } from '../Projectile';

type BossState = 'idle' | 'telegraph' | 'burst' | 'charge' | 'cooldown';

/**
 * Boss state machine: idle → telegraph (charge OR burst) → execute → cooldown → idle
 * Scales HP by floor depth.
 */
export class Boss extends Enemy {
  private state: BossState = 'idle';
  private stateTimerMs = 1200;
  private chargeDir = new Phaser.Math.Vector2(0, 0);
  private maxHp: number;

  constructor(scene: Phaser.Scene, x: number, y: number, floorDepth: number) {
    const hp = ENEMY.bossHp + floorDepth * 80;
    super(scene, x, y, 'enemy-boss', hp, ENEMY.bossAtk, 'boss');
    this.maxHp = hp;
    this.setScale(1.6);
    (this.body as Phaser.Physics.Arcade.Body).setSize(24, 24);
  }

  override update(_time: number, delta: number): void {
    this.updateCommon(delta);
    const player = this.getPlayer();
    if (!player) return;

    this.stateTimerMs -= delta;
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.state) {
      case 'idle': {
        // Slowly approach
        const dx = player.x - this.x, dy = player.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        body.setVelocity((dx / d) * ENEMY.bossSpd, (dy / d) * ENEMY.bossSpd);
        if (this.stateTimerMs <= 0) {
          // Pick attack: charge if close, burst if far
          if (d < 180) this.enter('telegraph', 600, () => this.enter('charge', 500));
          else         this.enter('telegraph', 700, () => this.enter('burst', 100));
        }
        break;
      }
      case 'telegraph': {
        body.setVelocity(0, 0);
        // Visual: blink
        this.setTint(Math.floor(this.stateTimerMs / 100) % 2 === 0 ? 0xff4444 : 0xffffff);
        if (this.stateTimerMs <= 0) this.advanceFromTelegraph();
        break;
      }
      case 'charge': {
        if (body.velocity.x === 0 && body.velocity.y === 0) {
          // Lock direction
          const dx = player.x - this.x, dy = player.y - this.y;
          const d = Math.hypot(dx, dy) || 1;
          this.chargeDir.set(dx / d, dy / d);
          body.setVelocity(this.chargeDir.x * 320, this.chargeDir.y * 320);
        }
        if (this.stateTimerMs <= 0) {
          body.setVelocity(0, 0);
          this.enter('cooldown', 800);
        }
        break;
      }
      case 'burst': {
        this.fireRadialBurst(12);
        this.enter('cooldown', 900);
        break;
      }
      case 'cooldown': {
        body.setVelocity(0, 0);
        if (this.stateTimerMs <= 0) this.enter('idle', 1000);
        break;
      }
    }

    // Health-gate phase: under 50% HP, faster cooldowns
    if (this.hp < this.maxHp * 0.5 && this.state === 'cooldown' && this.stateTimerMs > 400) {
      this.stateTimerMs = 400;
    }
  }

  private advanceFromTelegraph(): void {
    this.clearTint();
    // queued advance handled by enter() callback chain
  }

  private enter(next: BossState, durMs: number, after?: () => void): void {
    this.state = next;
    this.stateTimerMs = durMs;
    if (after) {
      this.scene.time.delayedCall(durMs, after);
    }
  }

  private fireRadialBurst(count: number): void {
    const group = this.scene.registry.get('enemyProjectiles') as Phaser.Physics.Arcade.Group;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const proj = group.get(this.x, this.y, 'proj-enemy') as Projectile | null;
      if (!proj) continue;
      proj.fire(this.x, this.y, angle, 180, ENEMY.bossAtk, 2400, 'enemy');
    }
  }
}
