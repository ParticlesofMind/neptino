import type { ToolFactory } from "../base/ToolTypes";
import { createBuildSelectTool } from "./SelectTool";
import { createPenTool } from "./PenTool";
import { createBrushTool } from "./BrushTool";
import { createTextTool } from "./TextTool";
import { createShapesTool } from "./ShapesTool";
import { createTableTool } from "./TableTool";
import { createGenerateTool } from "./GenerateTool";
import { createEraserTool } from "./EraserTool";

export const registerBuildTools = (register: (factory: ToolFactory) => void): void => {
  register(createBuildSelectTool);
  register(createPenTool);
  register(createBrushTool);
  register(createTextTool);
  register(createShapesTool);
  register(createTableTool);
  register(createGenerateTool);
  register(createEraserTool);
};
