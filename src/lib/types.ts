export interface OrderItem {
  id: string;
  name?: string;
  qty?: number;
  price?: number;
  [key: string]: unknown;
}

export interface Order {
  id: string;
  userId: string;
  date: string;
  status: string;
  total: number;
  subtotal: number;
  shipping: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  payment: string;
  createdAt: string;
  items: OrderItem[];
}

export interface Review {
  id: string;
  userId: string;
  orderId: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  suspended: boolean;
  createdAt: string;
}

export interface WishlistItem {
  userId: string;
  productId: string;
  addedAt: string;
  customerName: string;
  customerEmail: string;
}

export const ORDER_STATUSES = [
  'Pending',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
