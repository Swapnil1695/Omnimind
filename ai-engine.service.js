import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { Pinecone } from '@pinecone-database/pinecone';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class AIEngineService {
  constructor() {
    this.openai = null;
    this.gemini = null;
    this.anthropic = null;
    this.replicate = null;
    this.pinecone = null;
    this.models = new Map();
    this.initializeEngines();
  }

  initializeEngines() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      logger.info('✅ OpenAI client initialized');
    }

    // Initialize Google Gemini
    if (process.env.GOOGLE_AI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      logger.info('✅ Google Gemini client initialized');
    }

    // Initialize Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      logger.info('✅ Anthropic Claude client initialized');
    }

    // Initialize Replicate
    if (process.env.REPLICATE_API_TOKEN) {
      this.replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
      logger.info('✅ Replicate client initialized');
    }

    // Initialize Pinecone for vector storage
    if (process.env.PINECONE_API_KEY) {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      logger.info('✅ Pinecone client initialized');
    }

    // Register available models
    this.registerModels();
  }

  registerModels() {
    // GPT Models
    this.models.set('gpt-4', {
      provider: 'openai',
      name: 'GPT-4',
      maxTokens: 8192,
      contextWindow: 128000,
      costPer1K: 0.03, // Input
      capabilities: ['chat', 'completion', 'reasoning', 'code'],
    });

    this.models.set('gpt-4-turbo', {
      provider: 'openai',
      name: 'GPT-4 Turbo',
      maxTokens: 4096,
      contextWindow: 128000,
      costPer1K: 0.01,
      capabilities: ['chat', 'completion', 'vision', 'reasoning'],
    });

    this.models.set('gpt-3.5-turbo', {
      provider: 'openai',
      name: 'GPT-3.5 Turbo',
      maxTokens: 4096,
      contextWindow: 16385,
      costPer1K: 0.0015,
      capabilities: ['chat', 'completion', 'fast'],
    });

    // Gemini Models
    this.models.set('gemini-pro', {
      provider: 'gemini',
      name: 'Gemini Pro',
      maxTokens: 32768,
      contextWindow: 32768,
      costPer1K: 0.0005,
      capabilities: ['chat', 'completion', 'reasoning'],
    });

    this.models.set('gemini-pro-vision', {
      provider: 'gemini',
      name: 'Gemini Pro Vision',
      maxTokens: 16384,
      contextWindow: 16384,
      costPer1K: 0.0025,
      capabilities: ['chat', 'vision', 'multimodal'],
    });

    // Claude Models
    this.models.set('claude-3-opus', {
      provider: 'anthropic',
      name: 'Claude 3 Opus',
      maxTokens: 4096,
      contextWindow: 200000,
      costPer1K: 0.015,
      capabilities: ['chat', 'reasoning', 'analysis', 'long-context'],
    });

    this.models.set('claude-3-sonnet', {
      provider: 'anthropic',
      name: 'Claude 3 Sonnet',
      maxTokens: 4096,
      contextWindow: 200000,
      costPer1K: 0.003,
      capabilities: ['chat', 'reasoning', 'balanced'],
    });

    this.models.set('claude-3-haiku', {
      provider: 'anthropic',
      name: 'Claude 3 Haiku',
      maxTokens: 4096,
      contextWindow: 200000,
      costPer1K: 0.00025,
      capabilities: ['chat', 'fast', 'efficient'],
    });

    logger.info(`✅ Registered ${this.models.size} AI models`);
  }

  // Chat Completion
  async chatCompletion(messages, options = {}) {
    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 1000,
      stream = false,
      functions = [],
      functionCall = 'auto',
      systemPrompt = null,
      userId = null,
    } = options;

    const modelConfig = this.models.get(model);
    if (!modelConfig) {
      throw new AppError(`Model ${model} not available`, 400);
    }

    // Add system prompt if provided
    const finalMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      let completion;
      const startTime = Date.now();

      switch (modelConfig.provider) {
        case 'openai':
          completion = await this.openaiChat(finalMessages, {
            model,
            temperature,
            max_tokens: maxTokens,
            stream,
            functions,
            function_call: functionCall,
            user: userId,
          });
          break;

        case 'gemini':
          completion = await this.geminiChat(finalMessages, {
            model,
            temperature,
            maxTokens,
          });
          break;

        case 'anthropic':
          completion = await this.anthropicChat(finalMessages, {
            model,
            temperature,
            maxTokens,
          });
          break;

        default:
          throw new AppError(`Provider ${modelConfig.provider} not implemented`, 400);
      }

      const duration = Date.now() - startTime;
      const usage = this.calculateUsage(completion, modelConfig);

      logger.info(`🤖 AI chat completion (${model}): ${duration}ms, ${usage.totalTokens} tokens`);

      return {
        ...completion,
        usage,
        duration,
        model,
      };
    } catch (error) {
      logger.error('AI chat completion error:', error);
      throw new AppError(`AI service error: ${error.message}`, 500);
    }
  }

  async openaiChat(messages, options) {
    const completion = await this.openai.chat.completions.create({
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
      })),
      ...options,
    });

    return {
      content: completion.choices[0].message.content,
      role: completion.choices[0].message.role,
      finishReason: completion.choices[0].finish_reason,
      usage: completion.usage,
    };
  }

  async geminiChat(messages, options) {
    const model = this.gemini.getGenerativeModel({ model: options.model });
    
    // Convert messages format for Gemini
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const text = response.text();

    return {
      content: text,
      role: 'assistant',
      finishReason: 'stop',
    };
  }

  async anthropicChat(messages, options) {
    // Convert messages format for Claude
    const systemMessage = messages.find(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role !== 'system');

    const message = await this.anthropic.messages.create({
      model: options.model,
      system: systemMessage?.content,
      messages: userMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });

    return {
      content: message.content[0].text,
      role: 'assistant',
      finishReason: message.stop_reason,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    };
  }

  // Text Embeddings
  async createEmbeddings(text, model = 'text-embedding-ada-002') {
    try {
      if (!this.openai) {
        throw new AppError('OpenAI client not initialized', 500);
      }

      const response = await this.openai.embeddings.create({
        model,
        input: text,
        encoding_format: 'float',
      });

      return {
        embeddings: response.data[0].embedding,
        model: response.model,
        usage: response.usage,
      };
    } catch (error) {
      logger.error('Error creating embeddings:', error);
      throw error;
    }
  }

  // Image Generation
  async generateImage(prompt, options = {}) {
    const {
      model = 'dall-e-3',
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid',
      n = 1,
    } = options;

    try {
      if (!this.openai) {
        throw new AppError('OpenAI client not initialized', 500);
      }

      const response = await this.openai.images.generate({
        model,
        prompt,
        size,
        quality,
        style,
        n,
        response_format: 'url',
      });

      return {
        images: response.data.map(img => ({
          url: img.url,
          revisedPrompt: img.revised_prompt,
        })),
        created: response.created,
        model: response.model,
      };
    } catch (error) {
      logger.error('Error generating image:', error);
      throw error;
    }
  }

  // Image Analysis
  async analyzeImage(imageUrl, prompt, model = 'gpt-4-vision-preview') {
    try {
      if (!this.openai) {
        throw new AppError('OpenAI client not initialized', 500);
      }

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1000,
      });

      return {
        analysis: response.choices[0].message.content,
        usage: response.usage,
        model: response.model,
      };
    } catch (error) {
      logger.error('Error analyzing image:', error);
      throw error;
    }
  }

  // Audio Transcription
  async transcribeAudio(audioBuffer, options = {}) {
    const {
      model = 'whisper-1',
      language = 'en',
      temperature = 0,
      prompt = null,
    } = options;

    try {
      if (!this.openai) {
        throw new AppError('OpenAI client not initialized', 500);
      }

      // Convert buffer to file if needed
      const file = new File([audioBuffer], 'audio.mp3', { type: 'audio/mp3' });

      const response = await this.openai.audio.transcriptions.create({
        file,
        model,
        language,
        temperature,
        prompt,
        response_format: 'json',
      });

      return {
        text: response.text,
        language: response.language,
        duration: response.duration,
        model: response.model,
      };
    } catch (error) {
      logger.error('Error transcribing audio:', error);
      throw error;
    }
  }

  // Text-to-Speech
  async textToSpeech(text, options = {}) {
    const {
      model = 'tts-1',
      voice = 'alloy',
      speed = 1.0,
      format = 'mp3',
    } = options;

    try {
      if (!this.openai) {
        throw new AppError('OpenAI client not initialized', 500);
      }

      const response = await this.openai.audio.speech.create({
        model,
        input: text,
        voice,
        speed,
        response_format: format,
      });

      const buffer = Buffer.from(await response.arrayBuffer());

      return {
        audio: buffer,
        format,
        model,
        voice,
        textLength: text.length,
      };
    } catch (error) {
      logger.error('Error converting text to speech:', error);
      throw error;
    }
  }

  // Vector Store Operations
  async storeInVectorStore(vectors, namespace = 'default') {
    try {
      if (!this.pinecone) {
        throw new AppError('Pinecone client not initialized', 500);
      }

      const index = this.pinecone.Index(process.env.PINECONE_INDEX || 'omnimind');

      const upsertResponse = await index.upsert({
        vectors,
        namespace,
      });

      return {
        success: true,
        upsertedCount: upsertResponse.upsertedCount,
        namespace,
      };
    } catch (error) {
      logger.error('Error storing vectors:', error);
      throw error;
    }
  }

  async searchVectorStore(queryVector, options = {}) {
    const {
      namespace = 'default',
      topK = 10,
      includeMetadata = true,
      includeValues = false,
      filter = null,
    } = options;

    try {
      if (!this.pinecone) {
        throw new AppError('Pinecone client not initialized', 500);
      }

      const index = this.pinecone.Index(process.env.PINECONE_INDEX || 'omnimind');

      const searchResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata,
        includeValues,
        filter,
        namespace,
      });

      return searchResponse.matches;
    } catch (error) {
      logger.error('Error searching vectors:', error);
      throw error;
    }
  }

  // Project Management AI
  async analyzeProject(projectData) {
    const prompt = `Analyze the following project and provide insights:

Project: ${projectData.title}
Description: ${projectData.description}
Tasks: ${JSON.stringify(projectData.tasks)}
Timeline: Start ${projectData.startDate} - End ${projectData.deadline}

Please provide:
1. Risk assessment and potential issues
2. Timeline analysis and bottlenecks
3. Resource optimization suggestions
4. Success probability estimation
5. Recommendations for improvement`;

    return this.chatCompletion([
      { role: 'user', content: prompt },
    ], {
      model: 'gpt-4',
      temperature: 0.3,
      systemPrompt: 'You are an expert project management AI. Provide detailed, actionable insights.',
    });
  }

  async generateProjectPlan(requirements) {
    const prompt = `Create a detailed project plan based on these requirements:
    
Requirements: ${requirements}

Please provide:
1. Project structure and phases
2. Task breakdown with dependencies
3. Timeline estimation
4. Resource allocation
5. Success metrics
6. Risk mitigation strategies`;

    return this.chatCompletion([
      { role: 'user', content: prompt },
    ], {
      model: 'gpt-4',
      temperature: 0.4,
      systemPrompt: 'You are a project planning expert. Create comprehensive, realistic project plans.',
    });
  }

  async detectProjectErrors(projectState) {
    const prompt = `Analyze this project state and identify potential errors or issues:

Current State: ${JSON.stringify(projectState, null, 2)}

Look for:
1. Timeline inconsistencies
2. Resource conflicts
3. Task dependencies issues
4. Budget overruns
5. Quality concerns
6. Team capacity problems`;

    return this.chatCompletion([
      { role: 'user', content: prompt },
    ], {
      model: 'gpt-4',
      temperature: 0.2,
      systemPrompt: 'You are an error detection AI. Be thorough and precise in identifying issues.',
    });
  }

  async optimizeSchedule(scheduleData) {
    const prompt = `Optimize this schedule for maximum productivity:

Current Schedule: ${JSON.stringify(scheduleData, null, 2)}

Consider:
1. Priority of tasks
2. Energy levels throughout the day
3. Meeting efficiency
4. Focus time blocks
5. Breaks and recovery time
6. Personal preferences and constraints`;

    return this.chatCompletion([
      { role: 'user', content: prompt },
    ], {
      model: 'gpt-4',
      temperature: 0.3,
      systemPrompt: 'You are a productivity optimization AI. Create efficient, balanced schedules.',
    });
  }

  async generateMeetingSummary(transcript) {
    const prompt = `Generate a professional meeting summary from this transcript:

Transcript: ${transcript}

Please include:
1. Key decisions made
2. Action items with owners and deadlines
3. Important discussion points
4. Next steps
5. Open questions/concerns`;

    return this.chatCompletion([
      { role: 'user', content: transcript },
    ], {
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      systemPrompt: 'You are a meeting summarization AI. Extract key information clearly and concisely.',
    });
  }

  async processVoiceCommand(command, context = {}) {
    const prompt = `Process this voice command with context:

Command: "${command}"
User Context: ${JSON.stringify(context)}

Understand the intent and:
1. Determine the type of action needed
2. Extract relevant parameters
3. Consider user preferences
4. Provide appropriate response
5. Suggest follow-up if needed`;

    return this.chatCompletion([
      { role: 'user', content: prompt },
    ], {
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      systemPrompt: 'You are a voice assistant AI. Be helpful, concise, and contextual.',
    });
  }

  // Cost Calculation
  calculateUsage(completion, modelConfig) {
    const inputTokens = completion.usage?.prompt_tokens || completion.usage?.input_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || completion.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    const inputCost = (inputTokens / 1000) * (modelConfig.costPer1K || 0);
    const outputCost = (outputTokens / 1000) * (modelConfig.costPer1K || 0);
    const totalCost = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      inputCost: inputCost.toFixed(6),
      outputCost: outputCost.toFixed(6),
      totalCost: totalCost.toFixed(6),
      model: modelConfig.name,
    };
  }

  async getModelStats() {
    const stats = {
      totalModels: this.models.size,
      providers: new Set(),
      capabilities: new Set(),
      totalCostToday: 0,
      totalRequestsToday: 0,
    };

    for (const model of this.models.values()) {
      stats.providers.add(model.provider);
      model.capabilities.forEach(cap => stats.capabilities.add(cap));
    }

    return {
      ...stats,
      providers: Array.from(stats.providers),
      capabilities: Array.from(stats.capabilities),
      models: Array.from(this.models.entries()).map(([id, config]) => ({
        id,
        ...config,
      })),
    };
  }

  async validateModelCapabilities(model, requiredCapabilities) {
    const modelConfig = this.models.get(model);
    if (!modelConfig) {
      return { valid: false, error: `Model ${model} not available` };
    }

    const missingCapabilities = requiredCapabilities.filter(
      cap => !modelConfig.capabilities.includes(cap)
    );

    return {
      valid: missingCapabilities.length === 0,
      model: modelConfig.name,
      availableCapabilities: modelConfig.capabilities,
      missingCapabilities,
    };
  }

  getAvailableModels(capabilities = []) {
    const available = [];

    for (const [id, config] of this.models) {
      if (capabilities.length === 0 || capabilities.every(cap => config.capabilities.includes(cap))) {
        available.push({
          id,
          name: config.name,
          provider: config.provider,
          maxTokens: config.maxTokens,
          costPer1K: config.costPer1K,
          capabilities: config.capabilities,
        });
      }
    }

    return available;
  }

  async estimateCost(prompt, model = 'gpt-3.5-turbo', expectedOutputLength = 500) {
    const modelConfig = this.models.get(model);
    if (!modelConfig) {
      throw new AppError(`Model ${model} not available`, 400);
    }

    // Estimate tokens (rough estimation: 1 token ≈ 4 characters for English)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(expectedOutputLength / 4);

    const inputCost = (inputTokens / 1000) * modelConfig.costPer1K;
    const outputCost = (outputTokens / 1000) * modelConfig.costPer1K;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: totalCost.toFixed(6),
      costBreakdown: {
        input: inputCost.toFixed(6),
        output: outputCost.toFixed(6),
      },
      model: modelConfig.name,
    };
  }

  getServiceStatus() {
    return {
      openai: !!this.openai,
      gemini: !!this.gemini,
      anthropic: !!this.anthropic,
      replicate: !!this.replicate,
      pinecone: !!this.pinecone,
      totalModels: this.models.size,
      features: [
        'chat-completion',
        'embeddings',
        'image-generation',
        'image-analysis',
        'audio-transcription',
        'text-to-speech',
        'vector-store',
        'project-analysis',
        'error-detection',
        'schedule-optimization',
      ],
    };
  }
}

export default new AIEngineService();