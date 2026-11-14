import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  BookOpen,
  Compass,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type {
  BookRecommendation,
  ChatTurn,
  RecommendationResponse,
  UserPreferences,
  VerificationResult,
} from '../types/bookbuddy';

interface RecommendationsViewProps {
  verification: VerificationResult;
  preferences: UserPreferences;
  recommendation: RecommendationResponse | null;
  loading: boolean;
  error: string | null;
  chatHistory: ChatTurn[];
  chatLoading: boolean;
  onRetry: () => void;
  onShowThreeMore: () => void;
  onExploreAnotherGenre: () => void;
  onChangeAgeOrPrefs: () => void;
  onRecommendSimilar: () => void;
  onSendChat: (message: string) => void;
}

function BookCoverFrame({ book }: { book: BookRecommendation }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showCoverImg = Boolean(book.coverUrl) && !imgFailed;

  if (showCoverImg) {
    return (
      <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border border-cyan-400/25 bg-[#071127] shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:w-28">
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title} by ${book.author}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="relative flex aspect-[2/3] w-24 shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-cyan-400/25 bg-gradient-to-br from-[#0e1f47] via-[#0a1533] to-[#1a133d] p-2.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:w-28"
      aria-label={`Typographic book plate for ${book.title}`}
    >
      <BookOpen className="h-4 w-4 text-cyan-300/80" aria-hidden="true" />
      <div>
        <p className="line-clamp-3 font-display text-[11px] font-bold leading-tight text-white">
          {book.title}
        </p>
        <p className="mt-1 line-clamp-1 text-[10px] text-cyan-200/80">{book.author}</p>
      </div>
      <span className="text-[9px] uppercase tracking-wider text-slate-400">Cover Unavailable</span>
    </div>
  );
}

function BookCard({ book, index }: { book: BookRecommendation; index: number }) {
  return (
    <article className="flex flex-col justify-between rounded-2xl border border-cyan-400/20 bg-[#0b1530]/95 p-6 shadow-[0_12px_40px_rgba(2,6,23,0.6)] transition-colors duration-200 hover:border-cyan-300/45">
      <div>
        {/* Editorial index + unboxed genre metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-300/90">
          <span className="tabular-nums text-amber-300">0{index + 1}</span>
          <span aria-hidden="true" className="text-slate-500">
            ·
          </span>
          <span>{book.genre}</span>
        </div>

        {/* Cover + Title & Author */}
        <div className="mt-3.5 flex items-start gap-4">
          <BookCoverFrame book={book} />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-bold leading-snug text-white text-balance">
              {book.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-purple-200/90">by {book.author}</p>
          </div>
        </div>

        {/* Short Description */}
        <p className="mt-4 text-sm leading-relaxed text-slate-200">{book.description}</p>

        {/* Why This Book Is Recommended */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-amber-300/95">
            Why This Book Is Recommended
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-cyan-50/90">{book.whyRecommended}</p>
        </div>
      </div>

      {/* Age Suitability, Reading Difficulty, Estimated Reading Experience */}
      <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
        <div>
          <dt className="font-semibold text-slate-400">Age Suitability</dt>
          <dd className="mt-0.5 text-slate-100">{book.ageSuitability}</dd>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-400">Reading Difficulty</dt>
            <dd className="mt-0.5 text-slate-100">{book.readingDifficulty}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-400">Estimated Reading Experience</dt>
            <dd className="mt-0.5 text-slate-100">{book.estimatedReadingExperience}</dd>
          </div>
        </div>
      </dl>
    </article>
  );
}

export function RecommendationsView({
  verification,
  preferences,
  recommendation,
  loading,
  error,
  chatHistory,
  chatLoading,
  onRetry,
  onShowThreeMore,
  onExploreAnotherGenre,
  onChangeAgeOrPrefs,
  onRecommendSimilar,
  onSendChat,
}: RecommendationsViewProps) {
  const [chatInput, setChatInput] = useState('');

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;
    onSendChat(trimmed);
    setChatInput('');
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-cyan-400/25 bg-[#091229]/95 px-6 py-12 text-center shadow-[0_20px_60px_rgba(2,6,23,0.75)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 text-cyan-300">
          <BookOpen className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold text-white">
          Gemini AI Analysis in Progress
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
          Analysing your verified age group ({verification.ageGroup}), selected genres (
          {preferences.genres.join(', ')}), reading difficulty, and content suitability to select
          eight real books.
        </p>
        <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-1/2 animate-[slide_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-400/35 bg-[#120d21]/95 p-6 text-center shadow-xl">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-400" aria-hidden="true" />
        <h2 className="mt-3 font-display text-xl font-bold text-white">
          Could Not Reach BookBuddy AI
        </h2>
        <p className="mt-2 text-sm text-rose-100/90">{error}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Try Again</span>
          </button>
          <button
            type="button"
            onClick={onExploreAnotherGenre}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            <span>Adjust Genres & Preferences</span>
          </button>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  return (
    <div className="space-y-8">
      {/* Intro & Verified Reader Profile Summary */}
      <div className="rounded-2xl border border-cyan-400/20 bg-[#091229]/95 p-6">
        <p className="text-xs font-medium text-cyan-300">
          Verified Age: <span className="tabular-nums text-white">{verification.ageGroup}</span>
          <span className="mx-2 text-slate-500" aria-hidden="true">
            ·
          </span>
          {verification.mode === 'demo' ? 'Demo Mode (Sample ID)' : verification.providerName}
          <span className="mx-2 text-slate-500" aria-hidden="true">
            ·
          </span>
          {preferences.genres.join(' · ')}
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl text-balance">
          Your {recommendation.books.length} Personalized Book Recommendations
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
          {recommendation.greeting}
        </p>
        {recommendation.safetyNote && (
          <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-xs leading-relaxed text-amber-100">
            <strong className="font-semibold text-amber-300">Age & Suitability Note: </strong>
            {recommendation.safetyNote}
          </p>
        )}
      </div>

      {/* Book Cards Grid (8+ Books) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {recommendation.books.map((book, idx) => (
          <BookCard key={`${book.title}-${idx}`} book={book} index={idx} />
        ))}
      </div>

      {/* After Recommendations Follow-Up Section */}
      <section className="rounded-2xl border border-purple-400/25 bg-[#091229]/95 p-6">
        <h3 className="font-display text-xl font-bold text-white">
          Did you like these recommendations?
        </h3>
        <p className="mt-1 text-sm text-slate-300">
          Choose your next step or ask BookBuddy directly below.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={onShowThreeMore}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-500/25 focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <RefreshCw className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
            <span>Show me 8 more books</span>
          </button>

          <button
            type="button"
            onClick={onExploreAnotherGenre}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-blue-400/35 bg-blue-500/15 px-4 py-2.5 text-sm font-medium text-blue-100 transition-colors hover:border-blue-300 hover:bg-blue-500/25 focus-visible:outline-2 focus-visible:outline-blue-300"
          >
            <Compass className="h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
            <span>Explore another genre</span>
          </button>

          <button
            type="button"
            onClick={onChangeAgeOrPrefs}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span>Change verification or genres</span>
          </button>

          <button
            type="button"
            onClick={onRecommendSimilar}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-purple-400/35 bg-purple-500/15 px-4 py-2.5 text-sm font-medium text-purple-100 transition-colors hover:border-purple-300 hover:bg-purple-500/25 focus-visible:outline-2 focus-visible:outline-purple-300"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-purple-300" aria-hidden="true" />
            <span>Recommend something similar</span>
          </button>
        </div>

        {/* Conversational Follow-up Thread */}
        {chatHistory.length > 0 && (
          <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
            {chatHistory.map((turn, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 text-sm leading-relaxed ${
                  turn.role === 'user'
                    ? 'ml-auto max-w-2xl border border-cyan-400/25 bg-cyan-950/50 text-cyan-50'
                    : 'border border-white/10 bg-[#0d1936] text-slate-200'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {turn.role === 'user' ? 'You' : 'BookBuddy AI'}
                </p>
                <p className="mt-1">{turn.text}</p>
                {turn.books && turn.books.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {turn.books.map((b, bi) => (
                      <BookCard key={`${b.title}-${bi}`} book={b} index={bi} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chat Input */}
        <form onSubmit={handleChatSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="bookbuddy-followup" className="sr-only">
            Ask BookBuddy AI a follow-up question
          </label>
          <input
            id="bookbuddy-followup"
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask BookBuddy anything (e.g. 'Make them shorter' or 'Tell me more about book 1')..."
            disabled={chatLoading}
            className="min-h-[46px] flex-1 rounded-xl border border-white/15 bg-[#060d20] px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>{chatLoading ? 'Thinking...' : 'Ask BookBuddy'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
