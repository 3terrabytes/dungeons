import Phaser from 'phaser';
import { PROGRESSION } from '../config';
import type { Player } from '../entities/Player';

export class ProgressionSystem {
  constructor(private scene: Phaser.Scene, private player: Player) {
    scene.events.on('xp:gained', (amount: number) => this.grantXp(amount));
  }

  grantXp(amount: number): void {
    this.player.stats.xp += amount;
    while (this.player.stats.xp >= PROGRESSION.xpToNext(this.player.stats.level)) {
      this.player.stats.xp -= PROGRESSION.xpToNext(this.player.stats.level);
      this.levelUp();
    }
    this.scene.events.emit('stats:changed');
  }

  private levelUp(): void {
    const p = this.player.stats;
    p.level += 1;
    p.maxHp += PROGRESSION.perLevel.maxHp;
    p.atk   += PROGRESSION.perLevel.atk;
    p.def   += PROGRESSION.perLevel.def;
    p.hp    = p.maxHp;
    this.scene.events.emit('player:levelup', p.level);
  }
}
