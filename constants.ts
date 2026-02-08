
import { ShippingMode, Origin, OrderStatus } from './types';

export const KES_PER_USD = 135;
export const WHATSAPP_NUMBER = '254791873538';

// Foundation for Cloudflare Worker integration
export const API_BASE_URL = 'https://api.legitgrinder.com';

export const PHONE_MODELS_SCHEMA = {
  iphone: [
    { name: 'iPhone 11', capacities: ['64GB', '128GB', '256GB'], series: '11 Series' },
    { name: 'iPhone 11 Pro', capacities: ['64GB', '256GB', '512GB'], series: '11 Series' },
    { name: 'iPhone 11 Pro Max', capacities: ['64GB', '256GB', '512GB'], series: '11 Series' },
    { name: 'iPhone SE (2nd Gen)', capacities: ['64GB', '128GB', '256GB'], series: 'SE' },
    { name: 'iPhone 12 mini', capacities: ['64GB', '128GB', '256GB'], series: '12 Series' },
    { name: 'iPhone 12', capacities: ['64GB', '128GB', '256GB'], series: '12 Series' },
    { name: 'iPhone 12 Pro', capacities: ['128GB', '256GB', '512GB'], series: '12 Series' },
    { name: 'iPhone 12 Pro Max', capacities: ['128GB', '256GB', '512GB'], series: '12 Series' },
    { name: 'iPhone 13 mini', capacities: ['128GB', '256GB', '512GB'], series: '13 Series' },
    { name: 'iPhone 13', capacities: ['128GB', '256GB', '512GB'], series: '13 Series' },
    { name: 'iPhone 13 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '13 Series' },
    { name: 'iPhone 13 Pro Max', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '13 Series' },
    { name: 'iPhone SE (3rd Gen)', capacities: ['64GB', '128GB', '256GB'], series: 'SE' },
    { name: 'iPhone 14', capacities: ['128GB', '256GB', '512GB'], series: '14 Series' },
    { name: 'iPhone 14 Plus', capacities: ['128GB', '256GB', '512GB'], series: '14 Series' },
    { name: 'iPhone 14 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '14 Series' },
    { name: 'iPhone 14 Pro Max', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '14 Series' },
    { name: 'iPhone 15', capacities: ['128GB', '256GB', '512GB'], series: '15 Series' },
    { name: 'iPhone 15 Plus', capacities: ['128GB', '256GB', '512GB'], series: '15 Series' },
    { name: 'iPhone 15 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '15 Series' },
    { name: 'iPhone 15 Pro Max', capacities: ['256GB', '512GB', '1TB'], series: '15 Series' },
    { name: 'iPhone 16', capacities: ['128GB', '256GB', '512GB'], series: '16 Series' },
    { name: 'iPhone 16 Plus', capacities: ['128GB', '256GB', '512GB'], series: '16 Series' },
    { name: 'iPhone 16 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '16 Series' },
    { name: 'iPhone 16 Pro Max', capacities: ['256GB', '512GB', '1TB'], series: '16 Series' },
    { name: 'iPhone 16e', capacities: ['128GB', '256GB'], series: '16 Series' }
  ],
  samsung: [
    { name: 'S24 Ultra', capacities: ['256GB', '512GB', '1TB'], series: 'S24 Series' },
    { name: 'S24+', capacities: ['256GB', '512GB'], series: 'S24 Series' },
    { name: 'S24', capacities: ['128GB', '256GB', '512GB'], series: 'S24 Series' },
    { name: 'S23 Ultra', capacities: ['256GB', '512GB', '1TB'], series: 'S23 Series' },
    { name: 'S23+', capacities: ['256GB', '512GB'], series: 'S23 Series' },
    { name: 'S23', capacities: ['128GB', '256GB', '512GB'], series: 'S23 Series' },
    { name: 'S22 Ultra', capacities: ['128GB', '256GB', '512GB', '1TB'], series: 'S22 Series' },
    { name: 'S22+', capacities: ['128GB', '256GB'], series: 'S22 Series' },
    { name: 'S22', capacities: ['128GB', '256GB'], series: 'S22 Series' },
    { name: 'S21 Ultra', capacities: ['128GB', '256GB', '512GB'], series: 'S21 Series' },
    { name: 'S21+', capacities: ['128GB', '256GB'], series: 'S21 Series' },
    { name: 'S21', capacities: ['128GB', '256GB'], series: 'S21 Series' },
    { name: 'S21 FE', capacities: ['128GB', '256GB'], series: 'S21 Series' },
    { name: 'S20 Ultra', capacities: ['128GB', '256GB', '512GB'], series: 'S20 Series' },
    { name: 'S20+', capacities: ['128GB', '512GB'], series: 'S20 Series' },
    { name: 'S20', capacities: ['128GB', '512GB'], series: 'S20 Series' },
    { name: 'S20 FE', capacities: ['128GB', '256GB'], series: 'S20 Series' },
    { name: 'S10+', capacities: ['128GB', '512GB', '1TB'], series: 'S10 Series' },
    { name: 'S10', capacities: ['128GB', '512GB', '1TB'], series: 'S10 Series' },
    { name: 'S10e', capacities: ['128GB', '256GB'], series: 'S10 Series' }
  ],
  pixel: [
    { name: 'Pixel 9', capacities: ['128GB', '256GB'], series: '9 Series' },
    { name: 'Pixel 9 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '9 Series' },
    { name: 'Pixel 9 Pro XL', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '9 Series' },
    { name: 'Pixel 9 Pro Fold', capacities: ['256GB', '512GB'], series: '9 Series' },
    { name: 'Pixel 8a', capacities: ['128GB', '256GB'], series: '8 Series' },
    { name: 'Pixel 8', capacities: ['128GB', '256GB'], series: '8 Series' },
    { name: 'Pixel 8 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '8 Series' },
    { name: 'Pixel 7a', capacities: ['128GB'], series: '7 Series' },
    { name: 'Pixel 7', capacities: ['128GB', '256GB'], series: '7 Series' },
    { name: 'Pixel 7 Pro', capacities: ['128GB', '256GB', '512GB'], series: '7 Series' },
    { name: 'Pixel Fold', capacities: ['256GB', '512GB'], series: 'Fold Series' },
    { name: 'Pixel 6a', capacities: ['128GB'], series: '6 Series' },
    { name: 'Pixel 6', capacities: ['128GB', '256GB'], series: '6 Series' },
    { name: 'Pixel 6 Pro', capacities: ['128GB', '256GB', '512GB'], series: '6 Series' }
  ]
};

export const FEE_STRUCTURE = {
  SHIPPING_FLAT_USD: 20,
  SHIPPING_PERCENT: 0.035,
  SERVICE_FEE_FIXED_USD: 30,
  SERVICE_FEE_PERCENT_LARGE: 0.045,
  THRESHOLD_USD: 750,
  APPLE_PICKUP_FEE_USD: 60
};

export const STATUS_SEQUENCE = [
  OrderStatus.RECEIVED_BY_AGENT,
  OrderStatus.PREPARING,
  OrderStatus.COLLECTED,
  OrderStatus.SHIPPING,
  OrderStatus.LANDED_CUSTOMS,
  OrderStatus.READY_FOR_COLLECTION,
  OrderStatus.DELIVERED
];
