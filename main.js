/**
 * NOCTIS — High-Performance Scrollytelling Engine
 * Vanilla JavaScript Scrollytelling, Priority Frame Loading, Canvas Scrubbing,
 * Layout-Thrash-Free Rendering, Custom Headlight Cursor, Dynamic HUD, and Lineup Accordion.
 */

(function () {
  'use strict';

  // System & Viewport State
  const state = {
    isMobile: window.innerWidth < 768,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,

    // Canvas render geometries (cached on resize to eliminate getBoundingClientRect reflows)
    heroCanvasWidth: 0,
    heroCanvasHeight: 0,
    dismantleCanvasWidth: 0,
    dismantleCanvasHeight: 0,
    dismantleDrawRect: { dx: 0, dy: 0, dw: 0, dh: 0 },

    // Frame caches & loaded indices
    heroImages: new Array(CONFIG.frames.hero.count),
    heroLoadedSet: new Set(),
    dismantleImages: new Array(CONFIG.frames.dismantle.count),
    dismantleLoadedSet: new Set(),

    heroReady: false,
    dismantleReady: false,

    // Scrub state
    heroCurFrame: 0,
    heroTargetFrame: 0,
    dismantleCurFrame: 0,
    dismantleTargetFrame: 0,

    // Cursor
    cursor: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2
    },

    // Lineup
    lineupActiveIdx: CONFIG.lineup.defaultActiveIndex || 0,
    hoverDebounceTimer: null,
    lastScrollY: window.scrollY || 0,
    isScrolledRecently: true
  };

  function getFramePath(type, index) {
    const isMobile = window.innerWidth < 768;
    const cfg = CONFIG.frames[type];
    const pathTemplate = isMobile ? cfg.mobilePath : cfg.desktopPath;
    const padded = String(index).padStart(cfg.padLength, '0');
    return pathTemplate.replace('{index}', padded);
  }

  /* ==========================================================================
     1. HIGH-THROUGHPUT PRIORITY FRAME LOADER
     ========================================================================== */
  class PriorityFrameQueue {
    constructor(concurrency = 6) {
      this.concurrency = concurrency;
      this.running = 0;
      this.queue = [];
      this.requested = new Set();
    }

    enqueue(type, index, priority) {
      const key = `${type}-${index}`;
      if (this.requested.has(key)) return;
      this.requested.add(key);
      this.queue.push({ type, index, priority });
      this.process();
    }

    recalibratePriorities(heroTarget, dismantleTarget) {
      // Re-sort pending queue based on proximity to current scroll playhead
      this.queue.forEach((item) => {
        if (item.type === 'hero') {
          item.priority = Math.abs(item.index - heroTarget);
        } else {
          item.priority = Math.abs(item.index - dismantleTarget);
        }
      });
      this.queue.sort((a, b) => a.priority - b.priority);
      this.process();
    }

    process() {
      while (this.running < this.concurrency && this.queue.length > 0) {
        const item = this.queue.shift();
        this.running++;
        this.fetchFrame(item.type, item.index)
          .finally(() => {
            this.running--;
            this.process();
          });
      }
    }

    fetchFrame(type, index) {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = getFramePath(type, index);
        const idx = index - 1;

        const onDone = () => {
          if (type === 'hero') {
            state.heroImages[idx] = img;
            state.heroLoadedSet.add(idx);
          } else {
            state.dismantleImages[idx] = img;
            state.dismantleLoadedSet.add(idx);
          }
          resolve();
        };

        img.onload = () => {
          if (img.decode) {
            img.decode().then(onDone).catch(onDone);
          } else {
            onDone();
          }
        };
        img.onerror = resolve;
      });
    }
  }

  const frameQueue = new PriorityFrameQueue(6);

  /* ==========================================================================
     2. PRELOADER & INITIAL ASSET BOOTSTRAP
     ========================================================================== */
  const preloaderEl = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderCounter = document.getElementById('preloader-counter');

  function initPreloader() {
    const heroInitialCount = CONFIG.frames.hero.initialPreloadCount; // 40
    const dismantleInitialCount = 25; // Preload first 25 dismantle frames concurrently
    let loadedCount = 0;
    const totalRequired = heroInitialCount;

    // Preload all 5 lineup cars immediately in background
    CONFIG.lineup.models.forEach((m) => {
      const carImg = new Image();
      carImg.src = m.image;
    });

    // Load initial Hero frames (1..40)
    for (let i = 1; i <= heroInitialCount; i++) {
      const img = new Image();
      img.src = getFramePath('hero', i);
      const idx = i - 1;

      const onDecoded = () => {
        state.heroImages[idx] = img;
        state.heroLoadedSet.add(idx);
        loadedCount++;

        const pct = Math.min((loadedCount / totalRequired) * 100, 100);
        if (preloaderBar) {
          preloaderBar.style.transform = `translateX(-50%) scaleX(${pct / 100})`;
        }
        if (preloaderCounter) {
          preloaderCounter.textContent = String(Math.round(pct)).padStart(3, '0');
        }

        if (loadedCount >= totalRequired && !state.heroReady) {
          state.heroReady = true;
          if (preloaderBar) preloaderBar.classList.add('flash');

          setTimeout(() => {
            if (preloaderEl) preloaderEl.classList.add('preloader--hidden');
            revealInitialView();
            // Start queueing all remaining frames in background
            queueAllFrames(heroInitialCount + 1, dismantleInitialCount + 1);
          }, 120);
        }
      };

      img.onload = () => {
        if (img.decode) {
          img.decode().then(onDecoded).catch(onDecoded);
        } else {
          onDecoded();
        }
      };
      img.onerror = onDecoded;
    }

    // Preload initial Dismantle frames (1..25) concurrently
    for (let j = 1; j <= dismantleInitialCount; j++) {
      const dImg = new Image();
      dImg.src = getFramePath('dismantle', j);
      const dIdx = j - 1;
      const onDismantleDecoded = () => {
        state.dismantleImages[dIdx] = dImg;
        state.dismantleLoadedSet.add(dIdx);
        if (!state.dismantleReady) {
          state.dismantleReady = true;
          drawDismantleFrame(0);
        }
      };
      dImg.onload = () => {
        if (dImg.decode) {
          dImg.decode().then(onDismantleDecoded).catch(onDismantleDecoded);
        } else {
          onDismantleDecoded();
        }
      };
      dImg.onerror = onDismantleDecoded;
    }
  }

  function queueAllFrames(heroStart, dismantleStart) {
    const totalHero = CONFIG.frames.hero.count;
    const totalDismantle = CONFIG.frames.dismantle.count;

    // Enqueue Hero remaining frames
    for (let i = heroStart; i <= totalHero; i++) {
      frameQueue.enqueue('hero', i, i);
    }
    // Enqueue Dismantle remaining frames
    for (let j = dismantleStart; j <= totalDismantle; j++) {
      frameQueue.enqueue('dismantle', j, j);
    }
  }

  function revealInitialView() {
    const hero1 = document.getElementById('hero-ch-1');
    if (hero1) {
      hero1.querySelectorAll('.line-inner').forEach((el, idx) => {
        setTimeout(() => el.classList.add('is-revealed'), idx * 80);
      });
    }
    drawHeroFrame(0);
    drawDismantleFrame(0);
  }

  /* ==========================================================================
     3. FILM GRAIN OVERLAY (High-efficiency 8 FPS offscreen noise)
     ========================================================================== */
  const grainCanvas = document.getElementById('grain-canvas');
  let grainCtx = grainCanvas ? grainCanvas.getContext('2d') : null;
  let noisePattern = null;

  function initFilmGrain() {
    if (!grainCanvas || !grainCtx || state.reducedMotion) return;

    const tileSize = 256;
    const off = document.createElement('canvas');
    off.width = tileSize;
    off.height = tileSize;
    const oCtx = off.getContext('2d');
    const idata = oCtx.createImageData(tileSize, tileSize);
    const d = idata.data;

    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    oCtx.putImageData(idata, 0, 0);
    noisePattern = grainCtx.createPattern(off, 'repeat');

    function resizeGrain() {
      grainCanvas.width = window.innerWidth;
      grainCanvas.height = window.innerHeight;
    }
    resizeGrain();

    let lastTick = 0;
    function renderGrain(now) {
      if (now - lastTick > 125) { // 8 FPS
        lastTick = now;
        if (noisePattern) {
          grainCtx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
          grainCtx.save();
          const ox = (Math.random() * 256) | 0;
          const oy = (Math.random() * 256) | 0;
          grainCtx.translate(ox, oy);
          grainCtx.fillStyle = noisePattern;
          grainCtx.fillRect(-256, -256, grainCanvas.width + 512, grainCanvas.height + 512);
          grainCtx.restore();
        }
      }
      requestAnimationFrame(renderGrain);
    }
    requestAnimationFrame(renderGrain);
  }

  /* ==========================================================================
     4. CUSTOM CURSOR ("The Headlight")
     ========================================================================== */
  const cursorEl = document.getElementById('custom-cursor');
  const cursorLabel = document.getElementById('cursor-label');

  function initCustomCursor() {
    if (!cursorEl || state.reducedMotion) return;

    window.addEventListener('mousemove', (e) => {
      state.cursor.targetX = e.clientX;
      state.cursor.targetY = e.clientY;
    }, { passive: true });

    window.addEventListener('mousedown', () => {
      cursorEl.classList.add('cursor--flash');
      setTimeout(() => cursorEl.classList.remove('cursor--flash'), CONFIG.cursor.flashDurationMs);
    });

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-cursor], .lineup-slide, a, button');
      if (!target) return;

      if (target.classList.contains('lineup-slide')) {
        const isOpen = target.classList.contains('open');
        cursorEl.classList.add('cursor--morphed');
        if (cursorLabel) cursorLabel.textContent = isOpen ? 'CONFIGURE' : 'OPEN';
        return;
      }

      const label = target.getAttribute('data-cursor') || (target.tagName === 'A' || target.tagName === 'BUTTON' ? 'VIEW' : '');
      if (label) {
        cursorEl.classList.add('cursor--morphed');
        if (cursorLabel) cursorLabel.textContent = label;
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-cursor], .lineup-slide, a, button');
      if (target) {
        cursorEl.classList.remove('cursor--morphed');
        if (cursorLabel) cursorLabel.textContent = '';
      }
    });
  }

  /* ==========================================================================
     5. GLOBAL NAV HIDE / SHOW ON SCROLL
     ========================================================================== */
  const siteNav = document.getElementById('site-nav');

  function updateNavScroll() {
    if (!siteNav) return;
    const currentY = window.scrollY || 0;
    if (currentY > state.lastScrollY && currentY > 120) {
      siteNav.classList.add('nav--hidden');
    } else {
      siteNav.classList.remove('nav--hidden');
    }
    state.lastScrollY = currentY;
  }

  /* ==========================================================================
     6. ZERO-REFLOW CANVAS RENDERING UTILITIES
     ========================================================================== */
  function updateCanvasDimensions() {
    state.viewportWidth = window.innerWidth;
    state.viewportHeight = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.isMobile = window.innerWidth < 768;

    if (heroCanvas) {
      const hw = Math.round(state.viewportWidth * state.dpr);
      const hh = Math.round(state.viewportHeight * state.dpr);
      if (heroCanvas.width !== hw || heroCanvas.height !== hh) {
        heroCanvas.width = hw;
        heroCanvas.height = hh;
      }
      state.heroCanvasWidth = hw;
      state.heroCanvasHeight = hh;
    }

    if (dismantleCanvas) {
      const dw = Math.round(state.viewportWidth * state.dpr);
      const dh = Math.round(state.viewportHeight * state.dpr);
      if (dismantleCanvas.width !== dw || dismantleCanvas.height !== dh) {
        dismantleCanvas.width = dw;
        dismantleCanvas.height = dh;
      }
      state.dismantleCanvasWidth = dw;
      state.dismantleCanvasHeight = dh;
    }
  }

  function drawFitted(ctx, cw, ch, img) {
    if (!img || !img.naturalWidth) return { dx: 0, dy: 0, dw: 0, dh: 0 };

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const canvasAspect = cw / ch;
    const imgAspect = iw / ih;

    const isLandscape = canvasAspect >= 1.0;
    let dw, dh, dx, dy;

    if (isLandscape) {
      // Cover-fit
      if (canvasAspect > imgAspect) {
        dw = cw;
        dh = cw / imgAspect;
        dx = 0;
        dy = (ch - dh) / 2;
      } else {
        dh = ch;
        dw = ch * imgAspect;
        dx = (cw - dw) / 2;
        dy = 0;
      }
    } else {
      // Contain-fit vertically centered on --asphalt
      if (canvasAspect > imgAspect) {
        dh = ch;
        dw = ch * imgAspect;
        dx = (cw - dw) / 2;
        dy = 0;
      } else {
        dw = cw;
        dh = cw / imgAspect;
        dx = 0;
        dy = (ch - dh) / 2;
      }
    }

    ctx.fillStyle = CONFIG.tokens.asphalt;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);

    return { dx, dy, dw, dh };
  }

  function getNearestLoadedFrame(images, loadedSet, targetIdx) {
    if (loadedSet.has(targetIdx) && images[targetIdx]) {
      return images[targetIdx];
    }
    // Search radiating outwards
    for (let r = 1; r < 20; r++) {
      const prev = targetIdx - r;
      if (prev >= 0 && loadedSet.has(prev) && images[prev]) {
        return images[prev];
      }
      const next = targetIdx + r;
      if (next < images.length && loadedSet.has(next) && images[next]) {
        return images[next];
      }
    }
    // If none within 20 frames, find any first loaded frame
    for (const idx of loadedSet) {
      if (images[idx]) return images[idx];
    }
    return null;
  }

  /* ==========================================================================
     7. SECTION 1: HERO SCROLLYTELLING
     ========================================================================== */
  const heroWrapper = document.getElementById('hero');
  const heroCanvas = document.getElementById('hero-canvas');
  const heroCtx = heroCanvas ? heroCanvas.getContext('2d', { alpha: false }) : null;
  const heroProgressBar = document.getElementById('hero-progress-bar');
  const heroFadeOverlay = document.getElementById('hero-fade-overlay');

  const hudChapterVal = document.getElementById('hud-chapter-val');
  const hudSpeedVal = document.getElementById('hud-speed-val');
  const hudDistVal = document.getElementById('hud-dist-val');

  const heroChapters = [
    document.getElementById('hero-ch-1'),
    document.getElementById('hero-ch-2'),
    document.getElementById('hero-ch-3'),
    document.getElementById('hero-ch-4')
  ];

  let lastDrawnHeroFrame = -1;

  function drawHeroFrame(idx) {
    if (!heroCtx || !state.heroCanvasWidth) return;
    const img = getNearestLoadedFrame(state.heroImages, state.heroLoadedSet, idx);
    if (img) {
      drawFitted(heroCtx, state.heroCanvasWidth, state.heroCanvasHeight, img);
      lastDrawnHeroFrame = idx;
    }
  }

  function updateHeroScrolly() {
    if (!heroWrapper) return;
    const rect = heroWrapper.getBoundingClientRect();
    const maxScroll = heroWrapper.offsetHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(Math.max(-rect.top / maxScroll, 0), 1) : 0;

    const frameCount = CONFIG.frames.hero.count;
    state.heroTargetFrame = Math.round(progress * (frameCount - 1));

    if (heroProgressBar) {
      heroProgressBar.style.transform = `scaleX(${progress})`;
    }

    if (heroFadeOverlay) {
      const fadeStart = CONFIG.hero.fadeToBlackStart;
      const fadeOpacity = progress >= fadeStart ? (progress - fadeStart) / (1 - fadeStart) : 0;
      heroFadeOverlay.style.opacity = Math.min(Math.max(fadeOpacity, 0), 1);
    }

    const speed = Math.round(progress * CONFIG.hero.hud.maxSpeed);
    const dist = (progress * CONFIG.hero.hud.maxDistance).toFixed(1);
    if (hudSpeedVal) hudSpeedVal.textContent = String(speed).padStart(3, '0');
    if (hudDistVal) hudDistVal.textContent = dist;

    CONFIG.hero.chapters.forEach((ch, idx) => {
      const chEl = heroChapters[idx];
      if (!chEl) return;
      const inRange = progress >= ch.range[0] && progress <= ch.range[1];
      if (inRange) {
        if (!chEl.classList.contains('active')) {
          chEl.classList.add('active');
          chEl.querySelectorAll('.line-inner').forEach((el, lIdx) => {
            setTimeout(() => el.classList.add('is-revealed'), lIdx * 80);
          });
        }
        if (hudChapterVal) hudChapterVal.textContent = ch.hudChapter;
      } else {
        if (chEl.classList.contains('active')) {
          chEl.classList.remove('active');
          chEl.querySelectorAll('.line-inner').forEach((el) => {
            el.classList.remove('is-revealed');
          });
        }
      }
    });

    frameQueue.recalibratePriorities(state.heroTargetFrame, state.dismantleTargetFrame);
  }

  /* ==========================================================================
     8. SECTION 2: STATEMENT (Word-by-word reveal)
     ========================================================================== */
  const statementSec = document.getElementById('statement');
  const statementQuote = document.getElementById('statement-quote');
  let statementWords = [];

  function initStatementWords() {
    if (!statementQuote) return;
    const text = CONFIG.statement.text;
    const words = text.split(' ');
    statementQuote.innerHTML = '';
    statementWords = words.map((w) => {
      const span = document.createElement('span');
      span.className = 'statement-word';
      span.textContent = w;
      statementQuote.appendChild(span);
      return span;
    });
  }

  function updateStatementScroll() {
    if (!statementSec || !statementWords.length) return;
    const rect = statementSec.getBoundingClientRect();
    const vh = window.innerHeight;
    const startY = vh * 0.85;
    const endY = vh * 0.15;
    const p = Math.min(Math.max((startY - rect.top) / (startY - endY), 0), 1);

    const total = statementWords.length;
    statementWords.forEach((span, i) => {
      const wordProgress = Math.min(Math.max((p - (i / total)) / (1 / total), 0), 1);
      span.style.opacity = (0.15 + 0.85 * wordProgress).toFixed(2);
    });
  }

  /* ==========================================================================
     9. SECTION 3: DISMANTLE SCROLLYTELLING & STRUCTURAL CALLOUTS
     ========================================================================== */
  const dismantleWrapper = document.getElementById('dismantle');
  const dismantleCanvas = document.getElementById('dismantle-canvas');
  const dismantleCtx = dismantleCanvas ? dismantleCanvas.getContext('2d', { alpha: false }) : null;
  const dismantleProgressBar = document.getElementById('dismantle-progress-bar');
  const dismantleCalloutsContainer = document.getElementById('dismantle-callouts');

  let lastDrawnDismantleFrame = -1;
  let calloutInstances = [];

  function initDismantleCallouts() {
    if (!dismantleCalloutsContainer) return;
    dismantleCalloutsContainer.innerHTML = '';

    calloutInstances = CONFIG.dismantle.callouts.map((c) => {
      const wrap = document.createElement('div');
      wrap.className = 'dismantle-callout';
      wrap.id = `callout-${c.id}`;

      const dot = document.createElement('div');
      dot.className = 'callout-dot';

      const line = document.createElement('div');
      line.className = 'callout-line';

      const card = document.createElement('div');
      card.className = 'callout-card';
      card.innerHTML = `
        <span class="callout-title hud-mono">${c.title}</span>
        <span class="callout-desc">${c.desc}</span>
      `;

      wrap.appendChild(dot);
      wrap.appendChild(line);
      wrap.appendChild(card);
      dismantleCalloutsContainer.appendChild(wrap);

      return { wrap, dot, line, card, meta: c };
    });

    layoutCallouts();
  }

  function layoutCallouts() {
    if (!dismantleCalloutsContainer || !calloutInstances.length) return;
    const stageW = window.innerWidth;
    const stageH = window.innerHeight;

    // Use actual car drawn rectangle from canvas
    const { dx, dy, dw, dh } = state.dismantleDrawRect;
    const useRect = dw > 0 && dh > 0;
    const rectX = useRect ? dx / state.dpr : 0;
    const rectY = useRect ? dy / state.dpr : 0;
    const rectW = useRect ? dw / state.dpr : stageW;
    const rectH = useRect ? dh / state.dpr : stageH;

    calloutInstances.forEach(({ dot, line, card, meta }) => {
      // Dot mapped to car coordinate
      const dotX = rectX + (meta.dot.x / 100) * rectW;
      const dotY = rectY + (meta.dot.y / 100) * rectH;
      dot.style.left = `${dotX}px`;
      dot.style.top = `${dotY}px`;

      // Label card position
      const cardX = (meta.labelPos.x / 100) * stageW;
      const cardY = (meta.labelPos.y / 100) * stageH;
      card.style.left = `${cardX}px`;
      card.style.top = `${cardY}px`;

      // Draw connector line from dot to card anchor
      const deltaX = cardX - dotX;
      const deltaY = cardY - dotY;
      const length = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);

      line.style.width = `${length}px`;
      line.style.left = `${dotX}px`;
      line.style.top = `${dotY}px`;
      line.style.transform = `rotate(${angle}rad)`;
    });
  }

  function drawDismantleFrame(idx) {
    if (!dismantleCtx || !state.dismantleCanvasWidth) return;
    const img = getNearestLoadedFrame(state.dismantleImages, state.dismantleLoadedSet, idx);
    if (img) {
      state.dismantleDrawRect = drawFitted(dismantleCtx, state.dismantleCanvasWidth, state.dismantleCanvasHeight, img);
      lastDrawnDismantleFrame = idx;
    }
  }

  function updateDismantleScrolly() {
    if (!dismantleWrapper) return;
    const rect = dismantleWrapper.getBoundingClientRect();
    const maxScroll = dismantleWrapper.offsetHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(Math.max(-rect.top / maxScroll, 0), 1) : 0;

    const frameCount = CONFIG.frames.dismantle.count;
    state.dismantleTargetFrame = Math.round(progress * (frameCount - 1));

    if (dismantleProgressBar) {
      dismantleProgressBar.style.transform = `scaleX(${progress})`;
    }

    calloutInstances.forEach(({ wrap, meta }) => {
      const active = progress >= meta.fadeRange[0];
      if (active) {
        wrap.classList.add('active');
      } else {
        wrap.classList.remove('active');
      }
    });

    frameQueue.recalibratePriorities(state.heroTargetFrame, state.dismantleTargetFrame);
  }

  /* ==========================================================================
     10. SECTION 4: LINEUP ACCORDION (Dual-Layer Smooth Transitions)
     ========================================================================== */
  const lineupAccordion = document.getElementById('lineup-accordion');

  function initLineupAccordion() {
    if (!lineupAccordion) return;
    lineupAccordion.innerHTML = '';

    CONFIG.lineup.models.forEach((m, idx) => {
      const isOpen = idx === state.lineupActiveIdx;
      const slide = document.createElement('div');
      slide.className = `lineup-slide ${isOpen ? 'open' : 'closed'}`;
      slide.setAttribute('role', 'tab');
      slide.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      slide.setAttribute('tabindex', '0');
      slide.dataset.index = idx;

      const topNum = `<span class="slide-top-num hud-mono">${m.number}</span>`;
      const vertName = `<span class="slide-vertical-name hud-mono">${m.name} — ${m.number}</span>`;

      // Dual-layer image composition: thumbnail crop (closed) + full vehicle (open)
      const carWrap = `
        <div class="slide-car-wrap">
          <img src="${m.image}" alt="" class="slide-car-thumb" aria-hidden="true" loading="eager">
          <img src="${m.image}" alt="${m.alt}" class="slide-car-full" loading="eager">
        </div>
      `;

      const swatchesHtml = m.swatches.map((col, sIdx) => `
        <button type="button" class="swatch ${sIdx === 0 ? 'active' : ''}" style="background-color: ${col};" aria-label="Color option ${sIdx + 1}" data-color="${col}"></button>
      `).join('');

      const openContent = `
        <div class="slide-open-content">
          <div class="slide-top-info">
            <span class="slide-top-num hud-mono">${m.number}</span>
            <div class="line-mask">
              <h3 class="slide-model-name line-inner ${isOpen ? 'is-revealed' : ''}">${m.name}</h3>
            </div>
          </div>
          <div class="slide-bottom-details">
            <p class="slide-tagline">${m.tagline}</p>
            <div class="slide-specs-grid">
              ${m.specs.map(s => `
                <div class="spec-col">
                  <span class="spec-val">${s.value}</span>
                  <span class="spec-lbl">${s.label}</span>
                </div>
              `).join('')}
            </div>
            <div class="slide-actions-row">
              <div class="color-swatches" aria-label="Available Colors">
                ${swatchesHtml}
              </div>
              <a href="#reserve" class="slide-configure-link hud-mono" data-cursor="RESERVE">Configure →</a>
            </div>
          </div>
        </div>
      `;

      slide.innerHTML = topNum + vertName + carWrap + openContent;
      lineupAccordion.appendChild(slide);

      // 80ms Debounced Hover
      slide.addEventListener('mouseenter', () => {
        if (state.isMobile) return;
        clearTimeout(state.hoverDebounceTimer);
        state.hoverDebounceTimer = setTimeout(() => {
          setActiveSlide(idx);
        }, CONFIG.lineup.hoverDebounceMs);
      });

      slide.addEventListener('click', (e) => {
        const swatchBtn = e.target.closest('.swatch');
        if (swatchBtn) {
          const swatchesContainer = swatchBtn.parentElement;
          swatchesContainer.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
          swatchBtn.classList.add('active');
          return;
        }

        if (state.lineupActiveIdx !== idx) {
          setActiveSlide(idx);
        }
      });

      slide.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (state.lineupActiveIdx + 1) % CONFIG.lineup.models.length;
          setActiveSlide(next);
          focusSlide(next);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (state.lineupActiveIdx - 1 + CONFIG.lineup.models.length) % CONFIG.lineup.models.length;
          setActiveSlide(prev);
          focusSlide(prev);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveSlide(idx);
        }
      });
    });
  }

  function setActiveSlide(newIdx) {
    if (state.lineupActiveIdx === newIdx) return;
    state.lineupActiveIdx = newIdx;

    const slides = lineupAccordion.querySelectorAll('.lineup-slide');
    slides.forEach((slide, idx) => {
      const isOpen = idx === newIdx;
      slide.classList.toggle('open', isOpen);
      slide.classList.toggle('closed', !isOpen);
      slide.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      const nameEl = slide.querySelector('.slide-model-name');
      if (nameEl) {
        if (isOpen) {
          setTimeout(() => nameEl.classList.add('is-revealed'), 60);
        } else {
          nameEl.classList.remove('is-revealed');
        }
      }
    });

    if (cursorEl && cursorEl.classList.contains('cursor--morphed')) {
      const hovered = document.querySelector('.lineup-slide:hover');
      if (hovered && cursorLabel) {
        cursorLabel.textContent = hovered.classList.contains('open') ? 'CONFIGURE' : 'OPEN';
      }
    }
  }

  function focusSlide(idx) {
    const slides = lineupAccordion.querySelectorAll('.lineup-slide');
    if (slides[idx]) slides[idx].focus();
  }

  /* ==========================================================================
     11. LINEUP SECTION ENTRANCE (Rise 40px + 0.08s stagger)
     ========================================================================== */
  function initLineupEntranceObserver() {
    const lineupSec = document.getElementById('lineup');
    if (!lineupSec) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const slides = lineupSec.querySelectorAll('.lineup-slide');
          slides.forEach((slide, i) => {
            slide.style.opacity = '0';
            slide.style.transform = 'translateY(40px)';
            slide.style.transition = `opacity 0.8s var(--ease) ${i * 0.08}s, transform 0.8s var(--ease) ${i * 0.08}s, flex-grow 0.7s var(--ease)`;
            requestAnimationFrame(() => {
              slide.style.opacity = '1';
              slide.style.transform = 'translateY(0)';
            });
          });
          observer.unobserve(lineupSec);
        }
      });
    }, { threshold: 0.15 });

    observer.observe(lineupSec);
  }

  /* ==========================================================================
     12. RESERVE BUTTON INTERACTION
     ========================================================================== */
  const reserveBtn = document.getElementById('reserve-btn');
  if (reserveBtn) {
    reserveBtn.addEventListener('click', () => {
      const current = reserveBtn.querySelector('.reserve-btn__text');
      if (current) {
        const original = current.textContent;
        current.textContent = 'ALLOCATION CONFIRMED';
        setTimeout(() => {
          current.textContent = original;
        }, 2400);
      }
    });
  }

  /* ==========================================================================
     13. CENTRAL RAF ANIMATION LOOP
     ========================================================================== */
  function animationLoop() {
    // 1. Cursor lerp
    if (cursorEl && !state.reducedMotion) {
      state.cursor.x += (state.cursor.targetX - state.cursor.x) * CONFIG.cursor.lerp;
      state.cursor.y += (state.cursor.targetY - state.cursor.y) * CONFIG.cursor.lerp;
      cursorEl.style.transform = `translate3d(${state.cursor.x}px, ${state.cursor.y}px, 0)`;
    }

    // 2. Hero frame lerp & render
    const heroDiff = Math.abs(state.heroTargetFrame - state.heroCurFrame);
    if (heroDiff > 0.001) {
      state.heroCurFrame += (state.heroTargetFrame - state.heroCurFrame) * CONFIG.hero.lerpFactor;
      const roundedHero = Math.round(state.heroCurFrame);
      if (roundedHero !== lastDrawnHeroFrame && state.heroReady) {
        drawHeroFrame(roundedHero);
      }
    }

    // 3. Dismantle frame lerp & render
    const dismantleDiff = Math.abs(state.dismantleTargetFrame - state.dismantleCurFrame);
    if (dismantleDiff > 0.001) {
      state.dismantleCurFrame += (state.dismantleTargetFrame - state.dismantleCurFrame) * CONFIG.dismantle.lerpFactor;
      const roundedDismantle = Math.round(state.dismantleCurFrame);
      if (roundedDismantle !== lastDrawnDismantleFrame && state.dismantleReady) {
        drawDismantleFrame(roundedDismantle);
        layoutCallouts();
      }
    }

    requestAnimationFrame(animationLoop);
  }

  /* ==========================================================================
     14. EVENT DISPATCHERS & LISTENERS
     ========================================================================== */
  function onScroll() {
    updateNavScroll();
    updateHeroScrolly();
    updateStatementScroll();
    updateDismantleScrolly();
  }

  function onResize() {
    updateCanvasDimensions();
    layoutCallouts();
    if (state.heroReady) drawHeroFrame(Math.round(state.heroCurFrame));
    if (state.dismantleReady) drawDismantleFrame(Math.round(state.dismantleCurFrame));
  }

  function initReducedMotion() {
    if (!state.reducedMotion) return;
    if (heroCanvas) drawHeroFrame(0);
    if (dismantleCanvas) drawDismantleFrame(0);
    document.querySelectorAll('.line-inner').forEach(el => el.classList.add('is-revealed'));
  }

  /* ==========================================================================
     15. INITIALIZATION BOOTSTRAP
     ========================================================================== */
  window.addEventListener('DOMContentLoaded', () => {
    updateCanvasDimensions();
    initPreloader();
    initFilmGrain();
    initCustomCursor();
    initStatementWords();
    initDismantleCallouts();
    initLineupAccordion();
    initLineupEntranceObserver();

    if (state.reducedMotion) {
      initReducedMotion();
    } else {
      requestAnimationFrame(animationLoop);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    onScroll();
  });

})();
