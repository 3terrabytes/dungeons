import Phaser from 'phaser';
import { ENEMY } from '../../config';
import { Enemy } from './Enemy';
import type { Projectile } from '../Projectile';

export class RangedShooter extends Enemy {
  private fireCdMs = Phaser.Math.Between(200, ENEMY.rangedFireCooldownMs);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy-ranged', ENEMY.rangedHp, ENEMY.rangedAtk, 'ranged');
  }

  override update(_time: number, delta: number): void {
    this.updateCommon(delta);
    const player = this.getPlayer();
    if (!player) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const ideal = ENEMY.rangedIdealDistance;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (dist < ideal - 20) {
      // back off
      body.setVelocity((-dx / dist) * ENEMY.rangedSpd, (-dy / dist) * ENEMY.rangedSpd);
    } else if (dist > ideal + 20) {
      // close in slowly
      body.setVelocity((dx / dist) * ENEMY.rangedSpd * 0.6, (dy / dist) * ENEMY.rangedSpd * 0.6);
    } else {
      // strafe
      body.setVelocity(-dy / dist * ENEMY.rangedSpd * 0.5, dx / dist * ENEMY.rangedSpd * 0.5);
    }

    this.fireCdMs -= delta;
    if (this.fireCdMs <= 0 && dist < ideal + 80) {
      this.fire(dx, dy, dist);
      this.fireCdMs = ENEMY.rangedFireCooldownMs;
    }
  }

  private fire(dx: number, dy: number, dist: number): void {
    const group = this.scene.registry.get('enemyProjectiles') as Phaser.Physics.Arcade.Group;
    const proj = group.get(this.x, this.y, 'proj-enemy') as Projectile | null;
    if (!proj) return;
    const angle = Math.atan2(dy / dist, dx / dist);
    proj.fire(this.x, this.y, angle, ENEMY.rangedProjectileSpeed, ENEMY.rangedAtk, 1400, 'enemy');
  }
}
