import Phaser from 'phaser';
import { api, type SaveData } from '../api/client';

const DEFAULT_SAVE: SaveData = {
  highestFloor: 0,
  totalGold: 0,
  permanentBoosts: { maxHpBonus: 0, atkBonus: 0 },
  unlockedItems: [],
};

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    const isGuest = this.registry.get('guest') === true;

    this.add.text(width / 2, 90, 'DUNGEON CRAWLER', {
      fontFamily: 'monospace', fontSize: '36px', color: '#f5d76e',
    }).setOrigin(0.5);

    // Load save (or fall back to default for guest / network error)
    let save = DEFAULT_SAVE;
    if (!isGuest) {
      try { save = await api.getSave(); }
      catch { /* keep default */ }
    }
    this.registry.set('save', save);

    const stats = save.highestFloor > 0
      ? `Best floor: ${save.highestFloor}    Gold banked: ${save.totalGold}\nPermanent: +${save.permanentBoosts.maxHpBonus} HP, +${save.permanentBoosts.atkBonus} ATK`
      : 'No runs yet — good luck.';

    this.add.text(width / 2, 170, stats, {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaa', align: 'center',
    }).setOrigin(0.5);

    this.makeButton(width / 2, height / 2 + 10, 'START RUN', 0x4cc9f0, () => {
      this.scene.start('Dungeon', { floor: 1, save });
    });

    this.makeButton(width / 2, height / 2 + 70, isGuest ? 'BACK TO LOGIN' : 'LOG OUT', 0x4a4a6a, async () => {
      if (!isGuest) try { await api.logout(); } catch { /* ignore */ }
      this.registry.set('guest', false);
      this.scene.start('Login');
    });

    this.add.text(width / 2, height - 24,
      'WASD move    Mouse aim    Click ranged    Space melee    Q potion    E interact',
      { fontFamily: 'monospace', fontSize: '11px', color: '#666' },
    ).setOrigin(0.5);
  }

  private makeButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 240, 44, color).setStrokeStyle(2, 0x000000, 0.5).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '16px', color: '#000', fontStyle: 'bold',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setScale(1.04));
    bg.on('pointerout',  () => bg.setScale(1.0));
    bg.on('pointerdown', onClick);
  }
}
