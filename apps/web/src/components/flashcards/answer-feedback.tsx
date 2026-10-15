"use client";

let sharedContext: AudioContext | null = null;

const BURST_DOTS = [
  { left: "8%", delay: "0ms" },
  { left: "28%", delay: "50ms" },
  { left: "48%", delay: "15ms" },
  { left: "68%", delay: "80ms" },
  { left: "86%", delay: "30ms" },
];

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new Ctx();
  }
  return sharedContext;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function schedule(ctx: AudioContext, correct: boolean) {
  const now = ctx.currentTime;
  if (correct) {
    tone(ctx, 523.25, now, 0.09, 0.08, "sine");
    tone(ctx, 783.99, now + 0.08, 0.16, 0.1, "sine");
    return;
  }
  tone(ctx, 196, now, 0.1, 0.05, "triangle");
  tone(ctx, 146.83, now + 0.07, 0.14, 0.04, "triangle");
}

export function playAnswerSound(correct: boolean) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => schedule(ctx, correct)).catch(() => {});
      return;
    }
    schedule(ctx, correct);
  } catch {
    // A animação segue mesmo se o navegador bloquear o áudio.
  }
}

export function pulseClass(
  element: HTMLElement | null,
  className: "flashcard-pop" | "flashcard-shake"
) {
  if (!element) return;
  element.classList.remove("flashcard-pop", "flashcard-shake");
  void element.offsetWidth;
  element.classList.add(className);
}

export function AnswerBurst() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <span className="flashcard-burst inline-flex rounded-2xl bg-[#24c875] px-4 py-2 text-[15px] font-bold text-white shadow-md">
          Correto!
        </span>
        {BURST_DOTS.map((dot) => (
          <span
            key={dot.left}
            className="flashcard-dot absolute top-1/2 size-2 rounded-full bg-[#24c875]"
            style={{ left: dot.left, animationDelay: dot.delay }}
          />
        ))}
      </div>
    </div>
  );
}
