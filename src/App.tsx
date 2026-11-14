import { useCallback, useState } from 'react';
import { MagicBookSphere } from './components/MagicBookSphere';
import { WelcomeOverlay } from './components/WelcomeOverlay';
import { DiscoveryFlow } from './components/DiscoveryFlow';
import { FriendChatView } from './components/FriendChatView';
import type {
  BookRecommendation,
  ChatTurn,
  JourneyStage,
  RecommendationResponse,
  UserPreferences,
  VerificationResult,
} from './types/bookbuddy';

const INITIAL_PREFERENCES: UserPreferences = {
  genres: [],
  favouriteTopics: '',
  favouriteAuthors: '',
  readingDifficulty: 'Any',
  bookLength: 'Any',
  preferredLanguage: 'English',
  favouriteThemes: '',
};

const FRIEND_WELCOME_TURN: ChatTurn = {
  role: 'assistant',
  text: 'Welcome, you are an official member of Avenger! Hello, you friend of Sharvesh — ask me anything or tell me what kind of books you feel like reading today!',
};

export default function App() {
  const [stage, setStage] = useState<JourneyStage>('welcome');
  const [isSphereInteracting, setIsSphereInteracting] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Separate fresh chat state for anyone who taps 7 times
  const [friendMessages, setFriendMessages] = useState<ChatTurn[]>([FRIEND_WELCOME_TURN]);
  const [friendLoading, setFriendLoading] = useState(false);

  const handleUpdatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }, []);

  // Immediate transition to genre selection with zero delay once verified
  const handleVerified = useCallback((result: VerificationResult) => {
    setVerification(result);
    setRecommendation(null);
    setSeenTitles([]);
    setChatHistory([]);
    setStage('genres');
  }, []);

  // Open a fresh new chat greeting Sharvesh's friend on 7 taps
  const handleSevenTaps = useCallback(() => {
    setFriendMessages([FRIEND_WELCOME_TURN]);
    setFriendLoading(false);
    setStage('friend-chat');
  }, []);

  // Strict sequence guard: only allow advancing to stages whose prerequisites succeeded
  const handleChangeStage = useCallback(
    (nextStage: JourneyStage) => {
      if (nextStage === 'welcome' || nextStage === 'verify-age' || nextStage === 'friend-chat') {
        setStage(nextStage);
        return;
      }
      if (!verification?.verified) {
        setStage('verify-age');
        return;
      }
      if (nextStage === 'recommendations' && preferences.genres.length === 0) {
        setStage('genres');
        return;
      }
      setStage(nextStage);
    },
    [verification, preferences.genres.length],
  );

  const enrichCoversAsync = useCallback(
    async (books: BookRecommendation[], target: 'main' | 'friend' | number) => {
      try {
        const res = await fetch('/api/book-covers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            books: books.map((b) => ({ title: b.title, author: b.author })),
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { covers?: Record<string, string> };
        const covers = data.covers;
        if (!covers || Object.keys(covers).length === 0) return;

        if (target === 'main') {
          setRecommendation((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              books: prev.books.map((b) =>
                covers[b.title] ? { ...b, coverUrl: covers[b.title] } : b,
              ),
            };
          });
        } else if (target === 'friend') {
          setFriendMessages((prev) =>
            prev.map((turn) => {
              if (!turn.books) return turn;
              return {
                ...turn,
                books: turn.books.map((b) =>
                  covers[b.title] ? { ...b, coverUrl: covers[b.title] } : b,
                ),
              };
            }),
          );
        } else {
          setChatHistory((prev) =>
            prev.map((turn, idx) => {
              if (idx !== target || !turn.books) return turn;
              return {
                ...turn,
                books: turn.books.map((b) =>
                  covers[b.title] ? { ...b, coverUrl: covers[b.title] } : b,
                ),
              };
            }),
          );
        }
      } catch {
        // Silently ignore cover fetch errors; embossed fallback covers are already rendered
      }
    },
    [],
  );

  const fetchRecommendations = useCallback(
    async (mode: 'initial' | 'more' | 'similar') => {
      if (!verification?.verified) {
        setStage('verify-age');
        return;
      }
      setRecLoading(true);
      setRecError(null);
      if (mode === 'initial') {
        setChatHistory([]);
      }

      try {
        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verifiedAgeGroup: verification.ageGroup,
            preferences,
            excludeTitles: mode === 'initial' ? [] : seenTitles,
            mode,
            seedBooks:
              mode === 'similar' && recommendation
                ? recommendation.books.map((b) => ({ title: b.title, author: b.author }))
                : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Could not retrieve book recommendations.');
        }

        const result = data as RecommendationResponse;
        setRecommendation(result);
        setSeenTitles((prev) => {
          const added = result.books.map((b) => b.title);
          return Array.from(new Set([...prev, ...added]));
        });

        void enrichCoversAsync(result.books, 'main');
      } catch (err: unknown) {
        setRecError(
          err instanceof Error
            ? err.message
            : 'Unable to reach BookBuddy AI. Please try again.',
        );
      } finally {
        setRecLoading(false);
      }
    },
    [verification, preferences, seenTitles, recommendation, enrichCoversAsync],
  );

  const handleSendChat = useCallback(
    async (message: string) => {
      if (!verification?.verified) return;
      const nextHistory: ChatTurn[] = [...chatHistory, { role: 'user', text: message }];
      setChatHistory(nextHistory);
      setChatLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            verifiedAgeGroup: verification.ageGroup,
            preferences,
            currentBooks: recommendation?.books.map((b) => ({
              title: b.title,
              author: b.author,
              genre: b.genre,
            })),
            history: nextHistory.map((h) => ({ role: h.role, text: h.text })),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'BookBuddy could not respond right now.');
        }

        const replyBooks = Array.isArray(data.books) ? (data.books as BookRecommendation[]) : undefined;
        const turnIndex = nextHistory.length;

        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply,
            books: replyBooks,
          },
        ]);

        if (replyBooks && replyBooks.length > 0) {
          setSeenTitles((prev) => {
            const added = replyBooks.map((b) => b.title);
            return Array.from(new Set([...prev, ...added]));
          });
          void enrichCoversAsync(replyBooks, turnIndex);
        }
      } catch (err: unknown) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text:
              err instanceof Error
                ? `Sorry, I ran into an issue: ${err.message}`
                : 'Sorry, something went wrong. Please try again.',
          },
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [verification, chatHistory, preferences, recommendation, enrichCoversAsync],
  );

  const handleSendFriendMessage = useCallback(
    async (text: string) => {
      const nextHistory: ChatTurn[] = [...friendMessages, { role: 'user', text }];
      setFriendMessages(nextHistory);
      setFriendLoading(true);

      try {
        const res = await fetch('/api/friend-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: nextHistory.map((h) => ({ role: h.role, text: h.text })),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'BookBuddy could not respond right now.');
        }

        const replyBooks = Array.isArray(data.books)
          ? (data.books as BookRecommendation[])
          : undefined;

        setFriendMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply,
            books: replyBooks,
          },
        ]);

        if (replyBooks && replyBooks.length > 0) {
          void enrichCoversAsync(replyBooks, 'friend');
        }
      } catch (err: unknown) {
        setFriendMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text:
              err instanceof Error
                ? `Sorry, I ran into an issue: ${err.message}`
                : 'Sorry, something went wrong. Please try again.',
          },
        ]);
      } finally {
        setFriendLoading(false);
      }
    },
    [friendMessages, enrichCoversAsync],
  );

  const handleResetJourney = useCallback(() => {
    setVerification(null);
    setPreferences(INITIAL_PREFERENCES);
    setRecommendation(null);
    setSeenTitles([]);
    setRecError(null);
    setChatHistory([]);
    setStage('verify-age');
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050a18] text-slate-100">
      {/* Persistent Interactive 3D Sphere Stage */}
      <MagicBookSphere
        stageMode={stage === 'welcome' ? 'welcome' : 'journey'}
        onInteractChange={setIsSphereInteracting}
        onSevenTaps={handleSevenTaps}
      />

      {stage === 'welcome' && (
        <WelcomeOverlay
          isInteracting={isSphereInteracting}
          onStartJourney={() => setStage('verify-age')}
          onSevenTaps={handleSevenTaps}
        />
      )}

      {stage === 'friend-chat' && (
        <FriendChatView
          messages={friendMessages}
          loading={friendLoading}
          onSendMessage={handleSendFriendMessage}
          onNewChat={handleSevenTaps}
          onBackToWelcome={() => setStage('welcome')}
        />
      )}

      {stage !== 'welcome' && stage !== 'friend-chat' && (
        <DiscoveryFlow
          stage={stage}
          verification={verification}
          preferences={preferences}
          recommendation={recommendation}
          recLoading={recLoading}
          recError={recError}
          chatHistory={chatHistory}
          chatLoading={chatLoading}
          onChangeStage={handleChangeStage}
          onVerified={handleVerified}
          onUpdatePreferences={handleUpdatePreferences}
          onFetchRecommendations={fetchRecommendations}
          onSendChat={handleSendChat}
          onResetJourney={handleResetJourney}
        />
      )}
    </div>
  );
}
