export const KANA_AUDIO_PROFILE = Object.freeze({
  speedScale: 0.8,
  pitchScale: 0,
  intonationScale: 1,
  volumeScale: 1,
  prePhonemeLength: 0.1,
  postPhonemeLength: 0.2,
  minimumSpokenDurationSeconds: 0.22,
  minimumClearUVowelSeconds: 0.185,
  outputSamplingRate: 24000,
  outputStereo: false
});

const KANA_SPECIFIC_PROFILES = Object.freeze({
  'ヨ': { consonant: 'y', minimumConsonantSeconds: 0.145, minimumVowelSeconds: 0.195 },
  'ロ': { consonant: 'r', minimumConsonantSeconds: 0.115, minimumVowelSeconds: 0.185 }
});

export function applyKanaLearningProfile(query, kata = '') {
  const moras = query.accent_phrases?.flatMap(phrase => phrase.moras) || [];
  if (!moras.length) throw new Error('VOICEVOX audio query did not contain any moras.');

  Object.assign(query, {
    speedScale: KANA_AUDIO_PROFILE.speedScale,
    pitchScale: KANA_AUDIO_PROFILE.pitchScale,
    intonationScale: KANA_AUDIO_PROFILE.intonationScale,
    volumeScale: KANA_AUDIO_PROFILE.volumeScale,
    prePhonemeLength: KANA_AUDIO_PROFILE.prePhonemeLength,
    postPhonemeLength: KANA_AUDIO_PROFILE.postPhonemeLength,
    outputSamplingRate: KANA_AUDIO_PROFILE.outputSamplingRate,
    outputStereo: KANA_AUDIO_PROFILE.outputStereo
  });

  let uVowelAdjustedCount = 0;
  for (const mora of moras) {
    if (mora.vowel === 'u' && mora.vowel_length / query.speedScale < KANA_AUDIO_PROFILE.minimumClearUVowelSeconds) {
      mora.vowel_length = KANA_AUDIO_PROFILE.minimumClearUVowelSeconds * query.speedScale;
      uVowelAdjustedCount += 1;
    }
  }

  let targetedAdjustmentCount = 0;
  const specificProfile = KANA_SPECIFIC_PROFILES[kata];
  if (specificProfile) {
    const mora = moras.find(candidate => candidate.consonant === specificProfile.consonant);
    if (!mora) throw new Error(`${kata} did not contain the expected ${specificProfile.consonant} consonant.`);

    if (mora.consonant_length / query.speedScale < specificProfile.minimumConsonantSeconds) {
      mora.consonant_length = specificProfile.minimumConsonantSeconds * query.speedScale;
      targetedAdjustmentCount += 1;
    }
    if (mora.vowel_length / query.speedScale < specificProfile.minimumVowelSeconds) {
      mora.vowel_length = specificProfile.minimumVowelSeconds * query.speedScale;
      targetedAdjustmentCount += 1;
    }
  }

  const rawSpokenDuration = moras.reduce((total, mora) => (
    total + (Number(mora.consonant_length) || 0) + (Number(mora.vowel_length) || 0)
  ), 0);
  const spokenDuration = rawSpokenDuration / query.speedScale;
  const missingSpokenDuration = Math.max(0, KANA_AUDIO_PROFILE.minimumSpokenDurationSeconds - spokenDuration);

  if (missingSpokenDuration > 0) {
    const adjustableMoras = moras.filter(mora => Number.isFinite(Number(mora.vowel_length)));
    if (!adjustableMoras.length) throw new Error('VOICEVOX audio query did not contain an adjustable vowel.');
    const extraVowelLength = missingSpokenDuration * query.speedScale / adjustableMoras.length;
    for (const mora of adjustableMoras) mora.vowel_length = Number(mora.vowel_length) + extraVowelLength;
  }

  return {
    adjusted: missingSpokenDuration > 0 || uVowelAdjustedCount > 0 || targetedAdjustmentCount > 0,
    targetedAdjustmentCount,
    uVowelAdjustedCount,
    spokenDurationBefore: spokenDuration,
    spokenDurationAfter: Math.max(spokenDuration, KANA_AUDIO_PROFILE.minimumSpokenDurationSeconds)
  };
}
