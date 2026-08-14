/**
 * Verifica el rol ASISTENTE: qué ve, qué no, y que no pueda anular pedidos.
 *
 * Comprobar la tabla de `permisos.ts` a solas no demuestra nada — lo que importa
 * es si el servidor la respeta. Así que el test crea una asistente de verdad,
 * firma su sesión y golpea la API real endpoint por endpoint.
 *
 * Dos cosas que el test NO hace, a propósito:
 *  - Cambiar el estado de un pedido de verdad: `PUT /admin/orders` le manda un
 *    correo a la clienta. Para probar el camino permitido usa un orderId que no
 *    existe: si la autorización deja pasar, falla después contra la base (500),
 *    y ese 500 es justo la prueba de que el permiso se concedió.
 *  - Dejar rastro: la cuenta de prueba se borra en el `finally`.
 *
 * Uso (con el servidor levantado en :3000):
 *   npx tsx --env-file=.env.local scratch/verify_rol_asistente.ts
 */
import jwt from 'jsonwebtoken';
import { prisma } from '../src/lib/prisma';
import { getJwtSecret } from '../src/lib/jwt';
import {
  moduloDeRuta,
  puedeAsignarEstado,
  puedeVerModulo,
  MODULOS_POR_ROL,
} from '../src/lib/permisos';

const BASE = 'http://localhost:3000';
const EMAIL_DE_PRUEBA = 'asistente.prueba.borrable@ensueno.test';

let fallos = 0;
let pruebas = 0;

function comprobar(nombre: string, ok: boolean, detalle: string) {
  pruebas++;
  if (ok) console.log(`  ✅ ${nombre} — ${detalle}`);
  else {
    fallos++;
    console.log(`  ❌ ${nombre} — ${detalle}`);
  }
}

/** Golpea la API con la cookie de sesión de un rol. */
async function pedir(metodo: string, ruta: string, token: string, cuerpo?: unknown) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      cookie: `ensueno_token=${token}`,
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  return res.status;
}

async function main() {
  // ---------- 1. La tabla de permisos, sin red de por medio ----------
  console.log('\n=== 1. Tabla de permisos ===');
  comprobar(
    'la asistente ve exactamente pedidos, seguimiento y tips',
    JSON.stringify([...MODULOS_POR_ROL.ASISTENTE].sort()) === JSON.stringify(['followup', 'orders', 'tips']),
    MODULOS_POR_ROL.ASISTENTE.join(', ')
  );
  for (const m of ['products', 'shipping', 'hero', 'crm', 'metrics', 'team'] as const) {
    comprobar(`la asistente NO ve "${m}"`, !puedeVerModulo('ASISTENTE', m), 'fuera de su alcance');
  }
  comprobar('la asistente no puede anular', !puedeAsignarEstado('ASISTENTE', 'anulada'), 'estado vetado');
  comprobar('la asistente sí puede marcar entregada', puedeAsignarEstado('ASISTENTE', 'entregada'), 'estado permitido');
  comprobar('administración puede anular', puedeAsignarEstado('ADMIN', 'anulada'), 'sin vetos');
  comprobar(
    'una ruta nueva bajo /admin queda cerrada por defecto',
    moduloDeRuta('/api/v1/admin/lo-que-sea')?.modulo === 'team',
    'cae al módulo de equipo, que es solo administración'
  );

  // ---------- 2. Sesión de prueba ----------
  const asistente = await prisma.user.create({
    data: {
      email: EMAIL_DE_PRUEBA,
      // Hash de una cadena aleatoria que nadie conoce ni se usa: la sesión se
      // firma directamente, así que esta cuenta no tiene contraseña utilizable.
      passwordHash: `$2a$10$${Math.random().toString(36).slice(2).padEnd(53, 'x')}`,
      role: 'ASISTENTE',
      emailVerified: true,
    },
    select: { id: true, email: true, role: true },
  });

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true, role: true } });
  if (!admin) throw new Error('No hay ninguna administradora para comparar.');

  const firmar = (u: { id: string; email: string; role: string }) =>
    jwt.sign({ id: u.id, email: u.email, role: u.role }, getJwtSecret(), { expiresIn: '5m' });

  const tokenAsistente = firmar(asistente);
  const tokenAdmin = firmar(admin);

  try {
    // ---------- 3. Lo que la asistente SÍ puede ----------
    console.log('\n=== 3. Módulos de la asistente (espera 200) ===');
    for (const [metodo, ruta] of [
      ['GET', '/api/v1/admin/orders'],
      ['GET', '/api/v1/admin/followups'],
      ['GET', '/api/v1/tips?includeAll=true'],
    ] as const) {
      const s = await pedir(metodo, ruta, tokenAsistente);
      comprobar(`${metodo} ${ruta}`, s === 200, `${s}`);
    }

    // ---------- 4. Lo que NO puede ----------
    console.log('\n=== 4. Módulos ajenos (espera 403) ===');
    for (const [metodo, ruta, cuerpo] of [
      ['GET', '/api/v1/admin/users', undefined],
      ['GET', '/api/v1/admin/analytics', undefined],
      ['GET', '/api/v1/admin/remarketing', undefined],
      ['GET', '/api/v1/products?scope=archivados', undefined],
      ['POST', '/api/v1/products', { name: 'x', price: 1, image: 'y' }],
      ['DELETE', '/api/v1/products?id=loquesea', undefined],
      ['PUT', '/api/v1/hero', { id: 'x', title: 'y' }],
      ['PUT', '/api/v1/shipping/config', { freeShippingThreshold: 1 }],
      ['POST', '/api/v1/promotions', { title: 'x' }],
    ] as const) {
      const s = await pedir(metodo, ruta, tokenAsistente, cuerpo);
      comprobar(`${metodo} ${ruta}`, s === 403, `${s}`);
    }

    // ---------- 5. El veto de "anulada" ----------
    console.log('\n=== 5. Anular un pedido ===');
    const anular = await pedir('PUT', '/api/v1/admin/orders', tokenAsistente, {
      orderId: 'id-inexistente-de-prueba',
      status: 'anulada',
    });
    comprobar('la asistente NO puede anular', anular === 403, `${anular} (403 = rechazado por rol)`);

    // Mismo endpoint, estado permitido: si el permiso se concede, la petición
    // muere más adelante contra la base. Un 403 aquí significaría que el veto
    // está bloqueando de más.
    const permitido = await pedir('PUT', '/api/v1/admin/orders', tokenAsistente, {
      orderId: 'id-inexistente-de-prueba',
      status: 'empacada',
    });
    comprobar(
      'la asistente SÍ puede mover a otros estados',
      permitido !== 403,
      `${permitido} (pasó la autorización y falló contra la base, que es lo esperado)`
    );

    const anularAdmin = await pedir('PUT', '/api/v1/admin/orders', tokenAdmin, {
      orderId: 'id-inexistente-de-prueba',
      status: 'anulada',
    });
    comprobar(
      'administración sí puede anular',
      anularAdmin !== 403,
      `${anularAdmin} (sin veto de rol)`
    );

    // ---------- 6. Administración no perdió nada ----------
    console.log('\n=== 6. Administración conserva el panel completo (espera 200) ===');
    for (const ruta of [
      '/api/v1/admin/orders',
      '/api/v1/admin/followups',
      '/api/v1/admin/users',
      '/api/v1/admin/analytics',
      '/api/v1/admin/remarketing',
      '/api/v1/products?scope=archivados',
      '/api/v1/tips?includeAll=true',
    ]) {
      const s = await pedir('GET', ruta, tokenAdmin);
      comprobar(`GET ${ruta}`, s === 200, `${s}`);
    }

    // ---------- 7. Sin sesión no entra nadie ----------
    console.log('\n=== 7. Sin sesión (espera 401) ===');
    for (const ruta of ['/api/v1/admin/orders', '/api/v1/admin/followups']) {
      const res = await fetch(`${BASE}${ruta}`);
      comprobar(`GET ${ruta} sin cookie`, res.status === 401, `${res.status}`);
    }
  } finally {
    await prisma.user.delete({ where: { id: asistente.id } });
    const quedan = await prisma.user.count({ where: { email: EMAIL_DE_PRUEBA } });
    console.log(`\n  cuenta de prueba borrada (quedan ${quedan} con ese correo)`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(fallos === 0 ? `✅ ${pruebas}/${pruebas} comprobaciones pasaron` : `❌ ${fallos} de ${pruebas} fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('El test no pudo ejecutarse:', err);
  process.exit(1);
});
