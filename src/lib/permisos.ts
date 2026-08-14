/**
 * Quién puede ver y hacer qué dentro del panel.
 *
 * Este archivo es la única fuente de verdad: lo leen el proxy (primera barrera,
 * en el borde), cada ruta de API (barrera real, revalidada contra la base) y la
 * navegación del panel. Si la lista de módulos de un rol viviera repetida en
 * los tres sitios, tarde o temprano uno se desincronizaría y el desfase sería
 * justo el que abre un agujero.
 *
 * No importa nada de Prisma a propósito: el proxy corre en el edge.
 */

/** Roles que pueden entrar al panel. `CUSTOMER` no está, y esa es la idea. */
export type RolPanel = 'ADMIN' | 'ASISTENTE';

export type ModuloPanel =
  | 'orders'
  | 'metrics'
  | 'followup'
  | 'hero'
  | 'crm'
  | 'shipping'
  | 'products'
  | 'tips'
  | 'team';

const TODOS_LOS_MODULOS: readonly ModuloPanel[] = [
  'orders',
  'metrics',
  'followup',
  'hero',
  'crm',
  'shipping',
  'products',
  'tips',
  'team',
];

/**
 * La asistente entra a atender clientas: los pedidos del día, las llamadas de
 * seguimiento y el contenido del blog. Fuera quedan el catálogo, los precios de
 * envío, la portada, las métricas del negocio, el directorio de clientas y —
 * sobre todo— el equipo: quien pudiera invitar se daría acceso total a sí misma.
 */
export const MODULOS_POR_ROL: Record<RolPanel, readonly ModuloPanel[]> = {
  ADMIN: TODOS_LOS_MODULOS,
  ASISTENTE: ['orders', 'followup', 'tips'],
};

export const ES_ROL_DE_PANEL = (rol: unknown): rol is RolPanel =>
  rol === 'ADMIN' || rol === 'ASISTENTE';

export function puedeVerModulo(rol: unknown, modulo: ModuloPanel): boolean {
  if (!ES_ROL_DE_PANEL(rol)) return false;
  return MODULOS_POR_ROL[rol].includes(modulo);
}

/** Nombre del rol tal como se le muestra a una persona. */
export const NOMBRE_ROL: Record<RolPanel, string> = {
  ADMIN: 'Administradora',
  ASISTENTE: 'Asistente',
};

/* -------------------------------------------------------------------------
 * Estados de pedido
 * ---------------------------------------------------------------------- */

/** Los ocho estados que el panel escribe en `Order.status`. */
export const ESTADOS_PEDIDO = [
  'orden_generada',
  'confirmado',
  'empacada',
  'en_camino',
  'sin_poder_entregarse',
  'entregada',
  'devolucion',
  'anulada',
] as const;

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

/**
 * Estados que cada rol NO puede asignar.
 *
 * Anular es la única transición que borra plata de la contabilidad: saca el
 * pedido de los ingresos y no tiene vuelta desde la vista de la clienta. Esa
 * decisión se queda en administración.
 */
export const ESTADOS_VETADOS: Record<RolPanel, readonly EstadoPedido[]> = {
  ADMIN: [],
  ASISTENTE: ['anulada'],
};

export function puedeAsignarEstado(rol: unknown, estado: string): boolean {
  if (!ES_ROL_DE_PANEL(rol)) return false;
  return !(ESTADOS_VETADOS[rol] as readonly string[]).includes(estado);
}

/* -------------------------------------------------------------------------
 * Rutas de API
 * ---------------------------------------------------------------------- */

/**
 * Qué módulo protege cada ruta. El proxy resuelve el prefijo más largo que
 * coincida, así que `/api/v1/shipping/config` gana sobre `/api/v1/shipping`.
 *
 * `null` significa "cualquier rol del panel": subir imágenes lo necesitan tanto
 * el catálogo como los tips, y quién puede usarlo ya lo decide el módulo desde
 * el que se sube.
 */
export const MODULO_POR_RUTA: ReadonlyArray<readonly [string, ModuloPanel | null]> = [
  ['/api/v1/admin/orders', 'orders'],
  ['/api/v1/admin/followups', 'followup'],
  ['/api/v1/admin/analytics', 'metrics'],
  ['/api/v1/admin/remarketing', 'crm'],
  ['/api/v1/admin/users', 'team'],
  ['/api/v1/admin/uploads', null],
  ['/api/v1/tips', 'tips'],
  ['/api/v1/products', 'products'],
  ['/api/v1/promotions', 'products'],
  ['/api/v1/hero', 'hero'],
  ['/api/v1/shipping', 'shipping'],
  // Cualquier otra cosa bajo /api/v1/admin que se agregue mañana queda cerrada
  // a administración hasta que alguien la clasifique aquí a propósito.
  ['/api/v1/admin', 'team'],
];

const enRuta = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/**
 * Módulo que protege una ruta. `undefined` = ruta no vigilada.
 * Devuelve `{ modulo: null }` para las abiertas a todo el panel.
 */
export function moduloDeRuta(pathname: string): { modulo: ModuloPanel | null } | undefined {
  const coincidencias = MODULO_POR_RUTA.filter(([base]) => enRuta(pathname, base));
  if (coincidencias.length === 0) return undefined;

  // El prefijo más específico manda.
  const [, modulo] = coincidencias.reduce((a, b) => (b[0].length > a[0].length ? b : a));
  return { modulo };
}
