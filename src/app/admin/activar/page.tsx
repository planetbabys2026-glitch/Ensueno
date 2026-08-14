'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { ShieldCheck, KeyRound, ChevronLeft } from 'lucide-react';
import { NOMBRE_ROL, type RolPanel } from '@/lib/permisos';

/*
 * Activación de una invitación al panel.
 *
 * Vive bajo /admin para heredar el chrome limpio: AppLayoutWrapper le quita el
 * header y el footer de la tienda a todo lo que empiece con /admin. La ruta es
 * pública a propósito — quien llega aquí todavía no tiene cuenta.
 */

type Estado = 'validando' | 'invalida' | 'formulario' | 'guardando';

function ActivarCuentaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const token = searchParams.get('token') || '';

  const [estado, setEstado] = useState<Estado>('validando');
  const [invitacion, setInvitacion] = useState<{ email: string; fullName: string; role?: RolPanel } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const validar = async () => {
      if (!token) {
        setEstado('invalida');
        return;
      }
      try {
        const res = await apiService.getInvitation(token);
        if (cancelado) return;
        if (res.success) {
          setInvitacion(res.data);
          setEstado('formulario');
        } else {
          setEstado('invalida');
        }
      } catch (err) {
        if (!cancelado) setEstado('invalida');
      }
    };

    validar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  const handleActivar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setEstado('guardando');
    try {
      const res = await apiService.acceptInvitation(token, password);
      if (res.success) {
        // El endpoint deja la cookie de sesión puesta: se entra derecho.
        showToast('¡Listo! Bienvenida al panel de Ensueño', 'success');
        router.push('/admin');
      } else {
        setError(res.error || 'No pudimos activar la cuenta.');
        setEstado('formulario');
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
      setEstado('formulario');
    }
  };

  return (
    <main className="min-h-screen bg-cian flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-tinta-suave hover:text-azul transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al sitio
        </Link>

        <div className="bg-white border border-borde rounded-[24px] p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-celeste rounded-2xl grid place-items-center mx-auto">
              {estado === 'invalida' ? (
                <KeyRound className="w-8 h-8 text-azul" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-azul" />
              )}
            </div>
            <p className="ens-eyebrow text-azul mt-5">Panel interno</p>
            <h1 className="mt-2 font-display text-2xl leading-tight text-tinta">
              {estado === 'invalida' ? 'Este enlace ya no sirve' : 'Activa tu cuenta'}
            </h1>
            <p className="mt-3 text-sm text-tinta-suave">
              {estado === 'validando' && 'Estamos revisando tu invitación…'}
              {estado === 'invalida' &&
                'La invitación ya se usó, fue cancelada o venció. Pídele a tu equipo que te la reenvíe.'}
              {(estado === 'formulario' || estado === 'guardando') &&
                'Elige la contraseña con la que vas a entrar al panel. Nadie más la conoce.'}
            </p>
          </div>

          {estado === 'validando' && (
            <p className="mt-8 text-center text-sm text-tinta-suave animate-pulse">Validando el enlace…</p>
          )}

          {estado === 'invalida' && (
            <Link href="/admin" className="ens-btn ens-btn--azul w-full mt-6">
              Ir al inicio de sesión
            </Link>
          )}

          {(estado === 'formulario' || estado === 'guardando') && (
            <>
              {error && (
                <p className="mt-6 bg-cian border border-secondary text-secondary text-sm font-bold p-3.5 rounded-2xl">
                  {error}
                </p>
              )}

              <div className="mt-6 bg-cian border border-borde rounded-2xl p-3.5">
                <p className="ens-eyebrow text-tinta-suave">Tu cuenta</p>
                <p className="text-sm font-bold text-tinta mt-1">{invitacion?.fullName}</p>
                <p className="text-xs text-tinta-suave">{invitacion?.email}</p>
                {invitacion?.role && (
                  <p className="mt-2 inline-flex items-center text-[11px] font-black uppercase tracking-wider bg-white text-azul border border-borde rounded-full px-2.5 py-0.5">
                    {NOMBRE_ROL[invitacion.role]}
                  </p>
                )}
              </div>

              <form onSubmit={handleActivar} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="activar-pass" className="ens-eyebrow text-tinta-suave block mb-2">
                    Contraseña
                  </label>
                  <input
                    id="activar-pass"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-cian border border-borde text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1.5">Mínimo 6 caracteres.</p>
                </div>

                <div>
                  <label htmlFor="activar-confirm" className="ens-eyebrow text-tinta-suave block mb-2">
                    Confirma la contraseña
                  </label>
                  <input
                    id="activar-confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-cian border border-borde text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                  />
                </div>

                <button
                  type="submit"
                  disabled={estado === 'guardando'}
                  className="ens-btn ens-btn--azul w-full disabled:opacity-50"
                >
                  {estado === 'guardando' ? 'Activando…' : 'Activar y entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ActivarCuentaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cian py-20 text-center text-tinta-suave text-sm">Cargando invitación…</div>
      }
    >
      <ActivarCuentaForm />
    </Suspense>
  );
}
