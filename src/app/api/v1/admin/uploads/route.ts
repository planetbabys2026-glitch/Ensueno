import { NextResponse } from 'next/server';
import { requirePanel, noAutorizado } from '@/lib/adminAuth';
import { getCloudinaryConfig, signUploadParams } from '@/lib/cloudinary';

/*
 * Firma una carga directa a Cloudinary.
 *
 * El navegador pide una firma aquí (con sesión de administrador) y después
 * sube el archivo directo a Cloudinary. Así el secreto no viaja al cliente y
 * el archivo no atraviesa esta función, que tiene tope de tamaño de cuerpo.
 *
 * La firma incluye la carpeta, de modo que quien la reciba solo puede escribir
 * dentro de `ensueno/<sección>`, y caduca con el `timestamp`.
 */

/** Secciones que pueden recibir imágenes, para no aceptar carpetas libres. */
const CARPETAS: Record<string, string> = {
  productos: 'ensueno/productos',
  promociones: 'ensueno/promociones',
  tips: 'ensueno/tips',
  hero: 'ensueno/hero',
};

export async function POST(request: Request) {
  try {
    if (!(await requirePanel())) return noAutorizado();

    const config = getCloudinaryConfig();
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cloudinary no está configurado. Falta CLOUDINARY_URL en las variables de entorno.',
        },
        { status: 503 }
      );
    }

    const { section } = await request.json().catch(() => ({ section: undefined }));
    const folder = CARPETAS[section as string] || 'ensueno/varios';

    const timestamp = Math.round(Date.now() / 1000);
    const params = { folder, timestamp };
    const signature = signUploadParams(params, config.apiSecret);

    return NextResponse.json({
      success: true,
      data: {
        signature,
        timestamp,
        folder,
        apiKey: config.apiKey,
        cloudName: config.cloudName,
        uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      },
    });
  } catch (err) {
    console.error('Error en POST /api/v1/admin/uploads:', err);
    return NextResponse.json({ success: false, error: 'Error al preparar la carga' }, { status: 500 });
  }
}
