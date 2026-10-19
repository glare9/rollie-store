export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  sort_order: number;
};

export type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  pet_name: string | null;
  address: string;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
};

export type OrderStatus = "pending_payment" | "paid" | "delivered" | "cancelled";

export type Order = {
  id: string;
  order_ref: string;
  customer_id: string;
  status: OrderStatus;
  delivery_date: string;
  delivery_slot: string;
  delivery_address: string;
  pet_name: string | null;
  subtotal_cents: number;
  customer_note: string | null;
  payment_validated_at: string | null;
  confirmation_email_sent_at: string | null;
  created_at: string;
};

export type DeliverySlot = {
  code: string;
  label: string;
  start_time: string;
  end_time: string;
  sort_order: number;
};

export type DeliveryDay = {
  delivery_date: string;
  booked: number;
  cap: number;
  is_full: boolean;
};

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(cents / 100);
