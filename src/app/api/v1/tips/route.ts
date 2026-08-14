import { NextResponse } from 'next/server';
import { tipRepository } from '@/infrastructure/repositories/TipRepository';
import { requireModulo, noAutorizado } from '@/lib/adminAuth';

/*
 * El GET es público: /tips lo consume. Todo lo que escribe exige administrador
 * — esta ruta queda fuera del matcher del proxy (/api/v1/admin/*), así que
 * la única defensa es la de aquí adentro.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('q') || undefined;
    // El panel necesita ver también los borradores; el público, no.
    const includeAll = searchParams.get('includeAll') === 'true' && Boolean(await requireModulo('tips'));

    const tips = await tipRepository.getTips(category, query, includeAll);
    return NextResponse.json({ success: true, data: tips });
  } catch (err) {
    console.error('Error en GET /api/v1/tips:', err);
    return NextResponse.json({ success: false, error: 'Error al consultar tips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireModulo('tips'))) return noAutorizado();

    const body = await request.json();
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'El título es obligatorio.' },
        { status: 400 }
      );
    }
    const created = await tipRepository.createTip(body);
    return NextResponse.json({ success: true, message: 'Tip creado', data: created });
  } catch (err) {
    console.error('Error en POST /api/v1/tips:', err);
    return NextResponse.json({ success: false, error: 'Error al crear el tip' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await requireModulo('tips'))) return noAutorizado();

    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Falta el id del tip.' }, { status: 400 });
    }
    const updated = await tipRepository.updateTip(id, data);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Tip no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Tip actualizado', data: updated });
  } catch (err) {
    console.error('Error en PUT /api/v1/tips:', err);
    return NextResponse.json({ success: false, error: 'Error al actualizar el tip' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireModulo('tips'))) return noAutorizado();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Falta el id del tip.' }, { status: 400 });
    }
    const ok = await tipRepository.deleteTip(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Tip no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Tip eliminado' });
  } catch (err) {
    console.error('Error en DELETE /api/v1/tips:', err);
    return NextResponse.json({ success: false, error: 'Error al eliminar el tip' }, { status: 500 });
  }
}
