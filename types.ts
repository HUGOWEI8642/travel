
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
  photos: string[]; // Array of image URLs or base64 strings
  coverImage?: string; // Optional: specific cover image. If undefined, defaults to photos[0]
  expenses: Expense[];
}

export type ViewMode = 'list' | 'create' | 'detail';

export const DEFAULT_MEMBERS = ['Hugo', '仁駿', 'Hiro'];
