
export enum ShippingMode {
  AIR = 'Air',
  SEA = 'Sea'
}

export enum Origin {
  CHINA = 'China',
  USA = 'USA'
}

export enum OrderStatus {
  RECEIVED_BY_AGENT = 'Received by Agent',
  LEFT_WAREHOUSE = 'Left Warehouse',
  SHIPPING = 'Now Shipping',
  LANDED_CUSTOMS = 'Landed & In Customs',
  EN_ROUTE_NAIROBI = 'En route to Nairobi',
  READY_FOR_COLLECTION = 'Ready to Collect'
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
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  productName: string;
  status: OrderStatus;
  progress: number;
  lastUpdate: string;
  isPaid: boolean;
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
  totalKES: number;
}
