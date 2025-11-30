
export type ActivityType = 'spot' | 'food' | 'other';

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

export interface Expense {
  id: string;
  item: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
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
  expenses: Expense[];
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
