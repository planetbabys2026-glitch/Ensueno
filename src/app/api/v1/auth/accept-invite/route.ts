import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/jwt';
import { adminRepository } from '@/infrastructure/repositories/AdminRepository';
import { NOMBRE_ROL, type RolPanel } from '@/lib/permisos';

/*
 * Vive bajo /auth y no bajo /admin a propósito: quien activa su invitación
 * todavía no tiene sesión, así que el proxy de /api/v1/admin la bloquearía.
 * La autorización aquí la da el token de la invitación, nada más.
 */

const INVALIDA = { success: false, error: 'Esta invitación ya se usó, fue cancelada o venció.' };

/** Valida el enlace antes de pintar el formulario. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || '';

    const invitation = await adminRepository.findValidInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json(INVALIDA, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: invitation.email,
        fullName: invitation.fullName,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (err) {
    console.error('Error en GET /api/v1/auth/accept-invite:', err);
    return NextResponse.json({ success: false, error: 'Error al validar la invitación' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: 'Falta el enlace de invitación o la contraseña.' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const result = await adminRepository.acceptInvitation(token, password);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const { user } = result;
    const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, getJwtSecret(), { expiresIn: '7d' });

    // Se deja la sesión puesta: quien acaba de elegir su clave entra directo
    // al panel, sin volver a escribirla en la pantalla de login.
    const response = NextResponse.json({
      success: true,
      message: `¡Listo! Tu cuenta de ${NOMBRE_ROL[user.role as RolPanel]} quedó activa.`,
      user: { id: user.id, email: user.email, role: user.role },
    });

    response.cookies.set('ensueno_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Error en POST /api/v1/auth/accept-invite:', err);
    return NextResponse.json({ success: false, error: 'Error al activar la cuenta' }, { status: 500 });
  }
}
