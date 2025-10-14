/**
 * Model Manager
 * Central orchestrator for all ML models in Neptino
 * Manages model lifecycle, caching, and resource allocation
 */

import { phi3Model } from './Phi3Model';
import type { ModelStatus, ProgressCallback } from './types';

export class ModelManager {
  private static instance: ModelManager | null = null;
  
  private constructor() {}

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  /**
   * Initialize default models
   */
  public async initialize(progressCallback?: ProgressCallback): Promise<void> {
    console.log('🧠 Initializing Neptino Intelligence Models...');
    
    try {
      // Load Phi-3.5 Mini as primary model
      await phi3Model.load(undefined, progressCallback);
      console.log('✅ Intelligence models ready');
    } catch (error) {
      console.error('❌ Failed to initialize models:', error);
      throw error;
    }
  }

  /**
   * Get Phi-3.5 model instance
   */
  public getPhi3Model() {
    return phi3Model;
  }

  /**
   * Check if any models are ready
   */
  public isReady(): boolean {
    return phi3Model.isReady();
  }

  /**
   * Get status of all models
   */
  public getStatus(): Record<string, ModelStatus> {
    return {
      phi3: phi3Model.getStatus(),
    };
  }

  /**
   * Unload all models
   */
  public async unloadAll(): Promise<void> {
    console.log('Unloading all models...');
    await phi3Model.unload();
  }
}

// Export singleton instance
export const modelManager = ModelManager.getInstance();
