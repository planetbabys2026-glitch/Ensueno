import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretEncoded } from '@/lib/jwt';
import { ES_ROL_DE_PANEL, moduloDeRuta, puedeVerModulo } from '@/lib/permisos';

/** Métodos que no modifican nada: la tienda los necesita abiertos. */
const SOLO_LECTURA = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rutas de lectura pública pero escritura del panel.
 *
 * El catálogo, las promociones, los tips y las tarifas de envío se leen desde
 * la tienda sin sesión, pero crearlos, editarlos o borrarlos es cosa del panel.
 * Antes vivían fuera de todo control: bastaba un POST a /api/v1/products para
 * escribir en el catálogo. Cada una revalida el rol contra la base por su
 * cuenta; esto es la primera barrera, en el borde.
 *
 * /api/v1/shipping/calculate queda fuera a propósito: es un POST público que
 * el carrito usa para cotizar el flete.
 */
const ESCRITURA_SOLO_ADMIN = [
  '/api/v1/products',
  '/api/v1/promotions',
  '/api/v1/tips',
  '/api/v1/hero',
  '/api/v1/shipping/config',
  '/api/v1/shipping/rates',
];

const enRuta = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const esApiDeAdmin = enRuta(pathname, '/api/v1/admin');
  const esEscrituraProtegida =
    !SOLO_LECTURA.has(request.method) && ESCRITURA_SOLO_ADMIN.some((base) => enRuta(pathname, base));

  if (!esApiDeAdmin && !esEscrituraProtegida) {
    return NextResponse.next();
  }

  const token = request.cookies.get('ensueno_token')?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: 'No autorizado: Token requerido' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretEncoded());

    if (!ES_ROL_DE_PANEL(payload.role)) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado: Se requieren permisos del panel' },
        { status: 403 }
      );
    }

    // Cada ruta pertenece a un módulo; si el rol no lo tiene, no pasa de aquí.
    // `permisos.ts` es la misma tabla que usan las rutas, así que el borde y el
    // servidor no pueden opinar distinto.
    const vigilancia = moduloDeRuta(pathname);
    if (vigilancia?.modulo && !puedeVerModulo(payload.role, vigilancia.modulo)) {
      return NextResponse.json(
        { success: false, error: 'Tu rol no tiene acceso a esta sección' },
        { status: 403 }
      );
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Sesión expirada' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/v1/admin/:path*',
    '/api/v1/products/:path*',
    '/api/v1/promotions/:path*',
    '/api/v1/tips/:path*',
    '/api/v1/hero/:path*',
    '/api/v1/shipping/:path*',
  ],
};
