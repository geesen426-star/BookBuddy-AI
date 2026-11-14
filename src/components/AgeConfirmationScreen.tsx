import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { VerificationResult } from '../types/bookbuddy';

interface AgeConfirmationScreenProps {
  verification: VerificationResult;
  onContinueToGenres: () => void;
  onChangeVerification: () => void;
}

const METHOD_LABELS: Record<VerificationResult['method'], string> = {
  aadhaar: 'Aadhaar Card',
  passport: 'Passport',
  'school-id': 'School ID Card',
};

export function AgeConfirmationScreen({
  verification,
  onContinueToGenres,
  onChangeVerification,
}: AgeConfirmationScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(2);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    const timer = window.setTimeout(() => {
      onContinueToGenres();
    }, 2200);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [onContinueToGenres]);

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-cyan-400/35 bg-[#081024]/95 p-7 text-center shadow-[0_24px_70px_rgba(2,6,23,0.8)] sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/45 bg-emerald-500/15 text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.28)]">
        <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
      </div>

      <h2 className="mt-5 font-display text-2xl font-bold text-white sm:text-3xl">
        Your age has been successfully verified!
      </h2>

      <p className="mt-2 text-sm text-slate-300">
        Only your verified age group is shared — no identity documents or personal numbers are
        stored.
      </p>

      {/* Verified Age Group Display */}
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-cyan-400/30 bg-[#0c1836] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          Verified Age Group
        </p>
        <p className="mt-1.5 font-display text-4xl font-bold text-white tabular-nums">
          {verification.ageGroup}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
          <span>{METHOD_LABELS[verification.method]}</span>
          <span aria-hidden="true" className="text-slate-500">
            ·
          </span>
          <span>
            {verification.mode === 'demo'
              ? 'Demo Mode (SAMPLE - NOT A REAL ID)'
              : verification.providerName}
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-cyan-200/90">
        <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        <span>
          {secondsLeft > 0
            ? `Automatically opening Genre Selection in ${secondsLeft}s...`
            : 'Opening Genre Selection...'}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onChangeVerification}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
        >
          Change Verification Method
        </button>

        <button
          type="button"
          onClick={onContinueToGenres}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-opacity hover:opacity-95"
        >
          <span>Continue to Genre Selection</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
