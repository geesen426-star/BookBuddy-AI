import { useRef } from 'react';
import { Rotate3d, ArrowRight } from 'lucide-react';

interface WelcomeOverlayProps {
  isInteracting: boolean;
  onStartJourney: () => void;
  onSevenTaps: () => void;
}

export function WelcomeOverlay({
  isInteracting,
  onStartJourney,
  onSevenTaps,
}: WelcomeOverlayProps) {
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const handleHeaderTap = () => {
    const now = performance.now();
    if (now - lastTapRef.current <= 1500) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapRef.current = now;
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      onSevenTaps();
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between px-4 py-6 sm:px-8 sm:py-8">
      {/* Top Title Zone */}
      <header className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase text-cyan-300/85">
          <span>Your Personal Book Discovery Assistant</span>
        </div>
        <h1
          onClick={handleHeaderTap}
          className="pointer-events-auto mt-1.5 cursor-default select-none font-display text-3xl font-bold tracking-tight text-white sm:text-5xl"
        >
          BOOKBUDDY{' '}
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
      </header>

      {/* Center Spacer — keeps 3D interactive sphere 100% unobstructed */}
      <div className="flex-1" />

      {/* Bottom Welcome Copy & Glowing CTA */}
      <footer className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <div
          className={`mb-3 inline-flex items-center gap-2 text-xs font-medium transition-opacity duration-200 ${
            isInteracting ? 'text-cyan-300 opacity-100' : 'text-slate-300/75 opacity-90'
          }`}
        >
          <Rotate3d className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
          <span>
            {isInteracting
              ? 'Rotating magical orb...'
              : 'Drag or swipe the sphere to explore in 3D'}
          </span>
        </div>

        <p className="font-display text-lg font-medium text-slate-100 sm:text-xl text-balance">
          Discover Your Next Favourite Book!
        </p>

        <button
          type="button"
          onClick={onStartJourney}
          className="pointer-events-auto group relative mt-5 inline-flex min-h-[48px] items-center justify-center gap-3 rounded-xl border border-cyan-300/60 bg-gradient-to-r from-cyan-500/90 via-blue-600/90 to-purple-600/90 px-8 py-3.5 font-display text-sm font-semibold tracking-[0.12em] uppercase text-white shadow-[0_0_28px_rgba(34,211,238,0.45),0_0_60px_rgba(168,85,247,0.28)] transition-all duration-200 hover:scale-[1.02] hover:border-amber-300/70 hover:shadow-[0_0_36px_rgba(34,211,238,0.65),0_0_72px_rgba(251,191,36,0.32)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 whitespace-nowrap"
        >
          <span>START YOUR JOURNEY</span>
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
      </footer>
    </div>
  );
}
