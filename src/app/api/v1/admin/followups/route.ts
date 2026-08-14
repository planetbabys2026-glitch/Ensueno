import { NextResponse } from 'next/server';
import { requireModulo, noAutorizado } from '@/lib/adminAuth';
import { followUpRepository } from '@/infrastructure/repositories/FollowUpRepository';

export async function GET() {
  try {
    if (!(await requireModulo('followup'))) return noAutorizado();

    const [bandeja, config] = await Promise.all([
      followUpRepository.getBandeja(),
      followUpRepository.getConfig(),
    ]);

    return NextResponse.json({ success: true, data: { ...bandeja, config } });
  } catch (err) {
    console.error('Error en GET /api/v1/admin/followups:', err);
    return NextResponse.json({ success: false, error: 'Error al cargar el seguimiento' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireModulo('followup');
    if (!admin) return noAutorizado();

    const body = await request.json();

    // Los plazos viajan por aquí para no abrir otra ruta.
    if (body.action === 'config') {
      const config = await followUpRepository.updateConfig(
        Number(body.feedbackDelayDays),
        Number(body.repurchaseDelayDays)
      );
      return NextResponse.json({ success: true, message: 'Plazos guardados', data: config });
    }

    const { id, tipo } = body;
    if (!id || (tipo !== 'feedback' && tipo !== 'recompra')) {
      return NextResponse.json({ success: false, error: 'Falta el id o el tipo de contacto.' }, { status: 400 });
    }

    if (body.action === 'reabrir') {
      const vuelto = await followUpRepository.reabrir(id, tipo);
      if (!vuelto) return NextResponse.json({ success: false, error: 'Seguimiento no encontrado' }, { status: 404 });
      return NextResponse.json({ success: true, message: 'Volvió a quedar pendiente' });
    }

    const actualizado = await followUpRepository.registrarContacto(id, tipo, body, admin.email);
    if (!actualizado) {
      return NextResponse.json({ success: false, error: 'Seguimiento no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: tipo === 'feedback' ? 'Opinión registrada' : 'Contacto de recompra registrado',
    });
  } catch (err) {
    console.error('Error en PUT /api/v1/admin/followups:', err);
    return NextResponse.json({ success: false, error: 'Error al registrar el contacto' }, { status: 500 });
  }
}
