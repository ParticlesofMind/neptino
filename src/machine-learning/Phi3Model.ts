/**
 * Text Generation Model Integration
 * Manages loading and inference with language models via Transformers.js
 * 
 * Default Model: Xenova/distilgpt2 (82M parameters, no auth required)
 * Optimized for: Text generation, completion, educational content
 * 
 * To use better models, set VITE_HUGGINGFACE_TOKEN in .env and change defaultModelId
 */

import { 
  pipeline, 
  env,
  type TextGenerationPipeline 
} from '@huggingface/transformers';
import type { 
  GenerationConfig, 
  ChatMessage, 
  InferenceResult,
  ModelStatus,
  ProgressCallback 
} from './types';

// Configure transformers.js for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

// Set Hugging Face token if available (for accessing gated models)
const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;
if (HF_TOKEN) {
  // @ts-ignore - accessToken may not be in the type definition yet
  env.accessToken = HF_TOKEN;
  console.log('✅ Hugging Face authentication configured');
}

export class Phi3Model {
  private static instance: Phi3Model | null = null;
  private pipeline: TextGenerationPipeline | null = null;
  private status: ModelStatus = {
    isLoaded: false,
    isLoading: false,
    modelId: null,
    error: null,
    progress: 0
  };

  private readonly defaultModelId = 'Xenova/distilgpt2';
  private readonly defaultConfig: GenerationConfig = {
    maxNewTokens: 512,
    temperature: 0.7,
    topP: 0.9,
    topK: 50,
    doSample: true,
    repetitionPenalty: 1.1
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): Phi3Model {
    if (!Phi3Model.instance) {
      Phi3Model.instance = new Phi3Model();
    }
    return Phi3Model.instance;
  }

  /**
   * Load the Phi-3.5 Mini model
   * Downloads and initializes the ONNX model (first load may take time)
   */
  public async load(
    modelId?: string,
    progressCallback?: ProgressCallback
  ): Promise<void> {
    if (this.status.isLoaded) {
      console.log('Model already loaded');
      return;
    }

    if (this.status.isLoading) {
      throw new Error('Model is already loading');
    }

    const targetModelId = modelId || this.defaultModelId;
    
    try {
      this.status = {
        isLoaded: false,
        isLoading: true,
        modelId: targetModelId,
        error: null,
        progress: 0
      };

      progressCallback?.({ status: 'Initializing model download...' });

      // Create text-generation pipeline with the model
      // @ts-ignore - Complex pipeline type inference
      const pipelineInstance = await pipeline('text-generation', targetModelId, {
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            this.status.progress = percentage;
            progressCallback?.({
              status: `Downloading ${progress.file}`,
              progress: percentage,
              file: progress.file
            });
          } else if (progress.status === 'done') {
            progressCallback?.({
              status: `Loaded ${progress.file}`,
              progress: 100,
              file: progress.file
            });
          }
        }
      });
      
      this.pipeline = pipelineInstance as TextGenerationPipeline;

      this.status = {
        isLoaded: true,
        isLoading: false,
        modelId: targetModelId,
        error: null,
        progress: 100
      };

      progressCallback?.({ status: 'Model loaded successfully!', progress: 100 });
      console.log(`✅ Model loaded: ${targetModelId}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.status = {
        isLoaded: false,
        isLoading: false,
        modelId: null,
        error: errorMessage,
        progress: 0
      };
      
      progressCallback?.({ status: `Error: ${errorMessage}` });
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Generate text completion
   */
  public async generate(
    prompt: string,
    config?: Partial<GenerationConfig>
  ): Promise<InferenceResult> {
    if (!this.pipeline || !this.status.isLoaded) {
      throw new Error('Model not loaded. Call load() first.');
    }

    const startTime = performance.now();
    const generationConfig = { ...this.defaultConfig, ...config };

    try {
      const result = await this.pipeline(prompt, {
        max_new_tokens: generationConfig.maxNewTokens,
        temperature: generationConfig.temperature,
        top_p: generationConfig.topP,
        top_k: generationConfig.topK,
        do_sample: generationConfig.doSample,
        repetition_penalty: generationConfig.repetitionPenalty,
      });

      const endTime = performance.now();
      const inferenceTime = endTime - startTime;

      // Extract generated text
      const resultData: any = result;
      const generatedText = Array.isArray(resultData) 
        ? resultData[0]?.generated_text || ''
        : resultData?.generated_text || '';

      return {
        text: generatedText,
        inferenceTime,
      };
      
    } catch (error) {
      console.error('Generation failed:', error);
      throw error;
    }
  }

  /**
   * Chat with the model using messages format
   * Formats messages according to Phi-3 chat template
   */
  public async chat(
    messages: ChatMessage[],
    config?: Partial<GenerationConfig>
  ): Promise<InferenceResult> {
    if (!this.pipeline || !this.status.isLoaded) {
      throw new Error('Model not loaded. Call load() first.');
    }

    // Format messages using Phi-3 chat template
    const prompt = this.formatChatPrompt(messages);
    return this.generate(prompt, config);
  }

  /**
   * Format messages according to Phi-3 instruction format
   * Template: <|user|>\n{user_message}<|end|>\n<|assistant|>\n
   */
  private formatChatPrompt(messages: ChatMessage[]): string {
    let prompt = '';
    
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `<|system|>\n${message.content}<|end|>\n`;
      } else if (message.role === 'user') {
        prompt += `<|user|>\n${message.content}<|end|>\n`;
      } else if (message.role === 'assistant') {
        prompt += `<|assistant|>\n${message.content}<|end|>\n`;
      }
    }
    
    // Add final assistant prompt to trigger generation
    prompt += '<|assistant|>\n';
    
    return prompt;
  }

  /**
   * Get current model status
   */
  public getStatus(): ModelStatus {
    return { ...this.status };
  }

  /**
   * Check if model is ready for inference
   */
  public isReady(): boolean {
    return this.status.isLoaded && this.pipeline !== null;
  }

  /**
   * Unload model and free memory
   */
  public async unload(): Promise<void> {
    if (this.pipeline) {
      // Dispose of model resources
      this.pipeline = null;
      this.status = {
        isLoaded: false,
        isLoading: false,
        modelId: null,
        error: null,
        progress: 0
      };
      
      console.log('Model unloaded');
    }
  }
}

// Export singleton instance
export const phi3Model = Phi3Model.getInstance();
