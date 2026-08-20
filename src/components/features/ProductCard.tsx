'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { minPrice, hasVariantPricing } from '@/lib/pricing';
import { useCart } from '@/context/CartContext';
import StarRating from '@/components/ui/StarRating';

const CATEGORY_LABEL: Record<Product['category'], string> = {
  sueno: 'Sueño',
  piel: 'Piel',
  higiene: 'Higiene',
  kits: 'Combo',
};

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductCard({
  product,
  sizes = '(max-width: 640px) 82vw, (max-width: 1024px) 46vw, 33vw',
}: {
  product: Product;
  sizes?: string;
}) {
  const { addToCart } = useCart();
  const fromPrice = minPrice(product);
  const priceVaries = hasVariantPricing(product);
  const hasPromo = Boolean(product.originalPrice && product.originalPrice > fromPrice);

  return (
    <article className="ens-card group h-full">
      {/* Pozo de imagen: el empaque sobre color plano, no recortado. */}
      <div className="ens-card__media">
        <Link href={`/productos/${product.slug || product.id}`} className="block absolute inset-0 ens-focus">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes={sizes}
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </Link>

        {product.badge && (
          <span className="absolute top-3 left-3 bg-secondary text-white text-[11px] font-bold px-3 py-1 rounded-full">
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <p className="ens-eyebrow text-tinta-suave">{CATEGORY_LABEL[product.category]}</p>

        <h3 className="mt-1.5 font-display text-xl leading-snug text-tinta">
          <Link href={`/productos/${product.slug || product.id}`} className="hover:text-azul transition-colors">
            {product.name}
          </Link>
        </h3>

        <p className="mt-1.5 text-sm text-tinta-suave line-clamp-2">{product.subtitle}</p>

        <StarRating rating={product.rating} count={product.reviewsCount} className="mt-3" />

        {/* mt-auto empuja el par precio+botón al fondo, para que las tarjetas
            del slider queden alineadas aunque los subtítulos midan distinto. */}
        <div className="mt-auto pt-4 flex items-baseline gap-2">
          {/* Con precios por presentación se anuncia el más bajo: mostrar el
              precio base cuando ninguna variante cuesta eso confunde. */}
          {priceVaries && <span className="text-xs font-bold text-tinta-suave">desde</span>}
          <span className="font-display text-2xl text-azul">{formatPrice(fromPrice)}</span>
          {hasPromo && (
            <span className="text-sm text-tinta-suave line-through">
              {formatPrice(product.originalPrice!)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => addToCart(product)}
          className="ens-btn ens-btn--azul w-full mt-4"
        >
          Agregar al carrito
        </button>
      </div>
    </article>
  );
}
