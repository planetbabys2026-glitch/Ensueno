import { revalidatePath } from 'next/cache';

/**
 * Manda a regenerar la portada.
 *
 * La home es un Server Component que lee Prisma directo. Como no toca ninguna
 * API dinámica (cookies, headers, searchParams), Next la prerrenderiza durante
 * el build y después sirve ese HTML tal cual, para siempre: en
 * `prerender-manifest.json` la ruta `/` sale con `initialRevalidateSeconds:
 * false`. Por eso lo que se editaba en el panel se guardaba bien en la base y
 * aun así la landing seguía mostrando el catálogo del día del despliegue.
 *
 * Cada escritura de catálogo, promociones o portada pasa por aquí. El
 * `revalidate` de `page.tsx` es solo la red de seguridad para cuando la
 * invalidación puntual no alcanza (por ejemplo, con varias instancias).
 */
export function revalidateStorefront() {
  try {
    revalidatePath('/', 'page');
  } catch (err) {
    // La escritura ya está hecha: si falla el invalidado, se avisa y se sigue.
    // Devolver 500 aquí haría que el panel cantara error sobre un guardado que
    // sí ocurrió, que es peor que una portada rezagada unos minutos.
    console.warn('[revalidateStorefront] No se pudo invalidar la portada:', err);
  }
}
