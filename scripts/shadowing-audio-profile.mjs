export const SHADOWING_VOICE_PROFILES = Object.freeze({
  study: Object.freeze({
    speedScale: 0.92,
    pitchScale: 0,
    intonationScale: 1.05,
    volumeScale: 1,
    prePhonemeLength: 0.12,
    postPhonemeLength: 0.32,
    pauseScale: 1,
    maxPauseLength: Number.POSITIVE_INFINITY,
    outputSamplingRate: 24000,
    outputStereo: false
  }),
  'natural-male': Object.freeze({
    speedScale: 1,
    pitchScale: 0,
    intonationScale: 1.08,
    volumeScale: 1,
    prePhonemeLength: 0.08,
    postPhonemeLength: 0.16,
    pauseScale: 0.72,
    maxPauseLength: 0.34,
    outputSamplingRate: 24000,
    outputStereo: false
  })
});

export function applyShadowingVoiceProfile(query, profileName = 'study') {
  const profile = SHADOWING_VOICE_PROFILES[profileName];
  if (!profile) {
    throw new Error(`Unknown shadowing voice profile: ${profileName}`);
  }

  Object.assign(query, {
    speedScale: profile.speedScale,
    pitchScale: profile.pitchScale,
    intonationScale: profile.intonationScale,
    volumeScale: profile.volumeScale,
    prePhonemeLength: profile.prePhonemeLength,
    postPhonemeLength: profile.postPhonemeLength,
    outputSamplingRate: profile.outputSamplingRate,
    outputStereo: profile.outputStereo
  });

  let adjustedPauseCount = 0;
  for (const phrase of query.accent_phrases || []) {
    const pause = phrase.pause_mora;
    if (!pause || !Number.isFinite(Number(pause.vowel_length))) continue;

    const originalLength = Number(pause.vowel_length);
    pause.vowel_length = Math.min(originalLength * profile.pauseScale, profile.maxPauseLength);
    if (pause.vowel_length !== originalLength) adjustedPauseCount += 1;
  }

  return { profileName, adjustedPauseCount };
}
