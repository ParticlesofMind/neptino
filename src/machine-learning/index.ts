/**
 * Machine Learning Module
 * Neptino's AI Intelligence Layer
 * 
 * Provides browser-based ML inference using:
 * - Phi-3.5 Mini (3.8B) for instruction following and reasoning
 * - Future: Additional specialized models for specific tasks
 */

export { Phi3Model, phi3Model } from './Phi3Model';
export { ModelManager, modelManager } from './ModelManager';

export type {
  ModelConfig,
  GenerationConfig,
  ChatMessage,
  InferenceResult,
  ModelStatus,
  ProgressCallback
} from './types';
