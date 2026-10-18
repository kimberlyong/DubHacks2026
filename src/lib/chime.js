// A soft two-note "ding-dong" made with the Web Audio API, so there's no audio
// file to load. Gentle sine tones at low volume: noticeable without startling
// anyone who is sensitive to sound.

const CHIMES = [
  [659.25, 880], // E5 -> A5, rising
  [587.33, 783.99], // D5 -> G5, same shape a step lower so it doesn't get tuned out
];

let ctx = null;
let next = 0;

export function playChime(volume = 0.12) {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const notes = CHIMES[next++ % CHIMES.length];
    const start = ctx.currentTime + 0.02;

    notes.forEach((freq, i) => {
      const t = start + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Quick fade in, slow fade out: a bell-like tone with no click.
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    // No audio available; the popup still shows.
  }
}
