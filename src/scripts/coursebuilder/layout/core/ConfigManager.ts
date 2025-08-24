/**
 * Config Manager  
 * Handles block configuration (true/false flags, settings)
 */

import type { BaseBlockConfig, IConfigManager } from "./LayoutTypes";

export class ConfigManager implements IConfigManager {
  private blockConfigs: Map<string, BaseBlockConfig> = new Map();

  /**
   * Get block configuration
   */
  getBlockConfig(blockId: string): BaseBlockConfig | null {
    return this.blockConfigs.get(blockId) || null;
  }

  /**
   * Update block configuration
   */
  updateBlockConfig(blockId: string, config: Partial<BaseBlockConfig>): void {
    const existingConfig = this.blockConfigs.get(blockId);
    if (existingConfig) {
      this.blockConfigs.set(blockId, {
        ...existingConfig,
        ...config,
        styles: { ...existingConfig.styles, ...config.styles },
      });
    }
  }

  /**
   * Toggle block enabled state
   */
  toggleBlock(blockId: string, enabled: boolean): void {
    this.updateBlockConfig(blockId, { enabled });
  }

  /**
   * Set block configuration
   */
  setBlockConfig(config: BaseBlockConfig): void {
    this.blockConfigs.set(config.id, config);
  }

  /**
   * Get all block configurations
   */
  getAllConfigs(): BaseBlockConfig[] {
    return Array.from(this.blockConfigs.values());
  }

  /**
   * Export configuration to JSON
   */
  exportConfig(): any {
    return {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      blocks: Object.fromEntries(this.blockConfigs),
    };
  }

  /**
   * Import configuration from JSON
   */
  importConfig(config: any): void {
    if (config.blocks) {
      this.blockConfigs.clear();
      Object.entries(config.blocks).forEach(([blockId, blockConfig]) => {
        this.blockConfigs.set(blockId, blockConfig as BaseBlockConfig);
      });
    }
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.blockConfigs.clear();
  }

  /**
   * Check if block is enabled
   */
  isBlockEnabled(blockId: string): boolean {
    const config = this.getBlockConfig(blockId);
    return config?.enabled ?? true;
  }

  /**
   * Get enabled blocks only
   */
  getEnabledBlocks(): BaseBlockConfig[] {
    return this.getAllConfigs().filter(config => config.enabled);
  }
}
