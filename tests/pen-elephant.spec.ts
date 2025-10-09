import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import {
  loadPenShapesFromSvg,
  transformPenShape,
  PenShapeSpec,
} from './utils/svgPenLoader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_SOURCE = path.resolve(__dirname, '../src/assets/drawingTests/elephant-test.svg');
const SCALE = 0.6;
const OFFSET_X = 260;
const OFFSET_Y = 180;

const RAW_SHAPES = loadPenShapesFromSvg(SVG_SOURCE);
const EXPECTED_SHAPES: PenShapeSpec[] = RAW_SHAPES.map((shape) =>
  transformPenShape(shape, { scale: SCALE, translateX: OFFSET_X, translateY: OFFSET_Y })
);

test.describe('Pen Tool Elephant Reproduction', () => {
  test('recreates elephant SVG exactly', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {}
    });

    await page.goto('/src/pages/teacher/coursebuilder.html#create');

    await page.waitForFunction(() => {
      const canvas = document.querySelector('#pixi-canvas') as HTMLCanvasElement | null;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const api = (window as any).canvasAPI;
      return api && typeof api.isReady === 'function' && api.isReady();
    }, null, { timeout: 20000 });

    await page.evaluate(() => {
      const api = (window as any).canvasAPI;
      api?.enableDrawingEvents?.();
      api?.setTool?.('pen');
      (window as any).toolStateManager?.setTool?.('pen');
      const events = api?.events;
      if (events?.toolManager?.setActiveTool) {
        events.toolManager.setActiveTool('pen');
      }
    });

    await page.evaluate(
      ({ shapes }) => {
        const api = (window as any).canvasAPI;
        if (!api) {
          throw new Error('Canvas API unavailable');
        }

        // Clear any existing drawings for deterministic validation
        try {
          api.clearDrawings?.();
        } catch {}

        const layer = api.getDrawingLayer?.();
        if (!layer) {
          throw new Error('Drawing layer unavailable');
        }

        const events = api.events;
        const toolManager = events?.toolManager;
        if (!toolManager?.setActiveTool) {
          throw new Error('Tool manager missing');
        }

        toolManager.setActiveTool('pen');
        const penTool = toolManager.getActiveTool?.();
        if (!penTool || penTool.name !== 'pen') {
          throw new Error('Pen tool not active');
        }

        const cloneHandle = (handle: any) =>
          handle ? { x: Number(handle.x), y: Number(handle.y) } : null;

        const vectorSmooth = 'smooth';

        for (const shape of shapes) {
          penTool.settings.strokeColor = '#000000';
          penTool.settings.fillColor = '#000000';
          penTool.settings.size = 2;

          penTool.currentPath = null;
          penTool.isEditingExistingPath = false;
          penTool.originalShapeForEdit = null;

          shape.nodes.forEach((node: any, index: number) => {
            penTool.addNodeToPath({ x: node.x, y: node.y }, layer);
            const createdNode = penTool.currentPath.nodes[index];
            if (!createdNode) {
              throw new Error(`Node ${index} missing during construction`);
            }
            createdNode.position.set(node.x, node.y);
            createdNode.handleIn = cloneHandle(node.in);
            createdNode.handleOut = cloneHandle(node.out);
            if (createdNode.handleIn || createdNode.handleOut) {
              createdNode.pointType = vectorSmooth;
            }
          });

          penTool.updatePathGraphics();
          penTool.completePath(shape.closed);
        }
      },
      { shapes: EXPECTED_SHAPES }
    );

    const actualShapes = await page.evaluate(() => {
      const api = (window as any).canvasAPI;
      const layer = api?.getDrawingLayer?.();
      if (!layer) return [];

      const serializeHandle = (handle: any) =>
        handle ? { x: Number(handle.x), y: Number(handle.y) } : null;

      return layer.children
        .map((child: any) => child?.__meta)
        .filter((meta: any) => meta && meta.kind === 'pen')
        .map((meta: any) => ({
          closed: !!meta.closed,
          nodes: meta.nodes.map((node: any) => ({
            x: Number(node.x),
            y: Number(node.y),
            in: serializeHandle(node.in),
            out: serializeHandle(node.out),
          })),
        }));
    });

    expect(actualShapes.length).toBe(EXPECTED_SHAPES.length);

    const sortedActual = sortShapes(actualShapes);
    const sortedExpected = sortShapes(EXPECTED_SHAPES);

    for (let shapeIndex = 0; shapeIndex < sortedExpected.length; shapeIndex++) {
      const expected = sortedExpected[shapeIndex];
      const actual = sortedActual[shapeIndex];

      expect(actual.closed).toBe(expected.closed);
      expect(actual.nodes.length).toBe(expected.nodes.length);

      for (let nodeIndex = 0; nodeIndex < expected.nodes.length; nodeIndex++) {
        const expectedNode = expected.nodes[nodeIndex];
        const actualNode = actual.nodes[nodeIndex];

        assertClose(actualNode.x, expectedNode.x, `node ${nodeIndex} x`);
        assertClose(actualNode.y, expectedNode.y, `node ${nodeIndex} y`);
        assertHandleClose(actualNode.in, expectedNode.in, `node ${nodeIndex} handleIn`);
        assertHandleClose(actualNode.out, expectedNode.out, `node ${nodeIndex} handleOut`);
      }
    }
  });
});

function sortShapes(shapes: PenShapeSpec[]): PenShapeSpec[] {
  return [...shapes].sort((a, b) => {
    const aFirst = a.nodes[0];
    const bFirst = b.nodes[0];
    if (aFirst.x === bFirst.x) {
      return aFirst.y - bFirst.y;
    }
    return aFirst.x - bFirst.x;
  });
}

function assertClose(actual: number, expected: number, label: string, tolerance = 1e-2) {
  const diff = Math.abs(actual - expected);
  expect(diff, `${label} diff ${diff}`).toBeLessThanOrEqual(tolerance);
}

function assertHandleClose(
  actual: { x: number; y: number } | null,
  expected: { x: number; y: number } | null,
  label: string
) {
  if (!actual && !expected) {
    return;
  }
  expect(actual, `${label} presence`).toBeTruthy();
  if (!actual || !expected) {
    return;
  }
  assertClose(actual.x, expected.x, `${label} x`);
  assertClose(actual.y, expected.y, `${label} y`);
}
