import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  owner: 'player' | 'enemy' = 'player';
  private lifetimeMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'proj-player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(3);
    this.setActive(false).setVisible(false);
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number, lifeMs: number, owner: 'player' | 'enemy'): void {
    this.setPosition(x, y);
    this.setActive(true).setVisible(true);
    this.damage = damage;
    this.owner = owner;
    this.setTexture(owner === 'player' ? 'proj-player' : 'proj-enemy');
    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.lifetimeMs = lifeMs;
  }

  override update(_time: number, delta: number): void {
    if (!this.active) return;
    this.lifetimeMs -= delta;
    if (this.lifetimeMs <= 0) this.deactivate();
  }

  deactivate(): void {
    this.setActive(false).setVisible(false);
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
  }
}
