/**
 * Verifica que el módulo de Seguimiento del panel pinte bien los pedidos
 * entregados.
 *
 * Mirar solo el repositorio no alcanza: entre la fila de la base y el <li> hay
 * dos saltos donde las cosas se rompen en silencio. La API serializa a JSON, y
 * ahí cada `Date` se vuelve string; y el JSX llama métodos (`.join`,
 * `.toLocaleString`) sobre campos que, si llegaran nulos, tumbarían el módulo
 * entero con un TypeError.
 *
 * Por eso el test recorre el camino completo:
 *
 *   Order (base) → getBandeja() → JSON.parse(JSON.stringify(…)) → las
 *   expresiones exactas que están en el JSX del panel
 *
 * Uso: npx tsx --env-file=.env.local scratch/verify_followups_entregados.ts
 */
import { prisma } from '../src/lib/prisma';
import { followUpRepository } from '../src/infrastructure/repositories/FollowUpRepository';

let fallos = 0;
let pruebas = 0;

function comprobar(nombre: string, condicion: boolean, detalle: string) {
  pruebas++;
  if (condicion) {
    console.log(`  ✅ ${nombre} — ${detalle}`);
  } else {
    fallos++;
    console.log(`  ❌ ${nombre} — ${detalle}`);
  }
}

/** El mismo helper que usa el panel, copiado tal cual para probarlo de verdad. */
const desdeHace = (fecha: string | Date | null) => {
  if (!fecha) return '—';
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
};

async function main() {
  // ---------- 1. Fuente de verdad: los pedidos entregados de la base ----------
  const entregados = await prisma.order.findMany({
    where: { status: 'entregada' },
    include: { items: { select: { productName: true, quantity: true, selectedSize: true } } },
  });

  console.log(`\n=== 1. Pedidos en estado "entregada" en la base: ${entregados.length} ===`);
  for (const o of entregados) {
    console.log(`  ${o.orderNumber} · ${o.customerName} · $${o.total.toLocaleString('es-CO')} · ${o.items.length} ítem(s)`);
  }

  if (entregados.length === 0) {
    console.log('\n⚠️  No hay pedidos entregados: el test no puede comprobar el renderizado.');
    process.exit(1);
  }

  // ---------- 2. La bandeja, tal como la sirve la API ----------
  const bandeja = await followUpRepository.getBandeja();
  // Esto es lo que de verdad recibe el navegador: NextResponse.json() serializa,
  // así que las fechas dejan de ser Date y pasan a ser strings ISO.
  const comoLlegaAlPanel = JSON.parse(JSON.stringify(bandeja));

  console.log(`\n=== 2. Bandeja servida ===`);
  console.log(`  opinionPendiente: ${comoLlegaAlPanel.opinionPendiente.length}`);
  console.log(`  recompraPendiente: ${comoLlegaAlPanel.recompraPendiente.length}`);
  console.log(`  registradas: ${comoLlegaAlPanel.registradas.length}`);
  console.log(`  todas: ${comoLlegaAlPanel.todas.length}`);

  // ---------- 3. Cada entregado tiene su ficha, con los datos del pedido ----------
  console.log(`\n=== 3. Correspondencia pedido entregado → ficha de seguimiento ===`);
  for (const pedido of entregados) {
    const ficha = comoLlegaAlPanel.todas.find((f: any) => f.orderNumber === pedido.orderNumber);

    comprobar(
      `${pedido.orderNumber}: aparece en la bandeja`,
      Boolean(ficha),
      ficha ? 'tiene ficha de seguimiento' : 'NO tiene ficha — el módulo lo ignora'
    );
    if (!ficha) continue;

    comprobar(`${pedido.orderNumber}: cliente`, ficha.cliente === pedido.customerName, `"${ficha.cliente}"`);
    comprobar(`${pedido.orderNumber}: email`, ficha.email === pedido.customerEmail, `"${ficha.email}"`);
    comprobar(
      `${pedido.orderNumber}: teléfono`,
      ficha.telefono === pedido.customerPhone,
      ficha.telefono ? `"${ficha.telefono}"` : 'sin teléfono en el pedido'
    );
    comprobar(`${pedido.orderNumber}: total`, ficha.total === pedido.total, `${ficha.total}`);
    comprobar(
      `${pedido.orderNumber}: estado del pedido`,
      ficha.estadoPedido === 'entregada',
      `"${ficha.estadoPedido}"`
    );
    comprobar(
      `${pedido.orderNumber}: ciudad`,
      ficha.ciudad === [pedido.city, pedido.department].filter(Boolean).join(', '),
      `"${ficha.ciudad}"`
    );
    comprobar(
      `${pedido.orderNumber}: nº de productos`,
      ficha.productos.length === pedido.items.length,
      `${ficha.productos.length} línea(s): ${ficha.productos.join(' · ')}`
    );
  }

  // ---------- 4. Las expresiones del JSX, ejecutadas de verdad ----------
  // Aquí es donde aparecería un TypeError en producción: `.join` sobre undefined
  // o `.toLocaleString` sobre null tumban el módulo completo, no solo la fila.
  console.log(`\n=== 4. Expresiones exactas del JSX sobre los datos ya serializados ===`);
  const deEntregados = comoLlegaAlPanel.todas.filter((f: any) => f.estadoPedido === 'entregada');

  for (const f of deEntregados) {
    try {
      const linea1 = `${f.productos.join(' · ')} — $${f.total.toLocaleString('es-CO')}`;
      const linea2 = `${f.ciudad || 'Sin ciudad'} · compró ${desdeHace(f.compradoEl)}`;
      const espera = `Esperando ${desdeHace(f.feedbackDueAt)}`;
      const wa = f.telefono ? `https://wa.me/${f.telefono.replace(/\D/g, '')}` : '(sin teléfono)';

      comprobar(`${f.orderNumber}: la fila se renderiza sin excepción`, true, 'las 4 expresiones evaluaron');
      console.log(`       cabecera: ${f.cliente} · ${f.orderNumber} · ${espera}`);
      console.log(`       línea 1 : ${linea1}`);
      console.log(`       línea 2 : ${linea2}`);
      console.log(`       WhatsApp: ${wa}`);
      console.log(`       mailto  : mailto:${f.email}`);

      comprobar(
        `${f.orderNumber}: la fecha sobrevive al JSON`,
        !linea2.includes('Invalid Date') && !espera.includes('NaN') && espera !== 'Esperando —',
        `"${espera}" · "${linea2.split('compró ')[1]}"`
      );
    } catch (err: any) {
      comprobar(`${f.orderNumber}: la fila se renderiza sin excepción`, false, `LANZA: ${err.message}`);
    }
  }

  // ---------- 5. ¿En qué pestaña cae, y es lo que corresponde? ----------
  // La regla del módulo no es "todo entregado se ve", sino "se ve cuando vence
  // el plazo". Un pedido de ayer con plazo de 5 días TIENE que estar invisible;
  // afirmar lo contrario sería declarar bug un comportamiento correcto.
  console.log(`\n=== 5. Pestaña donde lo ve el equipo ===`);
  const ahora = Date.now();
  for (const f of deEntregados) {
    const enOpinion = comoLlegaAlPanel.opinionPendiente.some((x: any) => x.id === f.id);
    const opinionVencida = new Date(f.feedbackDueAt).getTime() <= ahora;
    const diasQueFaltan = Math.ceil((new Date(f.feedbackDueAt).getTime() - ahora) / 86400000);

    comprobar(
      `${f.orderNumber}: visibilidad coherente con el plazo`,
      enOpinion === opinionVencida,
      opinionVencida
        ? 'plazo cumplido y aparece en "Pedir opinión"'
        : `plazo sin cumplir (faltan ${diasQueFaltan} día(s)) y correctamente no aparece aún`
    );
  }

  // ---------- 6. Prueba temporal: al vencer el plazo, ¿aparece? ----------
  // Lo anterior demuestra que hoy está oculto por diseño. Falta demostrar lo
  // otro: que cuando llegue el día, sale. Se baja el plazo, se mira, y se
  // restaura en el `finally` — `updateConfig` recalcula las fechas de lo
  // pendiente, así que restaurar deja todo exactamente como estaba.
  console.log(`\n=== 6. Prueba temporal: adelantar el plazo ===`);
  const configOriginal = await followUpRepository.getConfig();
  console.log(`  plazos actuales: opinión ${configOriginal.feedbackDelayDays}d · recompra ${configOriginal.repurchaseDelayDays}d`);

  try {
    await followUpRepository.updateConfig(1, 1);
    const bandejaConPlazoVencido = await followUpRepository.getBandeja();

    for (const pedido of entregados) {
      const enOpinion = bandejaConPlazoVencido.opinionPendiente.some(
        (x: any) => x.orderNumber === pedido.orderNumber
      );
      comprobar(
        `${pedido.orderNumber}: con el plazo vencido sí aparece`,
        enOpinion,
        enOpinion
          ? 'sale en "Pedir opinión" con todos sus datos'
          : 'NO sale ni con el plazo vencido — ahí sí habría un fallo'
      );
    }
  } finally {
    await followUpRepository.updateConfig(
      configOriginal.feedbackDelayDays,
      configOriginal.repurchaseDelayDays
    );
    const restaurada = await followUpRepository.getConfig();
    console.log(
      `  plazos restaurados: opinión ${restaurada.feedbackDelayDays}d · recompra ${restaurada.repurchaseDelayDays}d`
    );
  }

  // ---------- 7. Los anulados no se siguen ----------
  const anulados = await prisma.order.count({ where: { status: 'anulada' } });
  const fichasDeAnulados = comoLlegaAlPanel.todas.filter((f: any) => f.estadoPedido === 'anulada').length;
  console.log(`\n=== 7. Pedidos anulados ===`);
  comprobar(
    'los anulados no entran a la bandeja',
    fichasDeAnulados === 0,
    `${anulados} anulados en la base, ${fichasDeAnulados} en la bandeja`
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(fallos === 0 ? `✅ ${pruebas}/${pruebas} comprobaciones pasaron` : `❌ ${fallos} de ${pruebas} fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('El test no pudo ejecutarse:', err);
  process.exit(1);
});
