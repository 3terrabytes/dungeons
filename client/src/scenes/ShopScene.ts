import Phaser from 'phaser';
import { COLORS } from '../config';
import { Inventory, SHOP_ITEMS, type BaseItem, type InventoryStateSnapshot } from '../systems/Inventory';
import { api, type SaveData } from '../api/client';

interface ShopSceneData {
  floor: number;
  save: SaveData;
  inventorySnapshot: InventoryStateSnapshot;
  carryStats: { hp: number; xp: number; level: number; gold: number };
}

export class ShopScene extends Phaser.Scene {
  private sceneData!: ShopSceneData;
  private inventory!: Inventory;
  private goldText!: Phaser.GameObjects.Text;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() { super('Shop'); }

  init(data: ShopSceneData): void {
    this.sceneData = data;
    this.inventory = new Inventory(data.inventorySnapshot);
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, COLORS.bg, 1).setOrigin(0);

    this.add.text(width / 2, 30, 'SHOPKEEPER', {
      fontFamily: 'monospace', fontSize: '24px', color: '#f5d76e', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 58, `Floor ${this.sceneData.floor} cleared. Spend before descending.`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaa',
    }).setOrigin(0.5);

    this.goldText = this.add.text(width - 16, 16, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.refreshGold();
    this.renderShelf();

    // Persist save meta-progression (highestFloor, totalGold, etc.) on shop entry
    void this.persistSave();

    // Continue button
    const btn = this.add.rectangle(width / 2, height - 50, 220, 44, 0x4cc9f0).setStrokeStyle(2, 0x000000, 0.5).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height - 50, 'DESCEND', {
      fontFamily: 'monospace', fontSize: '16px', color: '#000', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setScale(1.04));
    btn.on('pointerout',  () => btn.setScale(1));
    btn.on('pointerdown', () => this.descend());
  }

  private renderShelf(): void {
    const cols = 4;
    const cardW = 160, cardH = 100, gap = 16;
    const startX = (this.scale.width - (cols * cardW + (cols - 1) * gap)) / 2;
    const startY = 100;

    SHOP_ITEMS.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const card = this.makeCard(x, y, cardW, cardH, item);
      this.cards.push(card);
    });
  }

  private makeCard(x: number, y: number, w: number, h: number, item: BaseItem): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, COLORS.uiPanel).setOrigin(0).setStrokeStyle(1, COLORS.uiBorder).setInteractive({ useHandCursor: true });

    const sprite = item.sprite ? this.add.image(w - 24, 26, item.sprite).setOrigin(0.5) : null;

    const name = this.add.text(8, 8, item.name, {
      fontFamily: 'monospace', fontSize: '12px', color: '#fff', fontStyle: 'bold',
      wordWrap: { width: w - 50 },
    });
    const desc = this.add.text(8, 40, this.describe(item), {
      fontFamily: 'monospace', fontSize: '10px', color: '#aaa',
      wordWrap: { width: w - 16 },
    });
    const cost = this.add.text(8, h - 18, `${item.cost} G`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd166', fontStyle: 'bold',
    });

    container.add([bg, ...(sprite ? [sprite] : []), name, desc, cost]);

    bg.on('pointerover', () => bg.setFillStyle(0x2a2a4e));
    bg.on('pointerout',  () => bg.setFillStyle(COLORS.uiPanel));
    bg.on('pointerdown', () => this.tryBuy(item));

    return container;
  }

  private describe(item: BaseItem): string {
    if (item.type === 'consumable') return `+${item.effect?.heal} HP on use`;
    if (item.type === 'boost') {
      const e = item.effect!;
      return e.maxHp ? `+${e.maxHp} max HP (permanent)` : `+${e.atk} ATK (permanent)`;
    }
    const s = item.stats!;
    return [
      s.atk ? `+${s.atk} ATK` : '',
      s.def ? `+${s.def} DEF` : '',
      s.spd ? `+${s.spd} SPD` : '',
      s.maxHp ? `+${s.maxHp} max HP` : '',
    ].filter(Boolean).join(', ');
  }

  private tryBuy(item: BaseItem): void {
    if (this.sceneData.carryStats.gold < item.cost) {
      this.flashShake();
      return;
    }
    this.sceneData.carryStats.gold -= item.cost;
    this.inventory.acquire(item);
    if (item.type === 'boost' && item.effect) {
      // Permanent boosts also update save
      if (item.effect.maxHp) this.sceneData.save.permanentBoosts.maxHpBonus += item.effect.maxHp;
      if (item.effect.atk)   this.sceneData.save.permanentBoosts.atkBonus   += item.effect.atk;
    }
    this.refreshGold();
  }

  private flashShake(): void {
    this.cameras.main.shake(80, 0.005);
  }

  private refreshGold(): void {
    this.goldText.setText(`${this.sceneData.carryStats.gold} G`);
  }

  private async persistSave(): Promise<void> {
    if (this.registry.get('guest') === true) return;
    const updated: SaveData = {
      ...this.sceneData.save,
      highestFloor: Math.max(this.sceneData.save.highestFloor, this.sceneData.floor),
      totalGold: this.sceneData.save.totalGold + this.sceneData.carryStats.gold,
    };
    try { await api.putSave(updated); }
    catch { /* network is best-effort */ }
  }

  private descend(): void {
    this.scene.start('Dungeon', {
      floor: this.sceneData.floor + 1,
      save: this.sceneData.save,
      inventorySnapshot: this.inventory.snapshot(),
      carryStats: this.sceneData.carryStats,
    });
  }
}
