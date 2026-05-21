import Phaser from 'phaser';
import { api } from '../api/client';
import { COLORS } from '../config';

/**
 * Account sign-in. Uses HTML inputs overlaid on the canvas because typing into
 * Phaser is painful. Inputs are removed when the scene shuts down.
 */
export class LoginScene extends Phaser.Scene {
  private form?: HTMLDivElement;
  private statusText?: Phaser.GameObjects.Text;

  constructor() { super('Login'); }

  create(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, 80, 'DUNGEON CRAWLER', {
      fontFamily: 'monospace', fontSize: '36px', color: '#f5d76e',
    }).setOrigin(0.5);

    this.add.text(width / 2, 130, 'Sign in to begin your run', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaa',
    }).setOrigin(0.5);

    this.statusText = this.add.text(width / 2, height - 60, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ff6b6b',
    }).setOrigin(0.5);

    this.attachForm();

    // Try resuming an existing session (cookie may still be valid).
    void api.me().then((user) => {
      this.statusText!.setColor('#9bc53d').setText(`Welcome back, ${user.username}`);
      this.time.delayedCall(400, () => this.proceed());
    }).catch(() => { /* not logged in — show form */ });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.detachForm());
  }

  private attachForm(): void {
    const parent = document.getElementById('game') ?? document.body;
    const form = document.createElement('div');
    form.id = 'login-form';
    form.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -30%);
      display: flex; flex-direction: column; gap: 10px; padding: 20px;
      background: rgba(20, 18, 32, 0.95); border: 2px solid #4a4a6a; border-radius: 6px;
      color: #eee; font-family: monospace; min-width: 280px; z-index: 100;
    `;
    form.innerHTML = `
      <input id="u" placeholder="username" autocomplete="username"
        style="padding:8px;background:#0b0b12;color:#eee;border:1px solid #4a4a6a;font-family:monospace;" />
      <input id="p" type="password" placeholder="password" autocomplete="current-password"
        style="padding:8px;background:#0b0b12;color:#eee;border:1px solid #4a4a6a;font-family:monospace;" />
      <div style="display:flex;gap:8px;">
        <button id="login"
          style="flex:1;padding:10px;background:#4cc9f0;color:#000;border:0;cursor:pointer;font-family:monospace;font-weight:bold;">LOG IN</button>
        <button id="register"
          style="flex:1;padding:10px;background:#9bc53d;color:#000;border:0;cursor:pointer;font-family:monospace;font-weight:bold;">SIGN UP</button>
      </div>
      <button id="guest" style="padding:6px;background:transparent;color:#aaa;border:1px dashed #4a4a6a;cursor:pointer;font-family:monospace;">Play as guest</button>
    `;
    parent.appendChild(form);
    this.form = form;

    const u = form.querySelector<HTMLInputElement>('#u')!;
    const p = form.querySelector<HTMLInputElement>('#p')!;

    const submit = async (kind: 'login' | 'register') => {
      const username = u.value.trim();
      const password = p.value;
      if (username.length < 3 || password.length < 6) {
        this.setStatus('Username 3+ chars, password 6+ chars', '#ff6b6b');
        return;
      }
      this.setStatus('Connecting…', '#aaa');
      try {
        if (kind === 'login') await api.login(username, password);
        else                  await api.register(username, password);
        this.setStatus('Success!', '#9bc53d');
        this.proceed();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.setStatus(msg.includes('Failed to fetch') ? 'Server is waking up — try again in 30s' : msg, '#ff6b6b');
      }
    };

    form.querySelector<HTMLButtonElement>('#login')!.onclick    = () => void submit('login');
    form.querySelector<HTMLButtonElement>('#register')!.onclick = () => void submit('register');
    form.querySelector<HTMLButtonElement>('#guest')!.onclick    = () => {
      this.registry.set('guest', true);
      this.proceed();
    };
  }

  private detachForm(): void {
    this.form?.remove();
    this.form = undefined;
  }

  private setStatus(msg: string, color: string): void {
    this.statusText?.setColor(color).setText(msg);
  }

  private proceed(): void {
    this.scene.start('Menu');
  }
}
