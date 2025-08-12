/**
 * Focused PixiJS Canvas Manager
 * Coordinates application, layers, events, and tools
 * Single Responsibility: High-level canvas coordination only (under 250 lines)
 */

import { Application, Container } from 'pixi.js';
import { ToolManager } from '../tools/ToolManager.js';
import { PixiApplicationManager } from './PixiApplicationManager.js';
import { CanvasLayerManager } from './CanvasLayerManager.js';
import { CanvasEventHandler } from './CanvasEventHandler.js';
import { CommandManager } from '../commands/CommandManager.js';

export class PixiCanvas {
  private appManager: PixiApplicationManager;
  private layerManager: CanvasLayerManager | null = null;
  private eventHandler: CanvasEventHandler | null = null;
  private toolManager: ToolManager;
  private app: Application | null = null;

  constructor(containerSelector: string, commandManager: CommandManager) {
    this.appManager = new PixiApplicationManager(containerSelector);
    this.toolManager = new ToolManager(commandManager);
  }

  /**
   * Initialize the complete canvas system
   */
  public async init(): Promise<void> {
    try {
      // Initialize PIXI application
      this.app = await this.appManager.initializeApplication();
      
      // Initialize layer management
      this.layerManager = new CanvasLayerManager(this.app);
      this.layerManager.initializeLayers();
      this.layerManager.addBackgroundGrid();
      
      // Initialize event handling
      this.eventHandler = new CanvasEventHandler(this.app, this.toolManager);
      this.eventHandler.setDrawingContainer(this.layerManager.getDrawingContainer()!);
      this.eventHandler.setupEvents();
      
      console.log('🎨 PixiCanvas system fully initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PixiCanvas system:', error);
      throw error;
    }
  }

  /**
   * Tool Management
   */
  public setTool(toolName: string): boolean {
    const success = this.toolManager.setActiveTool(toolName);
    if (success && this.eventHandler) {
      this.eventHandler.updateCanvasCursor(toolName);
    }
    return success;
  }

  public updateToolColor(color: string): void {
    this.toolManager.updateColorForCurrentTool(color);
  }

  public updateToolSettings(toolName: string, settings: any): void {
    this.toolManager.updateToolSettings(toolName, settings);
  }

  public getActiveToolName(): string {
    return this.toolManager.getActiveToolName();
  }

  /**
   * Canvas Operations
   */
  public clearCanvas(): void {
    if (this.layerManager) {
      this.layerManager.clearDrawingLayer();
    }
  }

  public clearAll(): void {
    if (this.layerManager) {
      this.layerManager.clearAllLayers();
    }
  }

  public resize(width: number, height: number): void {
    this.appManager.resize(width, height);
  }

  /**
   * Data Access
   */
  public getDimensions(): { width: number; height: number } {
    return this.appManager.getDimensions();
  }

  public getApp(): Application | null {
    return this.app;
  }

  public getDrawingContainer(): Container | null {
    return this.layerManager?.getDrawingContainer() || null;
  }

  public getLayoutContainer(): Container | null {
    return this.layerManager?.getLayoutContainer() || null;
  }

  public getCanvasDimensions(): { width: number; height: number } {
    return this.appManager.getDimensions();
  }

  public getCanvasInfo(): any {
    const appInfo = this.appManager.getCanvasInfo();
    const layerInfo = this.layerManager?.getLayerInfo();
    const eventInfo = this.eventHandler?.getEventInfo();
    
    return {
      application: appInfo,
      layers: layerInfo,
      events: eventInfo,
      tools: {
        activeTool: this.toolManager.getActiveToolName(),
        toolSettings: this.toolManager.getToolSettings()
      }
    };
  }

  /**
   * Export functionality
   */
  public async exportAsImage(): Promise<string> {
    return await this.appManager.exportAsImage();
  }

  /**
   * Layout Management
   */
  public addLayoutBlock(block: any): void {
    if (this.layerManager) {
      this.layerManager.addLayoutBlock(block);
    }
  }

  public removeLayoutBlock(blockId: string): void {
    if (this.layerManager) {
      this.layerManager.removeLayoutBlock(blockId);
    }
  }

  public getLayoutBlocks(): any[] {
    return this.layerManager?.getLayoutBlocks() || [];
  }

  /**
   * Event Management
   */
  public setEventsEnabled(enabled: boolean): void {
    if (this.eventHandler) {
      this.eventHandler.setEventsEnabled(enabled);
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    // Destroy in reverse order of creation
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }
    
    if (this.layerManager) {
      this.layerManager.destroy();
      this.layerManager = null;
    }
    
    this.toolManager.destroy();
    this.appManager.destroy();
    this.app = null;
    
    console.log('🗑️ PixiCanvas system destroyed');
  }
}
