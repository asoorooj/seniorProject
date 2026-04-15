import type { UserPreferences } from "@/services/apiService";

export type EvaluationModality = "face" | "audio" | "text";

export const DEFAULT_EVALUATION_PREFERENCES: UserPreferences = {
  eval_face: true,
  eval_audio: true,
  eval_text: true,
};

const modalityToPreferenceKey: Record<EvaluationModality, keyof UserPreferences> = {
  face: "eval_face",
  audio: "eval_audio",
  text: "eval_text",
};

export function isModalityEnabled(
  modality: EvaluationModality,
  preferences: UserPreferences
) {
  return preferences[modalityToPreferenceKey[modality]];
}

export function hasAnyEnabledModality(preferences: UserPreferences) {
  return (
    preferences.eval_face ||
    preferences.eval_audio ||
    preferences.eval_text
  );
}

export function getNextModality(
  current: EvaluationModality,
  preferences: UserPreferences
): EvaluationModality | null {
  const order: EvaluationModality[] = ["face", "audio", "text"];
  const currentIndex = order.indexOf(current);
  for (let i = currentIndex + 1; i < order.length; i += 1) {
    const modality = order[i];
    if (isModalityEnabled(modality, preferences)) {
      return modality;
    }
  }
  return null;
}
