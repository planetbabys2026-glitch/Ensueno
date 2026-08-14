'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Sparkles, X, Star, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  isExiting?: boolean;
}

/** Diálogo de confirmación. Reemplaza al `confirm()` del navegador. */
export interface ConfirmOptions {
  /** Titular corto. Va en la voz del panel, no en la del navegador. */
  title: string;
  /** Qué va a pasar exactamente si confirma. */
  message: string;
  /** Texto del botón que ejecuta la acción. Nombra la acción, no dice "Sí". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para lo que retira o borra; `default` para el resto. */
  tone?: 'danger' | 'default';
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  /** Resuelve `true` si la persona confirma, `false` si cancela o cierra. */
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create dedicated portal root attached directly to document.body at max z-index
    let container = document.getElementById('ensueno-sweetalert-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ensueno-sweetalert-root';
      document.body.appendChild(container);
    }
    setPortalContainer(container);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, isExiting: false }]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  /* ----------------------------- Confirmación -----------------------------
   * El `confirm()` nativo bloquea el hilo, no se puede estilar y en móvil sale
   * con el dominio pegado arriba. Este lo sustituye con la misma tarjeta de las
   * alertas, y devuelve una promesa para que quien llama siga usando `await`.
   * -------------------------------------------------------------------- */
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolveConfirmRef = useRef<((answer: boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeConfirm = useCallback((answer: boolean) => {
    resolveConfirmRef.current?.(answer);
    resolveConfirmRef.current = null;
    setConfirmState(null);
  }, []);

  const showConfirm = useCallback(
    (options: ConfirmOptions) => {
      // Si ya había uno abierto, se cancela: nunca se deja una promesa colgada.
      resolveConfirmRef.current?.(false);
      return new Promise<boolean>((resolve) => {
        resolveConfirmRef.current = resolve;
        setConfirmState(options);
      });
    },
    []
  );

  // Escape cancela, y el foco entra al diálogo en vez de quedarse en la página
  // de atrás. Sin esto el teclado no tendría forma de salir.
  useEffect(() => {
    if (!confirmState) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm(false);
    };
    document.addEventListener('keydown', onKeyDown);
    confirmButtonRef.current?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmState, closeConfirm]);

  const activeToast = toasts.length > 0 ? toasts[toasts.length - 1] : null;
  const confirmIsDanger = confirmState?.tone === 'danger';

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* DEDICATED HIGH-PRIORITY SWEETALERT MODAL PORTAL */}
      {portalContainer && activeToast && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 2147483647, // MAXIMUM INT Z-INDEX IN ALL BROWSERS
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxSizing: 'border-box',
          }}
          onClick={() => removeToast(activeToast.id)}
        >
          {/* SweetAlert Solid Professional Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '28px 24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              border: activeToast.type === 'error' ? '3px solid #f43f5e' : activeToast.type === 'success' ? '3px solid #10b981' : '3px solid #c084fc',
              textAlign: 'center',
              margin: 'auto',
              boxSizing: 'border-box',
            }}
            className={`transition-all duration-300 transform ${
              activeToast.isExiting ? 'scale-90 opacity-0' : 'scale-100 opacity-100 animate-fade-in'
            }`}
          >
            {/* Close Button */}
            <button
              onClick={() => removeToast(activeToast.id)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '6px',
              }}
              title="Cerrar alerta"
            >
              <X className="w-5 h-5" />
            </button>

            {/* PERSONAJE ESTRELLA ENSUEÑO (Intercambiable por <img src="/estrellita-ensueno.png" />) */}
            <div style={{ display: 'inline-block', margin: '0 auto 12px auto' }}>
              <div
                className="animate-bounce"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #fef08a, #fbcfe8, #bae6fd)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  border: '2px solid #ffffff',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                }}
              >
                <Star className="w-10 h-10 fill-amber-400 text-amber-500" />
              </div>
            </div>

            {/* Header Badge */}
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  backgroundColor: activeToast.type === 'error' ? '#fff1f2' : activeToast.type === 'success' ? '#ecfdf5' : '#f3e8ff',
                  color: activeToast.type === 'error' ? '#9f1239' : activeToast.type === 'success' ? '#065f46' : '#6b21a8',
                  border: activeToast.type === 'error' ? '1px solid #fecdd3' : activeToast.type === 'success' ? '1px solid #a7f3d0' : '1px solid #e9d5ff',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {activeToast.type === 'error' ? 'Alerta de Cuidado Ensueño ⚠️' : 'Notificación Ensueño ✨'}
              </span>
            </div>

            {/* Message Body */}
            <p
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#1e293b',
                lineHeight: 1.5,
                margin: '0 0 20px 0',
                padding: '0 8px',
              }}
            >
              {activeToast.message}
            </p>

            {/* SweetAlert Big Action Button */}
            <button
              onClick={() => removeToast(activeToast.id)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#ffffff',
                background: activeToast.type === 'error'
                  ? 'linear-gradient(135deg, #f43f5e, #e11d48)'
                  : activeToast.type === 'success'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #f472b6, #c084fc)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
            >
              ENTENDIDO ✨
            </button>
          </div>
        </div>,
        portalContainer
      )}

      {/* ============ DIÁLOGO DE CONFIRMACIÓN (sustituye a confirm()) ============ */}
      {portalContainer && confirmState && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(31, 35, 51, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxSizing: 'border-box',
          }}
          onClick={() => closeConfirm(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ens-confirm-title"
            aria-describedby="ens-confirm-message"
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-in"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '28px 24px 24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              border: `3px solid ${confirmIsDanger ? '#8c3049' : '#1d5c7c'}`,
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <button
              onClick={() => closeConfirm(false)}
              aria-label="Cerrar sin hacer cambios"
              className="ens-focus"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#4f5469',
                padding: '6px',
                borderRadius: '8px',
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Mismo bloque de marca que las alertas, sin el rebote: aquí la
                persona tiene que leer antes de decidir. */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '24px',
                background: confirmIsDanger
                  ? 'linear-gradient(135deg, #f6bac7, #fbdde4)'
                  : 'linear-gradient(135deg, #bde4f8, #e4f3f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
                border: '2px solid #ffffff',
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              }}
            >
              {confirmIsDanger ? (
                <AlertTriangle className="w-9 h-9" style={{ color: '#8c3049' }} />
              ) : (
                <Star className="w-10 h-10 fill-amber-400 text-amber-500" />
              )}
            </div>

            <h2
              id="ens-confirm-title"
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#1f2333',
                lineHeight: 1.3,
                margin: '0 0 8px 0',
              }}
            >
              {confirmState.title}
            </h2>

            <p
              id="ens-confirm-message"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#4f5469',
                lineHeight: 1.55,
                margin: '0 0 22px 0',
                padding: '0 4px',
              }}
            >
              {confirmState.message}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                onClick={() => closeConfirm(false)}
                className="ens-focus"
                style={{
                  // Cancelar ocupa lo que mide su palabra; el botón de la
                  // acción se queda con el resto para no partirse en dos
                  // líneas cuando la etiqueta nombra la acción completa.
                  flex: '0 1 auto',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#4f5469',
                  backgroundColor: '#ffffff',
                  border: '2px solid #d3d5e5',
                  cursor: 'pointer',
                }}
              >
                {confirmState.cancelLabel || 'Cancelar'}
              </button>

              <button
                ref={confirmButtonRef}
                onClick={() => closeConfirm(true)}
                className="ens-focus"
                style={{
                  flex: '1 1 auto',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#ffffff',
                  backgroundColor: confirmIsDanger ? '#8c3049' : '#1d5c7c',
                  border: '2px solid transparent',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
                  cursor: 'pointer',
                }}
              >
                {confirmState.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>,
        portalContainer
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de ToastProvider');
  }
  return context;
}
