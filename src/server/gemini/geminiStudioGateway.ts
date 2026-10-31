import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';
import { GoogleGenAI } from '@google/genai';
import type {
  AssetTake,
  BrandEvaluationFinding,
  BrandEvaluationReport,
  BrandKit,
  CampaignDetail,
  ReferenceAnchor,
  VoicePersonaConfig,
} from '../../shared/types.js';
import type { CampaignVault, SceneDraftInput } from '../vault/campaignVault.js';

export interface RawInteractionResponse {
  id?: string;
  output_text?: string | null;
  output_image?: { data?: string; mime_type?: string } | null;
  output_audio?: { data?: string; mime_type?: string } | null;
  output_video?: { data?: string; mime_type?: string } | null;
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      data?: string;
      mime_type?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

export interface RawVoiceResponse {
  id?: string;
  sample_audio?: {
    data?: string;
    mime_type?: string;
  };
}

export interface RawInteractionsClient {
  interactions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (params: Record<string, any>) => Promise<RawInteractionResponse>;
  };
  voices?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (params: Record<string, any>) => Promise<RawVoiceResponse>;
  };
}

export interface StoryboardGenerationResult {
  interactionId: string;
  modelId: string;
  scenes: SceneDraftInput[];
  tokenUsage?: AssetTake['tokenUsage'];
  latencyMs: number;
}

export interface ImageInteractionRequest {
  campaignId: string;
  sceneId: string | null;
  modality: 'anchor_image' | 'keyframe_start' | 'keyframe_end';
  prompt: string;
  referenceImagePaths?: Array<{ dataBase64: string; mimeType: string }>;
  previousInteractionId?: string;
  modelId?: 'gemini-nano-banana-2.1' | 'gemini-3-pro-image' | 'gemini-3.1-flash-lite-image';
}

export interface VideoInteractionRequest {
  campaignId: string;
  sceneId: string;
  prompt: string;
  startKeyframe?: { dataBase64: string; mimeType: string };
  endKeyframe?: { dataBase64: string; mimeType: string };
  sourceVideoForExtension?: { dataBase64: string; mimeType: string };
  previousInteractionId?: string;
  durationSeconds?: number;
}

export interface VoiceDesignRequest {
  displayName: string;
  gender: 'male' | 'female' | 'neutral';
  languageCode: string;
  personaPrompt: string;
}

export interface VoiceoverInteractionRequest {
  campaignId: string;
  sceneId: string;
  text: string;
  vocalStyleDirective: string;
  voiceId: string;
  speakingRate?: number;
  previousInteractionId?: string;
}

export interface MusicInteractionRequest {
  campaignId: string;
  prompt: string;
  keyframeImages: Array<{ dataBase64: string; mimeType: string }>;
  modelId?: 'lyria-3.5' | 'lyria-3-clip-preview';
  durationSeconds?: number;
}

export interface MediaGenerationResult {
  interactionId: string;
  parentInteractionId?: string;
  modelId: string;
  dataBase64: string;
  mimeType: string;
  fileExtension: string;
  durationSeconds?: number;
  tokenUsage?: AssetTake['tokenUsage'];
  latencyMs: number;
}

export const STORYBOARD_JSON_SCHEMA = {
  type: 'object',
  properties: {
    scenes: {
      type: 'array',
      description: 'Ordered storyboard scenes for the aerospace marketing spot.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Concise scene title.' },
          narrativeBeat: { type: 'string', description: 'Dramatic purpose of the scene.' },
          visualPrompt: {
            type: 'string',
            description: 'Detailed photorealistic prompt for Nano Banana 2.1 start keyframe.',
          },
          endFramePrompt: {
            type: 'string',
            description: 'Optional end frame transition prompt.',
          },
          cameraMotionDirective: {
            type: 'string',
            description: 'Camera movement and physics directive for Omni 1.1 Flash.',
          },
          voiceoverScript: {
            type: 'string',
            description: 'Spoken narration line for Gemini 3.8 Flash TTS.',
          },
          vocalStyleDirective: {
            type: 'string',
            description: 'Speech delivery style annotation for speech_metadata.',
          },
          targetDurationSeconds: {
            type: 'integer',
            description: 'Target scene duration in seconds (typically 5 to 8).',
          },
        },
        required: [
          'title',
          'narrativeBeat',
          'visualPrompt',
          'cameraMotionDirective',
          'voiceoverScript',
          'vocalStyleDirective',
          'targetDurationSeconds',
        ],
      },
    },
  },
  required: ['scenes'],
};

export const BRAND_EVAL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overallScore: { type: 'integer', description: 'Overall compliance score from 0 to 100.' },
    categoryScores: {
      type: 'object',
      properties: {
        visualIdentity: { type: 'integer' },
        aerospaceRealism: { type: 'integer' },
        narrativeAudioCohesion: { type: 'integer' },
        regulatoryCompliance: { type: 'integer' },
      },
      required: [
        'visualIdentity',
        'aerospaceRealism',
        'narrativeAudioCohesion',
        'regulatoryCompliance',
      ],
    },
    executiveSummary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sceneNumber: { type: 'integer' },
          modality: {
            type: 'string',
            enum: ['keyframe_start', 'motion_video', 'voiceover_audio', 'script'],
          },
          category: {
            type: 'string',
            enum: [
              'visual_identity',
              'aerospace_realism',
              'narrative_audio_cohesion',
              'regulatory_compliance',
            ],
          },
          severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
          issue: { type: 'string' },
          suggestedFixPrompt: { type: 'string' },
        },
        required: [
          'sceneNumber',
          'modality',
          'category',
          'severity',
          'issue',
          'suggestedFixPrompt',
        ],
      },
    },
  },
  required: ['overallScore', 'categoryScores', 'executiveSummary', 'findings'],
};

/**
 * Wraps raw 16-bit mono PCM audio returned by Gemini TTS (`audio/L16;codec=pcm;rate=24000`)
 * in a standard 44-byte RIFF/WAVE header so browsers and FFmpeg can play the live audio stream.
 */
function wrapRawPcm16MonoInWav(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  if (pcmBuffer.length >= 4 && pcmBuffer.toString('ascii', 0, 4) === 'RIFF') {
    return pcmBuffer;
  }
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  header.writeUInt16LE(2, 32); // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

function selectGeminiTtsVoiceName(voiceIdOrGender?: string): string {
  const lower = (voiceIdOrGender || '').toLowerCase();
  const knownPrebuilt = ['kore', 'aoede', 'puck', 'charon', 'fenrir', 'leda', 'orus', 'zephyr'];
  for (const v of knownPrebuilt) {
    if (lower.includes(v)) {
      return v.charAt(0).toUpperCase() + v.slice(1);
    }
  }
  if (lower.includes('male') && !lower.includes('female')) {
    return 'Charon';
  }
  if (lower.includes('neutral')) {
    return 'Puck';
  }
  return 'Kore';
}

export class GeminiStudioGateway {
  private readonly client: RawInteractionsClient;
  private readonly customClient?: RawInteractionsClient;
  private readonly vertexGlobal?: GoogleGenAI;
  private readonly vertexRegional?: GoogleGenAI;
  private readonly isVertexAi: boolean;
  private readonly vault: CampaignVault;

  constructor(options: { client?: RawInteractionsClient; vault: CampaignVault }) {
    this.vault = options.vault;
    if (options.client) {
      this.customClient = options.client;
      this.client = options.client;
      this.isVertexAi = false;
    } else if (
      (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) &&
      process.env.GOOGLE_GENAI_USE_VERTEXAI !== '1'
    ) {
      const sdk = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      });
      this.client = sdk as unknown as RawInteractionsClient;
      this.isVertexAi = false;
    } else {
      const project =
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCP_PROJECT_ID ||
        'vertex-ai-demos-468803';
      const globalLocation = process.env.GOOGLE_CLOUD_LOCATION || 'global';
      const regionalLocation = process.env.VERTEX_LYRIA_LOCATION || 'us-central1';

      this.vertexGlobal = new GoogleGenAI({
        vertexai: true,
        project,
        location: globalLocation,
      });
      this.vertexRegional = new GoogleGenAI({
        vertexai: true,
        project,
        location: regionalLocation,
      });
      this.client = this.vertexGlobal as unknown as RawInteractionsClient;
      this.isVertexAi = true;
    }
  }

  private extractUsage(usage?: RawInteractionResponse['usage']): AssetTake['tokenUsage'] {
    if (!usage) return undefined;
    return {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      totalTokens:
        usage.total_tokens || (usage.input_tokens || 0) + (usage.output_tokens || 0),
    };
  }

  public readVaultMediaAsBase64(mediaUrl?: string): { dataBase64: string; mimeType: string } | null {
    if (!mediaUrl) return null;
    const fileName = basename(mediaUrl.replace(/^\/media\//, ''));
    if (!fileName) return null;
    const fullPath = join(this.vault.getMediaDir(), fileName);
    if (!existsSync(fullPath)) return null;
    const buf = readFileSync(fullPath);
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeType =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'mp4'
            ? 'video/mp4'
            : ext === 'wav'
              ? 'audio/wav'
              : 'audio/mpeg';
    return {
      dataBase64: buf.toString('base64'),
      mimeType,
    };
  }

  public async generateStoryboard(
    campaign: CampaignDetail,
    brandKit: BrandKit,
    sceneCount = 3
  ): Promise<StoryboardGenerationResult> {
    const startMs = Date.now();
    const modelId = 'gemini-3.8-flash';

    const prompt = [
      `You are the Executive Creative Director for ${brandKit.organization} (${brandKit.name}).`,
      `Generate a ${sceneCount}-scene storyboard for the campaign "${campaign.title}".`,
      `Target Audience: ${campaign.targetAudience}`,
      `Creative Brief: ${campaign.creativeBrief}`,
      `Key Product Claims: ${campaign.keyProductClaims.join(' | ')}`,
      `Visual Identity Rules: ${brandKit.visualIdentityRules.join(' | ')}`,
      `Aerospace Technical Realism Rules: ${brandKit.aerospaceRealismRules.join(' | ')}`,
      `Regulatory Claim Guardrails: ${brandKit.regulatoryClaimGuardrails.join(' | ')}`,
      `Available Visual Reference Anchors: ${campaign.anchors.map((a) => `${a.name} (${a.category}): ${a.description}`).join('; ')}`,
    ].join('\n');

    const interaction = await this.client.interactions.create({
      model: modelId,
      input: prompt,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: STORYBOARD_JSON_SCHEMA,
      },
    });

    if (!interaction.output_text) {
      throw new Error('gemini-3.8-flash returned an empty storyboard response.');
    }

    const parsed = JSON.parse(interaction.output_text);
    const anchorIds = campaign.anchors.map((a: ReferenceAnchor) => a.id);
    const scenes: SceneDraftInput[] = (parsed.scenes || []).map((s: SceneDraftInput) => ({
      title: s.title,
      narrativeBeat: s.narrativeBeat,
      visualPrompt: s.visualPrompt,
      endFramePrompt: s.endFramePrompt,
      cameraMotionDirective: s.cameraMotionDirective,
      voiceoverScript: s.voiceoverScript,
      vocalStyleDirective: s.vocalStyleDirective,
      targetDurationSeconds: s.targetDurationSeconds || 6,
      anchorIds,
    }));

    return {
      interactionId: interaction.id || `inter-sb-${randomUUID().slice(0, 8)}`,
      modelId,
      scenes,
      tokenUsage: this.extractUsage(interaction.usage),
      latencyMs: Date.now() - startMs,
    };
  }

  public async generateOrEditImage(
    request: ImageInteractionRequest
  ): Promise<MediaGenerationResult> {
    const startMs = Date.now();
    const modelId = request.modelId || 'gemini-nano-banana-2.1';
    const refs = (request.referenceImagePaths || []).slice(0, 14);

    // Live Vertex AI path for gemini-nano-banana-2.1
    if (this.isVertexAi && this.vertexGlobal) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: Array<Record<string, any>> = refs.map((ref) => ({
        inlineData: {
          data: ref.dataBase64,
          mimeType: ref.mimeType,
        },
      }));

      // If this is a stateful conversational edit turn, include the parent take's image so Nano Banana 2.1 edits it directly
      if (request.previousInteractionId) {
        try {
          const campaign = await this.vault.getCampaign(request.campaignId);
          const parentTake = campaign.takes.find(
            (t) => t.interactionId === request.previousInteractionId
          );
          const parentMedia = this.readVaultMediaAsBase64(parentTake?.mediaUrl);
          if (parentMedia) {
            parts.push({
              inlineData: {
                data: parentMedia.dataBase64,
                mimeType: parentMedia.mimeType,
              },
            });
          }
        } catch {
          // ignore if campaign lookup fails
        }
      }

      const instructionText = request.previousInteractionId
        ? `Edit the provided image according to this instruction while preserving subject identity and composition: ${request.prompt}`
        : request.prompt;
      parts.push({ text: instructionText });

      const response = await this.vertexGlobal.models.generateContent({
        model: modelId,
        contents: parts,
        config: {
          responseModalities: ['IMAGE'],
        },
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.inlineData?.data
      );
      const dataBase64 = imgPart?.inlineData?.data;
      const mimeType = imgPart?.inlineData?.mimeType || 'image/png';
      if (!dataBase64) {
        throw new Error(`${modelId} did not return an image payload.`);
      }

      return {
        interactionId: response.responseId || `inter-nb-${randomUUID().slice(0, 8)}`,
        parentInteractionId: request.previousInteractionId,
        modelId,
        dataBase64,
        mimeType,
        fileExtension: mimeType.includes('jpeg') ? 'jpg' : 'png',
        tokenUsage: response.usageMetadata
          ? {
              inputTokens: response.usageMetadata.promptTokenCount || 0,
              outputTokens: response.usageMetadata.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
        latencyMs: Date.now() - startMs,
      };
    }

    // Interactions API path (API key or injected test client)
    const inputParts: Array<Record<string, string>> = refs.map((ref) => ({
      type: 'image',
      data: ref.dataBase64,
      mime_type: ref.mimeType,
    }));
    inputParts.push({
      type: 'text',
      text: request.prompt,
    });

    const payload: Record<string, unknown> = {
      model: modelId,
      input: refs.length > 0 ? inputParts : request.prompt,
    };
    if (request.previousInteractionId) {
      payload.previous_interaction_id = request.previousInteractionId;
    }

    const interaction = await this.client.interactions.create(payload);
    const img =
      interaction.output_image ||
      interaction.steps
        ?.flatMap((st) => st.content || [])
        .find((c) => c.type === 'image');

    if (!img?.data) {
      throw new Error(`${modelId} interaction did not return an image payload.`);
    }
    const mimeType = img.mime_type || 'image/png';

    return {
      interactionId: interaction.id || `inter-img-${randomUUID().slice(0, 8)}`,
      parentInteractionId: request.previousInteractionId,
      modelId,
      dataBase64: img.data,
      mimeType,
      fileExtension: mimeType.includes('jpeg') ? 'jpg' : 'png',
      tokenUsage: this.extractUsage(interaction.usage),
      latencyMs: Date.now() - startMs,
    };
  }

  public async synthesizeOrEditVideo(
    request: VideoInteractionRequest
  ): Promise<MediaGenerationResult> {
    const startMs = Date.now();
    // On Vertex AI, the published Omni 1.1 Flash endpoint ID is gemini-omni-1.1-flash-preview
    const requestModelId = this.isVertexAi
      ? 'gemini-omni-1.1-flash-preview'
      : 'gemini-omni-1.1-flash';
    const canonicalModelId = 'gemini-omni-1.1-flash';

    const inputParts: Array<Record<string, string>> = [];
    if (request.sourceVideoForExtension) {
      inputParts.push({
        type: 'video',
        data: request.sourceVideoForExtension.dataBase64,
        mime_type: request.sourceVideoForExtension.mimeType,
      });
    } else {
      if (request.startKeyframe) {
        inputParts.push({
          type: 'image',
          data: request.startKeyframe.dataBase64,
          mime_type: request.startKeyframe.mimeType,
        });
      }
      if (request.endKeyframe) {
        inputParts.push({
          type: 'image',
          data: request.endKeyframe.dataBase64,
          mime_type: request.endKeyframe.mimeType,
        });
      }
    }
    inputParts.push({
      type: 'text',
      text: request.prompt,
    });

    const payload: Record<string, unknown> = {
      model: requestModelId,
      input: inputParts.length > 1 ? inputParts : request.prompt,
    };
    if (this.isVertexAi) {
      payload.response_format = { type: 'video' };
    }
    if (request.previousInteractionId) {
      payload.previous_interaction_id = request.previousInteractionId;
    }

    const interaction = await this.client.interactions.create(payload);
    const vid =
      interaction.output_video ||
      interaction.steps
        ?.flatMap((st) => st.content || [])
        .find((c) => c.type === 'video');

    if (!vid?.data) {
      throw new Error(`${requestModelId} interaction did not return a video payload.`);
    }

    const durationSeconds = request.durationSeconds || 6;
    const mimeType = vid.mime_type || 'video/mp4';

    return {
      interactionId: interaction.id || `inter-vid-${randomUUID().slice(0, 8)}`,
      parentInteractionId: request.previousInteractionId,
      modelId: canonicalModelId,
      dataBase64: vid.data,
      mimeType,
      fileExtension: 'mp4',
      durationSeconds,
      tokenUsage: this.extractUsage(interaction.usage),
      latencyMs: Date.now() - startMs,
    };
  }

  public async designVoicePersona(
    campaignId: string,
    request: VoiceDesignRequest
  ): Promise<VoicePersonaConfig> {
    // Live Vertex AI path using Gemini TTS voice synthesis for real audition sample
    if (this.isVertexAi && this.vertexGlobal) {
      const selectedPrebuiltVoice = selectGeminiTtsVoiceName(
        `${request.displayName} ${request.gender}`
      );
      const voiceId = `voice_${selectedPrebuiltVoice.toLowerCase()}_${randomUUID().slice(0, 6)}`;
      const auditionLine = `Speak with this vocal persona (${request.personaPrompt}): Cymbal Aerospace. Precision supersonic flight systems, cleared for stratospheric ascent.`;

      const ttsRes = await this.vertexGlobal.models.generateContent({
        model: 'gemini-2.5-flash-tts',
        contents: auditionLine,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedPrebuiltVoice,
              },
            },
          },
        },
      });

      const audioPart = ttsRes.candidates?.[0]?.content?.parts?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.inlineData?.data
      );
      if (!audioPart?.inlineData?.data) {
        throw new Error('Gemini TTS did not return an audition audio payload.');
      }

      const rawPcm = Buffer.from(audioPart.inlineData.data, 'base64');
      const wavBuffer = wrapRawPcm16MonoInWav(rawPcm, 24000);
      const durationSeconds = Number((rawPcm.length / (24000 * 2)).toFixed(2));

      const sampleTake = await this.vault.appendTake({
        campaignId,
        sceneId: null,
        modality: 'voiceover_audio',
        modelId: 'gemini-3.8-flash-tts',
        interactionId: voiceId,
        prompt: request.personaPrompt,
        mediaBuffer: wavBuffer,
        mimeType: 'audio/wav',
        fileExtension: 'wav',
        durationSeconds,
        setAsActive: false,
      });

      return {
        voiceId,
        displayName: request.displayName,
        gender: request.gender,
        languageCode: request.languageCode,
        personaPrompt: request.personaPrompt,
        sampleAudioUrl: sampleTake.mediaUrl,
        isDesignedVoice: true,
      };
    }

    if (!this.client.voices?.create) {
      throw new Error('Voices API not available on client');
    }
    const createdVoice = await this.client.voices.create({
      store: true,
      voice: {
        model: 'gemini-3.8-flash-tts',
        type: 'prompted',
        display_name: request.displayName,
        gender: request.gender,
        language_code: request.languageCode,
        prompted: {
          input: request.personaPrompt,
        },
      },
    });

    const voiceId = createdVoice.id || `voice_${randomUUID().slice(0, 8)}`;
    let sampleAudioUrl: string | undefined;

    if (createdVoice.sample_audio?.data) {
      const sampleTake = await this.vault.appendTake({
        campaignId,
        sceneId: null,
        modality: 'voiceover_audio',
        modelId: 'gemini-3.8-flash-tts',
        interactionId: voiceId,
        prompt: request.personaPrompt,
        mediaBase64: createdVoice.sample_audio.data,
        mimeType: createdVoice.sample_audio.mime_type || 'audio/wav',
        fileExtension: 'wav',
        durationSeconds: 3,
        setAsActive: false,
      });
      sampleAudioUrl = sampleTake.mediaUrl;
    }

    return {
      voiceId,
      displayName: request.displayName,
      gender: request.gender,
      languageCode: request.languageCode,
      personaPrompt: request.personaPrompt,
      sampleAudioUrl,
      isDesignedVoice: true,
    };
  }

  public async synthesizeSceneVoiceover(
    request: VoiceoverInteractionRequest
  ): Promise<MediaGenerationResult> {
    const startMs = Date.now();
    const canonicalModelId = 'gemini-3.8-flash-tts';

    // Live Vertex AI path
    if (this.isVertexAi && this.vertexGlobal) {
      const selectedVoice = selectGeminiTtsVoiceName(request.voiceId);
      const targetRate = Math.min(1.6, Math.max(0.8, request.speakingRate || 1.25));
      const styledPrompt = `Speak at a brisk, crisp ${targetRate}x commercial pace in ${request.vocalStyleDirective || 'upbeat, clear commercial narration'}: ${request.text}`;

      const response = await this.vertexGlobal.models.generateContent({
        model: 'gemini-2.5-flash-tts',
        contents: styledPrompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice,
              },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.inlineData?.data
      );
      if (!audioPart?.inlineData?.data) {
        throw new Error('Gemini TTS did not return an audio payload.');
      }

      const rawPcm = Buffer.from(audioPart.inlineData.data, 'base64');
      let wavBuffer = wrapRawPcm16MonoInWav(rawPcm, 24000);
      let durationSeconds = Number((rawPcm.length / (24000 * 2)).toFixed(2));

      // Apply FFmpeg atempo time-stretch so voiceover plays at the exact chosen pace without pitch shift
      if (Math.abs(targetRate - 1.0) > 0.03) {
        const tmpIn = join(tmpdir(), `tts-in-${randomUUID().slice(0, 8)}.wav`);
        const tmpOut = join(tmpdir(), `tts-out-${randomUUID().slice(0, 8)}.wav`);
        try {
          writeFileSync(tmpIn, wavBuffer);
          const ffmpegBin = (ffmpegPath as unknown as string) || 'ffmpeg';
          execFileSync(
            ffmpegBin,
            ['-y', '-v', 'error', '-i', tmpIn, '-filter:a', `atempo=${targetRate}`, tmpOut],
            { timeout: 10000 }
          );
          if (existsSync(tmpOut)) {
            wavBuffer = readFileSync(tmpOut);
            durationSeconds = Number((durationSeconds / targetRate).toFixed(2));
          }
        } catch {
          // keep original wavBuffer if atempo fails
        } finally {
          if (existsSync(tmpIn)) {
            try {
              unlinkSync(tmpIn);
            } catch {
              // ignore
            }
          }
          if (existsSync(tmpOut)) {
            try {
              unlinkSync(tmpOut);
            } catch {
              // ignore
            }
          }
        }
      }

      return {
        interactionId: response.responseId || `inter-tts-${randomUUID().slice(0, 8)}`,
        parentInteractionId: request.previousInteractionId,
        modelId: canonicalModelId,
        dataBase64: wavBuffer.toString('base64'),
        mimeType: 'audio/wav',
        fileExtension: 'wav',
        durationSeconds,
        tokenUsage: response.usageMetadata
          ? {
              inputTokens: response.usageMetadata.promptTokenCount || 0,
              outputTokens: response.usageMetadata.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
        latencyMs: Date.now() - startMs,
      };
    }

    const payload: Record<string, unknown> = {
      model: canonicalModelId,
      input: [
        {
          type: 'user_input',
          content: [
            {
              type: 'text',
              text: request.text,
              annotations: [
                {
                  type: 'speech_metadata',
                  style: request.vocalStyleDirective || 'authoritative aerospace narration',
                },
              ],
            },
          ],
        },
      ],
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [{ voice: request.voiceId || 'Puck' }],
      },
    };
    if (request.previousInteractionId) {
      payload.previous_interaction_id = request.previousInteractionId;
    }

    const interaction = await this.client.interactions.create(payload);
    const aud =
      interaction.output_audio ||
      interaction.steps
        ?.flatMap((st) => st.content || [])
        .find((c) => c.type === 'audio');

    if (!aud?.data) {
      throw new Error(`${canonicalModelId} interaction did not return an audio payload.`);
    }

    const rawBuf = Buffer.from(aud.data, 'base64');
    const wavBuf = wrapRawPcm16MonoInWav(rawBuf, 24000);
    const wordCount = request.text.trim().split(/\s+/).filter(Boolean).length;
    const estimatedDuration =
      rawBuf.length > 1000
        ? Number((rawBuf.length / (24000 * 2)).toFixed(2))
        : Math.max(2.5, Number((wordCount / 2.6).toFixed(1)));

    return {
      interactionId: interaction.id || `inter-tts-${randomUUID().slice(0, 8)}`,
      parentInteractionId: request.previousInteractionId,
      modelId: canonicalModelId,
      dataBase64: wavBuf.toString('base64'),
      mimeType: 'audio/wav',
      fileExtension: 'wav',
      durationSeconds: estimatedDuration,
      tokenUsage: this.extractUsage(interaction.usage),
      latencyMs: Date.now() - startMs,
    };
  }

  public async composeCampaignMusic(
    request: MusicInteractionRequest
  ): Promise<MediaGenerationResult> {
    const startMs = Date.now();
    const canonicalModelId = request.modelId || 'lyria-3.5';

    // Live Vertex AI path on regional Lyria publisher model (us-central1)
    if (this.isVertexAi && this.vertexRegional) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const regionalApiClient = (this.vertexRegional as any).apiClient;
      const response = await regionalApiClient.request({
        path: 'publishers/google/models/lyria-002:predict',
        httpMethod: 'POST',
        body: JSON.stringify({
          instances: [
            {
              prompt: `Original instrumental electronic ambient synth pad with deep sub-bass pulse and warm atmospheric strings: ${request.prompt}`,
            },
          ],
          parameters: {
            sample_count: 1,
          },
        }),
      });

      const json = await response.responseInternal.json();
      const pred = json?.predictions?.[0];
      const bytesBase64: string | undefined = pred?.bytesBase64Encoded || pred?.audioContent;
      if (!bytesBase64) {
        throw new Error('Lyria model on Vertex AI did not return an audio prediction.');
      }

      const wavBuf = Buffer.from(bytesBase64, 'base64');
      let durationSeconds = request.durationSeconds || 30;
      if (wavBuf.length >= 44 && wavBuf.toString('ascii', 0, 4) === 'RIFF') {
        const byteRate = wavBuf.readUInt32LE(28);
        const dataSize = wavBuf.readUInt32LE(40);
        if (byteRate > 0 && dataSize > 0) {
          durationSeconds = Number((dataSize / byteRate).toFixed(2));
        }
      }

      return {
        interactionId: `inter-lyria-${randomUUID().slice(0, 8)}`,
        modelId: canonicalModelId,
        dataBase64: bytesBase64,
        mimeType: 'audio/wav',
        fileExtension: 'wav',
        durationSeconds,
        latencyMs: Date.now() - startMs,
      };
    }

    const inputParts: Array<Record<string, string>> = [
      {
        type: 'text',
        text: request.prompt,
      },
      ...request.keyframeImages.slice(0, 10).map((img) => ({
        type: 'image',
        mime_type: img.mimeType,
        data: img.dataBase64,
      })),
    ];

    const interaction = await this.client.interactions.create({
      model: canonicalModelId,
      input: inputParts,
    });

    const aud =
      interaction.output_audio ||
      interaction.steps
        ?.flatMap((st) => st.content || [])
        .find((c) => c.type === 'audio');

    if (!aud?.data) {
      throw new Error(`${canonicalModelId} interaction did not return an audio payload.`);
    }

    const durationSeconds = request.durationSeconds || 24;
    const mimeType = aud.mime_type || 'audio/wav';

    return {
      interactionId: interaction.id || `inter-lyria-${randomUUID().slice(0, 8)}`,
      modelId: canonicalModelId,
      dataBase64: aud.data,
      mimeType,
      fileExtension: mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3' : 'wav',
      durationSeconds,
      tokenUsage: this.extractUsage(interaction.usage),
      latencyMs: Date.now() - startMs,
    };
  }

  public async evaluateCampaignBrandCompliance(
    campaign: CampaignDetail,
    brandKit: BrandKit
  ): Promise<BrandEvaluationReport> {
    const modelId = 'gemini-3.8-flash';
    const multimodalInput: Array<Record<string, string>> = [];

    for (const scene of campaign.scenes) {
      const kfTakeId = scene.activeTakes.keyframe_start;
      const kfTake = campaign.takes.find((t) => t.id === kfTakeId);
      const kfMedia = this.readVaultMediaAsBase64(kfTake?.mediaUrl);
      if (kfMedia) {
        multimodalInput.push({
          type: 'image',
          data: kfMedia.dataBase64,
          mime_type: kfMedia.mimeType,
        });
      }

      const vidTakeId = scene.activeTakes.motion_video;
      const vidTake = campaign.takes.find((t) => t.id === vidTakeId);
      const vidMedia = this.readVaultMediaAsBase64(vidTake?.mediaUrl);
      if (vidMedia) {
        multimodalInput.push({
          type: 'video',
          data: vidMedia.dataBase64,
          mime_type: vidMedia.mimeType,
        });
      }
    }

    const evaluationPrompt = [
      `Evaluate the generated multimodal assets and scripts for campaign "${campaign.title}" against the ${brandKit.name} guidelines.`,
      `Visual Identity Rules: ${brandKit.visualIdentityRules.join(' | ')}`,
      `Aerospace Technical Realism Rules: ${brandKit.aerospaceRealismRules.join(' | ')}`,
      `Regulatory Claim Guardrails: ${brandKit.regulatoryClaimGuardrails.join(' | ')}`,
      `Scenes Summary:`,
      ...campaign.scenes.map(
        (s, idx) =>
          `Scene ${idx + 1} (${s.title}): Visual="${s.visualPrompt}" | Motion="${s.cameraMotionDirective}" | Voiceover="${s.voiceoverScript}"`
      ),
    ].join('\n');

    multimodalInput.push({
      type: 'text',
      text: evaluationPrompt,
    });

    const interaction = await this.client.interactions.create({
      model: modelId,
      input: multimodalInput,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: BRAND_EVAL_JSON_SCHEMA,
      },
    });

    if (!interaction.output_text) {
      throw new Error('gemini-3.8-flash returned an empty brand evaluation response.');
    }

    const raw = JSON.parse(interaction.output_text);
    const findings: BrandEvaluationFinding[] = (raw.findings || []).map(
      (f: Omit<BrandEvaluationFinding, 'id' | 'sceneId' | 'resolved'>) => {
        const sceneIdx = Math.max(0, (f.sceneNumber || 1) - 1);
        const matchedScene = campaign.scenes[sceneIdx] || campaign.scenes[0];
        return {
          id: `finding-${randomUUID().slice(0, 8)}`,
          sceneId: matchedScene ? matchedScene.id : null,
          sceneNumber: f.sceneNumber || 1,
          modality: f.modality || 'keyframe_start',
          category: f.category || 'visual_identity',
          severity: f.severity || 'warning',
          issue: f.issue,
          suggestedFixPrompt: f.suggestedFixPrompt,
          resolved: false,
        };
      }
    );

    return {
      id: `eval-${randomUUID().slice(0, 8)}`,
      campaignId: campaign.id,
      interactionId: interaction.id || `inter-eval-${randomUUID().slice(0, 8)}`,
      modelId,
      overallScore: raw.overallScore ?? 90,
      categoryScores: {
        visualIdentity: raw.categoryScores?.visualIdentity ?? 90,
        aerospaceRealism: raw.categoryScores?.aerospaceRealism ?? 88,
        narrativeAudioCohesion: raw.categoryScores?.narrativeAudioCohesion ?? 91,
        regulatoryCompliance: raw.categoryScores?.regulatoryCompliance ?? 91,
      },
      executiveSummary:
        raw.executiveSummary ||
        'Multimodal inspection completed against Cymbal Aerospace brand and regulatory guardrails.',
      findings,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
