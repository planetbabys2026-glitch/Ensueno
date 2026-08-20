import type { EstadoPedido } from '@/lib/permisos';

export interface Product {
  id: string;
  slug?: string;
  name: string;
  subtitle: string;
  category: 'sueno' | 'piel' | 'higiene' | 'kits';
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  badge?: string;
  fragrances: string[];
  sizes: string[];
  /** Precio propio de cada presentación. Las ausentes se cobran a `price`. */
  sizePrices?: Record<string, number> | null;
  description: string;
  benefits: string[];
  ingredients: string[];
  safetyInfo: string;
  pediatricGuarantee?: string;
  additionalImages?: string[];
  inStock: boolean;
  isFeatured?: boolean;
  /** Con fecha, el producto está retirado: no sale en la tienda ni en la ficha.
      `archived` es la palanca que manda el panel para ponerla o quitarla. */
  archivedAt?: string | Date | null;
  archived?: boolean;
}

export interface CartItem {
  id: string; // unique cart item id (product.id + fragrance + size)
  product: Product;
  selectedFragrance: string;
  selectedSize: string;
  quantity: number;
  /** Precio de la presentación elegida, congelado al agregar al carrito.
      Opcional porque los carritos guardados antes de existir este campo
      siguen en localStorage; ahí se cae a `product.price`. */
  unitPrice?: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  date?: string;
  /** Los ocho valores que el panel escribe de verdad. Decía 'preparando' y
      'entregado', que no existen: quien filtrara por ellos no encontraría nunca
      un pedido. La lista vive en `permisos.ts`, que es la que valida el PUT. */
  status: EstadoPedido;
  statusStep: number; // 1 to 4
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shipping: number;
  total: number;
  customerName: string;
  customerEmail: string;
  address: string;
  deliveryEstimate: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  babyName: string;
  babyAgeMonths: number;
  skinType: 'Normal' | 'Sensible' | 'Muy Sensible / Atópica';
  address: string;
  savedItemIds: string[];
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    nightRoutineReminder: boolean;
  };
}

export interface Tip {
  id: string;
  title: string;
  subtitle: string;
  category: 'sueno' | 'piel' | 'higiene' | 'rutinas';
  categoryLabel: string;
  readTime: string;
  date: string;
  author: string;
  authorRole: string;
  image: string;
  summary: string;
  content: string[];
  tags: string[];
  /** Link de YouTube para incrustar en el artículo. */
  videoUrl?: string | null;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle?: string | null;
  code?: string | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  badge?: string | null;
  badgeColor?: string | null;
  tagline?: string | null;
  description?: string | null;
  savingText?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  targetBabyStage?: string | null;
  isActive: boolean;
  sortOrder?: number | null;
  productId?: string | null;
}
