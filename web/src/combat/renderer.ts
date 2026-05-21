import type { FightState } from "./engine";

export function render(ctx: CanvasRenderingContext2D, s: FightState) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, s.arenaW, s.arenaH);

  // Grid
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  for (let x = 0; x <= s.arenaW; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, s.arenaH);
    ctx.stroke();
  }
  for (let y = 0; y <= s.arenaH; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s.arenaW, y);
    ctx.stroke();
  }

  // Projectiles
  for (const p of s.projectiles) {
    ctx.fillStyle = p.fromPlayer ? "#60a5fa" : "#f87171";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemy
  ctx.fillStyle = s.enemy.color;
  ctx.beginPath();
  ctx.arc(s.enemy.x, s.enemy.y, s.enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Enemy HP bar
  drawHpBar(ctx, s.enemy.x - 30, s.enemy.y - s.enemy.radius - 12, 60, 5, s.enemy.hp / s.enemy.maxHp, "#ef4444");

  // Player
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(s.player.x, s.player.y, s.player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Aim line
  const dx = s.player.aimX - s.player.x;
  const dy = s.player.aimY - s.player.y;
  const m = Math.hypot(dx, dy) || 1;
  const ux = dx / m, uy = dy / m;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s.player.x + ux * s.player.radius, s.player.y + uy * s.player.radius);
  ctx.lineTo(s.player.x + ux * (s.player.radius + 18), s.player.y + uy * (s.player.radius + 18));
  ctx.stroke();

  // Player HP bar (bottom-left HUD)
  drawHpBar(ctx, 16, s.arenaH - 28, 220, 12, s.player.hp / s.player.maxHp, "#22c55e", true);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText(`HP ${Math.max(0, Math.round(s.player.hp))}/${s.player.maxHp}`, 16, s.arenaH - 32);
}

function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  color: string,
  rounded = false
) {
  const radius = rounded ? h / 2 : 0;
  ctx.fillStyle = "#1e293b";
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, Math.max(0, Math.min(1, pct)) * w, h, radius);
  ctx.fill();
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, w, h, radius);
  ctx.stroke();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
