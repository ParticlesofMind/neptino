/**
 * Machine Learning Types
 * Type definitions for ML models and inference
 */

export interface ModelConfig {
  modelId: string;
  taskType: 'text-generation' | 'text-classification' | 'question-answering' | 'summarization';
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface GenerationConfig {
  maxNewTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  doSample?: boolean;
  repetitionPenalty?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InferenceResult {
  text: string;
  tokensGenerated?: number;
  inferenceTime?: number;
}

export interface ModelStatus {
  isLoaded: boolean;
  isLoading: boolean;
  modelId: string | null;
  error: string | null;
  progress?: number;
}

export type ProgressCallback = (progress: { 
  status: string; 
  progress?: number; 
  file?: string;
}) => void;
