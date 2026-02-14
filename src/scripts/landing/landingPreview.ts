import { Application, BlurFilter, Container, Graphics } from "pixi.js";

const PREVIEW_DURATION_MS = 10_000;

type Satellite = {
  node: Graphics;
  radius: number;
  angle: number;
  speed: number;
  verticalScale: number;
  offset: number;
};

export function initLandingPreview(): void {
  const root = document.querySelector<HTMLElement>("[data-landing-preview]");
  if (!root || root.dataset.previewReady === "true") {
    return;
  }
  root.dataset.previewReady = "true";
  void bootstrapLandingPreview(root);
}

async function bootstrapLandingPreview(root: HTMLElement): Promise<void> {
  const canvasHost = root.querySelector<HTMLElement>("[data-landing-preview-canvas]");
  if (!canvasHost) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let cycleDuration = prefersReducedMotion.matches ? PREVIEW_DURATION_MS * 1.6 : PREVIEW_DURATION_MS;
  const handleMotionChange = (): void => {
    cycleDuration = prefersReducedMotion.matches ? PREVIEW_DURATION_MS * 1.6 : PREVIEW_DURATION_MS;
  };
  prefersReducedMotion.addEventListener("change", handleMotionChange);

  const app = new Application();
  const resolution = Math.min(window.devicePixelRatio ?? 1, 2);

  try {
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resizeTo: canvasHost,
      resolution,
      powerPreference: "high-performance",
      preference: "webgl",
    });
  } catch (error) {
    console.error("Failed to initialize landing preview", error);
    prefersReducedMotion.removeEventListener("change", handleMotionChange);
    return;
  }

  canvasHost.appendChild(app.canvas);
  canvasHost.querySelector("[data-landing-preview-fallback]")?.remove();

  const scene = new Container();
  scene.label = "landing-preview-scene";
  app.stage.addChild(scene);

  const starLayer = new Container();
  scene.addChild(starLayer);
  populateStars(starLayer);

  const halo = createHalo();
  scene.addChild(halo);

  const rings = createRings();
  scene.addChild(rings);

  const planet = createPlanet();
  scene.addChild(planet);

  const orbitLayer = new Container();
  scene.addChild(orbitLayer);
  const satellites = createSatellites(orbitLayer);

  const timelineSteps = Array.from(root.querySelectorAll<HTMLElement>("[data-preview-phase]"));
  const progressBar = root.querySelector<HTMLElement>("[data-preview-progress]");
  const clockDisplay = root.querySelector<HTMLElement>("[data-preview-clock]");

  let elapsed = 0;
  let currentPhaseIndex = -1;

  const resizeObserver = new ResizeObserver(() => {
    updateSceneLayout(scene, app);
  });
  resizeObserver.observe(canvasHost);
  updateSceneLayout(scene, app);

  const tickerFn = (ticker: { deltaMS: number; deltaTime: number }): void => {
    const deltaMS = typeof ticker.deltaMS === "number" ? ticker.deltaMS : ticker.deltaTime * (1000 / 60);
    const duration = Math.max(2000, cycleDuration);
    elapsed = (elapsed + deltaMS) % duration;
    const progress = elapsed / duration;

    planet.rotation = progress * Math.PI * 2;
    halo.rotation = -progress * Math.PI * 0.4;
    rings.rotation = progress * Math.PI * 0.15;

    starLayer.children.forEach((node, index) => {
      node.alpha = 0.25 + ((Math.sin(progress * Math.PI * 2 + index) + 1) / 2) * 0.5;
    });

    satellites.forEach((satellite) => {
      satellite.angle += deltaMS * satellite.speed;
      const x = Math.cos(satellite.angle) * satellite.radius;
      const y = Math.sin(satellite.angle) * satellite.radius * satellite.verticalScale;
      satellite.node.position.set(x, y);
    });

    if (progressBar) {
      progressBar.style.width = `${(progress * 100).toFixed(1)}%`;
    }

    if (clockDisplay) {
      clockDisplay.textContent = (elapsed / 1000).toFixed(1);
    }

    if (timelineSteps.length) {
      const phaseDuration = duration / timelineSteps.length;
      const nextIndex = Math.min(timelineSteps.length - 1, Math.floor(elapsed / phaseDuration));
      if (nextIndex !== currentPhaseIndex) {
        timelineSteps.forEach((step, index) => {
          step.classList.toggle("is-active", index === nextIndex);
        });
        currentPhaseIndex = nextIndex;
      }
    }
  };

  app.ticker.add(tickerFn);

  const teardown = (): void => {
    if (root.dataset.previewReady !== "true") {
      return;
    }
    root.dataset.previewReady = "destroyed";
    app.ticker.remove(tickerFn);
    resizeObserver.disconnect();
    prefersReducedMotion.removeEventListener("change", handleMotionChange);
    app.destroy();
  };

  window.addEventListener("pagehide", teardown, { once: true });
  window.addEventListener("beforeunload", teardown, { once: true });
}

function updateSceneLayout(scene: Container, app: Application): void {
  const { width, height } = app.renderer;
  scene.position.set(width / 2, height / 2);
  const minEdge = Math.min(width, height);
  const scale = Math.max(0.65, Math.min(1.1, minEdge / 520));
  scene.scale.set(scale);
}

function createPlanet(): Container {
  const group = new Container();
  group.label = "preview-planet";

  const base = new Graphics();
  base.circle(0, 0, 120).fill({ color: 0x4338ca });
  group.addChild(base);

  const highlight = new Graphics();
  highlight.circle(-25, -35, 90).fill({ color: 0x7c3aed, alpha: 0.85 });
  group.addChild(highlight);

  const shadow = new Graphics();
  shadow.circle(45, 35, 95).fill({ color: 0x1e1b4b, alpha: 0.7 });
  group.addChild(shadow);

  const contour = new Graphics();
  for (let i = 0; i < 5; i += 1) {
    const radius = 55 + i * 12;
    contour.arc(0, 0, radius, Math.PI * 0.1, Math.PI * 0.9).stroke({
      color: 0xffffff,
      alpha: 0.1 + i * 0.02,
      width: 2,
    });
  }
  group.addChild(contour);

  const atmosphere = new Graphics();
  atmosphere.circle(0, 0, 138).stroke({ color: 0x38bdf8, width: 3, alpha: 0.35 });
  atmosphere.filters = [new BlurFilter({ strength: 2 })];
  group.addChild(atmosphere);

  return group;
}

function createHalo(): Graphics {
  const halo = new Graphics();
  halo.circle(0, 0, 175).stroke({ color: 0x60a5fa, width: 2, alpha: 0.4 });
  halo.filters = [new BlurFilter({ strength: 4 })];
  return halo;
}

function createRings(): Graphics {
  const rings = new Graphics();
  rings.ellipse(0, 0, 210, 80).stroke({ color: 0x94a3b8, alpha: 0.35, width: 3 });
  rings.ellipse(0, 0, 180, 60).stroke({ color: 0x38bdf8, alpha: 0.45, width: 2 });
  return rings;
}

function createSatellites(layer: Container): Satellite[] {
  const satellites: Satellite[] = [];
  for (let i = 0; i < 3; i += 1) {
    const orbiter = new Graphics();
    orbiter.circle(0, 0, 6 + i * 1.2).fill({ color: 0xffffff, alpha: 0.9 });
    orbiter.stroke({ color: 0x38bdf8, width: 1, alpha: 0.8 });
    layer.addChild(orbiter);
    satellites.push({
      node: orbiter,
      radius: 150 + i * 20,
      angle: Math.random() * Math.PI * 2,
      speed: 0.0008 + i * 0.00035,
      verticalScale: 0.6 - i * 0.04,
      offset: i * 0.9,
    });
  }
  return satellites;
}

function populateStars(layer: Container): void {
  const starCount = 36;
  for (let i = 0; i < starCount; i += 1) {
    const star = new Graphics();
    const radius = 0.6 + Math.random() * 1.6;
    star.circle(0, 0, radius).fill({ color: 0xffffff, alpha: 0.4 + Math.random() * 0.4 });
    const x = (Math.random() - 0.5) * 420;
    const y = (Math.random() - 0.5) * 260;
    star.position.set(x, y);
    layer.addChild(star);
  }
}
