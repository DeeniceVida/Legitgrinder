
export enum ShippingMode {
  AIR = 'Air',
  SEA = 'Sea'
}

export enum Origin {
  CHINA = 'China',
  USA = 'USA'
}

export enum OrderStatus {
  RECEIVED_BY_AGENT = 'Order Placed',
  PREPARING = 'Preparing Order',
  COLLECTED = 'Collected by Agent',
  LEFT_WAREHOUSE = 'Left Warehouse',
  SHIPPING = 'Now Shipping',
  LANDED_CUSTOMS = 'Landed & In Customs',
  EN_ROUTE_NAIROBI = 'En route to Nairobi',
  READY_FOR_COLLECTION = 'Ready to Collect',
  DROPPED_BY_RIDER = 'Dropped by Rider',
  DELIVERED = 'Delivered & Completed'
}

export enum ConsultationStatus {
  PENDING = 'Pending Review',
  DOABLE = 'Confirmed Doable',
  PAID = 'Paid & Scheduled',
  RESCHEDULED = 'Rescheduled',
  CANCELLED = 'Cancelled'
}

export interface Consultation {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  date: string;
  time: string;
  topic: string;
  status: ConsultationStatus;
  feeUSD: number;
}

export enum Availability {
  LOCAL = 'Available Locally',
  IMPORT = 'Import on Order'
}

export interface ProductVariation {
  type: 'Size' | 'Design' | 'Color' | 'Bundle' | 'Capacity';
  name: string;
  priceKES: number; // Override or additional cost
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  priceKES: number;
  discountPriceKES?: number;
  imageUrls: string[];
  variations: ProductVariation[];
  availability: Availability;
  shippingDuration?: string;
  description: string;
  category: string;
  stockCount?: number;
  videoUrl?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId?: string;
  clientName: string;
  productName: string;
  quantity?: number;
  status: OrderStatus;
  progress: number;
  lastUpdate: string;
  isPaid: boolean;
  totalKES?: number;
  date?: string;
  createdAt?: string;
  paystackReference?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinedDate: string;
  totalSpentKES: number;
  orderCount: number;
  lastOrderDate: string;
  interests: string[];
  purchasedItems: string[];
  purchaseFrequency: 'High' | 'Medium' | 'Low';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  interests: string[];
}

export interface CapacityPrice {
  id: string; // The variant UUID from database
  capacity: string;
  sourcePriceUSD: number | null;
  currentPriceKES: number;
  previousPriceKES: number;
  lastSynced: string;
  isManualOverride: boolean;
}

export interface PricelistItem {
  id: string;
  modelName: string;
  brand: 'iphone' | 'samsung' | 'pixel';
  series: string;
  capacities: CapacityPrice[];
  syncAlert: boolean;
  sourceUrl?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  date: string;
  author: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// Added CalculationResult interface to fix missing export error
export interface CalculationResult {
  buyingPriceKES: number;
  shippingFeeKES: number;
  serviceFeeKES: number;
  applePickupFeeKES?: number;
  totalKES: number;
}
export type SourcingStatus = 'pending' | 'viewed' | 'contacted' | 'completed';

export interface SourcingRequest {
  id?: number;
  clientName: string;
  clientWhatsapp: string;
  productName: string;
  productCategory?: string;
  productLink?: string;
  estimatedQuantity: number;
  shippingPreference: 'Air' | 'Sea';
  itemType: 'Fragile' | 'Heavy' | 'General';
  targetBudgetKES?: number;
  urgency: 'High' | 'Medium' | 'Low';
  status: SourcingStatus;
  createdAt?: string;

  // Shipping calculator fields
  shippingWeight?: number; // for air freight (kg)
  packageLength?: number; // for sea freight (cm)
  packageWidth?: number; // for sea freight (cm)
  packageHeight?: number; // for sea freight (cm)
  calculatedCBM?: number; // auto-calculated cubic meters
  estimatedShippingCost?: number; // calculated shipping cost in KES
}

export const getOrderProgress = (status: OrderStatus): number => {
  switch (status) {
    case OrderStatus.RECEIVED_BY_AGENT: return 10;
    case OrderStatus.PREPARING: return 20;
    case OrderStatus.COLLECTED: return 35;
    case OrderStatus.LEFT_WAREHOUSE: return 50;
    case OrderStatus.SHIPPING: return 65;
    case OrderStatus.LANDED_CUSTOMS: return 80;
    case OrderStatus.EN_ROUTE_NAIROBI: return 90;
    case OrderStatus.READY_FOR_COLLECTION: return 95;
    case OrderStatus.DROPPED_BY_RIDER: return 98;
    case OrderStatus.DELIVERED: return 100;
    default: return 0;
  }
};


export interface EBook {
  id: string;
  title: string;
  author: string;
  description: string;
  priceKES: number;
  discountPriceKES?: number;
  coverImage: string;
  content: string;
  pdfUrl?: string;
  createdAt?: string;
}

export interface EBookPurchase {
  id: string;
  userId: string;
  bookId: string;
  purchasedAt: string;
}
