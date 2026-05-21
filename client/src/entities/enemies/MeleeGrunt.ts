import Phaser from 'phaser';
import { ENEMY } from '../../config';
import { Enemy } from './Enemy';

export class MeleeGrunt extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy-melee', ENEMY.meleeHp, ENEMY.meleeAtk, 'melee');
  }

  override update(_time: number, delta: number): void {
    this.updateCommon(delta);
    const player = this.getPlayer();
    if (!player) return;
    this.scene.physics.moveToObject(this, player, ENEMY.meleeSpd);
  }
}
