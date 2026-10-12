import { animate, inView, scroll, stagger } from 'motion';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SPRING = { type: 'spring', stiffness: 260, damping: 22 } as const;

const REVEAL_SELECTOR = [
  '.card',
  '.bento-card',
  '.latest-card',
  '.feed-item',
  '.panel',
  '.comparison-hero',
  '.editorial-workspace',
  '.newsletter',
  '.section-title',
  '.compare-card',
  '.faq-item',
  '.related-card',
  '.hero-stats',
  '.tabs',
  '[data-reveal]',
].join(',');

/* ---------- Global, once-per-session effects ---------- */

function setupScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  scroll(animate(bar, { scaleX: [0, 1] }, { ease: 'linear' }));
}

function setupCursorGlow() {
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);

  let frame = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        animate(
          glow,
          { x: e.clientX - 260, y: e.clientY - 260, opacity: 1 },
          { type: 'spring', stiffness: 90, damping: 20 }
        );
      });
    },
    { passive: true }
  );
  document.addEventListener('mouseleave', () => animate(glow, { opacity: 0 }, { duration: 0.4 }));
}

function setupMagnetic() {
  const selector = '.stack-cta, .cmd-trigger, .tool-pill, .official-link, .back-btn, .tab';
  let active: HTMLElement | null = null;

  const release = (el: HTMLElement) => animate(el, { '--mag-x': '0px', '--mag-y': '0px' } as any, SPRING);

  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>(selector) : null;
      if (active && active !== el) release(active);
      active = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.3;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
      animate(el, { '--mag-x': `${dx.toFixed(1)}px`, '--mag-y': `${dy.toFixed(1)}px` } as any, SPRING);
    },
    { passive: true }
  );
}

/* ---------- Per-page effects (re-run after each client-side navigation) ---------- */

function setupReveal() {
  const viewportBottom = window.innerHeight;
  const targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(
    (el) => !el.closest('.cmd-palette') && el.getBoundingClientRect().top > viewportBottom * 0.92
  );

  targets.forEach((el) => {
    el.classList.remove('motion-fade-up', 'motion-scale-in');
    el.classList.add('reveal-pending');
  });

  let batch = 0;
  let batchFrame = 0;

  inView(
    targets,
    (el) => {
      const node = el as HTMLElement;
      node.style.setProperty('--reveal-delay', `${Math.min(batch++, 8) * 70}ms`);
      if (!batchFrame) batchFrame = requestAnimationFrame(() => ((batch = 0), (batchFrame = 0)));
      node.classList.add('reveal-in');
      node.classList.remove('reveal-pending');
      window.setTimeout(() => {
        node.classList.remove('reveal-in');
        node.style.removeProperty('--reveal-delay');
      }, 1400);
    },
    { margin: '0px 0px -8% 0px' }
  );
}

function setupHeroHeadline() {
  const lines = document.querySelectorAll<HTMLElement>('[data-hero-line]');
  if (!lines.length) return;
  animate(
    lines,
    { opacity: [0, 1], y: [36, 0], filter: ['blur(10px)', 'blur(0px)'] },
    { duration: 0.9, delay: stagger(0.14, { startDelay: 0.1 }), ease: EASE }
  );
}

function setupCounters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    el.textContent = '0';
    inView(el, () => {
      animate(0, target, {
        duration: 1.6,
        ease: EASE,
        onUpdate: (v) => (el.textContent = Math.round(v).toLocaleString()),
      });
    });
  });
}

function setupOrbit() {
  const orbit = document.querySelector<HTMLElement>('.hero-orbit');
  if (!orbit) return;
  animate(orbit.querySelector('.orbit-core')!, { scale: [0.4, 1], opacity: [0, 1] }, { ...SPRING, delay: 0.25 });
  animate(
    orbit.querySelectorAll('.orbit-chip'),
    { opacity: [0, 1], scale: [0.6, 1] },
    { duration: 0.6, delay: stagger(0.06, { startDelay: 0.45 }), ease: EASE }
  );
  animate(orbit.querySelectorAll('.orbit-ring-line'), { opacity: [0, 1] }, { duration: 1.2, delay: stagger(0.15) });
}

function clearTransform(el: Element) {
  (el as HTMLElement).style.removeProperty('transform');
}

function setupVersusHeader() {
  const a = document.querySelector('.hero-tools .tool-pill.primary');
  const b = document.querySelector('.hero-tools .tool-pill.accent');
  const vs = document.querySelector('.hero-tools .vs-badge');
  if (!a || !b || !vs) return;
  animate(a, { x: [-60, 0], opacity: [0, 1] }, SPRING).then(() => clearTransform(a));
  animate(b, { x: [60, 0], opacity: [0, 1] }, SPRING).then(() => clearTransform(b));
  animate(vs, { scale: [0, 1.25, 1], rotate: [-90, 0] }, { duration: 0.8, delay: 0.2, ease: EASE });
}

function setupTabPanels() {
  document.querySelectorAll<HTMLButtonElement>('.tab[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = document.querySelector<HTMLElement>(`[data-panel="${btn.dataset.tab}"]`);
      if (!panel) return;
      animate(panel, { opacity: [0, 1], y: [14, 0] }, { duration: 0.45, ease: EASE }).then(() => clearTransform(panel));
    });
  });
}

function setupScoreBars() {
  document.querySelectorAll<HTMLElement>('.feed-score').forEach((el) => {
    const target = el.style.getPropertyValue('--score') || '50%';
    el.style.setProperty('--score', '0%');
    inView(el, () => {
      animate(el, { '--score': ['0%', target] } as any, { duration: 1.2, ease: EASE });
    });
  });
}

/* ---------- Boot ---------- */

let globalsReady = false;

function init() {
  if (reduceMotion.matches) {
    document.documentElement.classList.remove('motion-ready');
    return;
  }
  document.documentElement.classList.add('motion-ready');

  if (!globalsReady) {
    globalsReady = true;
    setupScrollProgress();
    if (finePointer.matches) {
      setupCursorGlow();
      setupMagnetic();
    }
  }

  setupReveal();
  setupHeroHeadline();
  setupCounters();
  setupOrbit();
  setupVersusHeader();
  setupTabPanels();
  setupScoreBars();
}

document.addEventListener('astro:page-load', init);
