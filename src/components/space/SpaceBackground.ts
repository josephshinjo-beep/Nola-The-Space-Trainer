/**
 * SpaceBackground: an animated starfield with a soft galaxy feel, drawn on
 * one <canvas> that sits behind the whole app.
 *
 * It is plain TypeScript with no framework code, so it can be reused
 * anywhere: createSpaceBackground(canvas) returns an object with start(),
 * stop(), resize(), destroy(), setSpeed() and setStatic().
 *
 * Layers, back to front:
 *   1. Gradient + nebula clouds   (painted once to a hidden canvas, then panned;
 *                                  skipped with `transparent`, to let a photo show through)
 *   2. A faint spiral galaxy      (painted once, rotated very slowly)
 *   3. Far, mid and near stars    (drift, wrap round the edges, twinkle)
 *   4. An occasional shooting star
 *
 * To restyle it, change SPACE_CONFIG below or pass overrides to
 * createSpaceBackground(canvas, { speed: 0.5, ... }).
 */

export interface StarLayerConfig {
  /** Stars on a 1920×1080 screen. Scaled by screen area. */
  count: number;
  /** Radius range in CSS pixels. */
  minSize: number;
  maxSize: number;
  /** Drift speed range in CSS pixels per second. */
  minSpeed: number;
  maxSpeed: number;
  /** Brightness range, 0 to 1. Keep modest so the interface stays readable. */
  minAlpha: number;
  maxAlpha: number;
  /** How much of a star's brightness the twinkle removes at its dimmest (0 = steady). */
  twinkleDepth: number;
  /** Use the colour palette (true) or plain white (false). */
  tinted: boolean;
  /** Draw each star with a soft glow (costs more; use for few, large stars). */
  glow: boolean;
}

export interface SpaceBackgroundConfig {
  /** Multiplies every movement. 0 freezes the sky, 2 doubles its speed. */
  speed: number;
  /** Sharpness cap for high-density screens. */
  maxPixelRatio: number;
  /** Star counts are multiplied by this on small or touch screens. */
  mobileStarFactor: number;
  /** Back to front. */
  layers: StarLayerConfig[];
  /** Star colours with how often each is used. */
  starColors: { color: string; weight: number }[];
  /** Twinkles per second, roughly (each star varies around this). */
  twinkleRate: number;
  /** Sideways wobble added to each star's path, in pixels per second. */
  wobble: number;
  gradient: { top: string; bottom: string };
  nebula: {
    /** Each cloud: position and radius as fractions of the screen, colour, opacity. */
    blobs: { x: number; y: number; radius: number; color: string; opacity: number }[];
    /** How far the clouds wander, as a fraction of the screen. */
    drift: number;
    /** Seconds for one full wander cycle. */
    driftPeriod: number;
  };
  galaxy: {
    enabled: boolean;
    /** Centre as fractions of the screen. */
    x: number;
    y: number;
    /** Diameter as a fraction of the screen's shorter side. */
    size: number;
    opacity: number;
    /** Seconds for one full turn. */
    rotationPeriod: number;
  };
  shootingStar: {
    enabled: boolean;
    /** Seconds between shooting stars (a random time in this range). */
    minGap: number;
    maxGap: number;
    /** Pixels per second. */
    speed: number;
    /** Trail length in pixels. */
    length: number;
    /** Seconds it stays visible. */
    life: number;
    opacity: number;
  };
  /** Leave the sky see-through (no gradient or clouds), so a photo underneath shows; only stars and shooting stars are drawn. */
  transparent: boolean;
  /** Log the average frame cost to the console once, after a few seconds. */
  debug: boolean;
}

export const SPACE_CONFIG: SpaceBackgroundConfig = {
  speed: 1,
  maxPixelRatio: 2,
  mobileStarFactor: 0.6,
  layers: [
    { count: 200, minSize: 0.5, maxSize: 0.9, minSpeed: 1.5, maxSpeed: 4, minAlpha: 0.2, maxAlpha: 0.55, twinkleDepth: 0.6, tinted: false, glow: false },
    { count: 60, minSize: 0.8, maxSize: 1.3, minSpeed: 5, maxSpeed: 10, minAlpha: 0.35, maxAlpha: 0.7, twinkleDepth: 0.4, tinted: true, glow: false },
    { count: 16, minSize: 1.2, maxSize: 1.9, minSpeed: 12, maxSpeed: 22, minAlpha: 0.45, maxAlpha: 0.8, twinkleDepth: 0.3, tinted: true, glow: true },
  ],
  starColors: [
    { color: '#ffffff', weight: 6 },
    { color: '#bcd9ff', weight: 3 },
    { color: '#ffe6b8', weight: 2 },
  ],
  twinkleRate: 0.35,
  wobble: 1.2,
  gradient: { top: '#05071a', bottom: '#140b2e' },
  nebula: {
    blobs: [
      { x: 0.82, y: 0.12, radius: 0.55, color: '61, 224, 245', opacity: 0.1 },
      { x: 0.12, y: 0.9, radius: 0.5, color: '255, 122, 26', opacity: 0.08 },
      { x: 0.45, y: 0.5, radius: 0.6, color: '124, 77, 255', opacity: 0.09 },
    ],
    drift: 0.06,
    driftPeriod: 240,
  },
  galaxy: { enabled: true, x: 0.72, y: 0.34, size: 0.7, opacity: 0.1, rotationPeriod: 900 },
  shootingStar: { enabled: true, minGap: 4, maxGap: 8, speed: 800, length: 140, life: 0.8, opacity: 0.7 },
  transparent: false,
  debug: false,
};

export interface SpaceBackground {
  /** Begin (or resume) animating. */
  start(): void;
  /** Pause. The last frame stays on screen. */
  stop(): void;
  /** Re-measure the screen and rebuild. Called automatically on resize and rotation. */
  resize(): void;
  /** Stop for good and remove every listener. */
  destroy(): void;
  /** Change the speed while running, for example setSpeed(3) during a boost. */
  setSpeed(multiplier: number): void;
  /** true = draw one still frame and do not animate (for reduced motion). */
  setStatic(isStatic: boolean): void;
  /** Where the mouse is, from -1 to 1 on each axis. The stars lean very slightly away from it (parallax). */
  setPointer(x: number, y: number): void;
  /** Average time spent drawing one frame, in milliseconds. */
  getAverageFrameMs(): number;
}

interface StarLayer {
  config: StarLayerConfig;
  count: number;
  x: Float32Array;
  y: Float32Array;
  /** Each star's own speed along the shared drift direction. */
  speed: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  phase: Float32Array;
  twinkle: Float32Array;
  /** Stars are stored grouped by colour; colorEnd[c] is where colour c's group ends. */
  colorEnd: Int32Array;
}

const TAU = Math.PI * 2;
const REFERENCE_AREA = 1920 * 1080;
const MAX_FRAME_SECONDS = 0.05;
const TRAIL_SEGMENTS = 8;

const between = (min: number, max: number) => min + Math.random() * (max - min);

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** Returns null if the browser cannot draw on a canvas; the page background colour shows instead. */
/** How far each star layer (far, mid, near) shifts with the mouse at most, in CSS pixels. Small on purpose. */
const PARALLAX_PX = [3, 7, 12];

export function createSpaceBackground(canvas: HTMLCanvasElement, overrides: Partial<SpaceBackgroundConfig> = {}): SpaceBackground | null {
  const config: SpaceBackgroundConfig = { ...SPACE_CONFIG, ...overrides };
  const maybeContext = canvas.getContext('2d', { alpha: config.transparent });
  if (!maybeContext) return null;
  const ctx: CanvasRenderingContext2D = maybeContext;

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let speed = config.speed;
  let isStatic = false;
  let running = false;
  let frameRequest = 0;
  let lastTime = 0;
  /** Animation clock in seconds. Only advances while animating, so pauses leave no gap. */
  let clock = 0;
  let resizeQueued = false;
  let destroyed = false;

  let backdrop: HTMLCanvasElement | null = null;
  let galaxySprite: HTMLCanvasElement | null = null;
  const pointerTarget = { x: 0, y: 0 };
  const pointerAt = { x: 0, y: 0 };
  const glowSprites: HTMLCanvasElement[] = [];
  let layers: StarLayer[] = [];

  // One reusable shooting star.
  const shot = { active: false, x: 0, y: 0, dirX: 0, dirY: 0, age: 0, nextIn: between(config.shootingStar.minGap, config.shootingStar.maxGap) };

  // Frame-cost measurement.
  let costTotal = 0;
  let costFrames = 0;
  let costLogged = false;

  // ---------- one-off painting (never done inside the animation loop) ----------

  /** Gradient plus nebula clouds, a little larger than the screen so it can be panned. */
  function paintBackdrop(): void {
    if (config.transparent) {
      backdrop = null;
      return;
    }
    const margin = config.nebula.drift * 2;
    // Painted at half resolution: it is all soft blur, and it is cheaper to draw.
    const scale = 0.5;
    const w = width * (1 + margin);
    const h = height * (1 + margin);
    backdrop = makeCanvas(w * scale, h * scale);
    const paint = backdrop.getContext('2d');
    if (!paint) return;
    paint.scale(scale, scale);

    const sky = paint.createLinearGradient(0, 0, w * 0.3, h);
    sky.addColorStop(0, config.gradient.top);
    sky.addColorStop(1, config.gradient.bottom);
    paint.fillStyle = sky;
    paint.fillRect(0, 0, w, h);

    const reach = Math.max(w, h);
    for (const blob of config.nebula.blobs) {
      const cx = blob.x * w;
      const cy = blob.y * h;
      const radius = blob.radius * reach;
      const cloud = paint.createRadialGradient(cx, cy, 0, cx, cy, radius);
      cloud.addColorStop(0, `rgba(${blob.color}, ${blob.opacity})`);
      cloud.addColorStop(0.5, `rgba(${blob.color}, ${blob.opacity * 0.4})`);
      cloud.addColorStop(1, `rgba(${blob.color}, 0)`);
      paint.fillStyle = cloud;
      paint.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
  }

  /** A small spiral galaxy seen face-on: a glowing core and two dusty arms. */
  function paintGalaxy(): void {
    if (!config.galaxy.enabled) {
      galaxySprite = null;
      return;
    }
    const size = 384;
    const half = size / 2;
    galaxySprite = makeCanvas(size, size);
    const paint = galaxySprite.getContext('2d');
    if (!paint) return;

    const haze = paint.createRadialGradient(half, half, 0, half, half, half);
    haze.addColorStop(0, 'rgba(255, 244, 224, 0.9)');
    haze.addColorStop(0.12, 'rgba(190, 200, 255, 0.35)');
    haze.addColorStop(0.5, 'rgba(120, 110, 220, 0.08)');
    haze.addColorStop(1, 'rgba(120, 110, 220, 0)');
    paint.fillStyle = haze;
    paint.fillRect(0, 0, size, size);

    paint.fillStyle = '#dfe6ff';
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 900; i++) {
        const along = Math.random();
        const angle = arm * Math.PI + along * 3.2 * Math.PI + between(-0.35, 0.35) * (0.4 + along);
        const distance = (0.06 + along * 0.9) * half + between(-6, 6);
        paint.globalAlpha = (1 - along) * 0.5 + 0.08;
        const dot = between(0.5, 1.6);
        paint.fillRect(half + Math.cos(angle) * distance, half + Math.sin(angle) * distance, dot, dot);
      }
    }
    paint.globalAlpha = 1;
  }

  /** A soft round glow for each star colour, used by the nearest stars. */
  function paintGlowSprites(): void {
    glowSprites.length = 0;
    for (const { color } of config.starColors) {
      const sprite = makeCanvas(32, 32);
      const paint = sprite.getContext('2d');
      if (paint) {
        const glow = paint.createRadialGradient(16, 16, 0, 16, 16, 16);
        glow.addColorStop(0, color);
        glow.addColorStop(0.25, color);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        paint.globalAlpha = 0.9;
        paint.fillStyle = glow;
        paint.fillRect(0, 0, 32, 32);
      }
      glowSprites.push(sprite);
    }
  }

  function buildStars(): void {
    const isSmallScreen = width < 768 || window.matchMedia('(pointer: coarse)').matches;
    const density = ((width * height) / REFERENCE_AREA) * (isSmallScreen ? config.mobileStarFactor : 1);
    const colors = config.starColors;
    const totalWeight = colors.reduce((sum, entry) => sum + entry.weight, 0);

    layers = config.layers.map((layerConfig) => {
      const count = Math.max(4, Math.round(layerConfig.count * Math.min(density, 2.5)));
      const layer: StarLayer = {
        config: layerConfig,
        count,
        x: new Float32Array(count),
        y: new Float32Array(count),
        speed: new Float32Array(count),
        size: new Float32Array(count),
        alpha: new Float32Array(count),
        phase: new Float32Array(count),
        twinkle: new Float32Array(count),
        colorEnd: new Int32Array(colors.length),
      };
      // Group stars by colour so the draw loop changes colour only a few times.
      let end = 0;
      for (let c = 0; c < colors.length; c++) {
        end = c === colors.length - 1 || !layerConfig.tinted ? count : Math.min(count, end + Math.round((count * colors[c]!.weight) / totalWeight));
        layer.colorEnd[c] = end;
      }
      for (let i = 0; i < count; i++) {
        layer.x[i] = Math.random() * width;
        layer.y[i] = Math.random() * height;
        layer.speed[i] = between(layerConfig.minSpeed, layerConfig.maxSpeed);
        layer.size[i] = between(layerConfig.minSize, layerConfig.maxSize);
        layer.alpha[i] = between(layerConfig.minAlpha, layerConfig.maxAlpha);
        layer.phase[i] = Math.random() * TAU;
        layer.twinkle[i] = config.twinkleRate * TAU * between(0.5, 1.6);
      }
      return layer;
    });
  }

  // ---------- per-frame work (no objects or strings are created here) ----------

  function update(dt: number): void {
    clock += dt;
    // Ease the parallax towards the mouse slowly, so it reads as a gentle drift, not a jump.
    const follow = 1 - Math.exp(-1.5 * dt);
    pointerAt.x += (pointerTarget.x - pointerAt.x) * follow;
    pointerAt.y += (pointerTarget.y - pointerAt.y) * follow;
    // Everything drifts the same general way, and that way turns slowly.
    const heading = 2.6 + Math.sin(clock * 0.02) * 0.5;
    const dirX = Math.cos(heading);
    const dirY = Math.sin(heading);

    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l]!;
      const { x, y, speed: own, phase, size } = layer;
      for (let i = 0; i < layer.count; i++) {
        // A gentle sideways sway keeps the paths from looking ruler-straight.
        const sway = Math.sin(clock * 0.3 + phase[i]!) * config.wobble;
        let nx = x[i]! + (dirX * own[i]! - dirY * sway) * dt;
        let ny = y[i]! + (dirY * own[i]! + dirX * sway) * dt;
        const edge = size[i]! * 4;
        if (nx < -edge) nx += width + edge * 2;
        else if (nx > width + edge) nx -= width + edge * 2;
        if (ny < -edge) ny += height + edge * 2;
        else if (ny > height + edge) ny -= height + edge * 2;
        x[i] = nx;
        y[i] = ny;
      }
    }

    const shooting = config.shootingStar;
    if (!shooting.enabled) return;
    if (shot.active) {
      shot.age += dt;
      shot.x += shot.dirX * shooting.speed * dt;
      shot.y += shot.dirY * shooting.speed * dt;
      if (shot.age >= shooting.life) {
        shot.active = false;
        shot.nextIn = between(shooting.minGap, shooting.maxGap);
      }
    } else {
      shot.nextIn -= dt;
      if (shot.nextIn <= 0) {
        // Starts in the upper part of the sky and falls at a random slant, left or right.
        const angle = between(0.25, 1.1);
        const leftward = Math.random() < 0.5;
        shot.active = true;
        shot.age = 0;
        shot.x = between(0.15, 0.85) * width;
        shot.y = between(0.02, 0.4) * height;
        shot.dirX = Math.cos(angle) * (leftward ? -1 : 1);
        shot.dirY = Math.sin(angle);
      }
    }
  }

  function draw(): void {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.globalAlpha = 1;

    // 1. Gradient and nebula: one image, slowly panned. It also clears the frame.
    if (config.transparent) {
      ctx.clearRect(0, 0, width, height);
    } else if (backdrop) {
      const margin = config.nebula.drift * 2;
      const turn = (clock / config.nebula.driftPeriod) * TAU;
      const panX = (Math.sin(turn) * 0.5 + 0.5) * margin * width;
      const panY = (Math.cos(turn * 0.7) * 0.5 + 0.5) * margin * height;
      ctx.drawImage(backdrop, -panX, -panY, width * (1 + margin), height * (1 + margin));
    } else {
      ctx.fillStyle = config.gradient.top;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Galaxy: tilted so it reads as a disc, turning very slowly.
    if (galaxySprite) {
      const size = Math.min(width, height) * config.galaxy.size;
      ctx.translate(config.galaxy.x * width, config.galaxy.y * height);
      ctx.rotate(-0.5);
      ctx.scale(1, 0.5);
      ctx.rotate((clock / config.galaxy.rotationPeriod) * TAU);
      ctx.globalAlpha = config.galaxy.opacity;
      ctx.drawImage(galaxySprite, -size / 2, -size / 2, size, size);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    // 3. Stars. Nearer layers shift a few pixels more with the mouse, for a light sense of depth.
    const colors = config.starColors;
    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l]!;
      const shift = PARALLAX_PX[Math.min(l, PARALLAX_PX.length - 1)]!;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, -pointerAt.x * shift * pixelRatio, -pointerAt.y * shift * pixelRatio);
      const { x, y, size, alpha, phase, twinkle, colorEnd } = layer;
      const depth = layer.config.twinkleDepth;
      let i = 0;
      for (let c = 0; c < colors.length; c++) {
        const end = colorEnd[c]!;
        if (end <= i) continue;
        const sprite = layer.config.glow ? glowSprites[c] : undefined;
        if (!sprite) ctx.fillStyle = layer.config.tinted ? colors[c]!.color : colors[0]!.color;
        for (; i < end; i++) {
          const shimmer = 1 - depth * (0.5 + 0.5 * Math.sin(clock * twinkle[i]! + phase[i]!));
          ctx.globalAlpha = alpha[i]! * shimmer;
          const s = size[i]!;
          if (sprite) ctx.drawImage(sprite, x[i]! - s * 3, y[i]! - s * 3, s * 6, s * 6);
          else ctx.fillRect(x[i]! - s, y[i]! - s, s * 2, s * 2);
        }
      }
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    // 4. Shooting star: a short line that fades towards its tail and over its life.
    if (shot.active) {
      const shooting = config.shootingStar;
      const life = shot.age / shooting.life;
      const fade = Math.sin(Math.min(1, life) * Math.PI) * shooting.opacity;
      const step = shooting.length / TRAIL_SEGMENTS;
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      for (let k = 0; k < TRAIL_SEGMENTS; k++) {
        ctx.globalAlpha = fade * (1 - k / TRAIL_SEGMENTS);
        ctx.lineWidth = 1.6 * (1 - k / (TRAIL_SEGMENTS * 1.5));
        ctx.beginPath();
        ctx.moveTo(shot.x - shot.dirX * step * k, shot.y - shot.dirY * step * k);
        ctx.lineTo(shot.x - shot.dirX * step * (k + 1), shot.y - shot.dirY * step * (k + 1));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now: number): void {
    frameRequest = 0;
    if (!running || isStatic || destroyed) return;
    // After a pause, lastTime is 0, so the first frame moves nothing: no jump.
    const dt = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, MAX_FRAME_SECONDS);
    lastTime = now;

    const began = performance.now();
    update(dt * speed);
    draw();
    costTotal += performance.now() - began;
    costFrames += 1;
    if (config.debug && !costLogged && costFrames >= 300) {
      costLogged = true;
      console.info(`[SpaceBackground] average ${(costTotal / costFrames).toFixed(2)} ms per frame over ${costFrames} frames (${width}×${height} at ${pixelRatio}x)`);
    }

    frameRequest = requestAnimationFrame(frame);
  }

  function schedule(): void {
    if (frameRequest === 0 && running && !isStatic && !destroyed && document.visibilityState === 'visible') {
      lastTime = 0;
      frameRequest = requestAnimationFrame(frame);
    }
  }

  function cancel(): void {
    if (frameRequest !== 0) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
  }

  // ---------- public controls ----------

  function resize(): void {
    if (destroyed) return;
    const nextWidth = Math.max(1, window.innerWidth);
    const nextHeight = Math.max(1, window.innerHeight);
    const nextRatio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
    if (nextWidth === width && nextHeight === height && nextRatio === pixelRatio && backdrop) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextRatio;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    paintBackdrop();
    buildStars();
    draw();
  }

  function onResize(): void {
    // Browsers fire many resize events while a window is dragged; rebuild once per frame at most.
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      resize();
    });
  }

  function onVisibility(): void {
    if (document.visibilityState === 'visible') schedule();
    else cancel();
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  paintGalaxy();
  paintGlowSprites();
  resize();

  return {
    start() {
      running = true;
      schedule();
    },
    stop() {
      running = false;
      cancel();
    },
    resize,
    destroy() {
      destroyed = true;
      running = false;
      cancel();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      backdrop = null;
      galaxySprite = null;
      glowSprites.length = 0;
      layers = [];
    },
    setSpeed(multiplier: number) {
      speed = Math.max(0, multiplier);
    },
    setPointer(x: number, y: number) {
      pointerTarget.x = Math.max(-1, Math.min(1, x));
      pointerTarget.y = Math.max(-1, Math.min(1, y));
    },
    setStatic(value: boolean) {
      if (value === isStatic) return;
      isStatic = value;
      if (isStatic) {
        cancel();
        draw();
      } else {
        schedule();
      }
    },
    getAverageFrameMs() {
      return costFrames === 0 ? 0 : costTotal / costFrames;
    },
  };
}
