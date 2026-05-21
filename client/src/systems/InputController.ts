import Phaser from 'phaser';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attackMelee: boolean;
  attackRanged: boolean;
  usePotion: boolean;
  interact: boolean;
}

export class InputController {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private pointer: Phaser.Input.Pointer;
  private justPressedPotion = false;
  private justPressedInteract = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = {
      w: kb.addKey('W'), a: kb.addKey('A'), s: kb.addKey('S'), d: kb.addKey('D'),
      up: kb.addKey('UP'), down: kb.addKey('DOWN'), left: kb.addKey('LEFT'), right: kb.addKey('RIGHT'),
      space: kb.addKey('SPACE'),
      q: kb.addKey('Q'),
      e: kb.addKey('E'),
    };
    this.pointer = scene.input.activePointer;

    kb.on('keydown-Q', () => { this.justPressedPotion = true; });
    kb.on('keydown-E', () => { this.justPressedInteract = true; });
  }

  sample(): { state: InputState; pointer: Phaser.Input.Pointer } {
    const state: InputState = {
      up:    this.keys.w!.isDown || this.keys.up!.isDown,
      down:  this.keys.s!.isDown || this.keys.down!.isDown,
      left:  this.keys.a!.isDown || this.keys.left!.isDown,
      right: this.keys.d!.isDown || this.keys.right!.isDown,
      attackMelee: this.keys.space!.isDown,
      attackRanged: this.pointer.isDown,
      usePotion: this.justPressedPotion,
      interact: this.justPressedInteract,
    };
    this.justPressedPotion = false;
    this.justPressedInteract = false;
    return { state, pointer: this.pointer };
  }
}
