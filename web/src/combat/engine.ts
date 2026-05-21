import type { EnemyDef, MoveDef } from "@dungeons/shared";

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  travelled: number;
  fromPlayer: boolean;
  alive: boolean;
}

export interface FightState {
  arenaW: number;
  arenaH: number;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    radius: number;
    speed: number;
    lastAttackAt: number;
    aimX: number;
    aimY: number;
  };
  enemy: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    radius: number;
    speed: number;
    damage: number;
    attackRange: number;
    attackCooldown: number;
    lastAttackAt: number;
    ai: EnemyDef["ai"];
    color: string;
  };
  weaponMove: MoveDef | null;
  projectiles: Projectile[];
  status: "active" | "win" | "lose";
  startedAt: number;
  endedAt: number | null;
  elapsedMs: number;
  inputs: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    fire: boolean;
  };
}

export interface FightInit {
  arenaW: number;
  arenaH: number;
  playerMaxHp: number;
  playerSpeed: number;
  weaponMove: MoveDef | null;
  enemy: EnemyDef;
}

const PLAYER_BASE_SPEED = 220;
const PLAYER_RADIUS = 16;

export function createFight(init: FightInit, now: number): FightState {
  return {
    arenaW: init.arenaW,
    arenaH: init.arenaH,
    player: {
      x: init.arenaW * 0.25,
      y: init.arenaH / 2,
      hp: init.playerMaxHp,
      maxHp: init.playerMaxHp,
      radius: PLAYER_RADIUS,
      speed: PLAYER_BASE_SPEED * init.playerSpeed,
      lastAttackAt: -9999,
      aimX: init.arenaW * 0.6,
      aimY: init.arenaH / 2,
    },
    enemy: {
      x: init.arenaW * 0.78,
      y: init.arenaH / 2,
      hp: init.enemy.hp,
      maxHp: init.enemy.hp,
      radius: init.enemy.radius,
      speed: init.enemy.speed,
      damage: init.enemy.damage,
      attackRange: init.enemy.attackRange,
      attackCooldown: init.enemy.attackCooldownMs,
      lastAttackAt: -9999,
      ai: init.enemy.ai,
      color: init.enemy.color,
    },
    weaponMove: init.weaponMove,
    projectiles: [],
    status: "active",
    startedAt: now,
    endedAt: null,
    elapsedMs: 0,
    inputs: { up: false, down: false, left: false, right: false, fire: false },
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}

export function step(state: FightState, dt: number, now: number): FightState {
  if (state.status !== "active") return state;
  state.elapsedMs = now - state.startedAt;

  // Player movement
  let vx = 0,
    vy = 0;
  if (state.inputs.up) vy -= 1;
  if (state.inputs.down) vy += 1;
  if (state.inputs.left) vx -= 1;
  if (state.inputs.right) vx += 1;
  if (vx !== 0 || vy !== 0) {
    const m = Math.hypot(vx, vy);
    vx /= m;
    vy /= m;
    state.player.x = clamp(
      state.player.x + vx * state.player.speed * dt,
      state.player.radius,
      state.arenaW - state.player.radius
    );
    state.player.y = clamp(
      state.player.y + vy * state.player.speed * dt,
      state.player.radius,
      state.arenaH - state.player.radius
    );
  }

  // Player attack
  if (state.inputs.fire && state.weaponMove) {
    const since = now - state.player.lastAttackAt;
    if (since >= state.weaponMove.cooldownMs) {
      state.player.lastAttackAt = now;
      const dx = state.player.aimX - state.player.x;
      const dy = state.player.aimY - state.player.y;
      const m = Math.hypot(dx, dy) || 1;
      const ux = dx / m,
        uy = dy / m;
      if (state.weaponMove.projectileSpeed > 0) {
        state.projectiles.push({
          x: state.player.x + ux * state.player.radius,
          y: state.player.y + uy * state.player.radius,
          vx: ux * state.weaponMove.projectileSpeed,
          vy: uy * state.weaponMove.projectileSpeed,
          damage: state.weaponMove.baseDamage,
          range: state.weaponMove.range,
          travelled: 0,
          fromPlayer: true,
          alive: true,
        });
      } else {
        // Melee — instant hit if in range
        if (dist(state.player.x, state.player.y, state.enemy.x, state.enemy.y) <=
            state.weaponMove.range + state.enemy.radius) {
          state.enemy.hp -= state.weaponMove.baseDamage;
        }
      }
    }
  }

  // Enemy AI
  const dE = dist(state.player.x, state.player.y, state.enemy.x, state.enemy.y);
  const dxE = state.player.x - state.enemy.x;
  const dyE = state.player.y - state.enemy.y;
  const uxE = dxE / (dE || 1);
  const uyE = dyE / (dE || 1);
  const enemySpeedDt = state.enemy.speed * dt;

  switch (state.enemy.ai) {
    case "chaser": {
      if (dE > state.enemy.attackRange * 0.6) {
        state.enemy.x += uxE * enemySpeedDt;
        state.enemy.y += uyE * enemySpeedDt;
      }
      break;
    }
    case "charger": {
      const factor = dE > 80 ? 1.2 : 0.8;
      state.enemy.x += uxE * enemySpeedDt * factor;
      state.enemy.y += uyE * enemySpeedDt * factor;
      break;
    }
    case "kiter": {
      const desired = 200;
      const diff = dE - desired;
      const move = Math.sign(diff) * enemySpeedDt;
      state.enemy.x += uxE * move;
      state.enemy.y += uyE * move;
      break;
    }
    case "summoner": {
      const desired = 220;
      const diff = dE - desired;
      const move = Math.sign(diff) * enemySpeedDt * 0.7;
      state.enemy.x += uxE * move;
      state.enemy.y += uyE * move;
      break;
    }
  }
  state.enemy.x = clamp(state.enemy.x, state.enemy.radius, state.arenaW - state.enemy.radius);
  state.enemy.y = clamp(state.enemy.y, state.enemy.radius, state.arenaH - state.enemy.radius);

  // Enemy attack
  const since = now - state.enemy.lastAttackAt;
  if (since >= state.enemy.attackCooldown && dE <= state.enemy.attackRange) {
    state.enemy.lastAttackAt = now;
    if (state.enemy.attackRange > 80) {
      // Ranged
      state.projectiles.push({
        x: state.enemy.x,
        y: state.enemy.y,
        vx: uxE * 360,
        vy: uyE * 360,
        damage: state.enemy.damage,
        range: state.enemy.attackRange + 80,
        travelled: 0,
        fromPlayer: false,
        alive: true,
      });
    } else {
      // Melee bite
      state.player.hp -= state.enemy.damage;
    }
  }

  // Projectile step
  for (const p of state.projectiles) {
    if (!p.alive) continue;
    const stepDx = p.vx * dt;
    const stepDy = p.vy * dt;
    p.x += stepDx;
    p.y += stepDy;
    p.travelled += Math.hypot(stepDx, stepDy);
    if (p.travelled > p.range || p.x < 0 || p.x > state.arenaW || p.y < 0 || p.y > state.arenaH) {
      p.alive = false;
      continue;
    }
    if (p.fromPlayer) {
      if (dist(p.x, p.y, state.enemy.x, state.enemy.y) <= state.enemy.radius) {
        state.enemy.hp -= p.damage;
        p.alive = false;
      }
    } else {
      if (dist(p.x, p.y, state.player.x, state.player.y) <= state.player.radius) {
        state.player.hp -= p.damage;
        p.alive = false;
      }
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.alive);

  // End condition
  if (state.enemy.hp <= 0) {
    state.enemy.hp = 0;
    state.status = "win";
    state.endedAt = now;
  } else if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.status = "lose";
    state.endedAt = now;
  }
  return state;
}
