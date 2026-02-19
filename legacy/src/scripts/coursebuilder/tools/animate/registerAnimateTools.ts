import type { ToolFactory } from "../base/ToolTypes";
import { SelectTool } from "../build/SelectTool";
import { createSceneTool } from "./SceneTool";
import { createPathTool } from "./PathTool";
import { createModifyTool } from "./ModifyTool";

export const registerAnimateTools = (register: (factory: ToolFactory) => void): void => {
  register(() => new SelectTool("animate"));
  register(createSceneTool);
  register(createPathTool);
  register(createModifyTool);
};
