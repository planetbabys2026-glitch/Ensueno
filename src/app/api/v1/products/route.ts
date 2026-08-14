import { NextResponse } from 'next/server';
import { productRepository, type ProductScope } from '@/infrastructure/repositories/ProductRepository';
import { requireAdmin, requirePanel, noAutorizado, sinPermiso } from '@/lib/adminAuth';
import { puedeVerModulo } from '@/lib/permisos';
import { revalidateStorefront } from '@/lib/revalidateStorefront';

/*
 * El GET es público: la tienda vive de él. Todo lo que escribe en el catálogo
 * exige administrador — esta ruta queda fuera del matcher del proxy
 * (/api/v1/admin/*), así que la única defensa es la de aquí adentro.
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('q') || undefined;

    /* Ver los productos retirados es del módulo de catálogo, no del público ni
       de la asistente. Se rechaza en vez de degradar a "activos" en silencio:
       devolver el catálogo activo bajo la etiqueta de archivados haría que el
       panel pintara productos vivos en la pestaña de retirados.

       Se distinguen los dos "no": sin sesión es 401, y con sesión del panel
       pero sin este módulo es 403. Mezclarlos le diría a una asistente que su
       sesión caducó cuando lo que pasa es que esa sección no es suya. */
    const scope: ProductScope = searchParams.get('scope') === 'archivados' ? 'archivados' : 'activos';
    if (scope === 'archivados') {
      const sesion = await requirePanel();
      if (!sesion) return noAutorizado();
      if (!puedeVerModulo(sesion.role, 'products')) return sinPermiso();
    }

    const products = await productRepository.getProducts(category, query, scope);
    return NextResponse.json({ success: true, data: products });
  } catch (err: any) {
    console.error('Error en GET /api/v1/products:', err);
    return NextResponse.json({ success: false, error: 'Error al consultar productos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const body = await req.json();

    if (!body.name || body.price === undefined || !body.image) {
      return NextResponse.json(
        { success: false, error: 'Campos requeridos: nombre, precio e imagen principal.' },
        { status: 400 }
      );
    }

    const created = await productRepository.createProduct(body);
    revalidateStorefront();
    return NextResponse.json({ success: true, message: 'Producto creado exitosamente', data: created });
  } catch (err: any) {
    console.error('Error en POST /api/v1/products:', err);
    return NextResponse.json({ success: false, error: 'Error al crear producto' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere id de producto' }, { status: 400 });
    }

    const updated = await productRepository.updateProduct(id, data);
    revalidateStorefront();
    return NextResponse.json({
      success: true,
      message:
        data.archived === false
          ? 'Producto restaurado: vuelve a estar en la tienda'
          : 'Producto actualizado con éxito',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error en PUT /api/v1/products:', err);
    return NextResponse.json({ success: false, error: 'Error al actualizar producto' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireAdmin())) return noAutorizado();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere id de producto' }, { status: 400 });
    }

    // Archiva en vez de borrar: el producto sale de la tienda y del catálogo
    // del panel, pero los pedidos que lo contienen siguen siendo legibles.
    await productRepository.archiveProduct(id);
    revalidateStorefront();
    return NextResponse.json({ success: true, message: 'Producto retirado de la tienda' });
  } catch (err: any) {
    console.error('Error en DELETE /api/v1/products:', err);
    return NextResponse.json({ success: false, error: 'Error al retirar el producto' }, { status: 500 });
  }
}
