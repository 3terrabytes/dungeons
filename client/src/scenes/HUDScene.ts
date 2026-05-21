import Phaser from 'phaser';
import { COLORS } from '../config';
import { PROGRESSION } from '../config';
import type { Player } from '../entities/Player';

/**
 * HUDScene runs in parallel with DungeonScene. It reads player stats from the
 * registry and listens for `stats:changed` and `player:levelup` events.
 */
export class HUDScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private lvlText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private potionText!: Phaser.GameObjects.Text;
  private floorText!: Phaser.GameObjects.Text;
  private levelupText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'HUD', active: false }); }

  create(): void {
    const dungeon = this.scene.get('Dungeon');

    // Top-left HP bar
    this.hpBarBg = this.add.rectangle(12, 12, 200, 14, 0x000000, 0.6).setOrigin(0, 0).setStrokeStyle(1, COLORS.uiBorder);
    this.hpBar   = this.add.rectangle(13, 13, 198, 12, COLORS.hpBar).setOrigin(0, 0);
    this.hpText  = this.add.text(115, 13, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#fff',
    }).setOrigin(0.5, 0);

    // XP bar below
    this.xpBarBg = this.add.rectangle(12, 30, 200, 6, 0x000000, 0.6).setOrigin(0, 0).setStrokeStyle(1, COLORS.uiBorder);
    this.xpBar   = this.add.rectangle(13, 31, 0, 4, COLORS.xpBar).setOrigin(0, 0);

    this.lvlText = this.add.text(220, 12, 'Lv 1', {
      fontFamily: 'monospace', fontSize: '14px', color: '#fff', fontStyle: 'bold',
    });

    // Top-right gold + potion + floor
    this.goldText = this.add.text(this.scale.width - 12, 12, '0 G', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.potionText = this.add.text(this.scale.width - 12, 30, 'Potions: 0  [Q]', {
      fontFamily: 'monospace', fontSize: '11px', color: '#9bc53d',
    }).setOrigin(1, 0);

    this.floorText = this.add.text(this.scale.width / 2, 12, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaa',
    }).setOrigin(0.5, 0);

    this.levelupText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
      fontFamily: 'monospace', fontSize: '28px', color: '#f5d76e', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    dungeon.events.on('stats:changed', () => this.refresh());
    dungeon.events.on('player:levelup', (lvl: number) => this.showLevelUp(lvl));
    this.refresh();
  }

  private refresh(): void {
    const dungeon = this.scene.get('Dungeon') as Phaser.Scene & { registry: Phaser.Data.DataManager };
    const player = dungeon.registry.get('player') as Player | undefined;
    if (!player) return;
    const s = player.stats;

    const hpPct = Phaser.Math.Clamp(s.hp / s.maxHp, 0, 1);
    this.hpBar.setSize(198 * hpPct, 12);
    this.hpText.setText(`${s.hp} / ${s.maxHp}`);

    const xpNeeded = PROGRESSION.xpToNext(s.level);
    this.xpBar.setSize(198 * Phaser.Math.Clamp(s.xp / xpNeeded, 0, 1), 4);

    this.lvlText.setText(`Lv ${s.level}`);
    this.goldText.setText(`${s.gold} G`);
    this.potionText.setText(`Potions: ${player.inventory.potions}  [Q]`);

    const floor = (dungeon as unknown as { floor: number }).floor;
    this.floorText.setText(`Floor ${floor}`);
  }

  private showLevelUp(lvl: number): void {
    this.levelupText.setText(`LEVEL ${lvl}!`).setAlpha(1).setScale(0.5);
    this.tweens.add({
      targets: this.levelupText,
      scale: 1.2, alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
    });
    this.refresh();
  }
}
