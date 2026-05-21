import Phaser from 'phaser';
import { LOOT } from '../../config';
import type { Player } from '../Player';

export class GoldCoin extends Phaser.Physics.Arcade.Sprite {
  amount: number;
  constructor(scene: Phaser.Scene, x: number, y: number, amount: number) {
    super(scene, x, y, 'gold');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(4);
    this.amount = amount;
    // small initial scatter
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(
      Phaser.Math.Between(-40, 40), Phaser.Math.Between(-40, 40),
    );
    (this.body as Phaser.Physics.Arcade.Body).setDrag(220, 220);
  }

  override update(_time: number, _delta: number): void {
    const player = this.scene.registry.get('player') as Player | undefined;
    if (!player) return;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < LOOT.magnetRadius && dist > 0.1) {
      const pull = Phaser.Math.Linear(0, LOOT.maxPullSpeed, 1 - dist / LOOT.magnetRadius);
      (this.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * pull, (dy / dist) * pull);
    }
    if (dist < LOOT.pickupRadius) {
      player.stats.gold += this.amount;
      this.scene.events.emit('stats:changed');
      this.destroy();
    }
  }
}
