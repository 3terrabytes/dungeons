import Phaser from 'phaser';
import { api, type SaveData } from '../api/client';

interface GameOverData {
  floor: number;
  save: SaveData;
  won: boolean;
  gold: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  async create(data: GameOverData): Promise<void> {
    const { width, height } = this.scale;
    const title = data.won ? 'VICTORY' : 'YOU DIED';
    const color = data.won ? '#9bc53d' : '#e63946';

    this.add.text(width / 2, height / 2 - 60, title, {
      fontFamily: 'monospace', fontSize: '48px', color, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Reached floor ${data.floor}\nBanked ${data.gold} gold`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaa', align: 'center',
    }).setOrigin(0.5);

    if (this.registry.get('guest') !== true) {
      try {
        const updated: SaveData = {
          ...data.save,
          highestFloor: Math.max(data.save.highestFloor, data.floor),
          totalGold: data.save.totalGold + data.gold,
        };
        await api.putSave(updated);
      } catch { /* ignore */ }
    }

    const btn = this.add.rectangle(width / 2, height / 2 + 80, 220, 44, 0x4cc9f0).setStrokeStyle(2, 0x000000, 0.5).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 + 80, 'BACK TO MENU', {
      fontFamily: 'monospace', fontSize: '14px', color: '#000', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerdown', () => this.scene.start('Menu'));
  }
}
