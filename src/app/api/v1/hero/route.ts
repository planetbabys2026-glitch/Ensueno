import { NextResponse } from 'next/server';
import { heroRepository } from '@/infrastructure/repositories/HeroRepository';
import { requireAdmin, noAutorizado } from '@/lib/adminAuth';
import { revalidateStorefront } from '@/lib/revalidateStorefront';

/*
 * El GET es público: la portada lo consume. Todo lo que escribe exige
 * administrador — igual que catálogo, tips y tarifas.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // El panel también tiene que ver las diapositivas apagadas.
    const includeAll = searchParams.get('includeAll') === 'true' && Boolean(await requireAdmin());

    const [slides, config] = await Promise.all([
      heroRepository.getSlides(includeAll),
      heroRepository.getConfig(),
    ]);

    return NextResponse.json({ success: true, data: { slides, intervalMs: config.intervalMs } });
  } catch (err) {
    console.error('Error en GET /api/v1/hero:', err);
    return NextResponse.json({ success: false, error: 'Error al consultar el hero' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const body = await request.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: 'El titular es obligatorio.' }, { status: 400 });
    }
    if (!body.image?.trim()) {
      return NextResponse.json({ success: false, error: 'La imagen es obligatoria.' }, { status: 400 });
    }

    const created = await heroRepository.createSlide(body);
    revalidateStorefront();
    return NextResponse.json({ success: true, message: 'Diapositiva creada', data: created });
  } catch (err) {
    console.error('Error en POST /api/v1/hero:', err);
    return NextResponse.json({ success: false, error: 'Error al crear la diapositiva' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const body = await request.json();
    const { id, action, direction, intervalMs, ...data } = body;

    // Los ajustes globales viajan por aquí para no abrir otra ruta.
    if (action === 'config') {
      const config = await heroRepository.updateConfig(Number(intervalMs));
      revalidateStorefront();
      return NextResponse.json({ success: true, message: 'Ajustes del hero guardados', data: config });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Falta el id de la diapositiva.' }, { status: 400 });
    }

    if (action === 'move') {
      if (direction !== 'up' && direction !== 'down') {
        return NextResponse.json({ success: false, error: 'Dirección no válida.' }, { status: 400 });
      }
      const movido = await heroRepository.moveSlide(id, direction);
      if (!movido) {
        return NextResponse.json({ success: false, error: 'No se pudo reordenar.' }, { status: 400 });
      }
      revalidateStorefront();
      return NextResponse.json({ success: true, message: 'Orden actualizado' });
    }

    if (data.title !== undefined && !String(data.title).trim()) {
      return NextResponse.json({ success: false, error: 'El titular es obligatorio.' }, { status: 400 });
    }

    const updated = await heroRepository.updateSlide(id, data);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Diapositiva no encontrada' }, { status: 404 });
    }

    revalidateStorefront();
    return NextResponse.json({ success: true, message: 'Diapositiva actualizada', data: updated });
  } catch (err) {
    console.error('Error en PUT /api/v1/hero:', err);
    return NextResponse.json({ success: false, error: 'Error al actualizar el hero' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Falta el id de la diapositiva.' }, { status: 400 });
    }

    const ok = await heroRepository.deleteSlide(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Diapositiva no encontrada' }, { status: 404 });
    }

    revalidateStorefront();
    return NextResponse.json({ success: true, message: 'Diapositiva eliminada' });
  } catch (err) {
    console.error('Error en DELETE /api/v1/hero:', err);
    return NextResponse.json({ success: false, error: 'Error al eliminar la diapositiva' }, { status: 500 });
  }
}
