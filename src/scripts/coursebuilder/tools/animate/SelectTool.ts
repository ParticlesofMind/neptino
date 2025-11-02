import type { CanvasTool } from "../base/ToolTypes";
import { SelectTool } from "../build/SelectTool";

export const createAnimateSelectTool = (): CanvasTool => new SelectTool("animate");
