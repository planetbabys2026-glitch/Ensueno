import { NextResponse } from 'next/server';
import { requireAdmin, noAutorizado } from '@/lib/adminAuth';
import { ES_ROL_DE_PANEL, NOMBRE_ROL, type RolPanel } from '@/lib/permisos';
import { adminRepository } from '@/infrastructure/repositories/AdminRepository';
import { userRepository } from '@/infrastructure/repositories/UserRepository';
import { resendService } from '@/infrastructure/services/ResendService';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ensueno.com.co';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const activationUrl = (rawToken: string) => `${APP_URL}/admin/activar?token=${encodeURIComponent(rawToken)}`;

/** Nombre legible de quien invita, para el correo. */
async function inviterName(email: string) {
  const user = await userRepository.findByEmail(email);
  return user?.motherProfile?.fullName || email.split('@')[0];
}

/**
 * Envía la invitación y decide qué devolverle al panel.
 *
 * Sin `RESEND_API_KEY` el envío es simulado: en ese caso se devuelve el enlace
 * para que la invitación no quede inservible en desarrollo. En producción el
 * enlace nunca sale por la API — solo por correo.
 */
async function deliverInvite(to: string, fullName: string, invitedByEmail: string, rawToken: string) {
  const url = activationUrl(rawToken);
  const result: any = await resendService.sendAdminInviteEmail(to, fullName, await inviterName(invitedByEmail), url);

  if (!result?.success) {
    return { sent: false as const, activationUrl: undefined };
  }
  return { sent: true as const, activationUrl: result?.simulated ? url : undefined };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return noAutorizado();

    const [admins, invites] = await Promise.all([
      adminRepository.listAdmins(),
      adminRepository.listPendingInvites(),
    ]);

    return NextResponse.json({ success: true, data: { admins, invites, currentAdminId: admin.id } });
  } catch (err) {
    console.error('Error en GET /api/v1/admin/users:', err);
    return NextResponse.json({ success: false, error: 'Error al consultar el equipo' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return noAutorizado();

    const body = await request.json();
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').toLowerCase().trim();
    // Solo `ADMIN` o `ASISTENTE`; cualquier otra cosa se rechaza en vez de
    // caer a un valor por defecto que nadie pidió.
    const role = body.role ?? 'ADMIN';

    if (!ES_ROL_DE_PANEL(role)) {
      return NextResponse.json(
        { success: false, error: 'El rol debe ser Administradora o Asistente.' },
        { status: 400 }
      );
    }

    if (!fullName || !email) {
      return NextResponse.json({ success: false, error: 'El nombre y el correo son obligatorios.' }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ success: false, error: 'Ese correo no parece válido.' }, { status: 400 });
    }

    const existing = await userRepository.findByEmail(email);
    if (existing && ES_ROL_DE_PANEL(existing.role)) {
      return NextResponse.json({ success: false, error: 'Esa persona ya tiene acceso al panel.' }, { status: 400 });
    }

    const { rawToken } = await adminRepository.createInvitation(email, fullName, admin.id, role as RolPanel);
    const delivery = await deliverInvite(email, fullName, admin.email, rawToken);

    if (!delivery.sent) {
      return NextResponse.json(
        { success: false, error: 'La invitación se creó pero el correo no salió. Reenvíala en un momento.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitación enviada a ${email} como ${NOMBRE_ROL[role as RolPanel]}`,
      data: { activationUrl: delivery.activationUrl },
    });
  } catch (err) {
    console.error('Error en POST /api/v1/admin/users:', err);
    return NextResponse.json({ success: false, error: 'Error al enviar la invitación' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return noAutorizado();

    const { inviteId, action } = await request.json();
    if (!inviteId || !['resend', 'revoke'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Falta el id de la invitación o la acción no es válida.' }, { status: 400 });
    }

    const invite = await adminRepository.getInvitationById(inviteId);
    if (!invite || invite.acceptedAt || invite.revokedAt) {
      return NextResponse.json({ success: false, error: 'Esa invitación ya no está pendiente.' }, { status: 404 });
    }

    if (action === 'revoke') {
      await adminRepository.revokeInvitation(inviteId);
      return NextResponse.json({ success: true, message: `Invitación de ${invite.email} cancelada` });
    }

    // Reenviar emite un token nuevo: el enlace anterior deja de servir.
    const { rawToken } = await adminRepository.refreshInvitationToken(inviteId);
    const delivery = await deliverInvite(invite.email, invite.fullName, admin.email, rawToken);

    if (!delivery.sent) {
      return NextResponse.json({ success: false, error: 'No pudimos reenviar el correo. Intenta de nuevo.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: `Invitación reenviada a ${invite.email}`,
      data: { activationUrl: delivery.activationUrl },
    });
  } catch (err) {
    console.error('Error en PUT /api/v1/admin/users:', err);
    return NextResponse.json({ success: false, error: 'Error al actualizar la invitación' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return noAutorizado();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Falta el id del administrador.' }, { status: 400 });
    }
    if (userId === admin.id) {
      return NextResponse.json({ success: false, error: 'No puedes quitarte a ti misma el acceso.' }, { status: 400 });
    }
    const target = (await adminRepository.listAdmins()).find((a) => a.id === userId);
    if (!target) {
      return NextResponse.json({ success: false, error: 'Esa cuenta ya no tiene acceso al panel.' }, { status: 404 });
    }

    // Quitarle el acceso a una asistente nunca deja el panel huérfano; el
    // conteo solo importa cuando la que sale es administradora.
    if (target.role === 'ADMIN' && (await adminRepository.countAdmins()) <= 1) {
      return NextResponse.json({ success: false, error: 'Debe quedar al menos un administrador.' }, { status: 400 });
    }

    const revoked = await adminRepository.revokeAccesoAlPanel(userId);
    return NextResponse.json({ success: true, message: `${revoked.email} ya no tiene acceso al panel` });
  } catch (err) {
    console.error('Error en DELETE /api/v1/admin/users:', err);
    return NextResponse.json({ success: false, error: 'Error al revocar el acceso' }, { status: 500 });
  }
}
