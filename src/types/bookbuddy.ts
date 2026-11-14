export type VerifiedAgeGroup = '8–12' | '13–17' | '18–25' | '26–40' | 'Above 40';

export type IdMethod = 'aadhaar' | 'passport' | 'school-id';

export type VerificationMode = 'provider' | 'demo';

export interface VerificationResult {
  verified: boolean;
  mode: VerificationMode;
  method: IdMethod;
  ageGroup: VerifiedAgeGroup;
  verificationRef: string;
  verifiedAt: string;
  providerName: string;
}

export interface ProviderConfigStatus {
  providerConfigured: boolean;
  providerName: string | null;
  schoolIdSupported: boolean;
  supportedMethods: IdMethod[];
}

export interface DemoPersona {
  id: string;
  label: string;
  ageGroup: VerifiedAgeGroup;
  recommendedMethod: IdMethod;
  sampleCode: string;
  description: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'demo-8-12',
    label: 'Sample Reader (Ages 8–12)',
    ageGroup: '8–12',
    recommendedMethod: 'school-id',
    sampleCode: 'SAMPLE-SCH-0812',
    description: 'Fictional middle-grade student ID for safe juvenile testing',
  },
  {
    id: 'demo-13-17',
    label: 'Sample Reader (Ages 13–17)',
    ageGroup: '13–17',
    recommendedMethod: 'school-id',
    sampleCode: 'SAMPLE-SCH-1317',
    description: 'Fictional teen high-school ID for YA suitability testing',
  },
  {
    id: 'demo-18-25',
    label: 'Sample Reader (Ages 18–25)',
    ageGroup: '18–25',
    recommendedMethod: 'aadhaar',
    sampleCode: 'SAMPLE-VID-1825',
    description: 'Fictional young adult sample card (not a real Aadhaar)',
  },
  {
    id: 'demo-26-40',
    label: 'Sample Reader (Ages 26–40)',
    ageGroup: '26–40',
    recommendedMethod: 'passport',
    sampleCode: 'SAMPLE-PSP-2640',
    description: 'Fictional adult sample passport (not a real document)',
  },
  {
    id: 'demo-above-40',
    label: 'Sample Reader (Above 40)',
    ageGroup: 'Above 40',
    recommendedMethod: 'aadhaar',
    sampleCode: 'SAMPLE-VID-4099',
    description: 'Fictional mature reader sample card (not a real Aadhaar)',
  },
];

export interface GenreItem {
  id: string;
  name: string;
  category: 'Fiction' | 'Nonfiction';
}

export const FICTION_GENRES: GenreItem[] = [
  { id: 'mystery-detective', name: 'Mystery & Detective', category: 'Fiction' },
  { id: 'thriller-suspense', name: 'Thriller & Suspense', category: 'Fiction' },
  { id: 'fantasy', name: 'Fantasy', category: 'Fiction' },
  { id: 'sci-fi', name: 'Science Fiction', category: 'Fiction' },
  { id: 'romance', name: 'Romance', category: 'Fiction' },
  { id: 'horror', name: 'Horror', category: 'Fiction' },
  { id: 'historical-fiction', name: 'Historical Fiction', category: 'Fiction' },
  { id: 'literary-fiction', name: 'Literary Fiction', category: 'Fiction' },
];

export const NONFICTION_GENRES: GenreItem[] = [
  { id: 'biography-memoir', name: 'Biography & Memoir', category: 'Nonfiction' },
  { id: 'history', name: 'History', category: 'Nonfiction' },
  { id: 'self-help', name: 'Self-Help & Personal Development', category: 'Nonfiction' },
  { id: 'true-crime', name: 'True Crime', category: 'Nonfiction' },
  { id: 'science-nature', name: 'Science & Nature', category: 'Nonfiction' },
];

export const ALL_GENRES: GenreItem[] = [...FICTION_GENRES, ...NONFICTION_GENRES];

export type ReadingDifficulty = 'Any' | 'Easy & Accessible' | 'Moderate' | 'Deep & Challenging';
export type BookLengthPreference = 'Any' | 'Short & Quick' | 'Medium' | 'Long & Immersive';

export interface UserPreferences {
  genres: string[];
  favouriteTopics: string;
  favouriteAuthors: string;
  readingDifficulty: ReadingDifficulty;
  bookLength: BookLengthPreference;
  preferredLanguage: string;
  favouriteThemes: string;
}

export interface BookRecommendation {
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

export interface RecommendationResponse {
  greeting: string;
  safetyNote?: string;
  books: BookRecommendation[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  books?: BookRecommendation[];
}

export type JourneyStage =
  | 'welcome'
  | 'verify-age'
  | 'genres'
  | 'recommendations'
  | 'friend-chat';
