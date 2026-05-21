import Phaser from 'phaser';
import { LOOT } from '../../config';
import type { Player } from '../Player';

export class XPOrb extends Phaser.Physics.Arcade.Sprite {
  amount: number;
  constructor(scene: Phaser.Scene, x: number, y: number, amount: number) {
    super(scene, x, y, 'xp-orb');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(4);
    this.amount = amount;
  }

  override update(_time: number, _delta: number): void {
    const player = this.scene.registry.get('player') as Player | undefined;
    if (!player) return;
    pullToward(this, player);
    if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < LOOT.pickupRadius) {
      this.scene.events.emit('xp:gained', this.amount);
      this.destroy();
    }
  }
}

function pullToward(orb: Phaser.Physics.Arcade.Sprite, player: { x: number; y: number }): void {
  const dx = player.x - orb.x, dy = player.y - orb.y;
  const dist = Math.hypot(dx, dy);
  if (dist < LOOT.magnetRadius && dist > 0.1) {
    const pull = Phaser.Math.Linear(0, LOOT.maxPullSpeed, 1 - dist / LOOT.magnetRadius);
    (orb.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * pull, (dy / dist) * pull);
  } else {
    (orb.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }
}
