import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck, Sparkles, Check, Leaf } from 'lucide-react';
import { Product, Promotion, Tip } from '@/types';
import { productRepository } from '@/infrastructure/repositories/ProductRepository';
import { MOCK_TIPS } from '@/data/mockData';
import ProductSlider from '@/components/features/ProductSlider';
import HeroSlider from '@/components/features/HeroSlider';
import NubeDivider from '@/components/ui/NubeDivider';
import { heroRepository } from '@/infrastructure/repositories/HeroRepository';
import { PROCLAMAS_APROBADAS, ATRIBUTOS_FORMULA } from '@/data/brandClaims';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(price);

/**
 * El repositorio devuelve filas de Prisma donde `category` es `string`, no el
 * union de `Product`. Al pasar la home a Server Component eso deja de estar
 * oculto tras el tipado de `apiService`, así que se estrecha aquí.
 */
const CATEGORIES = ['sueno', 'piel', 'higiene', 'kits'] as const;

/**
 * Red de seguridad del catálogo. Esta página no toca ninguna API dinámica, así
 * que Next la prerrenderizaba en el build y la servía congelada: lo editado en
 * el panel no llegaba nunca. Cada escritura de catálogo, promociones o portada
 * ya la invalida al instante (`revalidateStorefront`); esto solo garantiza que,
 * si esa invalidación se pierde, la portada se ponga al día sola en 5 minutos.
 */
export const revalidate = 300;

function toProduct(row: unknown): Product {
  const p = row as Product;
  const category = (CATEGORIES as readonly string[]).includes(p.category)
    ? p.category
    : 'higiene';
  return { ...p, category };
}

export default async function HomePage() {
  // Server Component: los productos van en el HTML de SSR. Antes se traían en
  // un useEffect, así que el HTML llegaba sin un solo producto.
  const [allProducts, promotions, heroSlides, heroConfig] = await Promise.all([
    productRepository.getProducts(),
    productRepository.getPromotions(undefined, true),
    // Nunca vacío: si el panel no tiene diapositivas, devuelve el hero de fábrica.
    heroRepository.getSlidesForHome(),
    heroRepository.getConfig(),
  ]);

  const catalog = allProducts.map(toProduct);
  const featured = catalog.filter((p) => p.isFeatured !== false);
  const products = featured.length > 0 ? featured : catalog;
  const activePromos = (promotions as Promotion[]).filter((p) => p.isActive !== false);
  const tips: Tip[] = MOCK_TIPS.slice(0, 3);

  return (
    <div className="page-entry-anim">
      {/* ================= Hero ================= */}
      <section className="ens-band ens-band--celeste overflow-hidden">
        {/* El contenido sale del panel (módulo Portada). Con una sola
            diapositiva se ve igual que el hero fijo de siempre. */}
        <HeroSlider slides={heroSlides} intervalMs={heroConfig.intervalMs} />

        {/* Firma: la nube toma el color de la banda de abajo. */}
        <NubeDivider className="text-white -mb-px relative z-20" />
      </section>

      {/* ========== Composición de la marca ========== */}
      <section className="bg-white border-b border-borde">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10">
            {ATRIBUTOS_FORMULA.map((atributo) => (
              <li key={atributo} className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-azul shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-bold text-tinta-suave whitespace-nowrap">
                  {atributo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= Productos ================= */}
      <section id="productos" className="ens-band ens-band--blanco scroll-mt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="ens-eyebrow text-azul">Catálogo</p>
            <h2 className="mt-3 font-display text-tinta text-[clamp(1.875rem,4vw,3rem)] leading-tight">
              Tus tres esenciales
            </h2>
            <p className="mt-4 text-lg text-tinta-suave">
              Lo que mamá y bebé usan todos los días.
            </p>
          </div>

          <div className="mt-10">
            <ProductSlider products={products} />
          </div>
        </div>

        <NubeDivider className="text-cian -mb-px" />
      </section>

      {/* ================= Promociones ================= */}
      {activePromos.length > 0 && (
        <section className="ens-band ens-band--cian">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-2xl">
              <p className="ens-eyebrow text-secondary">Ofertas</p>
              <h2 className="mt-3 font-display text-tinta text-[clamp(1.875rem,4vw,3rem)] leading-tight">
                Combos que rinden más
              </h2>
              <p className="mt-4 text-lg text-tinta-suave">
                Paquetes armados para que no se te acabe lo esencial.
              </p>
            </div>

            <ul className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {activePromos.map((promo) => (
                <li key={promo.id}>
                  <article className="ens-card group h-full">
                    {promo.imageUrl && (
                      <div className="ens-card__media">
                        <Image
                          src={promo.imageUrl}
                          alt={promo.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        {promo.badge && (
                          <span className="absolute top-3 left-3 bg-secondary text-white text-[11px] font-bold px-3 py-1 rounded-full">
                            {promo.badge}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col flex-1 p-5">
                      {promo.tagline && (
                        <p className="ens-eyebrow text-tinta-suave">{promo.tagline}</p>
                      )}

                      <h3 className="mt-1.5 font-display text-xl leading-snug text-tinta">
                        {promo.title}
                      </h3>

                      {promo.subtitle && (
                        <p className="mt-1.5 text-sm text-tinta-suave line-clamp-3">
                          {promo.subtitle}
                        </p>
                      )}

                      {promo.savingText && (
                        <p className="mt-4 flex items-start gap-2 text-sm font-bold text-secondary">
                          <Check className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{promo.savingText}</span>
                        </p>
                      )}

                      <div className="mt-auto pt-4 flex items-baseline gap-2">
                        {promo.price != null && (
                          <span className="font-display text-2xl text-azul">
                            {formatPrice(promo.price)}
                          </span>
                        )}
                        {promo.originalPrice != null && (
                          <span className="text-sm text-tinta-suave line-through">
                            {formatPrice(promo.originalPrice)}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/productos/combo-${promo.id}`}
                        className="ens-btn ens-btn--azul w-full mt-4"
                      >
                        Ver la oferta
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ================= Confianza ================= */}
      <section className="ens-band ens-band--lavanda">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="ens-eyebrow text-azul">Seguridad</p>
              <h2 className="mt-3 font-display text-tinta text-[clamp(1.875rem,4vw,3rem)] leading-tight">
                Formulado para piel que apenas empieza
              </h2>
              <p className="mt-4 text-lg text-tinta-suave leading-relaxed">
                Cada producto Ensueño se formula pensando en la piel más
                delicada, para que la de tu bebé quede protegida y suave.
              </p>

              {/* Las tres proclamas aprobadas de la marca. Salen de
                  `brandClaims` para que no vuelvan a escribirse a mano.
                  En fila y no en tres columnas: "Dermatológicamente" es una
                  palabra larga y en una columna estrecha se recortaba. */}
              <ul className="mt-8 space-y-3">
                {PROCLAMAS_APROBADAS.map((proclama) => (
                  <li
                    key={proclama}
                    className="bg-white border border-borde rounded-2xl px-5 py-4 flex items-center gap-3.5"
                  >
                    <ShieldCheck className="w-7 h-7 text-azul shrink-0" aria-hidden="true" />
                    <h3 className="font-display text-lg text-tinta leading-snug">{proclama}</h3>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden border border-borde">
              <Image
                src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80"
                alt="Madre cargando a su bebé"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= Tips ================= */}
      <section className="ens-band ens-band--blanco">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="ens-eyebrow text-azul">Guías</p>
              <h2 className="mt-3 font-display text-tinta text-[clamp(1.875rem,4vw,3rem)] leading-tight">
                Tips de sueño y cuidado
              </h2>
            </div>
            <Link
              href="/tips"
              className="inline-flex items-center gap-1.5 font-bold text-azul hover:text-tinta transition-colors ens-focus"
            >
              Ver todos los tips
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {tips.map((tip) => (
              <li key={tip.id}>
                <Link href="/tips" className="ens-card h-full p-5 ens-focus">
                  <p className="ens-eyebrow text-secondary">{tip.categoryLabel}</p>
                  <h3 className="mt-2 font-display text-lg leading-snug text-tinta line-clamp-2">
                    {tip.title}
                  </h3>
                  <p className="mt-2 text-sm text-tinta-suave line-clamp-3">{tip.summary}</p>
                  <div className="mt-auto pt-4 flex items-center justify-between text-xs text-tinta-suave border-t border-borde">
                    <span className="pt-4">{tip.author}</span>
                    <span className="pt-4">{tip.readTime}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
