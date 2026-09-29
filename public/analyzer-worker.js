// Runs Essentia.js analysis in a background thread so the page stays responsive.
// Receives: { samples: Float32Array } (mono, 44100 Hz)
// Replies:  { ok: true, bpm, key, scale } or { ok: false, error }

// The Essentia WASM build ends with `exports.EssentiaWASM = Module`, so give it an `exports` object.
self.exports = {};
importScripts('/essentia/essentia-wasm.umd.js', '/essentia/essentia.js-core.umd.js');

const wasmModule = self.exports.EssentiaWASM;

const ready = new Promise((resolve) => {
  if (wasmModule.calledRun) resolve();
  else wasmModule.onRuntimeInitialized = resolve;
});

let essentia = null;

// RhythmExtractor2013 reliably picks the right tempo range (e.g. 140, not 70), but its number can
// drift a couple of BPM (it read a steady 120 BPM test track as 117.9). PercivalBpmEstimator is
// precise but sometimes lands on half or double speed. So: take Percival, move it into
// RhythmExtractor's range by halving/doubling, and use it if the two then agree.
function combineTempo(rhythmBpm, percivalBpm) {
  let candidate = percivalBpm;
  while (candidate < rhythmBpm / Math.SQRT2) candidate *= 2;
  while (candidate > rhythmBpm * Math.SQRT2) candidate /= 2;
  const agrees = Math.abs(candidate - rhythmBpm) / rhythmBpm < 0.04;
  return agrees ? candidate : rhythmBpm;
}

self.onmessage = async (event) => {
  try {
    await ready;
    if (!essentia) essentia = new self.Essentia(wasmModule);

    const signal = essentia.arrayToVector(event.data.samples);

    const rhythm = essentia.RhythmExtractor2013(signal);
    const percival = essentia.PercivalBpmEstimator(signal);
    const bpm = combineTempo(rhythm.bpm, percival.bpm);
    for (const vec of [rhythm.ticks, rhythm.estimates, rhythm.bpmIntervals]) vec && vec.delete();

    const keyResult = essentia.KeyExtractor(signal);

    signal.delete();

    self.postMessage({ ok: true, bpm, key: keyResult.key, scale: keyResult.scale });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
