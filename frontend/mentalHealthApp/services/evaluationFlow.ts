import type { UserPreferences } from "@/services/apiService";

export type EvaluationModality = "face" | "audio" | "text";

export const DEFAULT_EVALUATION_PREFERENCES: UserPreferences = {
  pref_eval_image: true,
  pref_eval_audio: true,
  pref_eval_text: true,
};

const modalityToPreferenceKey: Record<EvaluationModality, keyof UserPreferences> = {
  face: "pref_eval_image",
  audio: "pref_eval_audio",
  text: "pref_eval_text",
};

export function isModalityEnabled(
  modality: EvaluationModality,
  preferences: UserPreferences
) {
  return preferences[modalityToPreferenceKey[modality]];
}

export function hasAnyEnabledModality(preferences: UserPreferences) {
  return (
    preferences.pref_eval_image ||
    preferences.pref_eval_audio ||
    preferences.pref_eval_text
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
