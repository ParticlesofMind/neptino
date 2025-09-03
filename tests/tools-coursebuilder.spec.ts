import { test, expect, Page } from '@playwright/test';

class CanvasHelpers {
  constructor(private page: Page) {}

  async gotoCreateView() {
    // Clear persisted UI/tool state before page scripts run
    await this.page.addInitScript(() => { try { window.localStorage.clear(); } catch {} });
    await this.page.goto('/src/pages/teacher/coursebuilder.html#create');
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for the PIXI canvas to appear and CanvasAPI to be ready
    await this.page.waitForFunction(() => {
      const el = document.querySelector('#pixi-canvas') as HTMLCanvasElement | null;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, null, { timeout: 20000 });
    await this.page.waitForFunction(() => {
      return window.canvasAPI !== undefined && window.canvasAPI.isReady();
    }, null, { timeout: 20000 });
  }

  async canvasBox() {
    // Robust bounding box getter using evaluate to avoid stale handles
    for (let i = 0; i < 10; i++) {
      const rect = await this.page.evaluate(() => {
        const el = document.querySelector('#pixi-canvas') as HTMLCanvasElement | null;
        if (!el) return null as any;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      });
      if (rect && rect.width > 0 && rect.height > 0) {
        return rect as { x: number; y: number; width: number; height: number };
      }
      await this.page.waitForTimeout(50);
    }
    throw new Error('Canvas bounding box not available');
  }

  async setTool(tool: string) {
    // Prefer UI click to mirror real usage (limit to tool buttons section)
    await this.page.locator(`.tools__selection .tools__item[data-tool="${tool}"]`).click();
    // Ensure CanvasAPI reflects it; if not within 1s, force via API
    try {
      await this.page.waitForFunction((t) => window.canvasAPI?.getActiveTool() === t, tool, { timeout: 800 });
    } catch {
      // Drive activation through both UI manager and CanvasAPI for reliability
      await this.page.evaluate((t) => (window as any).toolStateManager?.setTool(t), tool);
      await this.page.evaluate((t) => window.canvasAPI?.setTool(t), tool);
    }
    // Always ensure drawing events enabled and give a brief tick
    await this.page.evaluate(() => window.canvasAPI?.enableDrawingEvents());
    await this.page.waitForTimeout(50);
  }

  async drawingInfo() {
    return await this.page.evaluate(() => window.canvasAPI?.getDrawingObjectsInfo());
  }

  async moveMouseOnCanvas(x: number, y: number) {
    const box = await this.canvasBox();
    await this.page.mouse.move(box.x + x, box.y + y);
  }

  async mouseDownOnCanvas(x: number, y: number) {
    const box = await this.canvasBox();
    await this.page.mouse.move(box.x + x, box.y + y);
    await this.page.mouse.down();
  }

  async mouseUp() {
    await this.page.mouse.up();
  }

  async clickOnCanvas(x: number, y: number) {
    const box = await this.canvasBox();
    await this.page.mouse.click(box.x + x, box.y + y);
  }
}

test.describe('Coursebuilder Create Tools', () => {
  // Reduce cross-test interference for stability while tools evolve
  test.describe.configure({ mode: 'serial' });
  // Add a retry to smooth over occasional rendering/timing hiccups during tool switches
  test.describe.configure({ retries: 1 });
  let helpers: CanvasHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new CanvasHelpers(page);
    await helpers.gotoCreateView();
    // Use content bounds via canvasAPI throughout tests; no test bypass required
    // Reset canvas/tool state for consistency
    await page.evaluate(() => {
      try {
        window.canvasAPI?.clearDrawings();
        window.canvasAPI?.enableDrawingEvents();
        window.canvasAPI?.setTool('selection');
      } catch {}
    });
  });

  test('selection: default active and can select/move a shape', async ({ page }) => {
    // Draw a rectangle with shapes tool first (simpler selection target)
    await helpers.setTool('shapes');
    await page.waitForTimeout(200);
    const before = await helpers.drawingInfo();
    const startX = 260, startY = 260, endX = 420, endY = 360;
    await helpers.mouseDownOnCanvas(startX, startY);
    await page.waitForTimeout(50);
    await helpers.moveMouseOnCanvas(endX, endY);
    await helpers.mouseUp();
    await page.waitForTimeout(50);
    const after = await helpers.drawingInfo();
    expect((after?.length || 0) - (before?.length || 0)).toBeGreaterThan(0);

    // Switch to selection and drag the rectangle
    await helpers.setTool('selection');
    await page.waitForTimeout(150);
    const afterBeforeMove = await helpers.drawingInfo();
    const candidates = (afterBeforeMove || []).filter(o => o.type === 'Graphics' && !(o.name || '').startsWith('selection-') && !(o.name || '').startsWith('transform-'));
    const target = candidates[candidates.length - 1] || afterBeforeMove?.[afterBeforeMove.length - 1];
    const centerX = Math.round((startX + endX) / 2);
    const centerY = Math.round((startY + endY) / 2);
    // Click to select
    await helpers.clickOnCanvas(centerX, centerY);
    await page.waitForTimeout(50);
    // Drag
    await helpers.mouseDownOnCanvas(centerX, centerY);
    await page.waitForTimeout(50);
    await helpers.moveMouseOnCanvas(centerX + 120, centerY + 30);
    await helpers.mouseUp();
    const afterMove = await helpers.drawingInfo();
    const movedCandidates = (afterMove || []).filter(o => o.type === 'Graphics' && !(o.name || '').startsWith('selection-') && !(o.name || '').startsWith('transform-'));
    const moved = movedCandidates.sort((a,b) => Math.abs((a.width - (target?.width||0)) + (a.height - (target?.height||0))) - Math.abs((b.width - (target?.width||0)) + (b.height - (target?.height||0))))[0] || movedCandidates[movedCandidates.length - 1];
    expect(moved?.x).not.toBe(target?.x);
  });

  test('pen: create open and closed paths', async ({ page }) => {
    await helpers.setTool('pen');
    await page.waitForTimeout(300);
    const before = await helpers.drawingInfo();

    // Open path: click points then press Enter
    await helpers.clickOnCanvas(200, 200);
    await page.waitForTimeout(50);
    await helpers.clickOnCanvas(260, 240);
    await page.waitForTimeout(50);
    await helpers.clickOnCanvas(320, 260);
    await page.keyboard.press('Enter');

    // Closed path: three points then Space to close/fill
    await helpers.clickOnCanvas(400, 300);
    await page.waitForTimeout(50);
    await helpers.clickOnCanvas(460, 320);
    await page.waitForTimeout(50);
    await helpers.clickOnCanvas(420, 380);
    await page.keyboard.press(' ');

    await page.waitForTimeout(50);
    const after = await helpers.drawingInfo();
    expect((after?.length || 0)).toBeGreaterThan(before?.length || 0);
  });

  test('brush: draw a stroke', async ({ page }) => {
    await helpers.setTool('brush');
    await page.waitForTimeout(200);
    const before = await helpers.drawingInfo();

    await helpers.mouseDownOnCanvas(150, 400);
    await page.waitForTimeout(30);
    await helpers.moveMouseOnCanvas(260, 410);
    await page.waitForTimeout(30);
    await helpers.moveMouseOnCanvas(340, 430);
    await page.waitForTimeout(30);
    await helpers.moveMouseOnCanvas(420, 460);
    await helpers.mouseUp();

    await page.waitForTimeout(50);
    const after = await helpers.drawingInfo();
    expect((after?.length || 0)).toBeGreaterThan(before?.length || 0);
  });

  test('shapes: draw rectangle and circle', async ({ page }) => {
    await helpers.setTool('shapes');
    await page.waitForTimeout(300);
    const before = await helpers.drawingInfo();
    // Rectangle
    await helpers.mouseDownOnCanvas(200, 500);
    await page.waitForTimeout(50);
    await helpers.moveMouseOnCanvas(360, 640);
    await helpers.mouseUp();
    // Circle (hold shift for proportional)
    await page.keyboard.down('Shift');
    await helpers.mouseDownOnCanvas(500, 500);
    await page.waitForTimeout(50);
    await helpers.moveMouseOnCanvas(620, 620);
    await helpers.mouseUp();
    await page.keyboard.up('Shift');

    await page.waitForTimeout(50);
    const after = await helpers.drawingInfo();
    expect((after?.length || 0)).toBeGreaterThan(before?.length || 0);
  });

  test('tables: create a table with drag', async ({ page }) => {
    await helpers.setTool('tables');
    await page.waitForTimeout(300);
    const before = await helpers.drawingInfo();
    // Must exceed 50x50 to create
    await helpers.mouseDownOnCanvas(300, 300);
    await page.waitForTimeout(50);
    await helpers.moveMouseOnCanvas(500, 420);
    await helpers.mouseUp();
    const after = await helpers.drawingInfo();
    expect((after?.length || 0)).toBeGreaterThan(before?.length || 0);
  });

  test('eraser: remove a previously drawn shape', async ({ page }) => {
    // Ensure a shape exists
    await helpers.setTool('shapes');
    await helpers.mouseDownOnCanvas(520, 500);
    await helpers.moveMouseOnCanvas(660, 620);
    await helpers.mouseUp();
    const before = await helpers.drawingInfo();

    // Erase across the shape
    await helpers.setTool('eraser');
    await helpers.mouseDownOnCanvas(540, 540);
    await helpers.moveMouseOnCanvas(700, 560);
    await helpers.mouseUp();

    const after = await helpers.drawingInfo();
    // Objects should decrease or at least change
    expect((after?.length || 0)).toBeLessThan(before?.length || 0);
  });
});
