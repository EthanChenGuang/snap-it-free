export type NavTab = 'list' | 'map' | 'post' | 'setting' | 'detail';

export type ItemCondition = 'New' | 'Good' | 'Fair' | 'Used - Like New';

export type Category = 'All' | 'Furniture' | 'Tech' | 'Apparel' | 'Books' | 'Home Decor' | 'Others';

export interface Owner {
  id: string;
  name: string;
  avatar: string;
  joinedYear: number;
  itemsGiven: number;
  isVerified: boolean;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: Category;
  condition: ItemCondition;
  location: string;
  district: string;
  city: string;
  distanceKm?: number;
  imageUrl: string;
  mapSnippetUrl?: string;
  badge?: string; // e.g. "Verified Free", "NEW ARRIVAL", "LIDO EXCLUSIVE"
  timeAgo: string;
  isAvailable: boolean;
  cost: string; // "¥0.00" or "Free"
  conditionDetails?: string[];
  pickupLogistics?: string;
  owner: Owner;
  lat: number;
  lng: number;
  claimedBy?: string;
  createdAt: number;
}

export interface Zone {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED';
  lastUpdated: string;
  icon: string;
}

export interface AppSettings {
  language: 'zh' | 'en' | 'it';
  pushNotifications: boolean;
  soundAlerts: boolean;
  appearance: 'System default' | 'Light' | 'Dark';
}

export interface ChatMessage {
  id: string;
  itemId: string;
  sender: 'user' | 'owner';
  text: string;
  timestamp: string;
}
