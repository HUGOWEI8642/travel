
export type ActivityType = 'spot' | 'food' | 'other' | 'regret';

export interface Review {
  id: string;
  reviewer: string;
  rating: number; // 0-5
  comment: string;
  date?: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  reviews: Review[];
}

export interface ItineraryItem {
  date: string;
  activities: Activity[];
}

export type Currency = 'TWD' | 'JPY' | 'USD' | 'KRW' | 'EUR';

export type ExpenseCategory = 'transport' | 'accommodation' | 'food' | 'misc';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string, color: string, icon: string }> = {
  transport: { label: '交通', color: '#3b82f6', icon: '🚆' },      // Blue
  accommodation: { label: '住宿', color: '#8b5cf6', icon: '🛏️' }, // Violet
  food: { label: '餐食', color: '#f97316', icon: '🍴' },          // Orange
  misc: { label: '雜項', color: '#64748b', icon: '📝' }           // Slate
};

export interface Expense {
  id: string;
  item: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  category: ExpenseCategory;
}

export interface GeneralThought {
  id: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface TravelRecord {
  id: string;
  title: string;
  location: string;
  isInternational: boolean; // false for Domestic, true for International
  startDate: string;
  endDate: string;
  members: string[];
  itinerary: ItineraryItem[];
  photos: string[]; // Legacy: kept for backward compatibility or thumbnails
  coverImage?: string; // Specific cover image
  coverPosition?: string; // CSS object-position value (e.g., "50% 20%")
  coverScale?: number; // CSS transform scale value (e.g., 1.5)
  expenses: Expense[];
  generalThoughts: GeneralThought[];
}

// New interface for separate photo storage
export interface PhotoDocument {
  id: string;
  recordId: string;
  base64: string;
  createdAt: number;
}

export interface AppSettings {
  title: string;
  subtitle: string;
}

export type ViewMode = 'list' | 'create' | 'detail' | 'edit';

export const DEFAULT_MEMBERS = ['Hugo', '仁駿', 'Hiro'];
