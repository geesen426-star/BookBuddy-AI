import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

type VerifiedAgeGroup = '8–12' | '13–17' | '18–25' | '26–40' | 'Above 40';
type IdMethod = 'aadhaar' | 'passport' | 'school-id';

const VALID_AGE_GROUPS: VerifiedAgeGroup[] = ['8–12', '13–17', '18–25', '26–40', 'Above 40'];
const VALID_METHODS: IdMethod[] = ['aadhaar', 'passport', 'school-id'];

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getVerificationProviderConfig() {
  const url = process.env.AGE_VERIFICATION_PROVIDER_URL?.trim() || '';
  const apiKey = process.env.AGE_VERIFICATION_PROVIDER_API_KEY?.trim() || '';
  const name = process.env.AGE_VERIFICATION_PROVIDER_NAME?.trim() || null;
  const schoolIdSupported = process.env.AGE_VERIFICATION_SCHOOL_ID_SUPPORTED === 'true';
  const providerConfigured = Boolean(url && apiKey);

  const supportedMethods: IdMethod[] = ['aadhaar', 'passport'];
  if (schoolIdSupported) {
    supportedMethods.push('school-id');
  }

  return {
    url,
    apiKey,
    providerConfigured,
    providerName: providerConfigured ? name || 'Authorised KYC Provider' : null,
    schoolIdSupported,
    supportedMethods,
  };
}

function normalizeAgeGroup(input: unknown): VerifiedAgeGroup | null {
  if (typeof input === 'string') {
    const cleaned = input.trim().replace('-', '–');
    if ((VALID_AGE_GROUPS as string[]).includes(cleaned)) {
      return cleaned as VerifiedAgeGroup;
    }
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    if (input >= 5 && input <= 12) return '8–12';
    if (input >= 13 && input <= 17) return '13–17';
    if (input >= 18 && input <= 25) return '18–25';
    if (input >= 26 && input <= 40) return '26–40';
    if (input > 40 && input <= 120) return 'Above 40';
  }
  return null;
}

const BOOKBUDDY_SYSTEM_INSTRUCTION = `You are BOOKBUDDY AI, a premium AI-powered personalized book recommendation assistant.

YOUR MISSION:
Recommend the 8 most suitable real books based on the user's VERIFIED age category, selected genres, reading preferences, reading difficulty, and content suitability. Provide personalized recommendations instead of random popular books.

PRIVACY & SAFETY (CRITICAL):
- Never ask for or expect personal identity documents, Aadhaar numbers, passport numbers, or personal names. You only ever receive an anonymised verified age category.
- Always prioritise age suitability before anything else.
- Avoid recommending books with unsuitable mature content (explicit sexual content, graphic violence, severe disturbing themes, or harsh mature language) to younger readers (especially 8–12 and 13–17).
- NEVER recommend adult books to children or young teens.
- If a younger user (8–12 or 13–17) selects a mature genre such as Horror, Thriller & Suspense, or True Crime, choose strictly age-appropriate middle-grade or YA mysteries/spooky adventures (or age-appropriate historical investigations) and explain the content boundary clearly in ageSuitability and safetyNote.
- If age suitability is uncertain for any reason, explicitly mention it.

ACCURACY (CRITICAL):
- Only recommend REAL, verifiable books with REAL author names.
- NEVER invent book titles, author names, publication dates, or book cover URLs.
- If any detail needs verification, mention it honestly rather than guessing.
- Do not claim a book is available for purchase.

TONE & STYLE:
- Friendly, intelligent, encouraging, and warm in simple English.
- Keep explanations crisp and personalize every "whyRecommended" to the verified age category, selected genres, and preferences.`;

const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    greeting: {
      type: Type.STRING,
      description: 'Short, warm, encouraging intro tailored to the verified age group and genres.',
    },
    safetyNote: {
      type: Type.STRING,
      description:
        'Optional brief note if any genre/age adaptation was applied or if any suitability detail needs verification.',
    },
    books: {
      type: Type.ARRAY,
      description: 'Exactly eight (8) real, age-appropriate book recommendations.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Exact real book title.' },
          author: { type: Type.STRING, description: 'Exact real author full name.' },
          genre: { type: Type.STRING, description: 'Primary genre and subgenre.' },
          description: {
            type: Type.STRING,
            description: 'Concise 2-3 sentence spoiler-free book summary.',
          },
          whyRecommended: {
            type: Type.STRING,
            description:
              'Personalized reason connecting this book to the verified age category, genre, and preferences.',
          },
          ageSuitability: {
            type: Type.STRING,
            description:
              'Clear age guidance and brief content suitability note.',
          },
          readingDifficulty: {
            type: Type.STRING,
            description: 'Easy, Moderate, or Challenging with brief pacing/vocabulary context.',
          },
          estimatedReadingExperience: {
            type: Type.STRING,
            description: 'Reading mood, pacing, and approximate length feel.',
          },
        },
        required: [
          'title',
          'author',
          'genre',
          'description',
          'whyRecommended',
          'ageSuitability',
          'readingDifficulty',
          'estimatedReadingExperience',
        ],
      },
    },
  },
  required: ['greeting', 'books'],
};

interface BookItem {
  title: string;
  author: string;
  coverUrl?: string;
  genre: string;
  description: string;
  whyRecommended: string;
  ageSuitability: string;
  readingDifficulty: string;
  estimatedReadingExperience: string;
}

/**
 * Fetches a verified real book cover image from Open Library if available.
 * Never invents URLs; returns undefined when unavailable or on timeout.
 */
async function fetchVerifiedBookCover(title: string, author: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2400);
  try {
    const params = new URLSearchParams({
      title,
      author,
      limit: '1',
      fields: 'title,author_name,cover_i',
    });
    const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      docs?: Array<{ cover_i?: number }>;
    };
    const coverId = data.docs?.[0]?.cover_i;
    if (typeof coverId === 'number' && coverId > 0) {
      return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`;
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichBooksWithCovers(books: BookItem[]): Promise<BookItem[]> {
  return Promise.all(
    books.map(async (book) => {
      const coverUrl = await fetchVerifiedBookCover(book.title, book.author);
      return coverUrl ? { ...book, coverUrl } : book;
    }),
  );
}

async function generateWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

interface RecommendBody {
  verifiedAgeGroup?: string;
  preferences?: {
    genres?: string[];
    favouriteTopics?: string;
    favouriteAuthors?: string;
    readingDifficulty?: string;
    bookLength?: string;
    preferredLanguage?: string;
    favouriteThemes?: string;
  };
  excludeTitles?: string[];
  mode?: 'initial' | 'more' | 'similar';
  seedBooks?: Array<{ title: string; author: string }>;
}

function buildRecommendationPrompt(
  verifiedAgeGroup: VerifiedAgeGroup,
  body: RecommendBody,
): string {
  const prefs = body.preferences ?? {};
  const genresText =
    prefs.genres && prefs.genres.length > 0 ? prefs.genres.join(', ') : 'General Fiction';

  const lines = [
    `Verified Reader Profile (anonymised — no personal identity data):`,
    `- Verified Age Category: ${verifiedAgeGroup} years`,
    `- Selected Genres: ${genresText}`,
    `- Favourite Topics: ${prefs.favouriteTopics?.trim() || 'Not specified'}`,
    `- Favourite Authors: ${prefs.favouriteAuthors?.trim() || 'Not specified'}`,
    `- Reading Difficulty: ${prefs.readingDifficulty || 'Any'}`,
    `- Preferred Book Length: ${prefs.bookLength || 'Any'}`,
    `- Preferred Language: ${prefs.preferredLanguage?.trim() || 'English'}`,
    `- Favourite Themes: ${prefs.favouriteThemes?.trim() || 'Not specified'}`,
  ];

  if (body.excludeTitles && body.excludeTitles.length > 0) {
    lines.push(
      `\nDo NOT recommend any of these previously shown titles: ${body.excludeTitles.join(', ')}.`,
    );
  }

  if (body.mode === 'similar' && body.seedBooks && body.seedBooks.length > 0) {
    const seedList = body.seedBooks.map((b) => `"${b.title}" by ${b.author}`).join('; ');
    lines.push(
      `\nThe reader enjoyed the spirit of: ${seedList}. Recommend 8 DIFFERENT real books sharing similar appeal while strictly matching their verified age category (${verifiedAgeGroup}).`,
    );
  } else if (body.mode === 'more') {
    lines.push(
      `\nProvide 8 fresh, distinct real books tailored to this verified age category (${verifiedAgeGroup}) and preferences.`,
    );
  } else {
    lines.push(
      `\nRecommend EIGHT (8) distinct, best-matching real books for this verified reader. Always return 8 books. Strictly prioritize age-appropriateness and accuracy.`,
    );
  }

  return lines.join('\n');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Expose non-secret verification provider capability status
  app.get('/api/verify/config', (_req, res) => {
    const cfg = getVerificationProviderConfig();
    res.json({
      providerConfigured: cfg.providerConfigured,
      providerName: cfg.providerName,
      schoolIdSupported: cfg.schoolIdSupported,
      supportedMethods: cfg.supportedMethods,
    });
  });

  // Real Authorised Identity Verification Provider Endpoint (zero PII storage, no raw ID upload)
  app.post('/api/verify/provider', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;

      // Security safeguard: explicitly refuse raw identity documents or Aadhaar numbers
      if (
        'aadhaarNumber' in body ||
        'passportNumber' in body ||
        'documentImage' in body ||
        'documentBase64' in body ||
        'fileData' in body
      ) {
        res.status(400).json({
          error:
            'Security policy: Raw identity documents and Aadhaar/Passport numbers must never be transmitted to this application. Use an authorised provider session token.',
        });
        return;
      }

      const method = body.method as IdMethod;
      const consentGiven = body.consentGiven === true;
      const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken.trim() : '';

      if (!VALID_METHODS.includes(method)) {
        res.status(400).json({ error: 'Invalid identification method selected.' });
        return;
      }

      if (!consentGiven) {
        res.status(400).json({
          error: 'Explicit age-verification consent is required before proceeding.',
        });
        return;
      }

      const cfg = getVerificationProviderConfig();

      if (method === 'school-id' && !cfg.schoolIdSupported) {
        res.status(400).json({
          error:
            'School ID verification is only accepted when the authorised verification provider explicitly supports institutional School IDs.',
        });
        return;
      }

      if (!cfg.providerConfigured) {
        res.status(503).json({
          error:
            'No authorised identity verification provider is configured in server environment secrets (AGE_VERIFICATION_PROVIDER_URL / AGE_VERIFICATION_PROVIDER_API_KEY). Switch to Demo Verification Mode to test the full flow with fictional sample IDs.',
        });
        return;
      }

      if (!sessionToken) {
        res.status(400).json({
          error: 'An authorised provider verification token is required.',
        });
        return;
      }

      // Exchange token with the configured authorised verification provider and read ONLY minimum age result
      const providerRes = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          method,
          sessionToken,
          requestedScope: 'age_category_only',
        }),
      });

      if (!providerRes.ok) {
        res.status(502).json({
          error: 'Authorised verification provider could not confirm age.',
        });
        return;
      }

      const providerData = (await providerRes.json()) as {
        verified?: boolean;
        ageGroup?: string;
        verifiedAge?: number;
      };

      const ageGroup =
        normalizeAgeGroup(providerData.ageGroup) ?? normalizeAgeGroup(providerData.verifiedAge);

      if (!providerData.verified || !ageGroup) {
        res.status(422).json({
          error: 'Age verification was not confirmed by the authorised provider.',
        });
        return;
      }

      // Discard all personal details; emit only minimal anonymised verification result
      res.json({
        verified: true,
        mode: 'provider',
        method,
        ageGroup,
        verificationRef: `PRV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        verifiedAt: new Date().toISOString(),
        providerName: cfg.providerName || 'Authorised KYC Provider',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification request failed.';
      console.error('Provider verification error:', err);
      res.status(500).json({ error: message });
    }
  });

  // Separate Demo Mode Verification Endpoint (fictional sample personas only)
  app.post('/api/verify/demo', (req, res) => {
    const body = req.body as {
      method?: IdMethod;
      ageGroup?: string;
      sampleCode?: string;
    };

    if (!body.method || !VALID_METHODS.includes(body.method)) {
      res.status(400).json({ error: 'Please select a sample identification method.' });
      return;
    }

    const ageGroup = normalizeAgeGroup(body.ageGroup);
    if (!ageGroup) {
      res.status(400).json({ error: 'Please select a valid sample age category.' });
      return;
    }

    res.json({
      verified: true,
      mode: 'demo',
      method: body.method,
      ageGroup,
      verificationRef: `DEMO-${body.sampleCode || crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      verifiedAt: new Date().toISOString(),
      providerName: 'Demo Sandbox (SAMPLE - NOT A REAL ID)',
    });
  });

  app.post('/api/recommend', async (req, res) => {
    try {
      const body = req.body as RecommendBody;
      const verifiedAgeGroup = normalizeAgeGroup(body.verifiedAgeGroup);

      if (!verifiedAgeGroup) {
        res.status(400).json({
          error: 'Age verification is required before generating book recommendations.',
        });
        return;
      }

      if (!body.preferences?.genres || body.preferences.genres.length === 0) {
        res.status(400).json({
          error: 'Please select at least one book genre.',
        });
        return;
      }

      const ai = getAiClient();
      const prompt = buildRecommendationPrompt(verifiedAgeGroup, body);

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction: BOOKBUDDY_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: recommendationSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
      );

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Empty response received from Gemini AI.');
      }

      const parsed = JSON.parse(rawText) as {
        greeting?: string;
        safetyNote?: string;
        books?: BookItem[];
      };

      if (!Array.isArray(parsed.books) || parsed.books.length === 0) {
        throw new Error('Invalid recommendation format returned.');
      }

      res.json({
        greeting:
          parsed.greeting ||
          `Here are eight carefully matched books for the ${verifiedAgeGroup} age group!`,
        safetyNote: parsed.safetyNote || undefined,
        books: parsed.books.slice(0, 10),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to generate recommendations.';
      console.error('Recommendation API error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const {
        message,
        verifiedAgeGroup: rawAgeGroup,
        preferences,
        currentBooks,
        history,
      } = req.body as {
        message?: string;
        verifiedAgeGroup?: string;
        preferences?: RecommendBody['preferences'];
        currentBooks?: Array<{ title: string; author: string; genre: string }>;
        history?: Array<{ role: string; text: string }>;
      };

      const verifiedAgeGroup = normalizeAgeGroup(rawAgeGroup);
      if (!verifiedAgeGroup) {
        res.status(400).json({ error: 'Verified age group is required.' });
        return;
      }

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Please enter a message.' });
        return;
      }

      const ai = getAiClient();
      const contextSummary = [
        `Verified Reader Profile (anonymised):`,
        `- Verified Age Category: ${verifiedAgeGroup} years`,
        `- Genres: ${preferences?.genres?.join(', ') || 'Not set'}`,
        `- Topics: ${preferences?.favouriteTopics || 'Any'}`,
        `- Authors: ${preferences?.favouriteAuthors || 'Any'}`,
        `- Difficulty: ${preferences?.readingDifficulty || 'Any'}`,
        `- Length: ${preferences?.bookLength || 'Any'}`,
        `- Language: ${preferences?.preferredLanguage || 'English'}`,
        `- Themes: ${preferences?.favouriteThemes || 'Any'}`,
        currentBooks && currentBooks.length > 0
          ? `- Currently displayed books: ${currentBooks.map((b) => `"${b.title}" by ${b.author} (${b.genre})`).join('; ')}`
          : '- No books displayed yet.',
      ].join('\n');

      const recentHistory = (history || [])
        .slice(-6)
        .map((h) => `${h.role === 'user' ? 'Reader' : 'BookBuddy'}: ${h.text}`)
        .join('\n');

      const prompt = `${contextSummary}\n\nRecent conversation:\n${recentHistory || 'None'}\n\nReader says: "${message.trim()}"\n\nRespond warmly and helpfully. If the reader asks for new/different/similar book recommendations, include 8 real, strictly age-appropriate books for ${verifiedAgeGroup} in the "books" array; otherwise leave "books" empty.`;

      const chatSchema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Friendly, concise response to the reader in simple English.',
          },
          books: {
            type: Type.ARRAY,
            description:
              'Optional array of 8 new recommended books ONLY if the reader asked for new/more/similar books.',
            items: recommendationSchema.properties.books.items,
          },
        },
        required: ['reply'],
      };

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction: BOOKBUDDY_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: chatSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
      );

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Empty response from BookBuddy assistant.');
      }
      const parsed = JSON.parse(rawText) as { reply: string; books?: BookItem[] };

      res.json({
        reply: parsed.reply,
        books:
          Array.isArray(parsed.books) && parsed.books.length > 0
            ? parsed.books.slice(0, 10)
            : undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to reach BookBuddy right now.';
      console.error('Chat API error:', err);
      res.status(500).json({ error: message });
    }
  });

  // Non-blocking batch book cover lookup (called asynchronously after recommendations appear)
  app.post('/api/book-covers', async (req, res) => {
    try {
      const { books } = req.body as {
        books?: Array<{ title: string; author: string }>;
      };
      if (!Array.isArray(books) || books.length === 0) {
        res.json({ covers: {} });
        return;
      }

      const entries = await Promise.all(
        books.slice(0, 12).map(async (b) => {
          const url = await fetchVerifiedBookCover(b.title, b.author);
          return [b.title, url] as const;
        }),
      );

      const covers: Record<string, string> = {};
      for (const [title, url] of entries) {
        if (url) covers[title] = url;
      }
      res.json({ covers });
    } catch {
      res.json({ covers: {} });
    }
  });

  // Open chat endpoint for anyone unlocked via the 7-tap greeting
  app.post('/api/friend-chat', async (req, res) => {
    try {
      const { message, history } = req.body as {
        message?: string;
        history?: Array<{ role: string; text: string }>;
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Please enter a message.' });
        return;
      }

      const ai = getAiClient();
      const recentHistory = (history || [])
        .slice(-10)
        .map((h) => `${h.role === 'user' ? 'Friend' : 'BookBuddy'}: ${h.text}`)
        .join('\n');

      const prompt = `Conversation so far:\n${recentHistory || 'BookBuddy: Hello, you friend of Sharvesh!'}\n\nFriend says: "${message.trim()}"\n\nRespond warmly, clearly, and helpfully as BookBuddy AI. If they ask for book recommendations, include 8 real, safe, well-matched books in the "books" array; otherwise leave "books" empty.`;

      const friendChatSchema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Warm, helpful, concise reply in simple English.',
          },
          books: {
            type: Type.ARRAY,
            description:
              'Optional array of 8 real book recommendations ONLY if the user asked for book recommendations.',
            items: recommendationSchema.properties.books.items,
          },
        },
        required: ['reply'],
      };

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction: BOOKBUDDY_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: friendChatSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
      );

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Empty response from BookBuddy assistant.');
      }

      const parsed = JSON.parse(rawText) as { reply: string; books?: BookItem[] };

      res.json({
        reply: parsed.reply,
        books:
          Array.isArray(parsed.books) && parsed.books.length > 0
            ? parsed.books.slice(0, 10)
            : undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to reach BookBuddy right now.';
      console.error('Friend chat API error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BookBuddy AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
