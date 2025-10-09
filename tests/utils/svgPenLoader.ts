import fs from 'fs';
import path from 'path';
import svgPathParser from 'svg-path-parser';

const { parseSVG, makeAbsolute } = svgPathParser;

export interface PenHandle {
  x: number;
  y: number;
}

export interface PenNodeSpec {
  x: number;
  y: number;
  in: PenHandle | null;
  out: PenHandle | null;
}

export interface PenShapeSpec {
  nodes: PenNodeSpec[];
  closed: boolean;
}

export interface PenTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

const CLOSE_TOLERANCE = 1e-2;

export function loadPenShapesFromSvg(relativeSvgPath: string): PenShapeSpec[] {
  const absPath = path.resolve(relativeSvgPath);
  const svgContent = fs.readFileSync(absPath, 'utf8');
  const pathRegex = /<path[^>]*d="([^"]+)"[^>]*>/g;
  const shapes: PenShapeSpec[] = [];

  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(svgContent)) !== null) {
    const pathData = match[1];
    shapes.push(convertPathToPenShape(pathData));
  }

  return shapes;
}

function convertPathToPenShape(pathData: string): PenShapeSpec {
  const commands = makeAbsolute(parseSVG(pathData));
  const nodes: PenNodeSpec[] = [];

  let closed = false;

  for (const command of commands) {
    switch (command.code) {
      case 'M': {
        nodes.push(createNode(command.x, command.y));
        break;
      }
      case 'C': {
        if (nodes.length === 0) {
          throw new Error('Unexpected cubic command before initial move.');
        }
        const prev = nodes[nodes.length - 1];
        prev.out = { x: command.x1, y: command.y1 };

        const nextNode = createNode(command.x, command.y);
        nextNode.in = { x: command.x2, y: command.y2 };
        nodes.push(nextNode);
        break;
      }
      case 'Z': {
        closed = true;
        break;
      }
      default: {
        throw new Error(`Unsupported SVG command for pen path: ${command.code}`);
      }
    }
  }

  if (closed && nodes.length >= 2) {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (distance(first, last) <= CLOSE_TOLERANCE) {
      if (last.in) {
        first.in = { ...last.in };
      }
      nodes.pop();
    }
  }

  return {
    nodes: nodes.map((node) => ({
      x: node.x,
      y: node.y,
      in: node.in ? { ...node.in } : null,
      out: node.out ? { ...node.out } : null,
    })),
    closed,
  };
}

function createNode(x: number, y: number): PenNodeSpec {
  return { x, y, in: null, out: null };
}

function distance(a: PenNodeSpec, b: PenNodeSpec): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function transformPenShape(shape: PenShapeSpec, transform: PenTransform): PenShapeSpec {
  const applyHandle = (handle: PenHandle | null): PenHandle | null => {
    if (!handle) return null;
    return {
      x: handle.x * transform.scale + transform.translateX,
      y: handle.y * transform.scale + transform.translateY,
    };
  };

  return {
    closed: shape.closed,
    nodes: shape.nodes.map((node) => ({
      x: node.x * transform.scale + transform.translateX,
      y: node.y * transform.scale + transform.translateY,
      in: applyHandle(node.in),
      out: applyHandle(node.out),
    })),
  };
}
