import type { ToolFactory } from "../base/ToolTypes";
import { createAnimateSelectTool } from "./SelectTool";
import { createSceneTool } from "./SceneTool";
import { createPathTool } from "./PathTool";
import { createModifyTool } from "./ModifyTool";

export const registerAnimateTools = (register: (factory: ToolFactory) => void): void => {
  register(createAnimateSelectTool);
  register(createSceneTool);
  register(createPathTool);
  register(createModifyTool);
};
