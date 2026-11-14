import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  FlaskConical,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  DEMO_PERSONAS,
  type DemoPersona,
  type IdMethod,
  type ProviderConfigStatus,
  type VerificationMode,
  type VerificationResult,
} from '../types/bookbuddy';
import { SampleIdIllustration } from './SampleIdIllustration';

interface AgeVerificationScreenProps {
  onVerified: (result: VerificationResult) => void;
}

interface MethodMeta {
  id: IdMethod;
  title: string;
  description: string;
  providerNote: string;
}

const ID_METHODS: MethodMeta[] = [
  {
    id: 'aadhaar',
    title: 'Aadhaar Card',
    description: 'Tokenized age-bracket check via authorised DigiLocker / licensed eKYC provider.',
    providerNote: 'Full Aadhaar numbers are never collected, stored, or sent to Gemini.',
  },
  {
    id: 'passport',
    title: 'Passport',
    description: 'Authorised passport age-category verification without storing document scans.',
    providerNote: 'Only the resulting age bracket is shared with BookBuddy AI.',
  },
  {
    id: 'school-id',
    title: 'School ID Card',
    description: 'Student verification for younger readers when supported by the provider.',
    providerNote: 'Accepted only when the authorised provider supports institutional School IDs.',
  },
];

export function AgeVerificationScreen({ onVerified }: AgeVerificationScreenProps) {
  const [mode, setMode] = useState<VerificationMode>('provider');
  const [selectedMethod, setSelectedMethod] = useState<IdMethod>('aadhaar');
  const [providerConfig, setProviderConfig] = useState<ProviderConfigStatus | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Real provider form state (session token only — zero document upload or Aadhaar number)
  const [sessionToken, setSessionToken] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  // Demo mode state
  const [selectedPersona, setSelectedPersona] = useState<DemoPersona>(DEMO_PERSONAS[1]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/verify/config')
      .then((res) => res.json())
      .then((data: ProviderConfigStatus) => {
        if (active) setProviderConfig(data);
      })
      .catch(() => {
        if (active) {
          setProviderConfig({
            providerConfigured: false,
            providerName: null,
            schoolIdSupported: false,
            supportedMethods: ['aadhaar', 'passport'],
          });
        }
      })
      .finally(() => {
        if (active) setConfigLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleMethodSelect = (id: IdMethod) => {
    setSelectedMethod(id);
    setError(null);
  };

  const handleModeSwitch = (nextMode: VerificationMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleProviderVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedMethod === 'school-id' && !providerConfig?.schoolIdSupported) {
      setError(
        'School ID verification is disabled because the configured verification provider does not support institutional School IDs.',
      );
      return;
    }

    if (!consentGiven) {
      setError('Please confirm the privacy & age-verification consent box to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/verify/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          consentGiven: true,
          sessionToken: sessionToken.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification could not be completed.');
      }
      onVerified(data as VerificationResult);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach authorised verification provider.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoVerify = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/verify/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          ageGroup: selectedPersona.ageGroup,
          sampleCode: selectedPersona.sampleCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Demo verification failed.');
      }
      onVerified(data as VerificationResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const schoolIdBlockedInProviderMode =
    mode === 'provider' && !configLoading && !providerConfig?.schoolIdSupported;

  return (
    <section className="mx-auto max-w-5xl rounded-2xl border border-cyan-400/25 bg-[#081024]/95 p-6 sm:p-8 shadow-[0_24px_70px_rgba(2,6,23,0.8)]">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            VERIFY YOUR AGE
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-300 sm:text-base">
            Choose an identification method to verify your age and discover books suitable for you.
          </p>
        </div>

        {/* Strict Separation: Authorised Verification vs Demo Mode */}
        <div
          role="tablist"
          aria-label="Verification mode"
          className="inline-flex rounded-xl border border-white/15 bg-[#050a18] p-1 self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'provider'}
            onClick={() => handleModeSwitch('provider')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'provider'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Authorised Provider</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'demo'}
            onClick={() => handleModeSwitch('demo')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'demo'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/45'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Demo Mode (Sample IDs)</span>
          </button>
        </div>
      </div>

      {/* Mode Notice Banner */}
      {mode === 'demo' ? (
        <div className="mt-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100">
          <strong className="font-semibold text-amber-300">
            DEMO VERIFICATION MODE · SAMPLE - NOT A REAL ID:{' '}
          </strong>
          Fictional sample identification cards are active for developer testing without collecting
          real personal information. Demo verification is never real identity verification.
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-xs leading-relaxed text-cyan-100">
          <strong className="font-semibold text-cyan-300">
            PRIVACY & INDIAN COMPLIANCE PROTECTION:{' '}
          </strong>
          BookBuddy AI only accepts age-bracket tokens from an authorised verification provider. Raw
          identity documents and Aadhaar numbers are never uploaded, stored, or sent to Gemini.
        </div>
      )}

      {/* Three Identification Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {ID_METHODS.map((item) => {
          const isSelected = selectedMethod === item.id;
          const isUnsupportedSchool = item.id === 'school-id' && schoolIdBlockedInProviderMode;

          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
                isSelected
                  ? 'border-cyan-400 bg-[#0d1b3d] shadow-[0_0_28px_rgba(34,211,238,0.18)]'
                  : 'border-white/12 bg-[#0a142e] hover:border-cyan-400/40'
              }`}
            >
              <div>
                <SampleIdIllustration method={item.id} showSampleBanner={true} />

                <div className="mt-4 flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Selected
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{item.description}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  {isUnsupportedSchool
                    ? 'Provider status: Not supported by current authorised provider configuration.'
                    : item.providerNote}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleMethodSelect(item.id)}
                className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold tracking-wide transition-colors ${
                  isSelected
                    ? 'border-cyan-300 bg-cyan-500 text-slate-950'
                    : 'border-white/15 bg-white/5 text-slate-100 hover:border-cyan-400/50 hover:bg-cyan-500/15'
                }`}
              >
                <span>{isSelected ? `Selected: ${item.title}` : `Select ${item.title}`}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Verification Action Panel */}
      <div className="mt-6 rounded-2xl border border-white/12 bg-[#060d20] p-5 sm:p-6">
        {mode === 'provider' ? (
          <form onSubmit={handleProviderVerify} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Lock className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                <span>
                  Authorised Provider Check —{' '}
                  {ID_METHODS.find((m) => m.id === selectedMethod)?.title}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {configLoading
                  ? 'Checking provider status...'
                  : providerConfig?.providerConfigured
                    ? `Connected: ${providerConfig.providerName}`
                    : 'Provider not configured in environment'}
              </span>
            </div>

            {!configLoading && !providerConfig?.providerConfigured && (
              <div className="rounded-xl border border-purple-400/35 bg-purple-500/10 p-4 text-xs leading-relaxed text-purple-100">
                <p className="font-semibold text-purple-200">
                  Authorised Verification Provider Required for Live ID Checks
                </p>
                <p className="mt-1 text-slate-300">
                  Real Aadhaar, Passport, or School ID verification requires an authorised
                  verification provider configured on the server (
                  <code className="text-cyan-300">AGE_VERIFICATION_PROVIDER_URL</code>). Uploading a
                  raw ID image cannot safely verify authenticity. To test the complete BookBuddy AI
                  flow without personal documents, switch to Demo Mode.
                </p>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('demo')}
                  className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/30"
                >
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Switch to Demo Mode (Sample IDs)</span>
                </button>
              </div>
            )}

            <div>
              <label
                htmlFor="provider-session-token"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-300"
              >
                Authorised Provider Verification Token
              </label>
              <input
                id="provider-session-token"
                type="text"
                value={sessionToken}
                onChange={(e) => setSessionToken(e.target.value)}
                disabled={schoolIdBlockedInProviderMode}
                placeholder="Enter token returned by authorised DigiLocker / KYC session"
                className="mt-1.5 min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0a132b] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-slate-300">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/30 bg-[#0a132b] accent-cyan-400"
              />
              <span>
                I consent to requesting only my minimum age category from the authorised provider.
                For readers under 18, parent or guardian permission is confirmed in accordance with
                Indian privacy and child protection requirements.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || schoolIdBlockedInProviderMode}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(34,211,238,0.28)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{submitting ? 'Verifying via Provider...' : 'Verify with Authorised Provider'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <FlaskConical className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <span>
                  Demo Sandbox · Sample{' '}
                  {ID_METHODS.find((m) => m.id === selectedMethod)?.title} (SAMPLE - NOT A REAL ID)
                </span>
              </div>
              <span className="text-xs font-medium text-amber-300/90">
                No personal information collected
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Select a fictional sample profile to test age-appropriate BookBuddy AI recommendations
              across any age bracket:
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {DEMO_PERSONAS.map((persona) => {
                const active = selectedPersona.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => {
                      setSelectedPersona(persona);
                      setError(null);
                    }}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-amber-400 bg-amber-500/15 text-white'
                        : 'border-white/12 bg-[#0a142e] text-slate-300 hover:border-amber-400/45'
                    }`}
                  >
                    <span className="font-display text-sm font-bold text-amber-200 tabular-nums">
                      {persona.ageGroup}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium text-slate-200">
                      {persona.sampleCode}
                    </span>
                    <span className="mt-1 text-[11px] leading-snug text-slate-400">
                      {persona.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={handleDemoVerify}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.3)] transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                <span>
                  {submitting
                    ? 'Verifying Sample ID...'
                    : `Verify Sample ID (${selectedPersona.ageGroup})`}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
