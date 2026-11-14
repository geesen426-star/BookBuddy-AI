import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import {
  FICTION_GENRES,
  NONFICTION_GENRES,
  type BookLengthPreference,
  type ChatTurn,
  type JourneyStage,
  type ReadingDifficulty,
  type RecommendationResponse,
  type UserPreferences,
  type VerificationResult,
} from '../types/bookbuddy';
import { AgeVerificationScreen } from './AgeVerificationScreen';
import { RecommendationsView } from './RecommendationsView';

interface DiscoveryFlowProps {
  stage: Exclude<JourneyStage, 'welcome'>;
  verification: VerificationResult | null;
  preferences: UserPreferences;
  recommendation: RecommendationResponse | null;
  recLoading: boolean;
  recError: string | null;
  chatHistory: ChatTurn[];
  chatLoading: boolean;
  onChangeStage: (stage: JourneyStage) => void;
  onVerified: (result: VerificationResult) => void;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void;
  onFetchRecommendations: (mode: 'initial' | 'more' | 'similar') => void;
  onSendChat: (message: string) => void;
  onResetJourney: () => void;
}

const STEPS: Array<{ id: Exclude<JourneyStage, 'welcome'>; label: string }> = [
  { id: 'verify-age', label: '01. Verify Age' },
  { id: 'genres', label: '02. Genres' },
  { id: 'recommendations', label: '03. 8 Books' },
];

const DIFFICULTIES: ReadingDifficulty[] = [
  'Any',
  'Easy & Accessible',
  'Moderate',
  'Deep & Challenging',
];

const LENGTHS: BookLengthPreference[] = [
  'Any',
  'Short & Quick',
  'Medium',
  'Long & Immersive',
];

const METHOD_LABELS: Record<VerificationResult['method'], string> = {
  aadhaar: 'Aadhaar Card',
  passport: 'Passport',
  'school-id': 'School ID Card',
};

export function DiscoveryFlow({
  stage,
  verification,
  preferences,
  recommendation,
  recLoading,
  recError,
  chatHistory,
  chatLoading,
  onChangeStage,
  onVerified,
  onUpdatePreferences,
  onFetchRecommendations,
  onSendChat,
  onResetJourney,
}: DiscoveryFlowProps) {
  const [genreError, setGenreError] = useState<string | null>(null);
  const [showPreferencesDrawer, setShowPreferencesDrawer] = useState(false);

  const toggleGenre = (genreName: string) => {
    setGenreError(null);
    const exists = preferences.genres.includes(genreName);
    const next = exists
      ? preferences.genres.filter((g) => g !== genreName)
      : [...preferences.genres, genreName];
    onUpdatePreferences({ genres: next });
  };

  const handleAnalyzeAndRecommend = () => {
    if (!verification?.verified) {
      onChangeStage('verify-age');
      return;
    }
    if (preferences.genres.length === 0) {
      setGenreError('Please select at least one genre before continuing.');
      return;
    }
    setGenreError(null);
    onChangeStage('recommendations');
    onFetchRecommendations('initial');
  };

  const canReachStep = (stepId: Exclude<JourneyStage, 'welcome'>): boolean => {
    if (stepId === 'verify-age') return true;
    if (stepId === 'genres') return Boolean(verification?.verified);
    if (stepId === 'recommendations') {
      return (
        Boolean(verification?.verified) &&
        preferences.genres.length > 0 &&
        (recommendation !== null || recLoading)
      );
    }
    return false;
  };

  return (
    <div className="relative z-10 min-h-screen px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        {/* Top Bar Contract */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => onChangeStage('welcome')}
            className="inline-flex items-center gap-2 text-left font-display text-lg font-bold tracking-tight text-white transition-colors hover:text-cyan-300 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span>
              BOOKBUDDY{' '}
              <span className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
                AI
              </span>
            </span>
          </button>

          <nav aria-label="Verification & discovery sequence" className="flex flex-wrap items-center gap-2 sm:gap-3">
            {STEPS.map((step) => {
              const isActive = step.id === stage;
              const reachable = canReachStep(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && onChangeStage(step.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border border-cyan-400/40 bg-cyan-500/20 text-cyan-200'
                      : reachable
                        ? 'text-slate-300 hover:text-white'
                        : 'cursor-not-allowed text-slate-600'
                  }`}
                >
                  {step.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onResetJourney}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Start Over</span>
          </button>
        </header>

        {/* Sequenced Stage Rendering */}
        <main className="mt-8 pb-12">
          {stage === 'verify-age' && <AgeVerificationScreen onVerified={onVerified} />}

          {stage === 'genres' && verification?.verified && (
            <section className="mx-auto max-w-4xl rounded-2xl border border-cyan-400/25 bg-[#081024]/95 p-6 sm:p-8 shadow-[0_24px_70px_rgba(2,6,23,0.8)]">
              {/* Instant Age Confirmation Banner (Zero-Delay Display) */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-300"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-display text-sm font-bold text-white">
                      Your age has been successfully verified!
                    </p>
                    <p className="text-xs text-emerald-100/90">
                      Age Group:{' '}
                      <strong className="font-semibold text-white tabular-nums">
                        {verification.ageGroup}
                      </strong>
                      <span className="mx-2 text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span>{METHOD_LABELS[verification.method]}</span>
                      <span className="mx-2 text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        {verification.mode === 'demo'
                          ? 'Demo Mode (SAMPLE - NOT A REAL ID)'
                          : verification.providerName}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onChangeStage('verify-age')}
                  className="text-xs font-medium text-cyan-200 underline-offset-4 hover:text-white hover:underline whitespace-nowrap"
                >
                  Change Verification
                </button>
              </div>

              <h2 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
                WHAT TYPE OF BOOK WOULD YOU LIKE TO READ?
              </h2>
              <p className="mt-1.5 text-sm text-slate-300">
                Select one or multiple genres. BookBuddy AI will immediately recommend 8 real,
                age-appropriate books tailored to your profile.
              </p>

              {/* Fiction Genres (1-8) */}
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
                  Fiction
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {FICTION_GENRES.map((genre) => {
                    const active = preferences.genres.includes(genre.name);
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => toggleGenre(genre.name)}
                        aria-pressed={active}
                        className={`flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                          active
                            ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_20px_rgba(34,211,238,0.18)]'
                            : 'border-white/12 bg-[#0d1834] text-slate-200 hover:border-cyan-400/45 hover:bg-[#112044]'
                        }`}
                      >
                        <span>{genre.name}</span>
                        {active && (
                          <Check className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nonfiction Genres (9-13) */}
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-300">
                  Nonfiction
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {NONFICTION_GENRES.map((genre) => {
                    const active = preferences.genres.includes(genre.name);
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => toggleGenre(genre.name)}
                        aria-pressed={active}
                        className={`flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                          active
                            ? 'border-purple-400 bg-purple-500/20 text-white shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                            : 'border-white/12 bg-[#0d1834] text-slate-200 hover:border-purple-400/45 hover:bg-[#112044]'
                        }`}
                      >
                        <span>{genre.name}</span>
                        {active && (
                          <Check className="h-4 w-4 shrink-0 text-purple-300" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible Reading Preferences */}
              <div className="mt-6 rounded-xl border border-white/10 bg-[#060d20]">
                <button
                  type="button"
                  onClick={() => setShowPreferencesDrawer((v) => !v)}
                  aria-expanded={showPreferencesDrawer}
                  className="flex min-h-[46px] w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-200 transition-colors hover:text-cyan-300"
                >
                  <span>Customize Reading Preferences (Optional)</span>
                  {showPreferencesDrawer ? (
                    <ChevronUp className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                  )}
                </button>

                {showPreferencesDrawer && (
                  <div className="space-y-4 border-t border-white/10 p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="pref-topics"
                          className="block text-xs font-semibold uppercase tracking-wide text-slate-300"
                        >
                          Favourite Topics
                        </label>
                        <input
                          id="pref-topics"
                          type="text"
                          value={preferences.favouriteTopics}
                          onChange={(e) => onUpdatePreferences({ favouriteTopics: e.target.value })}
                          placeholder="e.g., space, history, cozy villages"
                          className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/15 bg-[#0a132b] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pref-authors"
                          className="block text-xs font-semibold uppercase tracking-wide text-slate-300"
                        >
                          Favourite Authors
                        </label>
                        <input
                          id="pref-authors"
                          type="text"
                          value={preferences.favouriteAuthors}
                          onChange={(e) => onUpdatePreferences({ favouriteAuthors: e.target.value })}
                          placeholder="e.g., Agatha Christie, Rick Riordan"
                          className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/15 bg-[#0a132b] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="pref-themes"
                          className="block text-xs font-semibold uppercase tracking-wide text-slate-300"
                        >
                          Favourite Themes
                        </label>
                        <input
                          id="pref-themes"
                          type="text"
                          value={preferences.favouriteThemes}
                          onChange={(e) => onUpdatePreferences({ favouriteThemes: e.target.value })}
                          placeholder="e.g., friendship, courage, discovery"
                          className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/15 bg-[#0a132b] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pref-language"
                          className="block text-xs font-semibold uppercase tracking-wide text-slate-300"
                        >
                          Preferred Language
                        </label>
                        <input
                          id="pref-language"
                          type="text"
                          value={preferences.preferredLanguage}
                          onChange={(e) =>
                            onUpdatePreferences({ preferredLanguage: e.target.value })
                          }
                          placeholder="English"
                          className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/15 bg-[#0a132b] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Reading Difficulty
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {DIFFICULTIES.map((diff) => {
                          const active = preferences.readingDifficulty === diff;
                          return (
                            <button
                              key={diff}
                              type="button"
                              onClick={() => onUpdatePreferences({ readingDifficulty: diff })}
                              className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                                active
                                  ? 'border-cyan-400 bg-cyan-500/20 text-white'
                                  : 'border-white/12 bg-[#0d1834] text-slate-300 hover:border-cyan-400/40 hover:text-white'
                              }`}
                            >
                              {diff}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Book Length
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {LENGTHS.map((len) => {
                          const active = preferences.bookLength === len;
                          return (
                            <button
                              key={len}
                              type="button"
                              onClick={() => onUpdatePreferences({ bookLength: len })}
                              className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                                active
                                  ? 'border-purple-400 bg-purple-500/20 text-white'
                                  : 'border-white/12 bg-[#0d1834] text-slate-300 hover:border-purple-400/40 hover:text-white'
                              }`}
                            >
                              {len}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {genreError && <p className="mt-4 text-sm text-rose-300">{genreError}</p>}

              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() => onChangeStage('verify-age')}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-300 tabular-nums">
                    {preferences.genres.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleAnalyzeAndRecommend}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(34,211,238,0.3)] transition-opacity hover:opacity-95"
                  >
                    <span>Analyse & Recommend 8 Books</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {stage === 'recommendations' && verification?.verified && (
            <RecommendationsView
              verification={verification}
              preferences={preferences}
              recommendation={recommendation}
              loading={recLoading}
              error={recError}
              chatHistory={chatHistory}
              chatLoading={chatLoading}
              onRetry={() => onFetchRecommendations('initial')}
              onShowThreeMore={() => onFetchRecommendations('more')}
              onExploreAnotherGenre={() => onChangeStage('genres')}
              onChangeAgeOrPrefs={() => onChangeStage('verify-age')}
              onRecommendSimilar={() => onFetchRecommendations('similar')}
              onSendChat={onSendChat}
            />
          )}
        </main>
      </div>
    </div>
  );
}
