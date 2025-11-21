// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common entity types
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// User types
export type UserRole = "founder" | "verified_creator" | "crew" | "admin" | "moderator" | "user";

export interface User extends BaseEntity {
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  roles: UserRole[];
}

// Script types
export interface Script extends BaseEntity {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  framework?: string[];
  sellerName: string;
  sellerEmail: string;
  sellerId?: string;
  tags: string[];
  features: string[];
  requirements: string[];
  images: string[];
  videos: string[];
  screenshots: string[];
  coverImage?: string;
  demoUrl?: string;
  documentationUrl?: string;
  supportUrl?: string;
  version: string;
  status: "pending" | "approved" | "rejected";
  featured: boolean;
  downloads: number;
  rating: number;
  reviewCount: number;
}

// Giveaway types
export interface Giveaway extends BaseEntity {
  title: string;
  description: string;
  totalValue: string;
  category: string;
  endDate: string;
  maxEntries?: number;
  featured: boolean;
  autoAnnounce: boolean;
  creatorName: string;
  creatorEmail: string;
  creatorId?: string;
  images: string[];
  videos: string[];
  coverImage?: string;
  tags: string[];
  rules: string[];
  status: "active" | "ended" | "cancelled";
  entriesCount: number;
}

// Ad types
export interface Ad extends BaseEntity {
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  category: string;
  status: "active" | "inactive" | "expired";
  startDate: string;
  endDate?: string;
  createdBy: string;
}




