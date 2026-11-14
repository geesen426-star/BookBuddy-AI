import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, MessageSquarePlus, Send, Shield } from 'lucide-react';
import type { BookRecommendation, ChatTurn } from '../types/bookbuddy';

interface FriendChatViewProps {
  messages: ChatTurn[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  onNewChat: () => void;
  onBackToWelcome: () => void;
}

function FriendBookMiniCard({ book }: { book: BookRecommendation }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showCover = Boolean(book.coverUrl) && !imgFailed;

  return (
    <article className="flex flex-col justify-between rounded-xl border border-red-200 bg-red-50/70 p-4">
      <div className="flex items-start gap-3">
        {showCover ? (
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-20 w-14 shrink-0 rounded-lg border border-red-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-600 text-white">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-red-700">{book.genre}</p>
          <h4 className="mt-0.5 font-display text-sm font-bold leading-snug text-slate-900">
            {book.title}
          </h4>
          <p className="text-xs font-medium text-red-800">by {book.author}</p>
        </div>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-slate-700">{book.description}</p>
      <p className="mt-2 text-[11px] text-slate-800">
        <strong className="font-semibold text-red-700">Why it fits: </strong>
        {book.whyRecommended}
      </p>
      <p className="mt-1.5 text-[11px] text-slate-600">
        {book.ageSuitability} · {book.readingDifficulty}
      </p>
    </article>
  );
}

export function FriendChatView({
  messages,
  loading,
  onSendMessage,
  onNewChat,
  onBackToWelcome,
}: FriendChatViewProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSendMessage(trimmed);
    setInput('');
  };

  return (
    <div className="relative z-20 flex min-h-screen flex-col bg-gradient-to-br from-red-700 via-red-600 to-white px-4 py-6 text-slate-900 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/30 pb-4">
          <button
            type="button"
            onClick={onBackToWelcome}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 font-display text-sm font-bold tracking-tight text-red-700 shadow-sm transition-colors hover:bg-red-50 whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4 text-red-600" aria-hidden="true" />
            <span>BOOKBUDDY AI</span>
          </button>

          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 whitespace-nowrap"
          >
            <MessageSquarePlus className="h-4 w-4 text-red-600" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </header>

        {/* Official Avenger Hero Banner */}
        <section className="mt-6 rounded-2xl border-2 border-red-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(127,29,29,0.28)] sm:p-7">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_8px_24px_rgba(220,38,38,0.4)]">
            <Shield className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-red-700 sm:text-3xl text-balance">
            Welcome! You are an official member of Avenger
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-700">
            Hello, you friend of Sharvesh — your private red &amp; white chat room is ready.
          </p>
        </section>

        {/* Chat Container */}
        <main className="mt-5 flex flex-1 flex-col rounded-2xl border border-red-200 bg-white p-4 shadow-[0_18px_50px_rgba(127,29,29,0.22)] sm:p-6">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.map((turn, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-4 text-sm leading-relaxed ${
                  turn.role === 'user'
                    ? 'ml-auto max-w-xl bg-red-600 text-white shadow-sm'
                    : 'max-w-3xl border border-red-200 bg-red-50 text-slate-900'
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    turn.role === 'user' ? 'text-red-100' : 'text-red-700'
                  }`}
                >
                  {turn.role === 'user' ? 'You (Avenger)' : 'BookBuddy AI'}
                </p>
                <p className="mt-1.5 whitespace-pre-line">{turn.text}</p>

                {turn.books && turn.books.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {turn.books.map((book, bi) => (
                      <FriendBookMiniCard key={`${book.title}-${bi}`} book={book} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="max-w-xs rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                BookBuddy AI is typing...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-5 flex flex-col gap-3 border-t border-red-100 pt-4 sm:flex-row"
          >
            <label htmlFor="friend-chat-input" className="sr-only">
              Send a message in your Avenger chat
            </label>
            <input
              id="friend-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or request book recommendations..."
              disabled={loading}
              autoFocus
              className="min-h-[46px] flex-1 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Send</span>
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
