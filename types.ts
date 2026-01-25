
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

export interface Product {
  id: string;
  name: string;
  priceKES: number;
  discount_price?: number;
  inventory_quantity: number;
  variations: string[];
  colors: string[];
  buyingPriceKES?: number;
  shippingFeeKES?: number;
  serviceFeeKES?: number;
  origin: Origin;
  category: string;
  image: string;
  description: string;
  stockStatus: 'In Stock' | 'Import on Order';
}

export interface CapacityPrice {
  capacity: string;
  sourcePriceUSD: number | null;
  currentPriceKES: number;
  previousPriceKES: number;
  lastSynced: string;
  isManualOverride: boolean;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  capacity: string;
  source_url: string | null;
  price_usd: number | null;
  price_kes: number | null;
  last_updated: string | null;
  status: 'active' | 'out_of_stock' | 'error';
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

export interface Order {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientLocation: string;
  productName: string;
  productUrl?: string;
  buyingPriceKES: number;
  shippingFeeKES: number;
  serviceFeeKES: number;
  totalCostKES: number;
  status: OrderStatus;
  mode: ShippingMode;
  origin: Origin;
  datePlaced: string;
  isPaid: boolean;
  weightKg?: number;
  dimensions?: string; // e.g., "10x20x30 cm"
}

export interface CalculationResult {
  buyingPriceKES: number;
  shippingFeeKES: number;
  serviceFeeKES: number;
  totalKES: number;
}
