import { Application, Container } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../utils/canvasSizing';

export interface SharedView {
  id: string;
  root: Container;
  inactiveCanvas: HTMLCanvasElement | null;
}

interface ActiveViewState {
  viewId: string;
  host: HTMLElement;
}

export class SharedPixiApplication {
  private static instance: SharedPixiApplication | null = null;

  private app: Application | null = null;
  private initPromise: Promise<Application> | null = null;

  private views: Map<string, SharedView> = new Map();
  private activeView: ActiveViewState | null = null;

  private constructor() {}

  public static getInstance(): SharedPixiApplication {
    if (!SharedPixiApplication.instance) {
      SharedPixiApplication.instance = new SharedPixiApplication();
    }
    return SharedPixiApplication.instance;
  }

  private async ensureInitialized(): Promise<Application> {
    if (this.app) {
      return this.app;
    }

    if (!this.initPromise) {
      this.initPromise = this.initializeApplication();
    }

    this.app = await this.initPromise;
    return this.app;
  }

  private async initializeApplication(): Promise<Application> {
    const app = new Application();
    await app.init({
      multiView: true,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    // Ensure the canvas is not attached by default; mounting is managed per view.
    if (app.canvas.parentElement) {
      app.canvas.parentElement.removeChild(app.canvas);
    }

    return app;
  }

  public async getApplication(): Promise<Application> {
    return this.ensureInitialized();
  }

  public async createView(viewId: string): Promise<SharedView> {
    if (this.views.has(viewId)) {
      return this.views.get(viewId)!;
    }

    await this.ensureInitialized();

    const root = new Container();
    root.sortableChildren = true;

    const view: SharedView = {
      id: viewId,
      root,
      inactiveCanvas: null,
    };

    this.views.set(viewId, view);
    return view;
  }

  public hasView(viewId: string): boolean {
    return this.views.has(viewId);
  }

  public getView(viewId: string): SharedView | null {
    return this.views.get(viewId) ?? null;
  }

  public async renderToCanvas(viewId: string, canvas: HTMLCanvasElement): Promise<void> {
    const app = await this.ensureInitialized();
    const view = this.views.get(viewId);
    if (!view) {
      throw new Error(`View ${viewId} not found`);
    }

    this.prepareCanvas(canvas);
    app.renderer.render({
      container: view.root,
      target: canvas,
      clear: true,
    });
  }

  public async activateView(viewId: string, host: HTMLElement, placeholderCanvas: HTMLCanvasElement): Promise<void> {
    const app = await this.ensureInitialized();
    const view = this.views.get(viewId);
    if (!view) {
      throw new Error(`View ${viewId} not found`);
    }

    if (this.activeView && this.activeView.viewId === viewId && this.activeView.host === host) {
      return;
    }

    // Restore previous active view (if any)
    if (this.activeView) {
      const previousView = this.views.get(this.activeView.viewId);
      if (previousView && previousView.inactiveCanvas) {
        const previousHost = this.activeView.host;
        if (previousHost.contains(app.canvas)) {
          previousHost.replaceChild(previousView.inactiveCanvas, app.canvas);
        }
        this.prepareCanvas(previousView.inactiveCanvas);
        app.renderer.render({
          container: previousView.root,
          target: previousView.inactiveCanvas,
          clear: true,
        });
      }
    }

    // Store placeholder for re-use when this view becomes inactive.
    view.inactiveCanvas = placeholderCanvas;

    if (host.contains(placeholderCanvas)) {
      host.replaceChild(app.canvas, placeholderCanvas);
    } else {
      host.appendChild(app.canvas);
    }

    app.renderer.resize(CANVAS_WIDTH, CANVAS_HEIGHT);
    app.stage = view.root;
    app.renderer.render({ container: view.root, clear: true });

    this.activeView = { viewId, host };
  }

  public async destroyView(viewId: string): Promise<void> {
    const view = this.views.get(viewId);
    if (!view) {
      return;
    }

    const app = await this.ensureInitialized();

      if (this.activeView && this.activeView.viewId === viewId) {
        if (this.activeView.host.contains(app.canvas)) {
          this.activeView.host.removeChild(app.canvas);
        }
        this.activeView = null;
      }

      view.root.destroy({ children: true });

      if (view.inactiveCanvas && view.inactiveCanvas.parentElement) {
        view.inactiveCanvas.parentElement.removeChild(view.inactiveCanvas);
      }

      this.views.delete(viewId);
  }

  public async deactivateAll(): Promise<void> {
    const app = await this.ensureInitialized();

    if (this.activeView) {
      const view = this.views.get(this.activeView.viewId);
      if (view && view.inactiveCanvas && this.activeView.host.contains(app.canvas)) {
        this.activeView.host.replaceChild(view.inactiveCanvas, app.canvas);
        this.prepareCanvas(view.inactiveCanvas);
        app.renderer.render({
          container: view.root,
          target: view.inactiveCanvas,
          clear: true,
        });
      } else if (this.activeView.host.contains(app.canvas)) {
        this.activeView.host.removeChild(app.canvas);
      }
    }

    this.activeView = null;
  }

  public getActiveViewId(): string | null {
    return this.activeView?.viewId ?? null;
  }

  private prepareCanvas(canvas: HTMLCanvasElement): void {
    canvas.width = CANVAS_WIDTH * (window.devicePixelRatio || 1);
    canvas.height = CANVAS_HEIGHT * (window.devicePixelRatio || 1);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
  }
}

export const sharedPixiApplication = SharedPixiApplication.getInstance();
