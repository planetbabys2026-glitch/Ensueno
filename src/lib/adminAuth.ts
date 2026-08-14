import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecretEncoded } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { ES_ROL_DE_PANEL, puedeVerModulo, type ModuloPanel } from '@/lib/permisos';

export interface AdminSession {
  id: string;
  role: string;
  email: string;
}

/** Respuesta única para todo lo que exige rol de administrador. */
export const noAutorizado = () =>
  NextResponse.json(
    { success: false, error: 'No autorizado. Se requiere rol de Administrador' },
    { status: 401 }
  );

/** Lo mismo, pero para quien sí entró al panel y toca una puerta que no es suya. */
export const sinPermiso = (que = 'Tu rol no tiene acceso a esta sección') =>
  NextResponse.json({ success: false, error: que }, { status: 403 });

/**
 * Devuelve la sesión si quien llama es administrador, o null.
 *
 * El proxy ya filtra `/api/v1/admin/*`, pero el rol se revalida aquí
 * contra la base y no contra el payload del token: un token firmado antes de
 * que se le revocara el acceso a alguien seguiría diciendo `role: 'ADMIN'`.
 */
export async function requireAdmin(): Promise<AdminSession | null> {
  const sesion = await sesionDelPanel();
  return sesion && sesion.role === 'ADMIN' ? sesion : null;
}

/**
 * Sesión de quien tenga acceso al módulo indicado, sea del rol que sea.
 *
 * Se usa en las rutas que la asistente comparte con administración (pedidos,
 * seguimiento, tips). Devuelve la sesión completa para que quien llame pueda
 * seguir decidiendo por rol —el veto de "anulada", por ejemplo— sin volver a
 * consultar la base.
 */
export async function requireModulo(modulo: ModuloPanel): Promise<AdminSession | null> {
  const sesion = await sesionDelPanel();
  return sesion && puedeVerModulo(sesion.role, modulo) ? sesion : null;
}

/** Sesión de cualquier rol con acceso al panel, sin mirar módulos. */
export async function requirePanel(): Promise<AdminSession | null> {
  const sesion = await sesionDelPanel();
  return sesion && ES_ROL_DE_PANEL(sesion.role) ? sesion : null;
}

/**
 * Resuelve la sesión y revalida el rol contra la base, no contra el token: uno
 * firmado antes de bajarle el rol a alguien seguiría diciendo `ADMIN`.
 */
async function sesionDelPanel(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ensueno_token')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecretEncoded());
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { id: true, role: true, email: true },
    });

    if (user && ES_ROL_DE_PANEL(user.role)) {
      return user;
    }
  } catch (err) {
    // Token inválido, expirado o firmado con otro secreto.
  }
  return null;
}
