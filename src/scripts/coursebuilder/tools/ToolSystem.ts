import { canvasEngine } from "../canvasInit";
import { ToolManager } from "./base/ToolManager";
import type { ToolFactory } from "./base/ToolTypes";
import { registerBuildTools } from "./build/registerBuildTools";
import { registerAnimateTools } from "./animate/registerAnimateTools";

export const toolManager = new ToolManager(canvasEngine);

export const registerTool = (factory: ToolFactory): void => {
  toolManager.registerTool(factory);
};

registerBuildTools(registerTool);
registerAnimateTools(registerTool);
