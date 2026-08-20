'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Tag,
  MapPin,
  Truck,
  User,
  Lock,
  Mail,
  Sparkles,
  Baby,
  Star,
  CheckCircle2,
  X,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/context/ToastContext';
import { apiService } from '@/services/api';
import { itemUnitPrice } from '@/lib/pricing';
import { COLOMBIA_LOCATION_DATA } from '@/data/colombiaData';

function CartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { currentUser, openAuthModal } = useUser();
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, discount, couponCode, applyCoupon, setCustomShippingCost } = useCart();
  const [inputCoupon, setInputCoupon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentParam = searchParams.get('payment');
  const statusParam = searchParams.get('status') || searchParams.get('collection_status');
  const externalRef = searchParams.get('external_reference') || searchParams.get('orderNumber');

  useEffect(() => {
    if (externalRef) {
      if (paymentParam === 'failure' || statusParam === 'rejected') {
        router.replace(`/confirmacion/${externalRef}?status=rejected`);
      } else if (statusParam === 'approved' || statusParam === 'pending') {
        router.replace(`/confirmacion/${externalRef}?status=${statusParam}`);
      }
    }
  }, [externalRef, paymentParam, statusParam, router]);

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // Shipping & Location state from Colombia dataset
  const [selectedDeptIndex, setSelectedDeptIndex] = useState(0);
  const [selectedCity, setSelectedCity] = useState(COLOMBIA_LOCATION_DATA[0].cities[0]);
  const [address, setAddress] = useState('');
  const [addressTitle, setAddressTitle] = useState('Hogar');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [shippingCost, setShippingCost] = useState(0);
  const [deliveryEstimate, setDeliveryEstimate] = useState('2-4 días hábiles');
  const [isFreeShipping, setIsFreeShipping] = useState(false);
  const [shippingDiscount, setShippingDiscount] = useState(0);

  const currentDepartment = COLOMBIA_LOCATION_DATA[selectedDeptIndex].name;
  const productCount = items.reduce((a, b) => a + b.quantity, 0);

  const calculateShippingRate = async () => {
    if (items.length === 0) {
      setShippingCost(0);
      setCustomShippingCost(0);
      setIsFreeShipping(true);
      return;
    }

    try {
      const res = await fetch('/api/v1/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: currentDepartment,
          city: selectedCity,
          subtotal,
          productCount,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setShippingCost(json.data.shippingCost);
        setCustomShippingCost(json.data.shippingCost);
        setDeliveryEstimate(json.data.deliveryEstimate || '2-4 días hábiles');
        setIsFreeShipping(json.data.isFree);
        setShippingDiscount(json.data.discountApplied || 0);
      }
    } catch (err) {
      console.warn('Error calculando envío:', err);
    }
  };

  // Recalculate shipping dynamically whenever location, subtotal or item count changes
  useEffect(() => {
    calculateShippingRate();
  }, [currentDepartment, selectedCity, subtotal, productCount, items.length]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.email) setCustomerEmail(currentUser.email);
      if (currentUser.profile?.fullName) setCustomerName(currentUser.profile.fullName);
      if (currentUser.profile?.phone) setCustomerPhone(currentUser.profile.phone);

      const fetchAddresses = async () => {
        try {
          const res = await apiService.getSavedAddresses();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setSavedAddresses(res.data);
            const defaultAddr = res.data.find((a: any) => a.isDefault) || res.data[0];
            applySavedAddress(defaultAddr);
            setShowNewAddressForm(false);
          } else {
            setSavedAddresses([]);
            setShowNewAddressForm(true);
          }
        } catch {
          setShowNewAddressForm(true);
        }
      };

      fetchAddresses();
    } else {
      setShowNewAddressForm(true);
    }
  }, [currentUser]);

  const applySavedAddress = (addr: any) => {
    if (!addr) return;
    setSelectedAddressId(addr.id);
    setAddressTitle(addr.title || 'Hogar');
    setAddress(addr.address);

    const deptIdx = COLOMBIA_LOCATION_DATA.findIndex(
      (d) => d.name.toLowerCase() === (addr.department || '').toLowerCase()
    );
    if (deptIdx !== -1) {
      setSelectedDeptIndex(deptIdx);
      const matchedCity = COLOMBIA_LOCATION_DATA[deptIdx].cities.find(
        (c) => c.toLowerCase() === (addr.city || '').toLowerCase()
      );
      if (matchedCity) {
        setSelectedCity(matchedCity);
      }
    }
  };

  const handleSaveNewAddress = async () => {
    if (!currentUser) return;
    try {
      const res = await apiService.addSavedAddress({
        title: addressTitle || 'Hogar',
        department: currentDepartment,
        city: selectedCity,
        address,
        isDefault: savedAddresses.length === 0,
      });
      if (res.success) {
        showToast('Dirección de envío guardada en tu cuenta 🏠', 'success');
        const updatedAddrs = await apiService.getSavedAddresses();
        if (updatedAddrs.success) setSavedAddresses(updatedAddrs.data || []);
      }
    } catch (err) {
      console.warn('Error guardando dirección:', err);
    }
  };

  const handleDeleteSavedAddress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiService.deleteSavedAddress(id);
      if (res.success) {
        showToast('Dirección eliminada', 'info');
        setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
        if (selectedAddressId === id) setSelectedAddressId(null);
      }
    } catch (err) {
      showToast('Error al eliminar dirección', 'error');
    }
  };



  const finalTotal = Math.max(0, subtotal - discount + shippingCost);
  const loyaltyPointsEarned = Math.floor(finalTotal / 1000);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleApplyCoupon = (code: string) => {
    if (!code) return;
    applyCoupon(code);
    showToast(`Cupón ${code} procesado`, 'info');
  };

  const handleCheckoutClick = () => {
    if (items.length === 0) return;
    if (!currentUser) {
      // Exigir inicio de sesión / registro flotante universal
      openAuthModal('login');
      return;
    }

    if (!address || !address.trim() || !selectedCity || !currentDepartment) {
      showToast('Debes seleccionar o ingresar una dirección de envío para continuar con tu compra.', 'error');
      return;
    }

    processOrder();
  };

  const processOrder = async () => {
    setIsSubmitting(true);
    showToast('Generando orden de pago segura con MercadoPago...', 'info');

    try {
      // Only save address if user typed a new one (not selecting an existing saved address)
      if (currentUser && !selectedAddressId) {
        await handleSaveNewAddress();
      }

      // Map cart items to the flat shape expected by OrderRepository
      const mappedItems = items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        selectedFragrance: item.selectedFragrance,
        selectedSize: item.selectedSize,
        unitPrice: itemUnitPrice(item),
        quantity: item.quantity,
        subtotal: itemUnitPrice(item) * item.quantity,
      }));

      const { order, mercadopago } = await apiService.createOrder({
        userId: currentUser?.id,
        items: mappedItems,
        subtotal,
        discount,
        couponCode,
        shippingCost,
        total: finalTotal,
        customerName: customerName || currentUser?.profile?.fullName || 'Cliente Ensueño',
        customerEmail: customerEmail || currentUser?.email || 'cliente@ensueno.com.co',
        customerPhone: customerPhone || currentUser?.profile?.phone,
        shippingAddress: `${address}, ${selectedCity}, ${currentDepartment}`,
        city: selectedCity,
        department: currentDepartment,
        deliveryEstimate,
      });

      clearCart();
      showToast('¡Pedido registrado! Redirigiendo a MercadoPago...', 'success');

      if (mercadopago && mercadopago.checkoutUrl) {
        window.location.href = mercadopago.checkoutUrl;
      } else {
        router.push(`/confirmacion/${order.orderNumber || order.id}`);
      }
    } catch (e: any) {
      console.error('Error during checkout:', e);
      showToast(e.message || 'Error al generar la orden de compra', 'error');
      if (e.pendingOrderNumber) {
        setTimeout(() => {
          router.push(`/confirmacion/${e.pendingOrderNumber}?status=rejected`);
        }, 2500);
      }
      setIsSubmitting(false);
    }
  };
  if (items.length === 0) {
    return (
      <div className="ens-band ens-band--cian page-entry-anim">
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 mx-auto grid place-items-center rounded-3xl bg-celeste border border-borde">
            <ShoppingBag className="w-9 h-9 text-azul" aria-hidden="true" />
          </div>
          <h1 className="mt-6 font-display text-tinta text-[clamp(1.75rem,4vw,2.5rem)] leading-tight">
            Tu carrito está vacío
          </h1>
          <p className="mt-3 text-lg text-tinta-suave">
            Empieza por los tres esenciales para el cuidado diario de tu bebé.
          </p>
          <Link href="/#productos" className="ens-btn ens-btn--azul mt-8">
            Ver productos
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ens-band ens-band--cian page-entry-anim">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ---------- Encabezado ---------- */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-borde">
          <div>
            <p className="ens-eyebrow text-azul">Carrito</p>
            <h1 className="mt-2 font-display text-tinta text-[clamp(1.75rem,4vw,2.75rem)] leading-tight">
              Tu pedido
            </h1>
            <p className="mt-1 text-tinta-suave">
              {productCount} {productCount === 1 ? 'producto' : 'productos'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearCart();
              showToast('Carrito vaciado', 'info');
            }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-borde text-sm font-bold text-tinta-suave hover:text-secondary hover:border-secondary transition-colors ens-focus"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Vaciar carrito
          </button>
        </div>

        {/* ---------- Estado de sesión ---------- */}
        {currentUser ? (
          <div className="mt-6 bg-white border border-borde rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="w-10 h-10 grid place-items-center rounded-full bg-azul text-white font-bold"
              >
                {(currentUser.profile?.fullName || currentUser.email || 'M').charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-bold text-tinta">
                  {currentUser.profile?.fullName || currentUser.email}
                </p>
                <p className="text-sm text-tinta-suave">Tus direcciones están guardadas</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-amarillo text-tinta text-sm font-bold">
              <Star className="w-4 h-4 fill-current" aria-hidden="true" />
              {currentUser.loyaltyPoints || 0} puntos
            </span>
          </div>
        ) : (
          <div className="mt-6 bg-white border border-borde rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="w-10 h-10 grid place-items-center rounded-full bg-celeste text-azul"
              >
                <User className="w-5 h-5" />
              </span>
              <div>
                <p className="font-bold text-tinta">Inicia sesión para terminar tu compra</p>
                <p className="text-sm text-tinta-suave">
                  Guardamos tus direcciones y acumulas puntos por cada pedido.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="ens-btn ens-btn--azul h-10 text-xs"
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {/* ---------- Contenido ---------- */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Líneas del pedido */}
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="bg-white border border-borde rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <Link
                    href={`/productos/${item.product.slug || item.product.id}`}
                    className="relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-celeste ens-focus"
                  >
                    <Image
                      src={item.product.image}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain p-1.5"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg leading-snug text-tinta">
                      <Link
                        href={`/productos/${item.product.slug || item.product.id}`}
                        className="hover:text-azul transition-colors ens-focus"
                      >
                        {item.product.name}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-sm text-tinta-suave">
                      {item.selectedFragrance} · {item.selectedSize}
                    </p>
                    <p className="mt-0.5 text-sm text-tinta-suave">
                      {formatPrice(itemUnitPrice(item))} por unidad
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-borde">
                    <div className="flex items-center gap-1 bg-cian border border-borde rounded-full p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        aria-label={`Quitar una unidad de ${item.product.name}`}
                        className="w-8 h-8 grid place-items-center rounded-full bg-white text-tinta hover:bg-celeste transition-colors ens-focus"
                      >
                        <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        aria-label={`Añadir una unidad de ${item.product.name}`}
                        className="w-8 h-8 grid place-items-center rounded-full bg-white text-tinta hover:bg-celeste transition-colors ens-focus"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <span className="font-display text-xl text-azul tabular-nums">
                      {formatPrice(itemUnitPrice(item) * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Quitar ${item.product.name} del carrito`}
                      className="w-9 h-9 grid place-items-center rounded-full text-tinta-suave hover:text-secondary hover:bg-cian transition-colors ens-focus"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Direcciones guardadas */}
            {currentUser && savedAddresses.length > 0 && (
              <div className="bg-white border border-borde rounded-2xl p-6">
                <h2 className="flex items-center gap-2 font-display text-xl text-tinta pb-4 border-b border-borde">
                  <Building2 className="w-5 h-5 text-azul" aria-hidden="true" />
                  Direcciones guardadas
                </h2>

                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <li key={addr.id}>
                        <div
                          className={`relative h-full p-4 rounded-2xl border-2 transition-colors ${
                            isSelected ? 'border-azul bg-cian' : 'border-borde hover:border-celeste'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => applySavedAddress(addr)}
                            aria-pressed={isSelected}
                            className="text-left w-full ens-focus"
                          >
                            <span className="flex items-center gap-1.5 font-bold text-tinta">
                              <MapPin className="w-4 h-4 text-azul" aria-hidden="true" />
                              {addr.title || 'Hogar'}
                              {addr.isDefault && (
                                <span className="text-[10px] bg-celeste text-tinta px-2 py-0.5 rounded-full">
                                  Predeterminada
                                </span>
                              )}
                            </span>
                            <span className="block mt-1.5 text-sm text-tinta line-clamp-1">
                              {addr.address}
                            </span>
                            <span className="block text-sm text-tinta-suave">
                              {addr.city}, {addr.department}
                            </span>
                            {isSelected && (
                              <span className="block mt-2 text-xs font-bold text-azul">
                                Seleccionada para este pedido
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedAddress(addr.id, e)}
                            aria-label={`Eliminar dirección ${addr.title || 'Hogar'}`}
                            className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full text-tinta-suave hover:text-secondary transition-colors ens-focus"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                  className="ens-btn ens-btn--linea h-10 text-xs mt-4"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  {showNewAddressForm ? 'Ocultar formulario' : 'Añadir otra dirección'}
                </button>
              </div>
            )}

            {/* Nueva dirección */}
            {(showNewAddressForm || !currentUser || savedAddresses.length === 0) && (
              <div className="bg-white border border-borde rounded-2xl p-6 animate-fade-in">
                <div className="flex items-center justify-between pb-4 border-b border-borde">
                  <h2 className="flex items-center gap-2 font-display text-xl text-tinta">
                    <MapPin className="w-5 h-5 text-azul" aria-hidden="true" />
                    Dirección de envío
                  </h2>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(false)}
                      aria-label="Cerrar formulario"
                      className="w-9 h-9 grid place-items-center rounded-full text-tinta-suave hover:text-tinta hover:bg-cian transition-colors ens-focus"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="departamento" className="ens-eyebrow text-tinta-suave block mb-2">
                      Departamento
                    </label>
                    <select
                      id="departamento"
                      value={selectedDeptIndex}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        setSelectedDeptIndex(idx);
                        setSelectedCity(COLOMBIA_LOCATION_DATA[idx].cities[0]);
                        setSelectedAddressId(null);
                      }}
                      className="w-full h-12 px-4 rounded-2xl border border-borde bg-cian text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                    >
                      {COLOMBIA_LOCATION_DATA.map((d, index) => (
                        <option key={d.name} value={index}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ciudad" className="ens-eyebrow text-tinta-suave block mb-2">
                      Municipio o ciudad
                    </label>
                    <select
                      id="ciudad"
                      value={selectedCity}
                      onChange={(e) => {
                        setSelectedCity(e.target.value);
                        setSelectedAddressId(null);
                      }}
                      className="w-full h-12 px-4 rounded-2xl border border-borde bg-cian text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                    >
                      {COLOMBIA_LOCATION_DATA[selectedDeptIndex].cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="direccion" className="ens-eyebrow text-tinta-suave block mb-2">
                      Dirección exacta
                    </label>
                    <input
                      id="direccion"
                      type="text"
                      required
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setSelectedAddressId(null);
                      }}
                      placeholder="Calle, carrera, apartamento, barrio"
                      className="w-full h-12 px-4 rounded-2xl border border-borde bg-cian text-tinta placeholder:text-tinta-suave focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---------- Resumen ---------- */}
          <aside className="bg-white border border-borde rounded-2xl p-6 lg:sticky lg:top-32">
            <h2 className="font-display text-xl text-tinta pb-4 border-b border-borde">
              Resumen
            </h2>

            <p className="mt-4 flex items-start gap-2.5 bg-amarillo rounded-2xl p-3.5 text-sm text-tinta">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Ganas <strong>{loyaltyPointsEarned} puntos</strong> con este pedido.
              </span>
            </p>

            <div className="mt-5">
              <label htmlFor="cupon" className="ens-eyebrow text-tinta-suave block mb-2">
                Cupón de descuento
              </label>
              <div className="flex gap-2">
                <input
                  id="cupon"
                  type="text"
                  value={inputCoupon}
                  onChange={(e) => setInputCoupon(e.target.value)}
                  placeholder="SUEÑO10"
                  className="min-w-0 flex-1 h-11 px-4 rounded-full border border-borde bg-cian text-tinta uppercase placeholder:normal-case placeholder:text-tinta-suave focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(inputCoupon)}
                  className="ens-btn ens-btn--azul h-11 px-5 text-xs shrink-0"
                >
                  Aplicar
                </button>
              </div>
            </div>

            <dl className="mt-5 py-5 border-y border-borde space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-tinta-suave">Subtotal</dt>
                <dd className="font-bold text-tinta tabular-nums">{formatPrice(subtotal)}</dd>
              </div>

              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-secondary font-bold">Descuento {couponCode}</dt>
                  <dd className="text-secondary font-bold tabular-nums">-{formatPrice(discount)}</dd>
                </div>
              )}

              {shippingDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-azul font-bold">Descuento por cantidad</dt>
                  <dd className="text-azul font-bold tabular-nums">-{formatPrice(shippingDiscount)}</dd>
                </div>
              )}

              <div className="flex justify-between items-center">
                <dt className="text-tinta-suave">Envío a {selectedCity}</dt>
                <dd>
                  {isFreeShipping ? (
                    <span className="inline-block bg-celeste text-tinta text-xs font-bold px-2.5 py-1 rounded-full">
                      Gratis
                    </span>
                  ) : (
                    <span className="font-bold text-tinta tabular-nums">{formatPrice(shippingCost)}</span>
                  )}
                </dd>
              </div>

              <div className="flex items-center gap-2 text-xs text-tinta-suave">
                <Truck className="w-4 h-4 shrink-0" aria-hidden="true" />
                Llega en {deliveryEstimate}
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between">
              <span className="font-bold text-tinta">Total</span>
              <span className="font-display text-3xl text-azul tabular-nums">
                {formatPrice(finalTotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckoutClick}
              disabled={isSubmitting}
              className="ens-btn ens-btn--azul w-full mt-6"
            >
              {isSubmitting ? 'Generando pago…' : 'Pagar con MercadoPago'}
              {!isSubmitting && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </button>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-tinta-suave">
              <ShieldCheck className="w-4 h-4 text-azul shrink-0" aria-hidden="true" />
              Pago seguro con cifrado SSL
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="ens-band ens-band--cian">
          <p className="max-w-7xl mx-auto px-4 py-24 text-center text-tinta-suave animate-pulse">
            Cargando carrito…
          </p>
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}
