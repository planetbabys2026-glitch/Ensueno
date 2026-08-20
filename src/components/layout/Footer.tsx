'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShieldCheck, Moon, Award } from 'lucide-react';

import { useUser } from '@/context/UserContext';
import { Product } from '@/types';
import { apiService } from '@/services/api';

const LOGO_URL = 'https://res.cloudinary.com/io8kzyuj/image/upload/ensueno/marca/logo.webp';

const TRUST = [
  {
    Icon: ShieldCheck,
    title: '100% hipoalergénico',
    blurb: 'Sin sulfatos ni parabenos',
  },
  {
    Icon: Award,
    title: 'Probado dermatológicamente',
    blurb: 'Hipoalergénicos y probados en pieles sensibles',
  },
  {
    Icon: Moon,
    title: 'Tres esenciales',
    blurb: 'Pañitos, colonia y mantequilla',
  },
  {
    Icon: Heart,
    title: 'Hecho con cuidado',
    blurb: 'Formulado para piel de bebé',
  },
];

export default function Footer() {
  const { currentUser, openAuthModal } = useUser();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiService
      .getProducts()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setProducts(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="mt-20">
      {/* Banda de confianza: celeste de marca con tinta oscura (11.60:1). */}
      <div className="ens-band ens-band--celeste">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST.map(({ Icon, title, blurb }) => (
              <li key={title} className="flex flex-col items-center text-center gap-2">
                <Icon className="w-7 h-7 text-tinta" aria-hidden="true" />
                <span className="font-display text-base leading-tight text-tinta">{title}</span>
                <span className="text-xs text-tinta-suave">{blurb}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cierre: el ancla oscura de marca con texto blanco (11.55:1). Es el
          único bloque oscuro del sitio — los seis tintes no cargan blanco. */}
      <div className="bg-azul-hondo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="space-y-4">
              <Link href="/" className="inline-block bg-white rounded-2xl p-3 ens-focus">
                <Image
                  src={LOGO_URL}
                  alt="Ensueño"
                  width={160}
                  height={52}
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <p className="text-sm text-white/80 leading-relaxed">
                El cuidado más tierno para tu bebé. Fórmulas pediátricas
                hipoalergénicas, hechos en Colombia con amor.
              </p>
            </div>

            <nav aria-labelledby="footer-productos">
              <h2 id="footer-productos" className="font-display text-lg text-white mb-4">
                Productos
              </h2>
              <ul className="space-y-2.5 text-sm text-white/80">
                {products.length > 0 ? (
                  products.map((p) => (
                    <li key={p.id || p.slug}>
                      <Link
                        href={`/productos/${p.slug || p.id}`}
                        className="hover:text-celeste transition-colors block truncate"
                      >
                        {p.name}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li>
                    <Link href="/#productos" className="hover:text-celeste transition-colors">
                      Ver catálogo completo
                    </Link>
                  </li>
                )}
              </ul>
            </nav>

            <nav aria-labelledby="footer-explora">
              <h2 id="footer-explora" className="font-display text-lg text-white mb-4">
                Explora
              </h2>
              <ul className="space-y-2.5 text-sm text-white/80">
                <li>
                  <Link href="/tips" className="hover:text-celeste transition-colors">
                    Tips de sueño y cuidado
                  </Link>
                </li>
                <li>
                  <Link
                    href="/perfil"
                    onClick={(e) => {
                      if (!currentUser) {
                        e.preventDefault();
                        openAuthModal('login');
                      }
                    }}
                    className="hover:text-celeste transition-colors cursor-pointer"
                  >
                    Mi perfil y pedidos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/politica-tratamiento-datos"
                    className="hover:text-celeste transition-colors"
                  >
                    Tratamiento de datos
                  </Link>
                </li>
              </ul>
            </nav>

            <div>
              <h2 className="font-display text-lg text-white mb-4">Club Ensueño</h2>
              <p className="text-sm text-white/80 mb-4">
                Consejos de sueño infantil y cupones, una vez por semana.
              </p>
              {/*
                TODO: este formulario todavía no tiene endpoint — sigue sin
                enviar nada. Queda deshabilitado en vez de fingir que funciona.
              */}
              <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
                <label htmlFor="newsletter-email" className="sr-only">
                  Tu correo electrónico
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  disabled
                  placeholder="Próximamente"
                  className="min-w-0 flex-1 px-4 h-11 rounded-full text-sm bg-white/10 border border-white/25 text-white placeholder:text-white/50 disabled:cursor-not-allowed"
                />
                <button type="submit" disabled className="ens-btn ens-btn--blanco h-11 px-5 text-xs">
                  Unirme
                </button>
              </form>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
            <p>© {new Date().getFullYear()} Ensueño Baby. Todos los derechos reservados.</p>
            <Link
              href="/politica-tratamiento-datos"
              className="underline hover:text-celeste transition-colors"
            >
              Política de tratamiento de datos (Habeas Data)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
