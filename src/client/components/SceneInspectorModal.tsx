import React, { useEffect, useState } from 'react';
import { Film, Image as ImageIcon, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import type { Modality, Scene } from '../../shared/types.js';
import type { SceneInspectorModalViewModel } from '../viewModel/studioViewModel.js';

export interface SceneInspectorModalProps {
  modalState: SceneInspectorModalViewModel | null;
  busyAction: string | null;
  onClose: () => void;
  onPatchScene: (sceneId: string, patch: Partial<Scene>) => Promise<void>;
  onDeleteScene: (sceneId: string) => Promise<void>;
  onGenerateSceneAsset: (
    sceneId: string,
    modality: 'keyframe_start' | 'motion_video' | 'voiceover_audio',
    options?: {
      promptOverride?: string;
      conversationalEdit?: boolean;
      extendVideo?: boolean;
    }
  ) => Promise<void>;
  onSwitchActiveTake: (sceneId: string, modality: Modality, takeId: string) => Promise<void>;
}

export function SceneInspectorModal({
  modalState,
  busyAction,
  onClose,
  onPatchScene,
  onDeleteScene,
  onGenerateSceneAsset,
  onSwitchActiveTake,
}: SceneInspectorModalProps) {
  const [title, setTitle] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [cameraMotionDirective, setCameraMotionDirective] = useState('');
  const [voiceoverScript, setVoiceoverScript] = useState('');
  const [magicEditPrompt, setMagicEditPrompt] = useState('');
  const [magicEditTarget, setMagicEditTarget] = useState<'keyframe_start' | 'motion_video'>(
    'keyframe_start'
  );

  useEffect(() => {
    if (modalState) {
      setTitle(modalState.title);
      setVisualPrompt(modalState.visualPrompt);
      setCameraMotionDirective(modalState.cameraMotionDirective);
      setVoiceoverScript(modalState.voiceoverScript);
      setMagicEditPrompt('');
    }
  }, [modalState]);

  if (!modalState) return null;

  async function handleSavePrompts(e: React.FormEvent) {
    e.preventDefault();
    if (!modalState) return;
    await onPatchScene(modalState.sceneId, {
      title,
      visualPrompt,
      cameraMotionDirective,
      voiceoverScript,
    });
  }

  return (
    <div
      data-testid="scene-inspector-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#0D1326] border border-slate-700/90 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
              Scene 0{modalState.sceneNumber} Inspector
            </span>
            <h3 className="text-base font-bold text-white">{modalState.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Delete Scene"
              onClick={async () => {
                await onDeleteScene(modalState.sceneId);
                onClose();
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="close-scene-inspector-btn"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prompt & Script Editor Form */}
        <form onSubmit={(e) => void handleSavePrompts(e)} className="space-y-3.5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Scene Title</label>
            <input
              type="text"
              data-testid="inspector-scene-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void onPatchScene(modalState.sceneId, { title })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-semibold text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-sky-300 font-semibold mb-1">
              Visual Keyframe Prompt
            </label>
            <textarea
              rows={3}
              data-testid={`scene-visual-prompt-${modalState.sceneNumber}`}
              value={visualPrompt}
              onChange={(e) => setVisualPrompt(e.target.value)}
              onBlur={() => void onPatchScene(modalState.sceneId, { visualPrompt })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs text-indigo-300 font-semibold mb-1">
              Camera & Motion Directive
            </label>
            <textarea
              rows={2}
              data-testid="inspector-motion-directive-input"
              value={cameraMotionDirective}
              onChange={(e) => setCameraMotionDirective(e.target.value)}
              onBlur={() =>
                void onPatchScene(modalState.sceneId, { cameraMotionDirective })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs text-emerald-300 font-semibold mb-1">
              Spoken Voiceover Script
            </label>
            <textarea
              rows={2}
              data-testid={`scene-voiceover-script-${modalState.sceneNumber}`}
              value={voiceoverScript}
              onChange={(e) => setVoiceoverScript(e.target.value)}
              onBlur={() => void onPatchScene(modalState.sceneId, { voiceoverScript })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid={`inspector-generate-kf-${modalState.sceneNumber}`}
                disabled={busyAction === `${modalState.sceneId}-keyframe_start-gen`}
                onClick={() =>
                  void onGenerateSceneAsset(modalState.sceneId, 'keyframe_start')
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                {busyAction === `${modalState.sceneId}-keyframe_start-gen`
                  ? 'Generating Keyframe...'
                  : 'Generate Keyframe'}
              </button>

              <button
                type="button"
                data-testid={`inspector-generate-motion-${modalState.sceneNumber}`}
                disabled={busyAction === `${modalState.sceneId}-motion_video-gen`}
                onClick={() =>
                  void onGenerateSceneAsset(modalState.sceneId, 'motion_video')
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                {busyAction === `${modalState.sceneId}-motion_video-gen`
                  ? 'Synthesizing Motion...'
                  : 'Synthesize Motion Clip'}
              </button>

              {modalState.canExtendMotion && (
                <button
                  type="button"
                  data-testid={`extend-motion-${modalState.sceneNumber}`}
                  disabled={busyAction === `${modalState.sceneId}-motion_video-ext`}
                  onClick={() =>
                    void onGenerateSceneAsset(modalState.sceneId, 'motion_video', {
                      extendVideo: true,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 text-xs font-semibold cursor-pointer"
                >
                  +4s Extend Clip
                </button>
              )}
            </div>

            <button
              type="submit"
              data-testid="inspector-save-btn"
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>

        {/* Conversational Magic Edit Section */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5" />
              Conversational Magic Edit
            </label>
            <div className="inline-flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setMagicEditTarget('keyframe_start')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  magicEditTarget === 'keyframe_start'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400'
                }`}
              >
                Keyframe
              </button>
              <button
                type="button"
                onClick={() => setMagicEditTarget('motion_video')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  magicEditTarget === 'motion_video'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400'
                }`}
              >
                Motion Clip
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              data-testid={`edit-kf-input-${modalState.sceneNumber}`}
              placeholder="Describe what to refine (e.g., 'Add golden sunset flare on fuselage')..."
              value={magicEditPrompt}
              onChange={(e) => setMagicEditPrompt(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              data-testid={`edit-kf-submit-${modalState.sceneNumber}`}
              disabled={!magicEditPrompt.trim()}
              onClick={async () => {
                await onGenerateSceneAsset(modalState.sceneId, magicEditTarget, {
                  promptOverride: magicEditPrompt,
                  conversationalEdit: true,
                });
                setMagicEditPrompt('');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-40 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Apply Edit
            </button>
          </div>
        </div>

        {/* Take History Selectors (Progressive Disclosure) */}
        {(modalState.keyframeTakes.length > 0 || modalState.motionTakes.length > 0) && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3">
            {modalState.keyframeTakes.length > 0 && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Keyframe Take History ({modalState.keyframeTakes.length})
                </label>
                <select
                  aria-label={`Keyframe Take History Scene ${modalState.sceneNumber}`}
                  value={modalState.activeKeyframeTake?.id || ''}
                  onChange={(e) =>
                    void onSwitchActiveTake(
                      modalState.sceneId,
                      'keyframe_start',
                      e.target.value
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {modalState.keyframeTakes.map((t, idx) => (
                    <option key={t.id} value={t.id}>
                      Take #{modalState.keyframeTakes.length - idx} — {t.prompt.slice(0, 36)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modalState.motionTakes.length > 0 && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Motion Clip History ({modalState.motionTakes.length})
                </label>
                <select
                  aria-label={`Motion Take History Scene ${modalState.sceneNumber}`}
                  value={modalState.activeMotionTake?.id || ''}
                  onChange={(e) =>
                    void onSwitchActiveTake(
                      modalState.sceneId,
                      'motion_video',
                      e.target.value
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {modalState.motionTakes.map((t, idx) => (
                    <option key={t.id} value={t.id}>
                      Take #{modalState.motionTakes.length - idx} ({t.durationSeconds || 6}s)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
