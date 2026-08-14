import { NextResponse } from 'next/server';
import { productRepository } from '@/infrastructure/repositories/ProductRepository';
import { requireAdmin, noAutorizado } from '@/lib/adminAuth';
import { revalidateStorefront } from '@/lib/revalidateStorefront';

/*
 * El GET es público para la portada. Todo lo que escribe exige administrador:
 * esta ruta queda fuera del matcher del proxy (/api/v1/admin/*), así que
 * la única defensa es la de aquí adentro.
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage') || undefined;
    // Ver las promociones inactivas es cosa del panel, no del público.
    const includeAll = searchParams.get('all') === 'true' && Boolean(await requireAdmin());

    const promotions = await productRepository.getPromotions(stage, includeAll);
    return NextResponse.json({ success: true, data: promotions });
  } catch (err: any) {
    console.error('Error en GET /api/v1/promotions:', err);
    return NextResponse.json({ success: false, error: 'Error al obtener promociones' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ success: false, error: 'Se requiere título de la promoción o combo' }, { status: 400 });
    }

    const promotion = await productRepository.createPromotion(body);
    revalidateStorefront();
    return NextResponse.json({ success: true, message: 'Promoción/Combo creado con éxito', data: promotion });
  } catch (err: any) {
    console.error('Error en POST /api/v1/promotions:', err);
    return NextResponse.json({ success: false, error: err.message || 'Error al crear la promoción' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere id de la promoción' }, { status: 400 });
    }

    const updated = await productRepository.updatePromotion(id, data);
    revalidateStorefront();
    return NextResponse.json({ success: true, message: 'Promoción/Combo actualizada con éxito', data: updated });
  } catch (err: any) {
    console.error('Error en PUT /api/v1/promotions:', err);
    return NextResponse.json({ success: false, error: err.message || 'Error al actualizar la promoción' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de promoción requerido' }, { status: 400 });
    }
    await productRepository.deletePromotion(id);
    revalidateStorefront();
    return NextResponse.json({ success: true, message: 'Promoción/Combo eliminada' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error al eliminar promoción' }, { status: 500 });
  }
}
