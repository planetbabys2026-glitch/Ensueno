import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { RolPanel } from '@/lib/permisos';

/** Ventana de vida de una invitación al panel. */
const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

/** El token viaja en el enlace; en la base solo queda su huella. */
function hashToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export class AdminRepository {
  /**
   * Administradores actuales. El nombre vive en el perfil de mamá, que es donde
   * el esquema guarda los nombres de todas las cuentas.
   */
  async listAdmins() {
    const admins = await prisma.user.findMany({
      // Todo el equipo del panel, no solo administración: la asistente también
      // tiene que aparecer para poder verle el acceso y quitárselo.
      where: { role: { in: ['ADMIN', 'ASISTENTE'] } },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        motherProfile: { select: { fullName: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return admins.map((a) => ({
      id: a.id,
      email: a.email,
      role: a.role as RolPanel,
      createdAt: a.createdAt,
      fullName: a.motherProfile?.fullName || a.email.split('@')[0],
    }));
  }

  /** Solo administración. Es el conteo que impide quedarse sin quien mande. */
  async countAdmins() {
    return prisma.user.count({ where: { role: 'ADMIN' } });
  }

  /** Invitaciones vivas: ni aceptadas, ni anuladas, ni vencidas. */
  async listPendingInvites() {
    const invites = await prisma.adminInvitation.findMany({
      where: {
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: { select: { email: true, motherProfile: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((i) => ({
      id: i.id,
      email: i.email,
      fullName: i.fullName,
      role: i.role as RolPanel,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
      invitedBy: i.invitedBy?.motherProfile?.fullName || i.invitedBy?.email || 'Ensueño',
    }));
  }

  /**
   * Emite una invitación. Anula las que siguieran vivas para ese correo: solo
   * el último enlace enviado debe funcionar.
   */
  async createInvitation(email: string, fullName: string, invitedById: string, role: RolPanel = 'ADMIN') {
    const normalizedEmail = email.toLowerCase().trim();

    await prisma.adminInvitation.updateMany({
      where: { email: normalizedEmail, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('base64url');

    const invitation = await prisma.adminInvitation.create({
      data: {
        email: normalizedEmail,
        fullName: fullName.trim(),
        role,
        tokenHash: hashToken(rawToken),
        invitedById,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    return { invitation, rawToken };
  }

  /** Vuelve a emitir el token de una invitación pendiente, conservando la fila. */
  async refreshInvitationToken(inviteId: string) {
    const rawToken = crypto.randomBytes(32).toString('base64url');

    const invitation = await prisma.adminInvitation.update({
      where: { id: inviteId },
      data: {
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    return { invitation, rawToken };
  }

  async findValidInvitationByToken(rawToken: string) {
    if (!rawToken || !rawToken.trim()) return null;

    const invitation = await prisma.adminInvitation.findUnique({
      where: { tokenHash: hashToken(rawToken.trim()) },
    });

    if (!invitation) return null;
    if (invitation.acceptedAt || invitation.revokedAt) return null;
    if (invitation.expiresAt < new Date()) return null;

    return invitation;
  }

  async revokeInvitation(inviteId: string) {
    return prisma.adminInvitation.update({
      where: { id: inviteId },
      data: { revokedAt: new Date() },
    });
  }

  async getInvitationById(inviteId: string) {
    return prisma.adminInvitation.findUnique({ where: { id: inviteId } });
  }

  /**
   * Consume la invitación y deja la cuenta lista para entrar al panel.
   *
   * Si el correo ya existía como clienta, se le sube el rol y se le cambia la
   * clave por la que acaba de elegir: la invitación es prueba suficiente de que
   * controla ese buzón.
   */
  async acceptInvitation(rawToken: string, password: string) {
    const invitation = await this.findValidInvitationByToken(rawToken);
    if (!invitation) {
      return { success: false as const, error: 'Esta invitación ya se usó o venció.' };
    }

    if (!password || password.length < 6) {
      return { success: false as const, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { email: invitation.email } });

    const user = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.user.update({
            where: { id: existing.id },
            // El rol sale de la invitación, nunca de lo que mande el cliente.
            data: { role: invitation.role, passwordHash, emailVerified: true },
            select: { id: true, email: true, role: true },
          })
        : await tx.user.create({
            data: {
              email: invitation.email,
              passwordHash,
              role: invitation.role,
              emailVerified: true,
              motherProfile: { create: { fullName: invitation.fullName } },
            },
            select: { id: true, email: true, role: true },
          });

      await tx.adminInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return saved;
    });

    return { success: true as const, user };
  }

  /**
   * Quita el acceso al panel sin borrar la cuenta: los pedidos y el historial
   * de esa persona siguen siendo suyos.
   */
  async revokeAccesoAlPanel(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { role: 'CUSTOMER' },
      select: { id: true, email: true, role: true },
    });
  }
}

export const adminRepository = new AdminRepository();
