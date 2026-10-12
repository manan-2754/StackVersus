/**
 * Per-tab motion graphics on comparison pages. Each tab gets its own interactive scene:
 * - Overview:  "duel" — two tool orbs joined by an energy beam; the cursor shifts the balance, clicks fire pulses.
 * - Specs:     "balance" — a scale that tips toward the side you point at or the spec card you hover.
 * - FAQ:       "question field" — floating question marks that lean toward the cursor and light up when opened.
 * - Community: "network" — a canvas of reader nodes that connect to the cursor; clicks spawn new readers.
 */
import { animate, stagger } from 'motion';

type Stage = { enter: () => void; leave?: () => void };

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SPRING = { type: 'spring', stiffness: 180, damping: 18 } as const;
const SOFT = { type: 'spring', stiffness: 90, damping: 16 } as const;

function clearTransform(el: Element) {
  (el as HTMLElement).style.removeProperty('transform');
}

function localPoint(e: PointerEvent | MouseEvent, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
}

function ripple(stage: HTMLElement, x: number, y: number, color?: string) {
  const ring = document.createElement('span');
  ring.className = 'stage-ripple';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  if (color) ring.style.borderColor = color;
  stage.appendChild(ring);
  animate(ring, { scale: [0.4, 6], opacity: [0.9, 0] }, { duration: 0.8, ease: EASE }).then(() => ring.remove());
}

/* ---------------- Overview: duel ---------------- */

function createDuel(stage: HTMLElement): Stage {
  const svg = stage.querySelector<SVGSVGElement>('.duel-svg')!;
  const beam = stage.querySelector<SVGPathElement>('.duel-beam')!;
  const glow = stage.querySelector<SVGPathElement>('.duel-beam-glow')!;
  const shapeA = stage.querySelector<HTMLElement>('.shape-a')!;
  const shapeB = stage.querySelector<HTMLElement>('.shape-b')!;
  const spark = stage.querySelector<HTMLElement>('.duel-spark')!;

  let bend = 0;
  let balance = 0.5;

  const geometry = () => {
    const s = stage.getBoundingClientRect();
    const a = shapeA.getBoundingClientRect();
    const b = shapeB.getBoundingClientRect();
    return {
      w: s.width,
      h: s.height,
      ax: a.left - s.left + a.width / 2,
      bx: b.left - s.left + b.width / 2,
      y: a.top - s.top + a.height / 2,
    };
  };

  const draw = () => {
    const g = geometry();
    svg.setAttribute('viewBox', `0 0 ${g.w} ${g.h}`);
    const cx = (g.ax + g.bx) / 2;
    const cy = g.y + bend;
    const d = `M ${g.ax} ${g.y} Q ${cx} ${cy} ${g.bx} ${g.y}`;
    beam.setAttribute('d', d);
    glow.setAttribute('d', d);
    // Point on the quadratic curve at t = balance.
    const t = balance;
    const px = (1 - t) ** 2 * g.ax + 2 * (1 - t) * t * cx + t ** 2 * g.bx;
    const py = (1 - t) ** 2 * g.y + 2 * (1 - t) * t * cy + t ** 2 * g.y;
    return { px, py };
  };

  const moveSpark = (opts = SOFT) => {
    const { px, py } = draw();
    animate(spark, { x: px, y: py }, opts);
    animate(shapeA, { scale: 1 + (0.5 - balance) * 0.25 }, SPRING);
    animate(shapeB, { scale: 1 + (balance - 0.5) * 0.25 }, SPRING);
  };

  const rotateShape = (el: HTMLElement, px: number, py: number, flip = 1) => {
    const rx = (py - 0.5) * 40 * flip;
    const ry = (px - 0.5) * 50 * flip;
    const isA = el.classList.contains('shape-a');
    const scale = 1 + (isA ? 0.5 - balance : balance - 0.5) * 0.25;
    animate(el, { rotateX: rx, rotateY: ry, rotateZ: ry * 0.15, scale }, { ...SPRING, duration: 0.35 } as any);
  };

  stage.addEventListener('pointermove', (e) => {
    const p = localPoint(e, stage);
    balance = Math.min(0.92, Math.max(0.08, p.x / p.w));
    bend = (p.y - p.h / 2) * 1.1;
    moveSpark();
    rotateShape(shapeA, 1 - p.x / p.w, p.y / p.h, 1);
    rotateShape(shapeB, p.x / p.w, p.y / p.h, -1);
  });

  stage.addEventListener('pointerleave', () => {
    balance = 0.5;
    bend = 0;
    moveSpark({ type: 'spring', stiffness: 60, damping: 12 } as any);
  });

  stage.addEventListener('click', (e) => {
    const p = localPoint(e, stage);
    ripple(stage, p.x, p.y);
    const target = p.x < p.w / 2 ? shapeA : shapeB;
    balance = target === shapeA ? 0.08 : 0.92;
    moveSpark({ type: 'spring', stiffness: 320, damping: 14 } as any);
    animate(target, { scale: [1.35, 0.9, 1.15] }, { duration: 0.6, ease: EASE });
    const r = target.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    window.setTimeout(() => ripple(stage, r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, '#6a4bcd'), 180);
  });

  new ResizeObserver(() => moveSpark({ duration: 0 } as any)).observe(stage);

  return {
    enter() {
      bend = 0;
      balance = 0.5;
      const { px, py } = draw();
      animate(shapeA, { x: [-120, 0], opacity: [0, 1], scale: [0.6, 1], rotateY: [-60, 0] }, SPRING);
      animate(shapeB, { x: [120, 0], opacity: [0, 1], scale: [0.6, 1], rotateY: [60, 0] }, SPRING);
      animate(spark, { x: px, y: py, scale: [0, 1.6, 1], opacity: [0, 1] }, { duration: 0.9, delay: 0.35, ease: EASE });
      const length = beam.getTotalLength?.() || 600;
      animate(glow, { strokeDasharray: [`0 ${length}`, `${length} 0`] } as any, { duration: 0.9, ease: EASE });
    },
  };
}

/* ---------------- Specs: balance ---------------- */

function createBalance(stage: HTMLElement): Stage {
  const rig = stage.querySelector<HTMLElement>('.balance-rig')!;
  const panel = stage.closest('.tab-panel')!;

  const counts = () => {
    const cards = panel.querySelectorAll('.matrix-card');
    const count = (card: Element | undefined, kind: string) =>
      card ? card.querySelectorAll(`.matrix-list.${kind} li`).length : 0;
    return {
      'a-pros': count(cards[0], 'pros'),
      'b-pros': count(cards[1], 'pros'),
      'a-cons': count(cards[0], 'cons'),
      'b-cons': count(cards[1], 'cons'),
    } as Record<string, number>;
  };

  const restingTilt = () => {
    const c = counts();
    const scoreA = c['a-pros'] - c['a-cons'];
    const scoreB = c['b-pros'] - c['b-cons'];
    return Math.max(-10, Math.min(10, (scoreB - scoreA) * 4));
  };

  const panScale = (shape: HTMLElement) => (shape.closest('.pan-dish') ? 0.72 : 1);

  const tilt = (deg: number, opts: object = SPRING) => {
    animate(rig, { '--tilt': `${deg}deg` } as any, opts);
    animate(rig, { rotateY: deg * 0.6, rotateX: Math.abs(deg) * 0.25 } as any, { ...opts, duration: 0.45 } as any);
  };

  stage.addEventListener('pointermove', (e) => {
    const p = localPoint(e, rig);
    if (p.x < 0 || p.x > p.w) return;
    const deg = (p.x / p.w - 0.5) * 36;
    tilt(deg);
    const shapes = rig.querySelectorAll<HTMLElement>('.shape');
    shapes.forEach((shape, i) => {
      const flip = i === 0 ? 1 : -1;
      animate(shape, { rotateY: deg * flip * 1.2, rotateX: (p.y / p.h - 0.5) * -30, scale: panScale(shape) }, {
        ...SPRING,
        duration: 0.4,
      } as any);
    });
  });
  stage.addEventListener('pointerleave', () => {
    tilt(restingTilt(), { type: 'spring', stiffness: 70, damping: 8 });
    rig
      .querySelectorAll<HTMLElement>('.shape')
      .forEach((shape) => animate(shape, { rotateY: 0, rotateX: 0, scale: panScale(shape) }, SPRING));
  });
  stage.addEventListener('click', (e) => {
    const p = localPoint(e, stage);
    ripple(stage, p.x, p.y);
    const pan = stage.querySelector(p.x < rig.getBoundingClientRect().width / 2 + 22 ? '.pan-a' : '.pan-b');
    if (pan)
      animate(
        pan.querySelector('.pan-dish')!,
        { y: [0, 14, 0], rotateZ: [0, 8, -8, 0] },
        { duration: 0.6, ease: EASE }
      );
  });

  panel.addEventListener('pointerover', (e) => {
    const card = (e.target as Element).closest('.matrix-card');
    if (!card) return;
    const index = Array.from(panel.querySelectorAll('.matrix-card')).indexOf(card);
    tilt(index === 0 ? -16 : 16);
  });
  panel.addEventListener('pointerout', (e) => {
    const to = (e as PointerEvent).relatedTarget as Element | null;
    if ((e.target as Element).closest('.matrix-card') && !to?.closest('.matrix-card')) tilt(restingTilt());
  });

  return {
    enter() {
      const c = counts();
      const max = Math.max(1, ...Object.values(c));
      stage.querySelectorAll<HTMLElement>('.meter').forEach((meter, i) => {
        const key = meter.dataset.meter!;
        const fill = meter.querySelector<HTMLElement>('.meter-fill')!;
        const value = meter.querySelector<HTMLElement>('.meter-value')!;
        animate(fill, { width: ['0%', `${(c[key] / max) * 100}%`] }, { duration: 1, delay: 0.2 + i * 0.1, ease: EASE });
        animate(0, c[key], {
          duration: 1,
          delay: 0.2 + i * 0.1,
          onUpdate: (v) => (value.textContent = String(Math.round(v))),
        });
      });
      animate(rig, { '--tilt': ['-18deg', `${restingTilt()}deg`] } as any, {
        type: 'spring',
        stiffness: 60,
        damping: 6,
        delay: 0.25,
      });
      const cards = panel.querySelectorAll('.matrix-card, .pricing-card');
      animate(
        cards,
        {
          opacity: [0, 1],
          transform: [
            'perspective(900px) rotateX(55deg) translateY(30px)',
            'perspective(900px) rotateX(0deg) translateY(0px)',
          ],
        },
        { duration: 0.8, delay: stagger(0.12, { startDelay: 0.15 }), ease: EASE }
      ).then(() => cards.forEach(clearTransform));
    },
  };
}

/* ---------------- FAQ: question field ---------------- */

function createQuestions(stage: HTMLElement): Stage {
  const glyphs = Array.from(stage.querySelectorAll<HTMLElement>('.q-glyph'));
  const panel = stage.closest('.tab-panel')!;

  stage.addEventListener('pointermove', (e) => {
    const p = localPoint(e, stage);
    glyphs.forEach((g) => {
      const r = g.getBoundingClientRect();
      const stageR = stage.getBoundingClientRect();
      const cx = r.left - stageR.left + r.width / 2;
      const cy = r.top - stageR.top + r.height / 2;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.hypot(dx, dy);
      const leanY = Math.max(-40, Math.min(40, (dx / 6) * Math.max(0.2, 1 - dist / 500)));
      const leanX = Math.max(-25, Math.min(25, (dy / 8) * Math.max(0.2, 1 - dist / 500)));
      const depth = (parseFloat(g.style.getPropertyValue('--i') || '0') % 5) - 2;
      animate(
        g,
        {
          rotateY: leanY,
          rotateX: -leanX,
          translateZ: depth * 18,
          scale: 1 + Math.max(0, 1 - dist / 180) * 0.6,
        },
        SPRING
      );
    });
  });
  stage.addEventListener('pointerleave', () =>
    animate(glyphs, { rotateY: 0, rotateX: 0, translateZ: 0, scale: 1 }, SOFT)
  );
  stage.addEventListener('click', (e) => {
    const p = localPoint(e, stage);
    ripple(stage, p.x, p.y);
    animate(glyphs, { y: [0, -26, 0] }, { duration: 0.6, delay: stagger(0.04, { from: 'center' }), ease: EASE });
  });

  panel.querySelectorAll<HTMLDetailsElement>('.faq-item').forEach((item, i) => {
    item.addEventListener('toggle', () => {
      const glyph = glyphs[i % glyphs.length];
      glyph.classList.toggle('lit', item.open);
      if (!item.open) return;
      animate(glyph, { scale: [1, 1.9, 1.25], rotateY: [0, 360], rotateX: [0, 180] }, { duration: 0.8, ease: EASE });
      const answer = item.querySelector('p');
      if (answer)
        animate(answer, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.4, ease: EASE }).then(() =>
          clearTransform(answer)
        );
    });
  });

  return {
    enter() {
      animate(
        glyphs,
        { opacity: [0, 0.45], y: [40, 0], rotate: [-60, 0] },
        { duration: 0.7, delay: stagger(0.05), ease: EASE }
      );
      const items = panel.querySelectorAll('.faq-item');
      animate(
        items,
        { opacity: [0, 1], x: [-30, 0] },
        { duration: 0.5, delay: stagger(0.07, { startDelay: 0.2 }), ease: EASE }
      ).then(() => items.forEach(clearTransform));
    },
  };
}

/* ---------------- Community: network ---------------- */

function createNetwork(stage: HTMLElement): Stage {
  const canvas = stage.querySelector<HTMLCanvasElement>('.network-canvas')!;
  const ctx = canvas.getContext('2d')!;
  const panel = stage.closest('.tab-panel')!;
  type Node = { x: number; y: number; z: number; vz: number; vx: number; vy: number; r: number; hue: number };
  const nodes: Node[] = [];
  const pointer = { x: -999, y: -999, active: false };
  let w = 0;
  let h = 0;
  let running = false;

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = stage.getBoundingClientRect();
    w = r.width;
    h = r.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const spawn = (x = Math.random() * w, y = Math.random() * h, burst = false) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = burst ? 1.5 + Math.random() * 2 : 0.15 + Math.random() * 0.35;
    nodes.push({
      x,
      y,
      z: (Math.random() - 0.5) * 80,
      vz: (Math.random() - 0.5) * 0.6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.6 + Math.random() * 2.4,
      hue: Math.random(),
    });
    if (nodes.length > 110) nodes.shift();
  };

  const color = (n: Node, alpha: number) =>
    n.hue < 0.5 ? `rgba(106, 75, 205, ${alpha})` : `rgba(214, 107, 178, ${alpha})`;

  const tick = () => {
    if (!running || !canvas.isConnected) {
      running = false;
      return;
    }
    ctx.clearRect(0, 0, w, h);
    for (const n of nodes) {
      if (pointer.active) {
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const dz = -n.z * 0.02;
        const d = Math.hypot(dx, dy);
        if (d < 150 && d > 1) {
          n.vx += (dx / d) * 0.03;
          n.vy += (dy / d) * 0.03;
          n.vz += dz;
        }
      }
      n.vx *= 0.985;
      n.vy *= 0.985;
      n.vz *= 0.97;
      if (Math.hypot(n.vx, n.vy) < 0.12) {
        n.vx += (Math.random() - 0.5) * 0.05;
        n.vy += (Math.random() - 0.5) * 0.05;
      }
      n.x += n.vx;
      n.y += n.vy;
      n.z += n.vz;
      n.z = Math.max(-60, Math.min(60, n.z));
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      n.x = Math.max(0, Math.min(w, n.x));
      n.y = Math.max(0, Math.min(h, n.y));
    }
    // Draw connections first so dots sit on top.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const depthFade = 1 - Math.abs(a.z - b.z) / 120;
        if (d < 90 && depthFade > 0) {
          ctx.strokeStyle = color(a, (1 - d / 90) * 0.35 * depthFade);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      const n = nodes[i];
      if (pointer.active) {
        const d = Math.hypot(pointer.x - n.x, pointer.y - n.y);
        if (d < 150) {
          ctx.strokeStyle = color(n, (1 - d / 150) * 0.7);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
    }
    // Draw nodes sorted back-to-front for pseudo-3D.
    const sorted = [...nodes].sort((a, b) => a.z - b.z);
    for (const n of sorted) {
      const scale = 0.7 + ((n.z + 60) / 120) * 0.7;
      ctx.fillStyle = color(n, 0.6 + ((n.z + 60) / 120) * 0.35);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    if (pointer.active) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = 'rgba(106, 75, 205, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    requestAnimationFrame(tick);
  };

  const start = () => {
    if (running || document.hidden) return;
    running = true;
    requestAnimationFrame(tick);
  };

  stage.addEventListener('pointermove', (e) => {
    const p = localPoint(e, stage);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
  });
  stage.addEventListener('pointerleave', () => (pointer.active = false));
  stage.addEventListener('click', (e) => {
    const p = localPoint(e, stage);
    for (let i = 0; i < 8; i++) spawn(p.x, p.y, true);
    ripple(stage, p.x, p.y);
  });
  document.addEventListener('visibilitychange', () =>
    document.hidden ? (running = false) : panel.classList.contains('active') && start()
  );
  new ResizeObserver(resize).observe(stage);

  return {
    enter() {
      resize();
      if (!nodes.length) for (let i = 0; i < 46; i++) spawn();
      start();
      const shareButtons = panel.querySelectorAll('.share-btn');
      animate(
        shareButtons,
        { opacity: [0, 1], scale: [0.5, 1] },
        { ...SPRING, delay: stagger(0.08, { startDelay: 0.15 }) }
      ).then(() => shareButtons.forEach(clearTransform));
      const related = panel.querySelectorAll('.related-card');
      animate(
        related,
        { opacity: [0, 1], x: [40, 0] },
        { duration: 0.5, delay: stagger(0.08, { startDelay: 0.2 }), ease: EASE }
      ).then(() => related.forEach(clearTransform));
      const comments = panel.querySelectorAll('.comment-form, .comment');
      animate(
        comments,
        { opacity: [0, 1], y: [24, 0] },
        { duration: 0.5, delay: stagger(0.06, { startDelay: 0.3 }), ease: EASE }
      ).then(() => comments.forEach(clearTransform));
    },
    leave() {
      running = false;
    },
  };
}

/* ---------------- Wiring ---------------- */

const FACTORIES: Record<string, (stage: HTMLElement) => Stage> = {
  overview: createDuel,
  specs: createBalance,
  faq: createQuestions,
  community: createNetwork,
};

let voteListener = false;

export function setupTabStages() {
  const stageEls = document.querySelectorAll<HTMLElement>('.tab-stage[data-stage]');
  if (!stageEls.length) return;

  const stages = new Map<string, Stage>();
  let current = '';

  const enter = (key: string) => {
    if (key === current) return;
    if (current) stages.get(current)?.leave?.();
    current = key;
    const el = document.querySelector<HTMLElement>(`.tab-stage[data-stage="${key}"]`);
    if (!el) return;
    if (!stages.has(key)) stages.set(key, FACTORIES[key](el));
    // Wait a frame so the panel is displayed and has measurable geometry.
    requestAnimationFrame(() => {
      animate(el, { opacity: [0, 1], scale: [0.97, 1] }, { duration: 0.5, ease: EASE }).then(() => clearTransform(el));
      stages.get(key)!.enter();
    });
  };

  document.querySelectorAll<HTMLButtonElement>('.tab[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => enter(btn.dataset.tab!));
  });

  const active = document.querySelector<HTMLElement>('.tab.active[data-tab]');
  enter(active?.dataset.tab || 'overview');

  if (!voteListener) {
    voteListener = true;
    // Comments re-render on vote, so find the fresh node by id and pop its score.
    document.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest?.('.vote-btn');
      if (!btn) return;
      const id = btn.closest('.comment')?.getAttribute('data-id');
      const dir = btn.getAttribute('data-dir');
      requestAnimationFrame(() => {
        const score = document.querySelector(`.comment[data-id="${id}"] .vote-score`);
        if (score)
          animate(score, { scale: [1, 1.8, 1], y: [0, dir === '1' ? -6 : 6, 0] }, { duration: 0.45, ease: EASE });
      });
    });
  }
}
