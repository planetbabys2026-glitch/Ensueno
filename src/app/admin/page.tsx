'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { COLOMBIA_LOCATION_DATA } from '@/data/colombiaData';
import { formatSizePrices } from '@/lib/pricing';
import { Tip } from '@/types';
import ImageUploader from '@/components/admin/ImageUploader';
import {
  ES_ROL_DE_PANEL,
  MODULOS_POR_ROL,
  NOMBRE_ROL,
  puedeAsignarEstado,
  type ModuloPanel,
  type RolPanel,
} from '@/lib/permisos';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Mail,
  Baby,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Send,
  Sparkles,
  BarChart3,
  PhoneCall,
  Star as StarIcon,
  Clock,
  Search,
  Truck,
  MapPin,
  Lock,
  LogOut,
  Save,
  Plus,
  ShieldCheck,
  Building2,
  Layers,
  Settings,
  X,
  KeyRound,
  UserCheck,
  Trash2,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  Filter,
  Pencil,
  Check,
  Tag,
  ChevronLeft,
  ChevronRight,
  Star,
  Gift,
  BookOpen,
  Video,
  ExternalLink,
} from 'lucide-react';



/* Clases compartidas del panel. Antes cada módulo repetía su propia variante
   de tarjeta, input y botón, y se iban desincronizando. */
const UI = {
  card: 'bg-white rounded-2xl p-6 border border-borde',
  input:
    'w-full h-11 px-4 rounded-xl border border-borde bg-cian text-sm text-tinta placeholder:text-tinta-suave focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow',
  btnPrimary:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-azul hover:bg-azul-hondo text-white font-bold text-sm transition-colors disabled:opacity-50 ens-focus',
  btnGhost:
    'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-borde bg-white text-tinta-suave hover:text-tinta hover:bg-cian font-bold text-sm transition-colors ens-focus',
  btnDanger:
    'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-borde bg-white text-tinta-suave hover:text-secondary hover:border-secondary font-bold text-sm transition-colors ens-focus',
} as const;


/** Edad legible a partir de la fecha de nacimiento. */
function babyAgeLabel(birthDate?: string | Date | null): string {
  if (!birthDate) return 'Sin fecha de nacimiento';
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return 'Sin fecha de nacimiento';
  const months = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  if (months < 0) return 'En camino';
  if (months < 1) return 'Recién nacido';
  if (months < 24) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}

/** Un módulo = una entrada aquí. Menú y cabecera se derivan de esto. */
const MODULES = {
  orders:   { eyebrow: 'Pedidos',    title: 'Pedidos y pagos',        nav: 'Pedidos',    Icon: ShoppingBag, description: 'Estado de cada pedido, pagos aprobados por MercadoPago y seguimiento de despachos.' },
  metrics:  { eyebrow: 'Métricas',   title: 'Qué se está vendiendo',  nav: 'Métricas',   Icon: BarChart3,   description: 'Productos más vendidos, a qué ciudades se despacha y cómo va el mes contra los anteriores.' },
  followup: { eyebrow: 'Seguimiento', title: 'Llamadas a clientas',   nav: 'Seguimiento', Icon: PhoneCall,  description: 'A quién toca llamar hoy: para preguntar cómo le fue con el producto y para ofrecerle la recompra.' },
  hero:     { eyebrow: 'Portada',    title: 'Hero de la portada',     nav: 'Portada',    Icon: Layers,      description: 'Lo primero que se ve al entrar. Con más de una diapositiva, la portada las va rotando sola.' },
  crm:      { eyebrow: 'Clientes',   title: 'Mamás y bebés',          nav: 'Clientes',   Icon: Users,       description: 'Directorio de clientas registradas, sus bebés y los recordatorios de recompra.' },
  shipping: { eyebrow: 'Envíos',     title: 'Tarifas de envío',       nav: 'Envíos',     Icon: Truck,       description: 'Fletes por departamento y municipio, y el umbral de envío gratis.' },
  products: { eyebrow: 'Catálogo',   title: 'Productos y combos',     nav: 'Catálogo',   Icon: ImageIcon,   description: 'Fichas del catálogo, imágenes y las promociones que salen en la portada.' },
  tips:     { eyebrow: 'Contenido',  title: 'Tips del blog',          nav: 'Tips',       Icon: BookOpen,    description: 'Guías publicadas en /tips, con imagen o video de YouTube.' },
  team:     { eyebrow: 'Equipo',     title: 'Administradores',        nav: 'Equipo',     Icon: ShieldCheck, description: 'Quién puede entrar al panel. Invita por correo: cada persona define su propia contraseña.' },
} as const;

type ModuleKey = keyof typeof MODULES;

export default function AdminDashboardPage() {
  const { showToast, showConfirm } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  /* Recuperación de clave dentro de la misma tarjeta de login: quien queda por
     fuera del panel no debería tener que irse a la web de la tienda. */
  const [loginView, setLoginView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<ModuleKey>('orders');
  /* Rol de quien está usando el panel. Manda en qué módulos se pintan y en si
     puede anular un pedido. Es comodidad de interfaz, no seguridad: la barrera
     de verdad está en el proxy y en cada ruta. */
  const [rol, setRol] = useState<RolPanel>('ADMIN');
  const modulosVisibles = MODULOS_POR_ROL[rol];
  const esAdmin = rol === 'ADMIN';

  // ---------------- Módulo de Métricas ----------------
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  /** Ventana de tiempo del informe. 0 = todo el histórico. */
  const [metricsDias, setMetricsDias] = useState(0);

  // ---------------- Módulo de Seguimiento ----------------
  const [followUps, setFollowUps] = useState<any>(null);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  /** Pestaña interna: a quién llamar. */
  const [followTab, setFollowTab] = useState<'opinion' | 'recompra' | 'registradas'>('opinion');
  /** Ficha abierta en el formulario de registro. */
  const [followTarget, setFollowTarget] = useState<any>(null);
  const [followKind, setFollowKind] = useState<'feedback' | 'recompra'>('feedback');
  const emptyFollowForm = {
    status: 'CONTACTADA',
    channel: 'LLAMADA',
    productRating: 5,
    processRating: 5,
    comment: '',
    notes: '',
  };
  const [followForm, setFollowForm] = useState<Record<string, any>>(emptyFollowForm);
  const [followConfig, setFollowConfig] = useState({ feedbackDelayDays: 5, repurchaseDelayDays: 30 });

  // ---------------- Módulo de Portada (hero) ----------------
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [heroInterval, setHeroInterval] = useState(6000);
  const [loadingHero, setLoadingHero] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [busyHeroId, setBusyHeroId] = useState<string | null>(null);
  const [showHeroForm, setShowHeroForm] = useState(false);
  const [editingHeroId, setEditingHeroId] = useState<string | null>(null);
  /* Valores del hero que trae la portada de fábrica: al crear la primera
     diapositiva se parte de ahí en vez de una pantalla en blanco. */
  const emptyHeroForm = {
    eyebrow: 'Cuidado pediátrico · Colombia',
    title: 'El cuidado más tierno para tu bebé',
    subtitle:
      'Tres esenciales sin alcohol, sin parabenos y probados dermatológicamente: pañitos, colonia y mantequilla corporal.',
    image: '/hero-familia.png',
    imageAlt: 'Mamá y bebé con la Colonia Ensueño',
    primaryLabel: 'Ver productos',
    primaryHref: '#productos',
    secondaryLabel: 'Leer los tips',
    secondaryHref: '/tips',
    showMascot: true,
    isActive: true,
  };
  const [heroForm, setHeroForm] = useState<Record<string, any>>(emptyHeroForm);
  /** Índice que se está viendo en la vista previa del módulo. */
  const [heroPreview, setHeroPreview] = useState(0);

  // ---------------- Módulo de Equipo ----------------
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [invitesList, setInvitesList] = useState<any[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ fullName: string; email: string; role: RolPanel }>({
    fullName: '',
    email: '',
    role: 'ADMIN',
  });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  /* Sin RESEND_API_KEY el correo solo se simula. Se muestra el enlace para que
     la invitación siga sirviendo en desarrollo; en producción llega vacío. */
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  // ---------------- Módulo de Tips ----------------
  const [tipsList, setTipsList] = useState<Tip[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [showTipForm, setShowTipForm] = useState(false);
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  const [savingTip, setSavingTip] = useState(false);
  const emptyTipForm = {
    title: '', subtitle: '', category: 'sueno', readTime: '3 min lectura',
    date: '', author: '', authorRole: '', image: '', videoUrl: '',
    summary: '', content: '', tags: '', isPublished: true, sortOrder: 0,
  };
  const [tipForm, setTipForm] = useState<Record<string, any>>(emptyTipForm);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    babyCohorts?: any;
    surveyResponses?: any[];
    pendingReminders?: any[];
    customers?: any[];
  }>({});

  const [products, setProducts] = useState<any[]>([]);
  // Retirados de la tienda. Se guardan aparte para que el catálogo normal no
  // tenga que filtrarlos en cada render y para poder restaurarlos.
  const [archivedProducts, setArchivedProducts] = useState<any[]>([]);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Full Product Management Modal & Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productFilter, setProductFilter] = useState<'all' | 'featured' | 'promo' | 'archived'>('all');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    subtitle: '',
    category: 'sueno',
    price: '28500',
    originalPrice: '',
    isPromo: false,
    badge: '',
    description: '',
    safetyInfo: 'Dermatológicamente testeado • Libre de Alcohol • Hipoalergénico',
    pediatricGuarantee: 'Vegano, libre de crueldad animal, sin parabenos, sin colorantes, sin sulfatos',
    sizes: '150ml, 250ml',
    fragrances: 'Flores Silvestres & Lavanda, Manzanilla Dulce',
    benefits: 'Induce sueño profundo, Calma irritaciones, Suavidad 24h',
    ingredients: 'Aceite esencial de Lavanda, Extracto de Manzanilla, Avena',
    image: '',
    additionalImages: '',
    isFeatured: true,
    inStock: true,
  });

  // Promotions & Combos Management State
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [isSavingPromo, setIsSavingPromo] = useState(false);
  const [adminProductSubTab, setAdminProductSubTab] = useState<'catalog' | 'promotions'>('catalog');
  const [promoForm, setPromoForm] = useState({
    title: '',
    subtitle: '',
    tagline: '',
    badge: 'OFERTA ESTRELLA ⭐',
    badgeColor: 'secondary',
    price: '',
    originalPrice: '',
    savingText: '',
    imageUrl: '',
    videoUrl: '',
    productId: '',
    code: '',
    discountPercent: '',
    targetBabyStage: '',
    isActive: true,
    sortOrder: '0',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [rateSearchTerm, setRateSearchTerm] = useState('');

  // Orders & Accounting Module State
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [orderMetrics, setOrderMetrics] = useState<any>({});
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Orders Pagination State
  const [ordersPerPage, setOrdersPerPage] = useState<number | 'all'>(10);
  const [ordersCurrentPage, setOrdersCurrentPage] = useState<number>(1);

  // Mobile Menu Drawer & Sidebar Collapse State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Password Change Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Shipping Config & Rates State
  const [shippingConfig, setShippingConfig] = useState({
    freeShippingThreshold: 60000,
    defaultRate: 12000,
    qtyDiscountThreshold: 3,
    qtyDiscountAmount: 3000,
  });
  const [shippingRates, setShippingRates] = useState<any[]>([]);

  // Department-wide rate assignment using numeric index
  const [deptFlatIndex, setDeptFlatIndex] = useState(0);
  const [deptFlatRate, setDeptFlatRate] = useState('8000');
  const [deptFlatDays, setDeptFlatDays] = useState('2-3 días hábiles');

  // Single City Rate using numeric index
  const [selectedDeptIndex, setSelectedDeptIndex] = useState(0);
  const [selectedCityName, setSelectedCityName] = useState(COLOMBIA_LOCATION_DATA[0].cities[0]);
  const [singleCityRate, setSingleCityRate] = useState('7000');
  const [singleCityDays, setSingleCityDays] = useState('2-3 días hábiles');

  // Inline editing state
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState('');
  const [editDays, setEditDays] = useState('');

  // Table features state
  const [selectedRateIds, setSelectedRateIds] = useState<Set<string>>(new Set());
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<'department' | 'city' | 'cost'>('department');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Coupon state
  const [promotionsList, setPromotionsList] = useState<any[]>([]);
  const [couponTitle, setCouponTitle] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState('10');
  const [couponDiscountAmount, setCouponDiscountAmount] = useState('');
  const [couponStage, setCouponStage] = useState('Todas');

  useEffect(() => {
    checkAdminAuth();
    loadProductsAndShipping();
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'crm') {
      loadRemarketingData();
    }
  }, [activeTab, isAuthenticated]);

  const loadRemarketingData = async () => {
    try {
      const res = await apiService.getAdminRemarketingData();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error cargando datos de remarketing:', err);
    }
  };

  /**
   * Comprueba la sesión contra /auth/me y no contra un módulo del panel.
   *
   * Antes preguntaba por los datos de remarketing, que son de administración:
   * a una asistente con sesión válida le habría respondido 401 y el panel la
   * habría echado al login. Quién es y qué puede ver son dos preguntas
   * distintas, y solo la primera decide si entra.
   */
  const checkAdminAuth = async () => {
    try {
      const res = await apiService.getCurrentUser();
      if (res.success && ES_ROL_DE_PANEL(res.user?.role)) {
        setIsAuthenticated(true);
        aplicarRol(res.user.role);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Deja el panel en el estado que corresponde al rol: la pestaña abierta pasa
   * a ser una permitida, y los datos que solo ve administración se cargan solo
   * si hay a quién mostrárselos.
   */
  const aplicarRol = (nuevoRol: RolPanel) => {
    setRol(nuevoRol);
    const permitidos = MODULOS_POR_ROL[nuevoRol] as readonly string[];
    setActiveTab((actual) => (permitidos.includes(actual) ? actual : (permitidos[0] as ModuleKey)));

    if (nuevoRol === 'ADMIN') {
      apiService
        .getAdminRemarketingData()
        .then((r) => r.success && setData(r.data))
        .catch(() => {});
    } else {
      setData({});
    }
  };

  const loadProductsAndShipping = async () => {
    try {
      const [prods, archivados] = await Promise.all([
        apiService.getProducts(),
        apiService.getArchivedProducts(),
      ]);
      setProducts(prods);
      setArchivedProducts(archivados);

      const configRes = await fetch('/api/v1/shipping/config');
      const configJson = await configRes.json();
      if (configJson.success && configJson.data) setShippingConfig(configJson.data);

      const ratesRes = await fetch('/api/v1/shipping/rates');
      const ratesJson = await ratesRes.json();
      if (ratesJson.success && Array.isArray(ratesJson.data)) {
        setShippingRates(ratesJson.data);
      }

      const promos = await apiService.getPromotions(undefined, true);
      setPromotionsList(promos);

      await loadAdminOrders();
    } catch (err) {
      console.error('Error cargando configuración de envíos:', err);
    }
  };

  const loadAdminOrders = async (status = orderStatusFilter, search = orderSearchTerm) => {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      const res = await fetch(`/api/v1/admin/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAdminOrders(json.data || []);
        if (json.metrics) setOrderMetrics(json.metrics);
      }
    } catch (err) {
      console.error('Error cargando órdenes para admin:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/v1/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Estado de la orden actualizado a "${newStatus.replace(/_/g, ' ')}"`, 'success');
        loadAdminOrders();
      } else {
        showToast(json.error || 'Error al actualizar pedido', 'error');
      }
    } catch (err) {
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await apiService.login(loginEmail, loginPassword);
      if (res.success && ES_ROL_DE_PANEL(res.user?.role)) {
        setIsAuthenticated(true);
        aplicarRol(res.user.role);
        showToast(`¡Bienvenida al panel, ${NOMBRE_ROL[res.user.role as RolPanel]}!`, 'success');
        loadProductsAndShipping();
      } else if (res.success) {
        setLoginError('Tu usuario no tiene acceso al panel.');
        showToast('Acceso denegado: tu cuenta no tiene permisos del panel', 'error');
      } else {
        setLoginError(res.error || 'Credenciales incorrectas');
        showToast(res.error || 'Credenciales incorrectas', 'error');
      }
    } catch (err) {
      setLoginError('Error de inicio de sesión');
      showToast('Error al conectar con el servidor', 'error');
    }
  };

  /** Cambia de vista en la tarjeta de login sin arrastrar el error anterior. */
  const goToLoginView = (view: 'login' | 'forgot' | 'reset') => {
    setLoginError(null);
    setLoginView(view);
  };

  const handleRequestRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const email = recoveryEmail.trim();
    if (!email) return;

    setRecoveryBusy(true);
    try {
      const res = await apiService.requestPasswordReset(email);
      if (res.success) {
        // El endpoint responde igual si el correo no existe, para no delatar
        // qué cuentas están registradas. El copy acompaña esa decisión.
        showToast('Si el correo está registrado, el código llega en unos segundos', 'success');
        setLoginView('reset');
      } else {
        setLoginError(res.error || 'No pudimos enviar el código');
      }
    } catch (err) {
      setLoginError('Error al conectar con el servidor');
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const code = recoveryCode.trim();
    if (code.length !== 6) {
      setLoginError('El código son 6 dígitos.');
      return;
    }
    if (recoveryPassword.length < 6) {
      setLoginError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setLoginError('Las contraseñas no coinciden.');
      return;
    }

    setRecoveryBusy(true);
    try {
      const res = await apiService.resetPassword(code, recoveryPassword, recoveryEmail.trim());
      if (!res.success) {
        setLoginError(res.error || 'No pudimos restablecer la contraseña');
        return;
      }

      // Con la clave nueva ya se puede entrar: se evita pedirla otra vez.
      const login = await apiService.login(recoveryEmail.trim(), recoveryPassword);
      if (login.success && ES_ROL_DE_PANEL(login.user?.role)) {
        setIsAuthenticated(true);
        aplicarRol(login.user.role);
        showToast('¡Contraseña actualizada! Bienvenida de vuelta', 'success');
        loadProductsAndShipping();
      } else if (login.success) {
        setLoginError('Tu contraseña se actualizó, pero esta cuenta no tiene acceso al panel.');
        goToLoginView('login');
      } else {
        showToast('Contraseña actualizada. Ingresa con tu clave nueva.', 'success');
        goToLoginView('login');
      }

      setRecoveryCode('');
      setRecoveryPassword('');
      setRecoveryConfirm('');
    } catch (err) {
      setLoginError('Error al conectar con el servidor');
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    goToLoginView('login');
    showToast('Sesión de administración cerrada', 'info');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('¡Contraseña actualizada exitosamente!', 'success');
        setShowSettingsModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(json.error || 'Error al cambiar contraseña', 'error');
      }
    } catch (err) {
      showToast('Error en el servidor al cambiar contraseña', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveShippingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/shipping/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shippingConfig),
      });
      const json = await res.json();
      if (json.success) {
        showToast('¡Reglas globales de envío guardadas con éxito!', 'success');
      }
    } catch (err) {
      showToast('Error al guardar reglas de envío', 'error');
    }
  };

  const handleApplyDepartmentFlatRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const deptObj = COLOMBIA_LOCATION_DATA[deptFlatIndex];
    if (!deptObj || !deptObj.cities || !deptFlatRate) {
      showToast('Por favor selecciona un departamento e ingresa una tarifa válida', 'error');
      return;
    }

    const rateVal = parseFloat(String(deptFlatRate).replace(/[^0-9]/g, ''));
    if (isNaN(rateVal) || rateVal < 0) {
      showToast('Ingresa un valor numérico válido para la tarifa', 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: deptObj.name,
          cities: deptObj.cities,
          cost: rateVal,
          estimatedDays: deptFlatDays || '2-3 días hábiles',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`¡Tarifa de $${rateVal.toLocaleString('es-CO')} aplicada a ${deptObj.cities.length} municipios de ${deptObj.name}!`, 'success');
        loadProductsAndShipping();
      } else {
        showToast(json.error || 'Error al aplicar tarifa por departamento', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al aplicar tarifa por departamento', 'error');
    }
  };

  const handleAddSingleCityRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const deptObj = COLOMBIA_LOCATION_DATA[selectedDeptIndex];
    if (!deptObj || !selectedCityName || !singleCityRate) {
      showToast('Por favor selecciona departamento, municipio y costo de envío', 'error');
      return;
    }

    const rateVal = parseFloat(String(singleCityRate).replace(/[^0-9]/g, ''));
    if (isNaN(rateVal) || rateVal < 0) {
      showToast('El costo de envío debe ser un valor numérico válido', 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: deptObj.name,
          city: selectedCityName,
          cost: rateVal,
          estimatedDays: singleCityDays,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Tarifa de $${rateVal.toLocaleString('es-CO')} para ${selectedCityName} (${deptObj.name}) guardada con éxito.`, 'success');
        loadProductsAndShipping();
      } else {
        showToast(json.error || 'Error al guardar tarifa de envío', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al guardar tarifa de ciudad', 'error');
    }
  };

  const handleDeleteRate = async (rateId: string, cityName: string) => {
    try {
      const res = await fetch(`/api/v1/shipping/rates?id=${rateId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast(`Tarifa de ${cityName} eliminada con éxito`, 'info');
        setSelectedRateIds((prev) => { const next = new Set(prev); next.delete(rateId); return next; });
        loadProductsAndShipping();
      }
    } catch (err) {
      showToast('Error al eliminar tarifa', 'error');
    }
  };

  const handleInlineEditSave = async (rate: any) => {
    const costVal = parseFloat(String(editCost).replace(/[^0-9]/g, ''));
    if (isNaN(costVal) || costVal < 0) {
      showToast('El costo debe ser un número válido', 'error');
      return;
    }
    try {
      const res = await fetch('/api/v1/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: rate.department,
          city: rate.city,
          cost: costVal,
          estimatedDays: editDays || '2-3 días hábiles',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Tarifa de ${rate.city} actualizada a $${costVal.toLocaleString('es-CO')} COP`, 'success');
        setEditingRateId(null);
        loadProductsAndShipping();
      } else {
        showToast(json.error || 'Error al actualizar tarifa', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al actualizar tarifa', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRateIds.size === 0) return;
    const count = selectedRateIds.size;
    let deleted = 0;
    for (const id of selectedRateIds) {
      try {
        const res = await fetch(`/api/v1/shipping/rates?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) deleted++;
      } catch (err) { /* skip */ }
    }
    setSelectedRateIds(new Set());
    showToast(`${deleted} de ${count} tarifas eliminadas correctamente`, deleted > 0 ? 'success' : 'error');
    loadProductsAndShipping();
  };

  const toggleRateSelection = (id: string) => {
    setSelectedRateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleSort = (col: 'department' | 'city' | 'cost') => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const handleUpdateProductImage = async (productId: string) => {
    if (!newImageUrl) return;
    try {
      const res = await apiService.updateProductImage(productId, newImageUrl);
      if (res.success) {
        showToast('URL de imagen de producto actualizada correctamente.', 'success');
        setEditingImageId(null);
        setNewImageUrl('');
        loadProductsAndShipping();
      } else {
        showToast(res.error || 'Error al actualizar imagen', 'error');
      }
    } catch (err: any) {
      showToast('Error en el servidor al actualizar imagen', 'error');
    }
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      subtitle: '',
      category: 'sueno',
      price: '28500',
      originalPrice: '',
      isPromo: false,
      badge: 'NUEVO',
      description: 'Fórmula delicada enriquecida con extractos naturales para el cuidado diario de tu bebé.',
      safetyInfo: 'Dermatológicamente testeado • Libre de Alcohol • Hipoalergénico',
      pediatricGuarantee: 'Vegano, libre de crueldad animal, sin parabenos, sin colorantes, sin sulfatos',
      sizes: '150ml, 250ml',
      fragrances: 'Flores Silvestres & Lavanda, Manzanilla Dulce',
      benefits: 'Induce sueño profundo, Calma irritaciones, Suavidad prolongada',
      ingredients: 'Aceite esencial de Lavanda, Extracto de Manzanilla, Avena coloidal',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop',
      additionalImages: '',
      isFeatured: true,
      inStock: true,
    });
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      subtitle: product.subtitle || '',
      category: product.category || 'sueno',
      price: product.price ? String(product.price) : '0',
      originalPrice: product.originalPrice ? String(product.originalPrice) : '',
      isPromo: Boolean(product.originalPrice && product.originalPrice > product.price),
      badge: product.badge || '',
      description: product.description || '',
      safetyInfo: product.safetyInfo || 'Dermatológicamente testeado',
      pediatricGuarantee: product.pediatricGuarantee || 'Vegano, libre de crueldad animal, sin parabenos, sin colorantes, sin sulfatos',
      // Reconstruye "150ml:28500, 250ml" para poder seguir editando los precios
      // por presentación en el mismo campo.
      sizes: Array.isArray(product.sizes)
        ? formatSizePrices(product.sizes, product.sizePrices)
        : product.sizes || '',
      fragrances: Array.isArray(product.fragrances) ? product.fragrances.join(', ') : product.fragrances || '',
      benefits: Array.isArray(product.benefits) ? product.benefits.join(', ') : product.benefits || '',
      ingredients: Array.isArray(product.ingredients) ? product.ingredients.join(', ') : product.ingredients || '',
      image: product.image || '',
      additionalImages: Array.isArray(product.additionalImages) ? product.additionalImages.join(', ') : product.additionalImages || '',
      isFeatured: product.isFeatured !== false,
      inStock: product.inStock !== false,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.image) {
      showToast('Por favor completa el Nombre, Precio e Imagen principal.', 'error');
      return;
    }

    setIsSavingProduct(true);
    try {
      const payload: any = {
        name: productForm.name,
        subtitle: productForm.subtitle,
        category: productForm.category,
        price: parseFloat(productForm.price),
        originalPrice: productForm.isPromo && productForm.originalPrice ? parseFloat(productForm.originalPrice) : null,
        badge: productForm.badge || null,
        description: productForm.description,
        safetyInfo: productForm.safetyInfo,
        pediatricGuarantee: productForm.pediatricGuarantee,
        // Va crudo: el repositorio separa el nombre del precio ("250ml:39900").
        sizes: productForm.sizes,
        fragrances: productForm.fragrances.split(',').map((s) => s.trim()).filter(Boolean),
        benefits: productForm.benefits.split(',').map((s) => s.trim()).filter(Boolean),
        ingredients: productForm.ingredients.split(',').map((s) => s.trim()).filter(Boolean),
        image: productForm.image,
        additionalImages: productForm.additionalImages.split(',').map((s) => s.trim()).filter(Boolean),
        isFeatured: productForm.isFeatured,
        inStock: productForm.inStock,
      };

      let res;
      if (editingProduct) {
        res = await apiService.updateProduct(editingProduct.id, payload);
      } else {
        res = await apiService.createProduct(payload);
      }

      if (res.success) {
        showToast(
          editingProduct
            ? 'Producto actualizado correctamente en el catálogo y página principal ✨'
            : '¡Nuevo producto creado y publicado exitosamente! 🛍️',
          'success'
        );
        setShowProductModal(false);
        setEditingProduct(null);
        loadProductsAndShipping();
      } else {
        showToast(res.error || 'Error al guardar producto', 'error');
      }
    } catch (err: any) {
      showToast('Error en el servidor al guardar el producto', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleToggleFeaturedProduct = async (product: any) => {
    try {
      const newFeaturedState = !product.isFeatured;
      const res = await apiService.updateProduct(product.id, { isFeatured: newFeaturedState });
      if (res.success) {
        showToast(
          newFeaturedState
            ? `⭐ "${product.name}" agregado a los esenciales de la página principal`
            : `"${product.name}" retirado de la página principal`,
          'info'
        );
        loadProductsAndShipping();
      }
    } catch (err) {
      showToast('Error al actualizar visibilidad en página principal', 'error');
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    const confirmado = await showConfirm({
      title: `¿Retirar "${productName}" de la tienda?`,
      message:
        'Deja de aparecer en la página principal y en el catálogo, y su ficha queda inaccesible. Los pedidos que ya lo incluyen no cambian, y puedes devolverlo desde el filtro "Retirados".',
      confirmLabel: 'Retirar de la tienda',
      cancelLabel: 'Conservar',
      tone: 'danger',
    });
    if (!confirmado) return;

    try {
      const res = await apiService.deleteProduct(productId);
      if (res.success) {
        showToast(`"${productName}" ya no aparece en la tienda`, 'info');
        loadProductsAndShipping();
      } else {
        showToast(res.error || 'No se pudo retirar el producto', 'error');
      }
    } catch (err) {
      showToast('Error en el servidor al retirar el producto', 'error');
    }
  };

  const handleRestoreProduct = async (productId: string, productName: string) => {
    const confirmado = await showConfirm({
      title: `¿Devolver "${productName}" a la tienda?`,
      message:
        'Vuelve al catálogo con los mismos datos que tenía. Si además quieres verlo en la página principal, márcalo después como destacado.',
      confirmLabel: 'Devolver a la tienda',
    });
    if (!confirmado) return;

    try {
      const res = await apiService.restoreProduct(productId);
      if (res.success) {
        showToast(`"${productName}" volvió al catálogo`, 'success');
        loadProductsAndShipping();
      } else {
        showToast(res.error || 'No se pudo restaurar el producto', 'error');
      }
    } catch (err) {
      showToast('Error en el servidor al restaurar el producto', 'error');
    }
  };

  const handleOpenCreatePromo = () => {
    setEditingPromo(null);
    setPromoForm({
      title: '',
      subtitle: 'Descripción detallada de la oferta especial...',
      tagline: 'Combo Especial',
      badge: 'OFERTA ESTRELLA ⭐',
      badgeColor: 'secondary',
      price: '37800',
      originalPrice: '56700',
      savingText: 'Ahorras $18.900 COP',
      imageUrl: 'https://res.cloudinary.com/io8kzyuj/image/upload/ensueno/productos/panitos-humedos.webp',
      videoUrl: '',
      productId: products[0]?.id || '',
      code: '',
      discountPercent: '',
      targetBabyStage: '',
      isActive: true,
      sortOrder: '0',
    });
    setShowPromoModal(true);
  };

  const handleOpenEditPromo = (promo: any) => {
    setEditingPromo(promo);
    setPromoForm({
      title: promo.title || '',
      subtitle: promo.subtitle || '',
      tagline: promo.tagline || '',
      badge: promo.badge || '',
      badgeColor: promo.badgeColor || 'secondary',
      price: promo.price ? String(promo.price) : '',
      originalPrice: promo.originalPrice ? String(promo.originalPrice) : '',
      savingText: promo.savingText || '',
      imageUrl: promo.imageUrl || '',
      videoUrl: promo.videoUrl || '',
      productId: promo.productId || '',
      code: promo.code || '',
      discountPercent: promo.discountPercent ? String(promo.discountPercent) : '',
      targetBabyStage: promo.targetBabyStage || '',
      isActive: promo.isActive !== false,
      sortOrder: promo.sortOrder ? String(promo.sortOrder) : '0',
    });
    setShowPromoModal(true);
  };

  const handleSavePromo = async () => {
    if (!promoForm.title) {
      showToast('Por favor ingresa un título para la promoción o combo.', 'error');
      return;
    }

    setIsSavingPromo(true);
    try {
      const payload: any = {
        title: promoForm.title,
        subtitle: promoForm.subtitle,
        tagline: promoForm.tagline,
        badge: promoForm.badge,
        badgeColor: promoForm.badgeColor,
        price: promoForm.price ? parseFloat(promoForm.price) : null,
        originalPrice: promoForm.originalPrice ? parseFloat(promoForm.originalPrice) : null,
        savingText: promoForm.savingText,
        imageUrl: promoForm.imageUrl,
        videoUrl: promoForm.videoUrl,
        productId: promoForm.productId || null,
        code: promoForm.code ? promoForm.code.trim().toUpperCase() : null,
        discountPercent: promoForm.discountPercent ? parseFloat(promoForm.discountPercent) : null,
        targetBabyStage: promoForm.targetBabyStage || null,
        isActive: promoForm.isActive,
        sortOrder: promoForm.sortOrder ? parseInt(promoForm.sortOrder) : 0,
      };

      let res;
      if (editingPromo) {
        res = await apiService.updatePromotion(editingPromo.id, payload);
      } else {
        res = await apiService.createPromotion(payload);
      }

      if (res.success) {
        showToast(
          editingPromo
            ? 'Promoción/Combo actualizado correctamente en la página principal ✨'
            : '¡Nueva promoción creada y publicada en la página principal! 🎁',
          'success'
        );
        setShowPromoModal(false);
        setEditingPromo(null);
        loadProductsAndShipping();
      } else {
        showToast(res.error || 'Error al guardar promoción', 'error');
      }
    } catch (err: any) {
      showToast('Error en el servidor al guardar la promoción', 'error');
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleTogglePromoActive = async (promo: any) => {
    try {
      const res = await apiService.updatePromotion(promo.id, { isActive: !promo.isActive });
      if (res.success) {
        showToast(
          !promo.isActive
            ? `🎁 Promoción "${promo.title}" activada`
            : `Promoción "${promo.title}" desactivada`,
          'info'
        );
        loadProductsAndShipping();
      }
    } catch (err) {
      showToast('Error al cambiar estado de la promoción', 'error');
    }
  };

  const handleDeletePromo = async (promoId: string, promoTitle: string) => {
    const confirmado = await showConfirm({
      title: `¿Eliminar la promoción "${promoTitle}"?`,
      message:
        'Desaparece de la sección de ofertas de la página principal. Esto no se puede deshacer: si solo quieres pausarla, usa el botón "Activa en inicio" de la tarjeta.',
      confirmLabel: 'Eliminar promoción',
      cancelLabel: 'Conservar',
      tone: 'danger',
    });
    if (!confirmado) return;

    try {
      const res = await apiService.deletePromotion(promoId);
      if (res.success) {
        showToast(`Promoción "${promoTitle}" eliminada`, 'info');
        loadProductsAndShipping();
      } else {
        showToast(res.error || 'Error al eliminar promoción', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar promoción', 'error');
    }
  };

  const handleSendReminder = async (email: string, name: string, babyName: string, productTitle: string) => {
    try {
      const res = await apiService.sendRemarketingReminder(email, name, babyName, productTitle);
      if (res.success) {
        showToast(`Recordatorio de remarketing enviado a ${email}`, 'success');
      } else {
        showToast(`Error al enviar correo: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('Error enviando recordatorio', 'error');
    }
  };

  /* Catálogo que se pinta en el módulo de productos. "Retirados" cambia la
     lista de origen, no el criterio: los archivados llegan en su propia
     consulta y nunca se mezclan con el catálogo activo. */
  const productosVisibles = (productFilter === 'archived' ? archivedProducts : products)
    .filter((p) => {
      if (productFilter === 'featured') return p.isFeatured !== false;
      if (productFilter === 'promo') return p.originalPrice && p.originalPrice > p.price;
      return true;
    })
    .filter(
      (p) =>
        !productSearchQuery ||
        p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        p.subtitle?.toLowerCase().includes(productSearchQuery.toLowerCase())
    );

  // Unique departments from loaded rates for the filter dropdown
  const uniqueDepartments = Array.from(new Set(shippingRates.map((r) => r.department).filter(Boolean))).sort();

  // Filter by department, then by search text, then sort
  const filteredRates = shippingRates
    .filter((r) => deptFilter === 'all' || r.department === deptFilter)
    .filter(
      (r) =>
        !rateSearchTerm ||
        r.department?.toLowerCase().includes(rateSearchTerm.toLowerCase()) ||
        r.city?.toLowerCase().includes(rateSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortColumn === 'cost') return (a.cost - b.cost) * dir;
      const valA = (a[sortColumn] || '').toLowerCase();
      const valB = (b[sortColumn] || '').toLowerCase();
      return valA.localeCompare(valB) * dir;
    });


  /** KPIs por módulo. Solo cifras que salen de datos reales. */
  const moduleKpis = (tab: ModuleKey): Array<{ label: string; value: string | number; Icon: any }> => {
    if (tab === 'orders') {
      return [
        { label: 'Recaudado', value: `$${(orderMetrics.totalRevenue || 0).toLocaleString('es-CO')}`, Icon: ShoppingBag },
        { label: 'Sin pagar', value: orderMetrics.generatedCount || 0, Icon: Sparkles },
        { label: 'Pagados', value: orderMetrics.confirmedCount || 0, Icon: CheckCircle2 },
        { label: 'En camino y entregados', value: (orderMetrics.shippedCount || 0) + (orderMetrics.deliveredCount || 0), Icon: Truck },
      ];
    }
    if (tab === 'crm') {
      const babies = (data.customers || []).flatMap((c: any) => c.babies || c.motherProfile?.babies || []);
      const total = data.babyCohorts?.totalBabies || babies.length;
      const sensitive = babies.filter((b: any) => /sensible|at[oó]pica/i.test(b.skinCondition || '')).length;
      return [
        { label: 'Clientas', value: data.customers?.length || 0, Icon: Users },
        { label: 'Bebés', value: total, Icon: Baby },
        { label: 'Piel sensible', value: total > 0 ? `${Math.round((sensitive / total) * 100)}%` : '—', Icon: Sparkles },
        { label: 'Recordatorios', value: data.pendingReminders?.length || 0, Icon: Mail },
      ];
    }
    if (tab === 'products') {
      return [
        { label: 'Productos', value: products.length, Icon: ShoppingBag },
        { label: 'Promociones', value: promotionsList.length, Icon: Tag },
        { label: 'Promos activas', value: promotionsList.filter((p: any) => p.isActive).length, Icon: CheckCircle2 },
      ];
    }
    if (tab === 'tips') {
      return [
        { label: 'Tips', value: tipsList.length, Icon: BookOpen },
        { label: 'Publicados', value: tipsList.filter((t) => t.isPublished !== false).length, Icon: CheckCircle2 },
        { label: 'Con video', value: tipsList.filter((t) => Boolean(t.videoUrl)).length, Icon: Video },
      ];
    }
    if (tab === 'shipping') {
      return [
        { label: 'Tarifas', value: shippingRates.length, Icon: Truck },
        { label: 'Envío gratis desde', value: `$${Number(shippingConfig.freeShippingThreshold || 0).toLocaleString('es-CO')}`, Icon: Gift },
      ];
    }
    if (tab === 'team') {
      return [
        { label: 'Administradores', value: adminsList.length, Icon: ShieldCheck },
        { label: 'Invitaciones pendientes', value: invitesList.length, Icon: Mail },
      ];
    }
    if (tab === 'metrics') {
      const r = metrics?.resumen;
      return [
        { label: 'Vendido', value: `$${(r?.ingresos || 0).toLocaleString('es-CO')}`, Icon: TrendingUp },
        { label: 'Pedidos pagados', value: r?.pedidos || 0, Icon: ShoppingBag },
        { label: 'Ticket promedio', value: `$${(r?.ticketPromedio || 0).toLocaleString('es-CO')}`, Icon: BarChart3 },
        { label: 'Clientas', value: r?.clientasUnicas || 0, Icon: Users },
      ];
    }
    if (tab === 'followup') {
      const r = followUps?.resumen;
      return [
        { label: 'Opiniones por pedir', value: followUps?.opinionPendiente?.length || 0, Icon: PhoneCall },
        { label: 'Recompras por llamar', value: followUps?.recompraPendiente?.length || 0, Icon: RefreshCw },
        { label: 'Nota del producto', value: r?.notaProducto ? `${r.notaProducto} / 5` : '—', Icon: StarIcon },
        { label: 'Nota del proceso', value: r?.notaProceso ? `${r.notaProceso} / 5` : '—', Icon: CheckCircle2 },
      ];
    }
    if (tab === 'hero') {
      return [
        { label: 'Diapositivas', value: heroSlides.length, Icon: Layers },
        { label: 'En la portada', value: heroActivas.length, Icon: CheckCircle2 },
        {
          label: 'Cambia cada',
          value: heroInterval > 0 && heroActivas.length > 1 ? `${heroInterval / 1000} s` : '—',
          Icon: RefreshCw,
        },
      ];
    }
    return [];
  };

  const allFilteredSelected = filteredRates.length > 0 && filteredRates.every((r) => selectedRateIds.has(r.id));

  // ---------------- Handlers de Tips ----------------
  // ---------------- Métricas ----------------

  const fetchMetrics = async (dias = metricsDias) => {
    setLoadingMetrics(true);
    try {
      const res = await apiService.getAnalytics(dias);
      if (res.success) setMetrics(res.data);
      else showToast(res.error || 'No pudimos calcular las métricas', 'error');
    } catch (err) {
      console.error('Error cargando métricas:', err);
      showToast('No pudimos calcular las métricas', 'error');
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'metrics') fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab, metricsDias]);

  // ---------------- Seguimiento ----------------

  const fetchFollowUps = async () => {
    setLoadingFollowUps(true);
    try {
      const res = await apiService.getFollowUps();
      if (res.success) {
        setFollowUps(res.data);
        setFollowConfig({
          feedbackDelayDays: res.data.config.feedbackDelayDays,
          repurchaseDelayDays: res.data.config.repurchaseDelayDays,
        });
      } else {
        showToast(res.error || 'No pudimos cargar el seguimiento', 'error');
      }
    } catch (err) {
      console.error('Error cargando seguimiento:', err);
      showToast('No pudimos cargar el seguimiento', 'error');
    } finally {
      setLoadingFollowUps(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'followup') fetchFollowUps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab]);

  const openFollowForm = (ficha: any, kind: 'feedback' | 'recompra') => {
    setFollowTarget(ficha);
    setFollowKind(kind);
    setFollowForm({
      ...emptyFollowForm,
      status: kind === 'feedback' ? 'CONTACTADA' : 'CONTACTADA',
      productRating: ficha.productRating ?? 5,
      processRating: ficha.processRating ?? 5,
      comment: ficha.feedbackComment || '',
      notes: ficha.repurchaseNotes || '',
      channel: ficha.feedbackChannel || 'LLAMADA',
    });
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followTarget) return;

    setSavingFollowUp(true);
    try {
      const res = await apiService.saveFollowUp({
        id: followTarget.id,
        tipo: followKind,
        ...followForm,
        // Sin respuesta o sin interés no llevan calificación: quedaría inventada.
        productRating: followForm.status === 'CONTACTADA' ? followForm.productRating : null,
        processRating: followForm.status === 'CONTACTADA' ? followForm.processRating : null,
      });
      if (res.success) {
        showToast(res.message || 'Contacto registrado', 'success');
        setFollowTarget(null);
        await fetchFollowUps();
      } else {
        showToast(res.error || 'No pudimos registrar el contacto', 'error');
      }
    } catch (err) {
      console.error('Error registrando contacto:', err);
      showToast('No pudimos registrar el contacto', 'error');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleReabrirFollowUp = async (ficha: any, tipo: 'feedback' | 'recompra') => {
    try {
      const res = await apiService.saveFollowUp({ id: ficha.id, tipo, action: 'reabrir' });
      if (res.success) {
        showToast('Volvió a la lista de pendientes', 'success');
        await fetchFollowUps();
      } else {
        showToast(res.error || 'No pudimos reabrirlo', 'error');
      }
    } catch (err) {
      showToast('No pudimos reabrirlo', 'error');
    }
  };

  const handleSaveFollowConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFollowUp(true);
    try {
      const res = await apiService.saveFollowUp({ action: 'config', ...followConfig });
      if (res.success) {
        showToast('Plazos guardados', 'success');
        await fetchFollowUps();
      } else {
        showToast(res.error || 'No pudimos guardar los plazos', 'error');
      }
    } catch (err) {
      showToast('No pudimos guardar los plazos', 'error');
    } finally {
      setSavingFollowUp(false);
    }
  };

  /** "hace 3 días" / "hoy" — cuánto lleva esperando un contacto. */
  const desdeHace = (fecha: string | Date | null) => {
    if (!fecha) return '—';
    const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
    if (dias <= 0) return 'hoy';
    if (dias === 1) return 'ayer';
    return `hace ${dias} días`;
  };

  // ---------------- Portada (hero) ----------------

  const fetchHero = async () => {
    setLoadingHero(true);
    try {
      // includeAll: el panel también ve las diapositivas apagadas.
      const res = await apiService.getHero(true);
      if (res.success) {
        setHeroSlides(res.data.slides || []);
        setHeroInterval(res.data.intervalMs ?? 6000);
        setHeroPreview(0);
      } else {
        showToast(res.error || 'No pudimos cargar la portada', 'error');
      }
    } catch (err) {
      console.error('Error cargando la portada:', err);
      showToast('No pudimos cargar la portada', 'error');
    } finally {
      setLoadingHero(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'hero') fetchHero();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab]);

  const openNewHeroSlide = () => {
    setEditingHeroId(null);
    setHeroForm(emptyHeroForm);
    setShowHeroForm(true);
  };

  const openEditHeroSlide = (slide: any) => {
    setEditingHeroId(slide.id);
    setHeroForm({
      eyebrow: slide.eyebrow || '',
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      image: slide.image || '',
      imageAlt: slide.imageAlt || '',
      primaryLabel: slide.primaryLabel || '',
      primaryHref: slide.primaryHref || '',
      secondaryLabel: slide.secondaryLabel || '',
      secondaryHref: slide.secondaryHref || '',
      showMascot: slide.showMascot !== false,
      isActive: slide.isActive !== false,
    });
    setShowHeroForm(true);
  };

  const handleSaveHeroSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroForm.title?.trim()) {
      showToast('El titular es obligatorio', 'error');
      return;
    }
    if (!heroForm.image?.trim()) {
      showToast('La imagen es obligatoria', 'error');
      return;
    }

    setSavingHero(true);
    try {
      const res = editingHeroId
        ? await apiService.updateHeroSlide(editingHeroId, heroForm)
        : await apiService.createHeroSlide(heroForm);

      if (res.success) {
        showToast(editingHeroId ? 'Diapositiva actualizada' : 'Diapositiva creada', 'success');
        setShowHeroForm(false);
        setEditingHeroId(null);
        setHeroForm(emptyHeroForm);
        await fetchHero();
      } else {
        showToast(res.error || 'No pudimos guardar la diapositiva', 'error');
      }
    } catch (err) {
      console.error('Error guardando la diapositiva:', err);
      showToast('No pudimos guardar la diapositiva', 'error');
    } finally {
      setSavingHero(false);
    }
  };

  const handleToggleHeroSlide = async (slide: any) => {
    setBusyHeroId(slide.id);
    try {
      const res = await apiService.updateHeroSlide(slide.id, { isActive: !slide.isActive });
      if (res.success) {
        showToast(slide.isActive ? 'Diapositiva apagada' : 'Diapositiva encendida', 'success');
        await fetchHero();
      } else {
        showToast(res.error || 'No pudimos cambiar el estado', 'error');
      }
    } catch (err) {
      showToast('No pudimos cambiar el estado', 'error');
    } finally {
      setBusyHeroId(null);
    }
  };

  const handleMoveHeroSlide = async (slide: any, direction: 'up' | 'down') => {
    setBusyHeroId(slide.id);
    try {
      const res = await apiService.moveHeroSlide(slide.id, direction);
      if (res.success) {
        await fetchHero();
      } else {
        showToast(res.error || 'No pudimos reordenar', 'error');
      }
    } catch (err) {
      showToast('No pudimos reordenar', 'error');
    } finally {
      setBusyHeroId(null);
    }
  };

  const handleDeleteHeroSlide = async (slide: any) => {
    if (!confirm(`¿Eliminar la diapositiva "${slide.title}"? No se puede deshacer.`)) return;

    setBusyHeroId(slide.id);
    try {
      const res = await apiService.deleteHeroSlide(slide.id);
      if (res.success) {
        showToast('Diapositiva eliminada', 'success');
        await fetchHero();
      } else {
        showToast(res.error || 'No pudimos eliminar la diapositiva', 'error');
      }
    } catch (err) {
      showToast('No pudimos eliminar la diapositiva', 'error');
    } finally {
      setBusyHeroId(null);
    }
  };

  const handleSaveHeroInterval = async (segundos: number) => {
    const ms = Math.round(segundos * 1000);
    setSavingHero(true);
    try {
      const res = await apiService.updateHeroConfig(ms);
      if (res.success) {
        setHeroInterval(res.data.intervalMs);
        showToast(
          res.data.intervalMs === 0
            ? 'El carrusel ya no avanza solo'
            : `El carrusel avanza cada ${res.data.intervalMs / 1000} s`,
          'success'
        );
      } else {
        showToast(res.error || 'No pudimos guardar el ritmo', 'error');
      }
    } catch (err) {
      showToast('No pudimos guardar el ritmo', 'error');
    } finally {
      setSavingHero(false);
    }
  };

  /* Solo las encendidas salen en la portada; la vista previa muestra eso. */
  const heroActivas = heroSlides.filter((s) => s.isActive !== false);

  // ---------------- Equipo del panel ----------------

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await apiService.listAdminUsers();
      if (res.success) {
        setAdminsList(res.data.admins || []);
        setInvitesList(res.data.invites || []);
        setCurrentAdminId(res.data.currentAdminId || null);
      } else {
        showToast(res.error || 'No pudimos cargar el equipo', 'error');
      }
    } catch (err) {
      console.error('Error cargando el equipo:', err);
      showToast('No pudimos cargar el equipo', 'error');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'team') fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = inviteForm.fullName.trim();
    const email = inviteForm.email.trim();

    if (!fullName || !email) {
      showToast('Escribe el nombre y el correo de la persona', 'error');
      return;
    }

    setSendingInvite(true);
    setLastInviteLink(null);
    try {
      const res = await apiService.inviteAdminUser(fullName, email, inviteForm.role);
      if (res.success) {
        showToast(res.message || 'Invitación enviada', 'success');
        setInviteForm({ fullName: '', email: '', role: 'ADMIN' });
        if (res.data?.activationUrl) setLastInviteLink(res.data.activationUrl);
        await fetchTeam();
      } else {
        showToast(res.error || 'No pudimos enviar la invitación', 'error');
      }
    } catch (err) {
      console.error('Error enviando invitación:', err);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleInviteAction = async (invite: any, action: 'resend' | 'revoke') => {
    if (action === 'revoke' && !confirm(`¿Cancelar la invitación de ${invite.email}? El enlace dejará de servir.`)) {
      return;
    }

    setBusyTeamId(invite.id);
    setLastInviteLink(null);
    try {
      const res = await apiService.updateAdminInvite(invite.id, action);
      if (res.success) {
        showToast(res.message || 'Invitación actualizada', 'success');
        if (res.data?.activationUrl) setLastInviteLink(res.data.activationUrl);
        await fetchTeam();
      } else {
        showToast(res.error || 'No pudimos actualizar la invitación', 'error');
      }
    } catch (err) {
      console.error('Error actualizando invitación:', err);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setBusyTeamId(null);
    }
  };

  const handleRevokeAdmin = async (admin: any) => {
    if (!confirm(`¿Quitarle el acceso al panel a ${admin.fullName} (${admin.email})?\n\nSu cuenta y sus pedidos se conservan; solo deja de ser administradora.`)) {
      return;
    }

    setBusyTeamId(admin.id);
    try {
      const res = await apiService.revokeAdminUser(admin.id);
      if (res.success) {
        showToast(res.message || 'Acceso revocado', 'success');
        await fetchTeam();
      } else {
        showToast(res.error || 'No pudimos revocar el acceso', 'error');
      }
    } catch (err) {
      console.error('Error revocando acceso:', err);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setBusyTeamId(null);
    }
  };

  /** "en 2 días" / "en 5 horas" — cuánto le queda a una invitación. */
  const inviteTimeLeft = (expiresAt: string | Date) => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return 'Vencida';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `Vence en ${days} ${days === 1 ? 'día' : 'días'}`;
    }
    if (hours >= 1) return `Vence en ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    return 'Vence en menos de una hora';
  };

  const fetchTips = async () => {
    setLoadingTips(true);
    try {
      // includeAll: el panel también tiene que ver los borradores.
      setTipsList(await apiService.getTips(undefined, undefined, true));
    } catch (err) {
      console.error('Error cargando tips:', err);
      showToast('No pudimos cargar los tips', 'error');
    } finally {
      setLoadingTips(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'tips') fetchTips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab]);

  const openNewTip = () => {
    setEditingTipId(null);
    setTipForm(emptyTipForm);
    setShowTipForm(true);
  };

  const openEditTip = (tip: Tip) => {
    setEditingTipId(tip.id);
    setTipForm({
      title: tip.title, subtitle: tip.subtitle, category: tip.category,
      readTime: tip.readTime, date: tip.date, author: tip.author,
      authorRole: tip.authorRole, image: tip.image, videoUrl: tip.videoUrl || '',
      summary: tip.summary,
      // Un párrafo por línea en blanco: es como se escribe naturalmente.
      content: (tip.content || []).join('\n\n'),
      tags: (tip.tags || []).join(', '),
      isPublished: tip.isPublished !== false,
      sortOrder: tip.sortOrder ?? 0,
    });
    setShowTipForm(true);
  };

  const handleSaveTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipForm.title?.trim()) {
      showToast('El título es obligatorio', 'error');
      return;
    }
    setSavingTip(true);
    try {
      const payload = {
        ...tipForm,
        sortOrder: Number(tipForm.sortOrder) || 0,
        videoUrl: tipForm.videoUrl?.trim() || null,
        content: String(tipForm.content || '')
          .split(/\n\s*\n/)
          .map((x) => x.trim())
          .filter(Boolean),
        tags: String(tipForm.tags || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      };
      const res = editingTipId
        ? await apiService.updateTip(editingTipId, payload)
        : await apiService.createTip(payload);

      if (res.success) {
        showToast(editingTipId ? 'Tip actualizado' : 'Tip creado', 'success');
        setShowTipForm(false);
        setEditingTipId(null);
        setTipForm(emptyTipForm);
        await fetchTips();
      } else {
        showToast(res.error || 'No pudimos guardar el tip', 'error');
      }
    } catch (err) {
      console.error('Error guardando tip:', err);
      showToast('No pudimos guardar el tip', 'error');
    } finally {
      setSavingTip(false);
    }
  };

  const handleDeleteTip = async (tip: Tip) => {
    if (!confirm(`¿Eliminar el tip "${tip.title}"? No se puede deshacer.`)) return;
    try {
      const res = await apiService.deleteTip(tip.id);
      if (res.success) {
        showToast('Tip eliminado', 'success');
        await fetchTips();
      } else {
        showToast(res.error || 'No pudimos eliminar el tip', 'error');
      }
    } catch (err) {
      console.error('Error eliminando tip:', err);
      showToast('No pudimos eliminar el tip', 'error');
    }
  };

  /** Acepta cualquier forma de link de YouTube y devuelve la URL de incrustado. */
  const tipVideoEmbed = (url?: string | null): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  };


  // Login de administrador con la identidad de marca
  if (isAuthenticated === false) {
    return (
      <main className="min-h-screen bg-cian flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-md w-full">
          {/* Salida clara hacia el sitio: quien llega aquí por error necesita
              una puerta de vuelta, no el botón de atrás del navegador. */}
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-tinta-suave hover:text-azul transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver al sitio
          </a>

          <div className="bg-white border border-borde rounded-[24px] p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-celeste rounded-2xl grid place-items-center mx-auto">
                {loginView === 'login' ? (
                  <ShieldCheck className="w-8 h-8 text-azul" />
                ) : (
                  <KeyRound className="w-8 h-8 text-azul" />
                )}
              </div>
              <p className="ens-eyebrow text-azul mt-5">Panel interno</p>
              <h1 className="mt-2 font-display text-2xl leading-tight text-tinta">
                {loginView === 'login' && 'Administración Ensueño'}
                {loginView === 'forgot' && 'Recupera tu acceso'}
                {loginView === 'reset' && 'Crea tu contraseña nueva'}
              </h1>
              <p className="mt-3 text-sm text-tinta-suave">
                {loginView === 'login' && 'Ingresa con tu cuenta autorizada para gestionar catálogo, envíos y tips.'}
                {loginView === 'forgot' && 'Escribe tu correo y te enviamos un código de 6 dígitos para volver a entrar.'}
                {loginView === 'reset' && 'Revisa tu correo, escribe el código que te llegó y elige una contraseña nueva.'}
              </p>
            </div>

            {loginError && (
              <p className="mt-6 bg-cian border border-secondary text-secondary text-sm font-bold p-3.5 rounded-2xl">
                {loginError}
              </p>
            )}

            {loginView === 'forgot' && (
              <form onSubmit={handleRequestRecoveryCode} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="admin-recovery-email" className="ens-eyebrow text-tinta-suave block mb-2">
                    Correo electrónico
                  </label>
                  <input
                    id="admin-recovery-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-cian border border-borde text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                  />
                </div>

                <button type="submit" disabled={recoveryBusy} className="ens-btn ens-btn--azul w-full disabled:opacity-50">
                  {recoveryBusy ? 'Enviando…' : 'Enviarme el código'}
                </button>

                <button
                  type="button"
                  onClick={() => goToLoginView('reset')}
                  className="w-full text-center text-xs font-bold text-tinta-suave hover:text-azul transition-colors"
                >
                  Ya tengo un código
                </button>
              </form>
            )}

            {loginView === 'reset' && (
              <form onSubmit={handleConfirmRecovery} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="admin-recovery-code" className="ens-eyebrow text-tinta-suave block mb-2">
                    Código de 6 dígitos
                  </label>
                  <input
                    id="admin-recovery-code"
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full h-12 px-4 rounded-2xl bg-cian border border-borde text-tinta text-center font-display text-xl tracking-[0.4em] placeholder:text-borde placeholder:tracking-[0.4em] focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                  />
                </div>

                <div>
                  <label htmlFor="admin-recovery-pass" className="ens-eyebrow text-tinta-suave block mb-2">
                    Contraseña nueva
                  </label>
                  <input
                    id="admin-recovery-pass"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-cian border border-borde text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1.5">Mínimo 6 caracteres.</p>
                </div>

                <div>
                  <label htmlFor="admin-recovery-confirm" className="ens-eyebrow text-tinta-suave block mb-2">
                    Confirma la contraseña
                  </label>
                  <input
                    id="admin-recovery-confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={recoveryConfirm}
                    onChange={(e) => setRecoveryConfirm(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-cian border border-borde text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                  />
                </div>

                <button type="submit" disabled={recoveryBusy} className="ens-btn ens-btn--azul w-full disabled:opacity-50">
                  {recoveryBusy ? 'Guardando…' : 'Guardar y entrar'}
                </button>
              </form>
            )}

            {loginView !== 'login' && (
              <button
                type="button"
                onClick={() => goToLoginView('login')}
                className="mt-5 w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold text-tinta-suave hover:text-azul transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </button>
            )}

            {loginView === 'login' && (
            <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="admin-email" className="ens-eyebrow text-tinta-suave block mb-2">
                  Correo electrónico
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-cian border border-borde text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="admin-pass" className="ens-eyebrow text-tinta-suave block mb-2">
                  Contraseña
                </label>
                <input
                  id="admin-pass"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-cian border border-borde text-tinta focus:outline-none focus:border-azul focus:ring-2 focus:ring-celeste transition-shadow"
                />
              </div>

              <button type="submit" className="ens-btn ens-btn--azul w-full">
                Entrar al panel
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail(loginEmail);
                  goToLoginView('forgot');
                }}
                className="w-full text-center text-sm font-bold text-azul hover:text-azul-hondo transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (loading || isAuthenticated === null) {
    return <div className="min-h-screen bg-cian py-20 text-center text-tinta-suave text-sm">Cargando Dashboard Admin Ensueño...</div>;
  }

  return (
    <div className="min-h-screen bg-cian text-tinta font-sans flex flex-col md:flex-row">
      {/* Left Sidebar Navigation (Desktop Collapsible & Mobile Drawer) */}
      <aside
        className={`w-full bg-white/95 border-b md:border-b-0 md:border-r border-borde  shrink-0 flex flex-col justify-between z-30 shadow-sm md:min-h-screen sticky top-0 md:h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72'
        }`}
      >
        <div className="p-4 sm:p-6 space-y-6">
          {/* Brand Logo & Mobile/Collapse Toggles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-cian text-azul rounded-2xl flex items-center justify-center font-bold shadow-sm border border-white shrink-0">
                <Baby className="w-5 h-5 text-azul" />
              </div>
              {!isSidebarCollapsed && (
                <div className="hidden md:block overflow-hidden transition-all duration-300">
                  <span className="font-extrabold text-base text-tinta block leading-tight truncate">
                    Panel Admin
                  </span>
                  <span className="text-[11px] text-azul font-semibold truncate">Ensueño Baby</span>
                </div>
              )}
              <div className="md:hidden">
                <span className="font-extrabold text-base text-tinta block leading-tight">Panel Admin</span>
                <span className="text-[11px] text-azul font-semibold">Ensueño Baby</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Desktop Collapse Toggle */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? 'Expandir Menú' : 'Colapsar Menú'}
                className="hidden md:flex p-2 rounded-xl bg-cian hover:bg-cian text-azul border border-borde transition-all shadow-sm"
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              {/* Mobile Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-tinta-suave hover:text-tinta"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className={`space-y-1.5 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-extrabold text-tinta-suave uppercase tracking-wider block px-3 mb-2 transition-all duration-300">
                Módulos de Gestión
              </span>
            )}

            {/* El menú se genera desde MODULES: antes eran siete bloques
                duplicados que se desincronizaban entre sí. */}
            {(modulosVisibles as readonly ModuleKey[]).map((key) => {
              const mod = MODULES[key];
              const isActive = activeTab === key;
              const count =
                key === 'products' ? products.length
                : key === 'tips' ? tipsList.length
                : key === 'shipping' ? shippingRates.length
                : key === 'crm' ? (data.customers?.length || 0)
                : key === 'team' ? adminsList.length
                : key === 'hero' ? heroSlides.length
                : key === 'metrics' ? 0
                // Solo lo que toca llamar hoy: el badge es una lista de tareas.
                : key === 'followup'
                  ? (followUps?.opinionPendiente?.length || 0) + (followUps?.recompraPendiente?.length || 0)
                : adminOrders.length;

              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                    setIsMobileMenuOpen(false);
                  }}
                  title={mod.title}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'
                  } py-3 rounded-2xl font-bold text-sm transition-colors ens-focus ${
                    isActive ? 'bg-azul text-white' : 'text-tinta-suave hover:bg-cian hover:text-tinta'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <mod.Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {!isSidebarCollapsed && <span className="truncate">{mod.nav}</span>}
                  </span>
                  {!isSidebarCollapsed && count > 0 && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                        isActive ? 'bg-white/25 text-white' : 'bg-cian text-tinta-suave'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className={`p-4 m-4 rounded-2xl bg-cian border border-borde space-y-3 hidden md:block transition-all duration-300 ${
          isSidebarCollapsed ? 'p-2 m-2 text-center' : ''
        }`}>
          <div className="flex items-center gap-2.5 justify-center md:justify-start">
            <UserCheck className="w-4 h-4 text-azul shrink-0" />
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <span className="font-extrabold text-tinta block text-xs truncate">admin@ensueno.com.co</span>
                <span className="text-[9px] text-azul font-bold uppercase tracking-wider">ADMIN MAESTRO</span>
              </div>
            )}
          </div>

          {/* Vuelta al sitio público, sin cerrar sesión. */}
          <a
            href="/"
            title="Ir al sitio web"
            className="bg-white hover:bg-cian text-azul border border-borde text-[11px] font-bold py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 w-full"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {!isSidebarCollapsed && <span>Ir al sitio</span>}
          </a>

          <div className={`flex items-center gap-2 pt-1 border-t border-borde ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Ajustes de Cuenta"
              className="flex-1 bg-white hover:bg-cian text-azul border border-borde text-[11px] font-bold py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm w-full"
            >
              <Settings className="w-3.5 h-3.5" />
              {!isSidebarCollapsed && <span>Ajustes</span>}
            </button>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="bg-white hover:bg-cian text-secondary border border-secondary text-[11px] font-bold py-1.5 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm w-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              {!isSidebarCollapsed && <span>Salir</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
        {/*
          Cabecera del módulo. Título, descripción y KPIs salen de MODULES, así
          que añadir un módulo no obliga a tocar tres cadenas ternarias.
        */}
        {(() => {
          const mod = MODULES[activeTab];
          const kpis = moduleKpis(activeTab);
          return (
            <header className="bg-celeste rounded-2xl p-6 sm:p-8 border border-borde">
              <p className="ens-eyebrow text-azul">{mod.eyebrow}</p>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl leading-tight text-tinta">
                {mod.title}
              </h1>
              <p className="mt-2 text-sm text-tinta-suave max-w-3xl">{mod.description}</p>

              {kpis.length > 0 && (
                <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/60">
                  {kpis.map((k) => (
                    <div key={k.label} className="bg-white rounded-2xl p-4 border border-borde">
                      <dt className="flex items-center justify-between text-xs font-bold text-tinta-suave">
                        <span>{k.label}</span>
                        <k.Icon className="w-4 h-4 text-azul shrink-0" aria-hidden="true" />
                      </dt>
                      <dd className="mt-2 font-display text-2xl text-tinta tabular-nums">{k.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </header>
          );
        })()}
        {/* Tab 0: Módulo de Verificación de Pedidos y Contabilidad */}
        {activeTab === 'orders' && (
          <div className={`${UI.card} space-y-6`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borde pb-4">
              <div>
                <h2 className="text-xl font-bold text-tinta flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-azul" /> Módulo de Verificación de Pedidos y Contabilidad
                </h2>
                <p className="text-xs text-tinta-suave mt-1">
                  Control, trazabilidad y cambio de estado de pedidos en tiempo real para la contabilidad del e-commerce.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadAdminOrders()}
                  className="bg-cian hover:bg-cian text-azul font-bold text-xs px-3.5 py-2 rounded-xl border border-borde transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Actualizar Datos
                </button>
              </div>
            </div>

            {/* Resumen Contable */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-cian rounded-2xl p-4 border border-borde">
              <div className="bg-white p-3 rounded-xl border border-borde shadow-sm">
                <span className="text-[10px] font-bold uppercase text-tinta-suave block">Total Recaudado Confirmado</span>
                <span className="text-lg font-black text-azul">
                  ${(orderMetrics.totalRevenue || 0).toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-borde shadow-sm">
                <span className="text-[10px] font-bold uppercase text-tinta-suave block">Órdenes Generadas</span>
                <span className="text-lg font-black text-tertiary">{orderMetrics.generatedCount || 0}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-borde shadow-sm">
                <span className="text-[10px] font-bold uppercase text-tinta-suave block">Pagos Aprobados</span>
                <span className="text-lg font-black text-azul">{orderMetrics.confirmedCount || 0}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-borde shadow-sm">
                <span className="text-[10px] font-bold uppercase text-tinta-suave block">Empacadas / En Camino</span>
                <span className="text-lg font-black text-azul">
                  {(orderMetrics.packedCount || 0) + (orderMetrics.shippedCount || 0)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-borde shadow-sm">
                <span className="text-[10px] font-bold uppercase text-tinta-suave block">Entregadas</span>
                <span className="text-lg font-black text-azul">{orderMetrics.deliveredCount || 0}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-borde shadow-sm">
                <span className="text-[10px] font-bold uppercase text-tinta-suave block">Sin Entregar / Devolución</span>
                <span className="text-lg font-black text-secondary">
                  {(orderMetrics.failedDeliveryCount || 0) + (orderMetrics.returnedCount || 0)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-borde shadow-sm">
                <span className="text-[10px] font-bold uppercase text-tinta-suave block">Anuladas</span>
                <span className="text-lg font-black text-tinta-suave">{orderMetrics.canceledCount || 0}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-borde shadow-sm">
                <span className="text-[10px] font-bold uppercase text-tinta-suave block">Total Registros</span>
                <span className="text-lg font-black text-tinta">{orderMetrics.totalOrders || 0}</span>
              </div>
            </div>

            {/* Calculos y Controles de Paginación Variable */}
            {(() => {
              const totalOrdersCount = adminOrders.length;
              const effectivePerPage = ordersPerPage === 'all' ? totalOrdersCount : Number(ordersPerPage);
              const totalPages = ordersPerPage === 'all' ? 1 : Math.ceil(totalOrdersCount / (effectivePerPage || 1)) || 1;
              const safeCurrentPage = Math.min(Math.max(1, ordersCurrentPage), totalPages);

              const startIndex = ordersPerPage === 'all' ? 0 : (safeCurrentPage - 1) * effectivePerPage;
              const endIndex = ordersPerPage === 'all' ? totalOrdersCount : startIndex + effectivePerPage;
              const paginatedOrders = adminOrders.slice(startIndex, endIndex);

              return (
                <>
                  {/* Barra de Filtros, Búsqueda y Paginación Variable */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-tinta-suave" />
                        <select
                          value={orderStatusFilter}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOrderStatusFilter(val);
                            setOrdersCurrentPage(1);
                            loadAdminOrders(val, orderSearchTerm);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-cian border border-borde text-xs font-semibold text-tinta focus:ring-2 focus:ring-celeste"
                        >
                          <option value="all">Ver Todos los Estados ({adminOrders.length})</option>
                          <option value="orden_generada">1. Orden Generada (Pendiente Pago)</option>
                          <option value="confirmado">2. Pago Aprobado</option>
                          <option value="empacada">3. Empacada</option>
                          <option value="en_camino">4. En Camino</option>
                          <option value="sin_poder_entregarse">5. Sin Poder Entregarse</option>
                          <option value="entregada">6. Entregada</option>
                          <option value="devolucion">7. Devolución</option>
                          <option value="anulada">8. Anulada</option>
                        </select>
                      </div>

                      {/* Selector de Paginación Variable */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-tinta-suave">Mostrar:</span>
                        <select
                          value={ordersPerPage}
                          onChange={(e) => {
                            const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                            setOrdersPerPage(val);
                            setOrdersCurrentPage(1);
                          }}
                          className="px-3 py-2 rounded-xl bg-cian border border-borde text-xs font-extrabold text-azul focus:ring-2 focus:ring-celeste cursor-pointer shadow-sm"
                        >
                          <option value={5}>5 reg / pág</option>
                          <option value={10}>10 reg / pág</option>
                          <option value={25}>25 reg / pág</option>
                          <option value={50}>50 reg / pág</option>
                          <option value={100}>100 reg / pág</option>
                          <option value="all">Ver Todos ({totalOrdersCount})</option>
                        </select>
                      </div>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <input
                        type="text"
                        placeholder="Buscar por Nº orden, cliente o ciudad..."
                        value={orderSearchTerm}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOrderSearchTerm(val);
                          setOrdersCurrentPage(1);
                          loadAdminOrders(orderStatusFilter, val);
                        }}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-cian border border-borde text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                      />
                      <Search className="w-4 h-4 text-tinta-suave absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {/* Tabla de Órdenes Paginada */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-borde text-tinta-suave font-bold uppercase bg-cian">
                          <th className="py-3 px-4">Nº Orden & Fecha</th>
                          <th className="py-3 px-4">Cliente / Contacto</th>
                          <th className="py-3 px-4">Destino & Dirección</th>
                          <th className="py-3 px-4">Productos & Total</th>
                          <th className="py-3 px-4">Pasarela MercadoPago</th>
                          <th className="py-3 px-4">Estado Contable / Logístico</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borde">
                        {paginatedOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-tinta-suave italic">
                              No se encontraron pedidos registrados con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          paginatedOrders.map((ord) => {
                            const dateStr = new Date(ord.createdAt).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <tr key={ord.id} className="hover:bg-cian transition-colors">
                                <td className="py-4 px-4 align-top">
                                  <span className="font-extrabold text-azul block font-mono text-sm">
                                    #{ord.orderNumber || ord.id.slice(-6)}
                                  </span>
                                  <span className="text-[11px] text-tinta-suave font-medium">{dateStr}</span>
                                </td>

                                <td className="py-4 px-4 align-top">
                                  <span className="font-bold text-tinta block">{ord.customerName}</span>
                                  <span className="text-[11px] text-tinta-suave block">{ord.customerEmail}</span>
                                  {ord.customerPhone && (
                                    <span className="text-[10px] text-tinta-suave block mt-0.5">Tel: {ord.customerPhone}</span>
                                  )}
                                </td>

                                <td className="py-4 px-4 align-top">
                                  <span className="font-semibold text-tinta block line-clamp-2">{ord.shippingAddress}</span>
                                  <span className="text-[11px] text-tinta-suave block">
                                    {ord.city}, {ord.department}
                                  </span>
                                </td>

                                <td className="py-4 px-4 align-top">
                                  <div className="space-y-1">
                                    {ord.items?.map((it: any) => (
                                      <div key={it.id} className="text-[11px] text-tinta-suave">
                                        <strong>{it.quantity}x</strong> {it.productName || it.product?.name}{' '}
                                        <span className="text-tinta-suave text-[10px]">
                                          (${it.unitPrice?.toLocaleString('es-CO')})
                                        </span>
                                      </div>
                                    ))}
                                    <div className="pt-1 border-t border-borde font-extrabold text-sm text-azul">
                                      Total: ${ord.total?.toLocaleString('es-CO')} COP
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-4 align-top">
                                  {ord.paymentStatus === 'approved' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-celeste text-azul border border-borde">
                                      <CheckCircle2 className="w-3 h-3" /> Aprobado MP
                                    </span>
                                  ) : ord.paymentStatus === 'rejected' || ord.paymentStatus === 'cancelled' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cian text-secondary border border-secondary">
                                      Rechazado MP
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amarillo text-tinta border border-borde">
                                      Pendiente Pago
                                    </span>
                                  )}
                                  {ord.paymentTransactionId && (
                                    <span className="text-[9px] text-tinta-suave block font-mono mt-1">
                                      ID: {ord.paymentTransactionId}
                                    </span>
                                  )}
                                </td>

                                <td className="py-4 px-4 align-top">
                                  <select
                                    value={ord.status}
                                    disabled={updatingOrderId === ord.id}
                                    onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                      ord.status === 'orden_generada'
                                        ? 'bg-amarillo text-tinta border-borde'
                                        : ord.status === 'confirmado'
                                        ? 'bg-celeste text-azul border-borde'
                                        : ord.status === 'empacada'
                                        ? 'bg-cian text-azul border-borde'
                                        : ord.status === 'en_camino'
                                        ? 'bg-celeste text-azul border-borde'
                                        : ord.status === 'sin_poder_entregarse'
                                        ? 'bg-orange-50 text-orange-800 border-orange-300'
                                        : ord.status === 'entregada'
                                        ? 'bg-teal-50 text-teal-800 border-teal-300'
                                        : ord.status === 'devolucion'
                                        ? 'bg-cian text-secondary border-secondary'
                                        : 'bg-cian text-tinta-suave border-borde'
                                    }`}
                                  >
                                    <option value="orden_generada">1. Orden Generada</option>
                                    <option value="confirmado">2. Pago Aprobado</option>
                                    <option value="empacada">3. Empacada</option>
                                    <option value="en_camino">4. En Camino</option>
                                    <option value="sin_poder_entregarse">5. Sin Poder Entregarse</option>
                                    <option value="entregada">6. Entregada</option>
                                    <option value="devolucion">7. Devolución</option>
                                    {/* Anular saca el pedido de los ingresos y no
                                        tiene vuelta: solo administración. Si el
                                        pedido YA está anulado se deja la opción,
                                        porque si no el <select> mostraría un valor
                                        que no está en su lista y quedaría en
                                        blanco. La barrera real está en el PUT. */}
                                    {(puedeAsignarEstado(rol, 'anulada') || ord.status === 'anulada') && (
                                      <option value="anulada" disabled={!puedeAsignarEstado(rol, 'anulada')}>
                                        8. Anulada
                                      </option>
                                    )}
                                  </select>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pie de Página con Controles de Paginación */}
                  {totalOrdersCount > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-borde text-xs">
                      <span className="text-tinta-suave font-medium">
                        Mostrando{' '}
                        <strong className="text-tinta font-bold">
                          {totalOrdersCount === 0 ? 0 : startIndex + 1}
                        </strong>{' '}
                        a{' '}
                        <strong className="text-tinta font-bold">
                          {Math.min(endIndex, totalOrdersCount)}
                        </strong>{' '}
                        de <strong className="text-azul font-extrabold">{totalOrdersCount}</strong> órdenes
                      </span>

                      {ordersPerPage !== 'all' && totalPages > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                          <button
                            disabled={safeCurrentPage <= 1}
                            onClick={() => setOrdersCurrentPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-xl border border-borde bg-white hover:bg-cian text-tinta-suave font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            Anterior
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              onClick={() => setOrdersCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-xl font-extrabold text-xs transition-all shrink-0 ${
                                safeCurrentPage === pageNum
                                  ? 'bg-azul text-white shadow-sm'
                                  : 'bg-white text-tinta-suave border border-borde hover:bg-cian'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}

                          <button
                            disabled={safeCurrentPage >= totalPages}
                            onClick={() => setOrdersCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="px-3 py-1.5 rounded-xl border border-borde bg-white hover:bg-cian text-tinta-suave font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            Siguiente
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Tab 1: CRM Clientes */}
        {activeTab === 'crm' && (
          <div className={`${UI.card} space-y-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-tinta flex items-center gap-2">
                  <Users className="w-6 h-6 text-azul" /> Base de Datos Mamás y Bebés ({data.customers?.length || 0})
                </h2>
                <p className="text-xs text-tinta-suave mt-1">
                  Clientes y perfiles registrados en la base de datos real con puntos acumulados e historial.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadRemarketingData}
                  title="Actualizar datos de clientes"
                  className="p-2 rounded-xl bg-cian hover:bg-cian text-azul border border-borde transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email, ciudad o bebé..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-cian border border-borde text-xs w-64 text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                  <Search className="w-4 h-4 text-tinta-suave absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            {/* Distribución por etapa. Antes era una pestaña propia con solo
                cuatro números; vive mejor junto a la base de clientes. */}
            <div>
              <h3 className="text-sm font-bold text-tinta-suave mb-3">
                Bebés por etapa de crecimiento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-5 rounded-2xl bg-cian border border-borde shadow-sm space-y-1">
                  <h3 className="font-extrabold text-secondary text-sm">Embarazo / Prenatal</h3>
                  <span className="text-3xl font-black text-secondary block">
                    {data.babyCohorts?.summary?.embarazo || 0}
                  </span>
                  <p className="text-[11px] font-medium text-secondary">Bebés en camino registrados por las mamás.</p>
                </div>

                <div className="p-5 rounded-2xl bg-cian border border-borde shadow-sm space-y-1">
                  <h3 className="font-extrabold text-azul text-sm">Recién Nacidos (0 - 3m)</h3>
                  <span className="text-3xl font-black text-azul block">
                    {data.babyCohorts?.summary?.recienNacido || 0}
                  </span>
                  <p className="text-[11px] font-medium text-azul">Etapa de máxima cuidado y piel delicada.</p>
                </div>

                <div className="p-5 rounded-2xl bg-amarillo border border-borde shadow-sm space-y-1">
                  <h3 className="font-extrabold text-tinta text-sm">Lactantes (3 - 12m)</h3>
                  <span className="text-3xl font-black text-tinta block">
                    {(data.babyCohorts?.summary?.lactanteMenor || 0) + (data.babyCohorts?.summary?.lactanteMayor || 0)}
                  </span>
                  <p className="text-[11px] font-medium text-tinta">Etapa de rutina de baño y sueño dulce.</p>
                </div>

                <div className="p-5 rounded-2xl bg-celeste border border-borde shadow-sm space-y-1">
                  <h3 className="font-extrabold text-azul text-sm">Toddler / Mayores (12m+)</h3>
                  <span className="text-3xl font-black text-azul block">
                    {data.babyCohorts?.summary?.toddler || 0}
                  </span>
                  <p className="text-[11px] font-medium text-azul">Niños exploradores e hidratación diaria.</p>
                </div>

              {/* Los que no tienen fecha: antes se contaban como recién nacidos y
                  falseaban el reparto. Ahora quedan visibles como dato pendiente. */}
              {(data.babyCohorts?.summary?.sinFecha || 0) > 0 && (
                <div className="p-5 rounded-2xl bg-amarillo border border-borde space-y-1">
                  <h3 className="font-extrabold text-tinta text-sm">Sin fecha registrada</h3>
                  <span className="text-3xl font-black text-tinta block">
                    {data.babyCohorts?.summary?.sinFecha || 0}
                  </span>
                  <p className="text-[11px] font-medium text-tinta-suave">Pídeles la fecha para clasificarlos.</p>
                </div>
              )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borde text-tinta-suave font-bold uppercase bg-cian">
                    <th className="py-3 px-4">Mamá (Cliente)</th>
                    <th className="py-3 px-4">Contacto & Ubicación</th>
                    <th className="py-3 px-4">Bebé & Piel</th>
                    <th className="py-3 px-4">Órdenes & Puntos</th>
                    <th className="py-3 px-4 text-right">Acción Remarketing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {(!data.customers || data.customers.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-tinta-suave italic">
                        No se encontraron clientes registrados en la base de datos.
                      </td>
                    </tr>
                  ) : (
                    data.customers
                      .filter((c: any) => {
                        if (!searchTerm) return true;
                        const s = searchTerm.toLowerCase();
                        const prof = c.profile || c.motherProfile;
                        const fullName = (c.fullName || prof?.fullName || '').toLowerCase();
                        const email = (c.email || '').toLowerCase();
                        const phone = (c.phone || prof?.phone || '').toLowerCase();
                        const city = (c.city || prof?.city || '').toLowerCase();
                        const babyName = (c.babies?.[0]?.babyName || prof?.babies?.[0]?.babyName || '').toLowerCase();
                        return (
                          fullName.includes(s) ||
                          email.includes(s) ||
                          phone.includes(s) ||
                          city.includes(s) ||
                          babyName.includes(s)
                        );
                      })
                      .map((customer: any) => {
                        const prof = customer.profile || customer.motherProfile;
                        const motherName = customer.fullName || prof?.fullName || customer.email.split('@')[0];
                        const phone = customer.phone || prof?.phone || 'Sin teléfono';
                        const location =
                          [customer.city || prof?.city, customer.department || prof?.department]
                            .filter(Boolean)
                            .join(', ') || 'No especificada';
                        const babies = customer.babies || prof?.babies || [];
                        const baby = babies[0];
                        const babyName = baby?.babyName || 'Bebé';
                        const skin = baby?.skinCondition || 'Normal';
                        const hasBaby = (customer.hasBaby ?? prof?.hasBaby) !== false && babies.length > 0;
                        const babyAge = babyAgeLabel(baby?.birthDate);
                        const approvedOrders = (customer.orders || []).filter(
                          (o: any) =>
                            o.paymentStatus === 'approved' ||
                            (o.status && o.status !== 'orden_generada' && o.status !== 'anulada')
                        );
                        const approvedCount = approvedOrders.length;
                        const totalSpentApproved = approvedOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
                        const loyaltyPointsApproved = Math.floor(totalSpentApproved / 1000);

                        return (
                          <tr key={customer.id} className="hover:bg-cian transition-colors">
                            <td className="py-4 px-4 align-top font-bold text-tinta">
                              {motherName}
                              <div className="text-[11px] font-normal text-tinta-suave">
                                Reg: {new Date(customer.createdAt).toLocaleDateString('es-CO')}
                              </div>
                            </td>

                            <td className="py-4 px-4 align-top text-tinta-suave">
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <Mail className="w-3.5 h-3.5 text-azul shrink-0" /> {customer.email}
                              </div>
                              {phone !== 'Sin teléfono' && (
                                <div className="text-[11px] text-tinta-suave mt-0.5 font-mono">Tel: {phone}</div>
                              )}
                              <div className="text-[10px] text-tinta-suave mt-0.5">{location}</div>
                            </td>

                            <td className="py-4 px-4 align-top">
                              {hasBaby ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-cian text-secondary border border-borde">
                                    <Baby className="w-3.5 h-3.5" /> {babyName}
                                  </span>
                                  <span className="text-[11px] font-medium text-tinta-suave block mt-1">
                                    {babyAge}
                                  </span>
                                  <span className="text-[11px] font-medium text-tinta-suave block">
                                    Piel: <strong className="text-azul">{skin}</strong>
                                  </span>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-cian text-tinta-suave border border-borde">
                                  Sin bebé registrado
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4 align-top">
                              <span className="font-extrabold text-tinta block text-xs">
                                {approvedCount} orden(es) aprobadas
                              </span>
                              <span className="text-[11px] text-azul font-bold block">
                                ${totalSpentApproved.toLocaleString('es-CO')} COP
                              </span>
                              <span className="text-[10px] text-tertiary font-bold block mt-0.5">
                                ⭐ {loyaltyPointsApproved} pts
                              </span>
                            </td>

                            <td className="py-4 px-4 align-top text-right">
                              <button
                                onClick={() =>
                                  handleSendReminder(
                                    customer.email,
                                    motherName,
                                    babyName,
                                    'Mantequilla Corporal Ensueño'
                                  )
                                }
                                className="inline-flex items-center gap-1.5 bg-azul hover:bg-azul-hondo text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all"
                              >
                                <Send className="w-3.5 h-3.5" /> Recordatorio Recompra
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Envíos */}
        {activeTab === 'shipping' && (
          <div className="space-y-8">
            {/* Asignación por Departamento Completo usando índice numérico */}
            <div className="bg-cian rounded-3xl p-6 text-tinta border border-borde shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-azul" />
                <h2 className="text-lg font-extrabold text-tinta">Asignación Rápida por Departamento Completo</h2>
              </div>
              <p className="text-xs text-tinta-suave">
                Selecciona un departamento de Colombia e ingresa la tarifa plana para aplicarla con un solo clic a todos sus municipios.
              </p>

              <form onSubmit={handleApplyDepartmentFlatRate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-tinta-suave uppercase mb-1">Departamento</label>
                  <select
                    value={deptFlatIndex}
                    onChange={(e) => setDeptFlatIndex(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-borde text-tinta text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-celeste"
                  >
                    {COLOMBIA_LOCATION_DATA.map((d, index) => (
                      <option key={d.name} value={index}>
                        {d.name} ({d.cities.length} municipios)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-tinta-suave uppercase mb-1">Tarifa Envío (COP)</label>
                  <input
                    type="number"
                    required
                    value={deptFlatRate}
                    onChange={(e) => setDeptFlatRate(e.target.value)}
                    placeholder="Ej: 8000"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-borde text-tinta text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-tinta-suave uppercase mb-1">Tiempo Estimado</label>
                  <select
                    value={deptFlatDays}
                    onChange={(e) => setDeptFlatDays(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-borde text-tinta text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-celeste"
                  >
                    <option value="1-2 días hábiles">1-2 días hábiles</option>
                    <option value="2-3 días hábiles">2-3 días hábiles</option>
                    <option value="3-5 días hábiles">3-5 días hábiles</option>
                    <option value="5-7 días hábiles">5-7 días hábiles</option>
                    <option value="7-10 días hábiles">7-10 días hábiles</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-azul hover:bg-azul-hondo text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide"
                  >
                    <Layers className="w-4 h-4" /> Aplicar a Departamento
                  </button>
                </div>
              </form>
            </div>

            {/* Selector por Municipio Específico */}
            <div className={`${UI.card} space-y-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borde pb-4">
                <div>
                  <h2 className="text-xl font-bold text-tinta flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-azul" /> Tarifas Configuradas por Municipio ({shippingRates.length})
                  </h2>
                  <p className="text-xs text-tinta-suave mt-1">Guarda o modifica el valor del envío para cualquier municipio de Colombia.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Department filter */}
                  <div className="relative">
                    <select
                      value={deptFilter}
                      onChange={(e) => { setDeptFilter(e.target.value); setSelectedRateIds(new Set()); }}
                      className="pl-7 pr-3 py-1.5 rounded-xl bg-cian border border-borde text-xs w-44 font-semibold text-tinta-suave focus:outline-none focus:ring-2 focus:ring-celeste appearance-none"
                    >
                      <option value="all">Todos los departamentos</option>
                      {uniqueDepartments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <Filter className="w-3.5 h-3.5 text-tinta-suave absolute left-2 top-2.5 pointer-events-none" />
                  </div>
                  {/* Text search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar ciudad..."
                      value={rateSearchTerm}
                      onChange={(e) => setRateSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-cian border border-borde text-xs w-40 focus:outline-none focus:ring-2 focus:ring-celeste"
                    />
                    <Search className="w-3.5 h-3.5 text-tinta-suave absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    onClick={loadProductsAndShipping}
                    className="p-2 rounded-xl border border-borde hover:bg-cian text-tinta-suave"
                    title="Recargar Tarifas"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bulk delete bar */}
              {selectedRateIds.size > 0 && (
                <div className="flex items-center justify-between bg-cian border border-secondary rounded-2xl px-4 py-3">
                  <span className="text-xs font-bold text-secondary">
                    {selectedRateIds.size} tarifa{selectedRateIds.size > 1 ? 's' : ''} seleccionada{selectedRateIds.size > 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedRateIds(new Set())}
                      className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-lg border border-borde bg-white"
                    >
                      Deseleccionar
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="text-xs font-bold text-white bg-secondary hover:bg-secondary/90 px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar Seleccionadas
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleAddSingleCityRate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-cian p-4 rounded-2xl border border-borde">
                <div>
                  <label className="block text-xs font-bold text-tinta-suave uppercase mb-1">1. Departamento</label>
                  <select
                    value={selectedDeptIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value);
                      setSelectedDeptIndex(idx);
                      setSelectedCityName(COLOMBIA_LOCATION_DATA[idx].cities[0]);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-borde text-xs font-semibold text-tinta bg-white"
                  >
                    {COLOMBIA_LOCATION_DATA.map((d, index) => (
                      <option key={d.name} value={index}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-suave uppercase mb-1">2. Municipio / Ciudad</label>
                  <select
                    value={selectedCityName}
                    onChange={(e) => setSelectedCityName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-borde text-xs font-semibold text-tinta bg-white"
                  >
                    {COLOMBIA_LOCATION_DATA[selectedDeptIndex].cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-suave uppercase mb-1">3. Costo Envío (COP)</label>
                  <input
                    type="number"
                    required
                    value={singleCityRate}
                    onChange={(e) => setSingleCityRate(e.target.value)}
                    placeholder="Ej: 7000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-borde text-xs font-semibold text-tinta bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-suave uppercase mb-1">4. Tiempo Estimado</label>
                  <select
                    value={singleCityDays}
                    onChange={(e) => setSingleCityDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-borde text-xs font-semibold text-tinta bg-white"
                  >
                    <option value="1-2 días hábiles">1-2 días hábiles</option>
                    <option value="2-3 días hábiles">2-3 días hábiles</option>
                    <option value="3-5 días hábiles">3-5 días hábiles</option>
                    <option value="5-7 días hábiles">5-7 días hábiles</option>
                    <option value="7-10 días hábiles">7-10 días hábiles</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-azul hover:bg-azul-hondo text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Guardar
                  </button>
                </div>
              </form>

              {/* Tabla de Tarifas Registradas */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-borde text-tinta-suave font-bold uppercase bg-cian">
                      <th className="py-3 px-3 w-10">
                        <button
                          onClick={() => {
                            if (allFilteredSelected) {
                              setSelectedRateIds(new Set());
                            } else {
                              setSelectedRateIds(new Set(filteredRates.map((r) => r.id)));
                            }
                          }}
                          className="text-azul hover:text-azul transition-colors"
                          title={allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        >
                          {allFilteredSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button onClick={() => handleToggleSort('department')} className="flex items-center gap-1 hover:text-azul transition-colors">
                          Departamento
                          {sortColumn === 'department' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button onClick={() => handleToggleSort('city')} className="flex items-center gap-1 hover:text-azul transition-colors">
                          Municipio / Ciudad
                          {sortColumn === 'city' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button onClick={() => handleToggleSort('cost')} className="flex items-center gap-1 hover:text-azul transition-colors">
                          Costo de Envío
                          {sortColumn === 'cost' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                        </button>
                      </th>
                      <th className="py-3 px-4">Tiempo Estimado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borde">
                    {filteredRates.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-tinta-suave text-xs italic">
                          No hay tarifas específicas cargadas. Agrega una arriba o haz clic en &quot;Aplicar a Todo el Departamento&quot;.
                        </td>
                      </tr>
                    ) : (
                      filteredRates.map((rate) => (
                        <tr
                          key={rate.id}
                          className={`transition-colors ${
                            selectedRateIds.has(rate.id) ? 'bg-cian' : editingRateId === rate.id ? 'bg-amarillo' : 'hover:bg-cian'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <button
                              onClick={() => toggleRateSelection(rate.id)}
                              className="text-azul hover:text-azul transition-colors"
                            >
                              {selectedRateIds.has(rate.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-bold text-tinta">{rate.department}</td>
                          <td className="py-3 px-4 text-tinta-suave font-semibold">{rate.city}</td>
                          <td className="py-2 px-4">
                            {editingRateId === rate.id ? (
                              <input
                                type="number"
                                value={editCost}
                                onChange={(e) => setEditCost(e.target.value)}
                                className="w-24 px-2 py-1.5 rounded-lg border border-borde bg-white text-xs font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                                autoFocus
                              />
                            ) : (
                              <span className="font-black text-azul">${rate.cost?.toLocaleString('es-CO')} COP</span>
                            )}
                          </td>
                          <td className="py-2 px-4">
                            {editingRateId === rate.id ? (
                              <select
                                value={editDays}
                                onChange={(e) => setEditDays(e.target.value)}
                                className="w-36 px-2 py-1.5 rounded-lg border border-borde bg-white text-xs font-semibold text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                              >
                                <option value="1-2 días hábiles">1-2 días hábiles</option>
                                <option value="2-3 días hábiles">2-3 días hábiles</option>
                                <option value="3-5 días hábiles">3-5 días hábiles</option>
                                <option value="5-7 días hábiles">5-7 días hábiles</option>
                                <option value="7-10 días hábiles">7-10 días hábiles</option>
                              </select>
                            ) : (
                              <span className="text-tinta-suave">{rate.estimatedDays}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {editingRateId === rate.id ? (
                                <>
                                  <button
                                    onClick={() => handleInlineEditSave(rate)}
                                    className="text-azul hover:text-azul p-1 transition-colors"
                                    title="Guardar cambios"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingRateId(null)}
                                    className="text-tinta-suave hover:text-tinta-suave p-1 transition-colors"
                                    title="Cancelar edición"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingRateId(rate.id);
                                      setEditCost(String(rate.cost || 0));
                                      setEditDays(rate.estimatedDays || '2-3 días hábiles');
                                    }}
                                    className="text-tertiary hover:text-tinta p-1 transition-colors"
                                    title="Editar tarifa"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRate(rate.id, rate.city)}
                                    className="text-tinta-suave hover:text-secondary p-1 transition-colors"
                                    title="Eliminar tarifa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary footer */}
              {filteredRates.length > 0 && (
                <div className="flex items-center justify-between text-[11px] text-tinta-suave pt-2 border-t border-borde">
                  <span>Mostrando {filteredRates.length} de {shippingRates.length} tarifas{deptFilter !== 'all' ? ` en ${deptFilter}` : ''}</span>
                  <span>Ordenado por {sortColumn === 'department' ? 'Departamento' : sortColumn === 'city' ? 'Ciudad' : 'Costo'} ({sortDirection === 'asc' ? 'A→Z' : 'Z→A'})</span>
                </div>
              )}
            </div>

            {/* Reglas Globales */}
            <div className={`${UI.card} space-y-6`}>
              <h2 className="text-xl font-bold text-tinta flex items-center gap-2">
                <Truck className="w-5 h-5 text-azul" /> Umbral para Envío Gratis y Descuentos
              </h2>

              <form onSubmit={handleSaveShippingConfig} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-tinta-suave uppercase mb-2">
                    Monto Pedido para Envío Gratis (COP)
                  </label>
                  <input
                    type="number"
                    value={shippingConfig.freeShippingThreshold}
                    onChange={(e) =>
                      setShippingConfig({ ...shippingConfig, freeShippingThreshold: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-cian border border-borde text-sm font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-suave uppercase mb-2">
                    Tarifa Base Nacional Estándar (COP)
                  </label>
                  <input
                    type="number"
                    value={shippingConfig.defaultRate}
                    onChange={(e) =>
                      setShippingConfig({ ...shippingConfig, defaultRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-cian border border-borde text-sm font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-suave uppercase mb-2">
                    Mínimo Productos Descuento Cantidad
                  </label>
                  <input
                    type="number"
                    value={shippingConfig.qtyDiscountThreshold}
                    onChange={(e) =>
                      setShippingConfig({ ...shippingConfig, qtyDiscountThreshold: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-cian border border-borde text-sm font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta-suave uppercase mb-2">
                    Descuento Envío por Cantidad (COP)
                  </label>
                  <input
                    type="number"
                    value={shippingConfig.qtyDiscountAmount}
                    onChange={(e) =>
                      setShippingConfig({ ...shippingConfig, qtyDiscountAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-cian border border-borde text-sm font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    className="bg-azul hover:bg-azul-hondo text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Guardar Reglas Globales
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Cohortes por Edad */}

        {/* Tab 4: Administración de Productos & Promociones de la Página Principal */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Sub-Tab Navigation Bar */}
            <div className="bg-white rounded-2xl p-2 border border-borde shadow-sm flex items-center gap-2">
              <button
                onClick={() => setAdminProductSubTab('catalog')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  adminProductSubTab === 'catalog'
                    ? 'bg-azul text-white shadow-md'
                    : 'bg-cian text-tinta-suave hover:bg-cian'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>🛍️ Catálogo de Productos ({products.length})</span>
              </button>

              <button
                onClick={() => setAdminProductSubTab('promotions')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  adminProductSubTab === 'promotions'
                    ? 'bg-tertiary text-white shadow-md'
                    : 'bg-cian text-tinta-suave hover:bg-cian'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>🎁 Promociones y Combos de Sueño ({promotionsList.length})</span>
              </button>
            </div>

            {/* SUBTAB 1: CATÁLOGO DE PRODUCTOS */}
            {adminProductSubTab === 'catalog' && (
              <div className="space-y-6">
                {/* Header Metrics & Main Action */}
                <div className={`${UI.card} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                  <div>
                    <span className="text-[11px] font-black uppercase text-azul tracking-wider bg-cian px-3 py-1 rounded-full border border-borde">
                      Gestión del Catálogo E-Commerce
                    </span>
                    <h2 className="text-2xl font-black text-tinta mt-1">Administración de Productos</h2>
                    <p className="text-xs font-semibold text-tinta-suave">
                      Crea y edita productos para la 2da sección de la página principal y la página de detalle.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenCreateProduct}
                    className="btn-ensueno-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:scale-105 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Nuevo Producto</span>
                  </button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-borde shadow-sm space-y-1">
                    <span className="text-xs font-bold text-tinta-suave uppercase">Total en Catálogo</span>
                    <span className="text-2xl font-black text-tinta block">{products.length} productos</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-cian border border-borde shadow-sm space-y-1">
                    <span className="text-xs font-bold text-tinta uppercase">⭐ En 2da Sección Inicio</span>
                    <span className="text-2xl font-black text-tinta block">
                      {products.filter((p) => p.isFeatured !== false).length} destacados
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-cian border border-borde shadow-sm space-y-1">
                    <span className="text-xs font-bold text-secondary uppercase">🔥 En Oferta / Promoción</span>
                    <span className="text-2xl font-black text-secondary block">
                      {products.filter((p) => p.originalPrice && p.originalPrice > p.price).length} promociones
                    </span>
                  </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-white rounded-2xl p-4 border border-borde shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setProductFilter('all')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        productFilter === 'all'
                          ? 'bg-azul text-white shadow-sm'
                          : 'bg-cian text-tinta-suave hover:bg-cian'
                      }`}
                    >
                      Todos ({products.length})
                    </button>
                    <button
                      onClick={() => setProductFilter('featured')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                        productFilter === 'featured'
                          ? 'bg-tertiary text-white shadow-sm'
                          : 'bg-cian text-tinta-suave hover:bg-cian'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" /> 2da Sección Inicio
                    </button>
                    <button
                      onClick={() => setProductFilter('promo')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        productFilter === 'promo'
                          ? 'bg-secondary text-white shadow-sm'
                          : 'bg-cian text-tinta-suave hover:bg-cian'
                      }`}
                    >
                      En Oferta
                    </button>

                    {/* Los retirados no se borran de la base: viven aquí hasta
                        que alguien los devuelva a la tienda. */}
                    {(archivedProducts.length > 0 || productFilter === 'archived') && (
                      <button
                        onClick={() => setProductFilter('archived')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                          productFilter === 'archived'
                            ? 'bg-tinta text-white shadow-sm'
                            : 'bg-cian text-tinta-suave hover:bg-cian'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Retirados ({archivedProducts.length})
                      </button>
                    )}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-tinta-suave absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Buscar producto..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-cian border border-borde text-xs text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-celeste"
                    />
                  </div>
                </div>

                {/* Products Grid */}
                {productosVisibles.length === 0 ? (
                  <div className={`${UI.card} text-center py-12`}>
                    <p className="text-sm font-bold text-tinta">
                      {productFilter === 'archived'
                        ? 'No hay productos retirados.'
                        : 'Ningún producto coincide con este filtro.'}
                    </p>
                    <p className="text-xs font-semibold text-tinta-suave mt-1">
                      {productFilter === 'archived'
                        ? 'Lo que retires de la tienda aparecerá aquí para poder devolverlo.'
                        : 'Prueba con otra búsqueda o vuelve a "Todos".'}
                    </p>
                    {productFilter !== 'all' && (
                      <button
                        onClick={() => setProductFilter('all')}
                        className={`${UI.btnGhost} mt-4`}
                      >
                        Ver todo el catálogo
                      </button>
                    )}
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {productosVisibles
                    .map((product) => {
                      const hasPromo = product.originalPrice && product.originalPrice > product.price;
                      const isFeatured = product.isFeatured !== false;
                      const estaRetirado = Boolean(product.archivedAt);

                      return (
                        <div
                          key={product.id}
                          className={`border rounded-3xl p-5 bg-white space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative ${
                            estaRetirado
                              ? 'border-borde opacity-90'
                              : isFeatured
                              ? 'border-borde ring-2 ring-celeste'
                              : 'border-borde'
                          }`}
                        >
                          {/* Featured Badge */}
                          <div className="flex items-center justify-between gap-2">
                            {estaRetirado ? (
                              <span className="bg-tinta text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Retirado de la tienda
                              </span>
                            ) : isFeatured ? (
                              <span className="bg-amarillo text-tinta border border-borde text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amarillo text-tertiary" /> 2da Sección Inicio
                              </span>
                            ) : (
                              <span className="bg-cian text-tinta-suave text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                Solo en Catálogo
                              </span>
                            )}

                            {hasPromo && (
                              <span className="bg-cian text-secondary border border-secondary text-[10px] font-black px-2 py-0.5 rounded-full">
                                🔥 En Promoción
                              </span>
                            )}
                          </div>

                          {/* Image Preview */}
                          <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-cian border border-borde">
                            <img
                              src={product.image}
                              alt={product.name}
                              className={`w-full h-full object-cover ${estaRetirado ? 'grayscale' : ''}`}
                            />
                            {product.badge && (
                              <span className="absolute top-2.5 left-2.5 bg-azul text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                                {product.badge}
                              </span>
                            )}
                          </div>

                          {/* Content Info */}
                          <div className="space-y-1.5 flex-grow">
                            <h3 className="font-extrabold text-tinta text-base leading-snug">{product.name}</h3>
                            <p className="text-xs font-semibold text-tinta-suave line-clamp-2">{product.subtitle}</p>

                            {/* Price Display */}
                            <div className="pt-2 flex items-baseline gap-2">
                              <span className="text-base font-black text-azul">
                                ${product.price?.toLocaleString('es-CO')} COP
                              </span>
                              {hasPromo && (
                                <span className="text-xs text-tinta-suave line-through font-bold">
                                  ${product.originalPrice?.toLocaleString('es-CO')} COP
                                </span>
                              )}
                            </div>

                            {/* Badges Summary */}
                            <div className="pt-2 flex flex-wrap gap-1">
                              {product.fragrances?.length > 0 && (
                                <span className="bg-cian text-tinta-suave text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  🌸 {product.fragrances.length} Aromas
                                </span>
                              )}
                              {product.sizes?.length > 0 && (
                                <span className="bg-cian text-tinta-suave text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  📐 {product.sizes.length} Tallas
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="pt-3 border-t border-borde space-y-2">
                            {estaRetirado ? (
                              /* Un producto fuera de la tienda solo admite una
                                 decisión: devolverlo. Destacarlo o editarlo sin
                                 que nadie pueda verlo no lleva a ningún lado. */
                              <button
                                onClick={() => handleRestoreProduct(product.id, product.name)}
                                className="w-full bg-azul hover:bg-azul-hondo text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Devolver a la tienda
                              </button>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleOpenEditProduct(product)}
                                    className="w-full bg-cian hover:bg-cian text-azul text-xs font-bold py-2 rounded-xl border border-borde transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Editar Todo
                                  </button>

                                  <button
                                    onClick={() => handleToggleFeaturedProduct(product)}
                                    className={`w-full text-xs font-bold py-2 rounded-xl border transition-colors flex items-center justify-center gap-1 ${
                                      isFeatured
                                        ? 'bg-amarillo hover:bg-amarillo text-tinta border-borde'
                                        : 'bg-cian hover:bg-cian text-tinta-suave border-borde'
                                    }`}
                                    title="Alternar presencia en 2da sección de la página principal"
                                  >
                                    <Star className={`w-3.5 h-3.5 ${isFeatured ? 'fill-amarillo text-tertiary' : ''}`} />
                                    {isFeatured ? 'En Inicio' : '+ A Inicio'}
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleDeleteProduct(product.id, product.name)}
                                  className="w-full text-secondary hover:text-secondary hover:bg-cian text-[11px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Retirar de la tienda
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                )}
              </div>
            )}

            {/* SUBTAB 2: PROMOCIONES Y COMBOS DE SUEÑO (SECCIÓN 3 PÁGINA PRINCIPAL) */}
            {adminProductSubTab === 'promotions' && (
              <div className="space-y-6">
                {/* Header Metrics & Main Action */}
                <div className={`${UI.card} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                  <div>
                    <span className="text-[11px] font-black uppercase text-tinta tracking-wider bg-amarillo px-3 py-1 rounded-full border border-borde">
                      Sección 3 de la Página Principal
                    </span>
                    <h2 className="text-2xl font-black text-tinta mt-1">Promociones y Combos de Sueño</h2>
                    <p className="text-xs font-semibold text-tinta-suave">
                      Modifica, elimina o agrega ofertas especiales, imágenes o videos promocionales para la tienda.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenCreatePromo}
                    className="px-5 py-2.5 rounded-xl bg-tertiary hover:bg-tertiary text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:scale-105 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Nueva Promoción / Combo</span>
                  </button>
                </div>

                {/* Promos Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {promotionsList.map((promo: any) => {
                    const hasVideo = Boolean(promo.videoUrl);
                    const isYouTube = promo.videoUrl?.includes('youtube.com') || promo.videoUrl?.includes('youtu.be');

                    return (
                      <div
                        key={promo.id}
                        className={`border rounded-3xl p-5 bg-white space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative ${
                          promo.isActive !== false ? 'border-borde ring-2 ring-celeste' : 'border-borde opacity-80'
                        }`}
                      >
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="bg-amarillo text-tinta border border-borde text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            {promo.badge || 'OFERTA ESPECIAL ⭐'}
                          </span>

                          <button
                            onClick={() => handleTogglePromoActive(promo)}
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border transition-all ${
                              promo.isActive !== false
                                ? 'bg-celeste text-azul border-borde'
                                : 'bg-cian text-tinta-suave border-borde'
                            }`}
                          >
                            {promo.isActive !== false ? '● ACTIVA EN INICIO' : '○ INACTIVA'}
                          </button>
                        </div>

                        {/* Media Preview: Video o Imagen */}
                        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-tinta/70 border border-borde">
                          {hasVideo ? (
                            isYouTube ? (
                              <iframe
                                src={promo.videoUrl?.replace('watch?v=', 'embed/')}
                                title={promo.title}
                                className="w-full h-full border-0 pointer-events-none"
                              />
                            ) : (
                              <video src={promo.videoUrl} className="w-full h-full object-cover" />
                            )
                          ) : promo.imageUrl ? (
                            <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-tinta-suave text-xs font-bold bg-cian">
                              Sin Imagen/Video
                            </div>
                          )}

                          {hasVideo && (
                            <span className="absolute bottom-2 right-2 bg-tinta/70 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-borde">
                              🎬 Video Adjunto
                            </span>
                          )}
                        </div>

                        {/* Text Content */}
                        <div className="space-y-1.5 flex-grow">
                          {promo.tagline && (
                            <span className="text-[10px] font-black text-tinta uppercase tracking-wider block">
                              {promo.tagline}
                            </span>
                          )}
                          <h3 className="font-extrabold text-tinta text-base leading-snug">{promo.title}</h3>
                          <p className="text-xs font-semibold text-tinta-suave line-clamp-2">{promo.subtitle}</p>

                          {/* Pricing & Savings */}
                          <div className="pt-2 bg-cian p-3 rounded-xl border border-borde space-y-1">
                            {promo.savingText && (
                              <p className="text-[11px] font-bold text-azul flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-azul" />
                                {promo.savingText}
                              </p>
                            )}
                            <div className="flex items-baseline gap-2">
                              {promo.price && (
                                <span className="text-base font-black text-azul">
                                  ${promo.price?.toLocaleString('es-CO')} COP
                                </span>
                              )}
                              {promo.originalPrice && (
                                <span className="text-xs text-tinta-suave line-through font-bold">
                                  ${promo.originalPrice?.toLocaleString('es-CO')} COP
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-3 border-t border-borde grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleOpenEditPromo(promo)}
                            className="w-full bg-amarillo hover:bg-amarillo text-tinta text-xs font-bold py-2 rounded-xl border border-borde transition-colors flex items-center justify-center gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar Todo
                          </button>

                          <button
                            onClick={() => handleDeletePromo(promo.id, promo.title)}
                            className="w-full text-secondary hover:text-secondary hover:bg-cian text-[11px] font-bold py-2 rounded-xl border border-secondary transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================== MÓDULO DE TIPS ================== */}
        {activeTab === 'tips' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-black text-xl text-tinta">Tips del Blog</h2>
                <p className="text-xs text-tinta-suave mt-0.5">
                  Guías que se muestran en <span className="font-bold">/tips</span>. Puedes adjuntar
                  un video de YouTube en vez de la imagen de portada.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/tips"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-borde text-tinta-suave hover:bg-cian font-bold text-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Ver en el sitio
                </a>
                <button
                  onClick={openNewTip}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-azul hover:bg-azul-hondo text-white font-bold text-xs shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" /> Nuevo tip
                </button>
              </div>
            </div>

            {loadingTips ? (
              <p className="py-16 text-center text-sm text-tinta-suave animate-pulse">Cargando tips…</p>
            ) : tipsList.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-borde">
                <BookOpen className="w-10 h-10 text-borde mx-auto mb-3" />
                <p className="font-bold text-tinta-suave">Todavía no hay tips</p>
                <p className="text-xs text-tinta-suave mt-1">Crea el primero para publicarlo en el blog.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {tipsList.map((tip) => (
                  <article
                    key={tip.id}
                    className="bg-white rounded-3xl border border-borde overflow-hidden flex flex-col hover:border-borde transition-colors"
                  >
                    <div className="relative h-40 bg-cian shrink-0">
                      {tipVideoEmbed(tip.videoUrl) ? (
                        <div className="absolute inset-0 grid place-items-center bg-tinta/70 text-white gap-1.5">
                          <Video className="w-8 h-8" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Video de YouTube
                          </span>
                        </div>
                      ) : tip.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={tip.image} alt="" className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-borde">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}

                      <span className="absolute top-3 left-3 bg-white/95 border border-borde text-tinta-suave text-[10px] font-black px-2.5 py-1 rounded-full">
                        {tip.categoryLabel || tip.category}
                      </span>

                      {tip.isPublished === false && (
                        <span className="absolute top-3 right-3 bg-amarillo border border-borde text-tinta text-[10px] font-black px-2.5 py-1 rounded-full">
                          Borrador
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-black text-base text-tinta line-clamp-2">{tip.title}</h3>
                      <p className="text-xs text-tinta-suave mt-1.5 line-clamp-2">{tip.summary}</p>

                      <p className="text-[11px] text-tinta-suave mt-3">
                        {tip.author || 'Sin autor'} · {tip.readTime} · {tip.date}
                      </p>

                      {tip.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {tip.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="bg-cian text-tinta-suave text-[10px] font-bold px-2 py-1 rounded-full"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto pt-4 flex items-center gap-2">
                        <button
                          onClick={() => openEditTip(tip)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cian hover:bg-cian text-azul font-bold text-xs transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteTip(tip)}
                          title="Eliminar tip"
                          className="p-2 rounded-xl text-tinta-suave hover:text-secondary hover:bg-cian transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'followup' && (
          <div className="space-y-6">
            {/* Plazos: cuándo aparece cada clienta en la bandeja. */}
            <div className={`${UI.card} space-y-4`}>
              <div>
                <h2 className="font-black text-base text-tinta flex items-center gap-2">
                  <Clock className="w-5 h-5 text-azul" /> Cuándo llamar
                </h2>
                <p className="text-xs text-tinta-suave mt-0.5">
                  Cada pedido pagado entra solo a la lista cuando se cumple el plazo. Cambiar esto reordena lo que
                  todavía está pendiente; lo ya registrado no se toca.
                </p>
              </div>

              <form onSubmit={handleSaveFollowConfig} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                <div>
                  <label className="ens-eyebrow text-tinta-suave block mb-1.5">
                    Preguntar la opinión — días tras la compra
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={followConfig.feedbackDelayDays}
                    onChange={(e) =>
                      setFollowConfig({ ...followConfig, feedbackDelayDays: Number(e.target.value) })
                    }
                    className={UI.input}
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">
                    Lo justo para que ya haya llegado y lo haya probado.
                  </p>
                </div>
                <div>
                  <label className="ens-eyebrow text-tinta-suave block mb-1.5">
                    Ofrecer la recompra — días tras la compra
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={followConfig.repurchaseDelayDays}
                    onChange={(e) =>
                      setFollowConfig({ ...followConfig, repurchaseDelayDays: Number(e.target.value) })
                    }
                    className={UI.input}
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">
                    Calcúlalo por cuánto le dura el producto a una mamá.
                  </p>
                </div>
                <div className="flex items-start pt-6">
                  <button type="submit" disabled={savingFollowUp} className={`${UI.btnPrimary} w-full sm:w-auto`}>
                    <Save className="w-4 h-4" /> Guardar
                  </button>
                </div>
              </form>
            </div>

            {/* Bandeja */}
            <div className={`${UI.card} space-y-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borde pb-4">
                <div className="flex flex-wrap gap-2">
                  {([
                    ['opinion', 'Pedir opinión', followUps?.opinionPendiente?.length || 0],
                    ['recompra', 'Ofrecer recompra', followUps?.recompraPendiente?.length || 0],
                    ['registradas', 'Ya registradas', followUps?.registradas?.length || 0],
                  ] as const).map(([key, label, count]) => (
                    <button
                      key={key}
                      onClick={() => setFollowTab(key)}
                      className={`h-10 px-4 rounded-xl border font-bold text-xs transition-colors ens-focus inline-flex items-center gap-2 ${
                        followTab === key
                          ? 'bg-azul border-azul text-white'
                          : 'bg-white border-borde text-tinta-suave hover:bg-cian hover:text-tinta'
                      }`}
                    >
                      {label}
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                          followTab === key ? 'bg-white/25' : 'bg-cian text-azul'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
                <button onClick={fetchFollowUps} className={UI.btnGhost}>
                  <RefreshCw className="w-4 h-4" /> Actualizar
                </button>
              </div>

              {loadingFollowUps ? (
                <p className="py-12 text-center text-sm text-tinta-suave animate-pulse">Cargando el seguimiento…</p>
              ) : (
                (() => {
                  const lista =
                    followTab === 'opinion'
                      ? followUps?.opinionPendiente || []
                      : followTab === 'recompra'
                        ? followUps?.recompraPendiente || []
                        : followUps?.registradas || [];

                  const vacio =
                    followTab === 'opinion'
                      ? { t: 'Nadie por llamar todavía', s: 'Cuando un pedido cumpla el plazo aparecerá aquí.' }
                      : followTab === 'recompra'
                        ? { t: 'Ninguna recompra por ofrecer', s: 'Las compras recientes aún no cumplen el plazo.' }
                        : { t: 'Todavía no has registrado contactos', s: 'Lo que vayas registrando queda aquí.' };

                  if (lista.length === 0) {
                    return (
                      <div className="py-14 text-center bg-white rounded-3xl border border-dashed border-borde">
                        <PhoneCall className="w-10 h-10 text-borde mx-auto mb-3" />
                        <p className="font-bold text-tinta-suave">{vacio.t}</p>
                        <p className="text-xs text-tinta-suave mt-1">{vacio.s}</p>
                      </div>
                    );
                  }

                  return (
                    <ul className="space-y-3">
                      {lista.map((f: any) => {
                        const esRecompra = followTab === 'recompra';
                        const vence = esRecompra ? f.repurchaseDueAt : f.feedbackDueAt;
                        return (
                          <li
                            key={`${f.id}-${followTab}`}
                            className="p-4 rounded-2xl border border-borde bg-white flex flex-col lg:flex-row lg:items-center gap-4"
                          >
                            {/* Quién y cómo contactarla */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-sm text-tinta">{f.cliente}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cian text-azul border border-borde">
                                  {f.orderNumber}
                                </span>
                                {followTab !== 'registradas' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amarillo text-tinta border border-borde">
                                    Esperando {desdeHace(vence)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-tinta-suave mt-1">
                                {f.productos.join(' · ')} — ${f.total.toLocaleString('es-CO')}
                              </p>
                              <p className="text-xs text-tinta-suave mt-0.5">
                                {f.ciudad || 'Sin ciudad'} · compró {desdeHace(f.compradoEl)}
                              </p>
                            </div>

                            {/* Canales directos: el objetivo es levantar el teléfono. */}
                            <div className="flex items-center gap-2 shrink-0">
                              {f.telefono && (
                                <>
                                  <a
                                    href={`tel:${f.telefono}`}
                                    title={`Llamar a ${f.telefono}`}
                                    className={UI.btnGhost}
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" /> {f.telefono}
                                  </a>
                                  <a
                                    href={`https://wa.me/${f.telefono.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Escribir por WhatsApp"
                                    className={UI.btnGhost}
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </a>
                                </>
                              )}
                              <a href={`mailto:${f.email}`} title={f.email} className={UI.btnGhost}>
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            {/* Resultado */}
                            <div className="shrink-0">
                              {followTab === 'registradas' ? (
                                <div className="text-right space-y-1">
                                  {f.feedbackStatus !== 'PENDIENTE' && (
                                    <p className="text-[11px] text-tinta-suave">
                                      Opinión:{' '}
                                      <span className="font-bold text-tinta">
                                        {f.feedbackStatus === 'CONTACTADA' && f.productRating
                                          ? `${f.productRating}/5 producto · ${f.processRating}/5 proceso`
                                          : f.feedbackStatus.replace('_', ' ').toLowerCase()}
                                      </span>
                                    </p>
                                  )}
                                  {f.repurchaseStatus !== 'PENDIENTE' && (
                                    <p className="text-[11px] text-tinta-suave">
                                      Recompra:{' '}
                                      <span className="font-bold text-tinta">
                                        {f.repurchaseStatus.replace(/_/g, ' ').toLowerCase()}
                                      </span>
                                    </p>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleReabrirFollowUp(
                                        f,
                                        f.feedbackStatus !== 'PENDIENTE' ? 'feedback' : 'recompra'
                                      )
                                    }
                                    className="text-[10px] font-bold text-azul hover:text-azul-hondo transition-colors"
                                  >
                                    Volver a pendiente
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openFollowForm(f, esRecompra ? 'recompra' : 'feedback')}
                                  className={UI.btnPrimary}
                                >
                                  <Check className="w-4 h-4" /> Registrar
                                </button>
                              )}
                            </div>

                            {/* Lo que dijo, si ya se registró */}
                            {followTab === 'registradas' && (f.feedbackComment || f.repurchaseNotes) && (
                              <p className="lg:w-64 shrink-0 text-xs text-tinta-suave italic bg-cian rounded-xl p-3 border border-borde">
                                “{f.feedbackComment || f.repurchaseNotes}”
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Ventana de tiempo. Todo el módulo se recalcula con esto. */}
            <div className={`${UI.card} flex flex-wrap items-center justify-between gap-4`}>
              <div>
                <h2 className="font-black text-base text-tinta flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-azul" /> Periodo
                </h2>
                <p className="text-xs text-tinta-suave mt-0.5">
                  Solo cuentan los pedidos pagados. Los que quedaron sin pagar se muestran aparte.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { d: 7, t: '7 días' },
                  { d: 30, t: '30 días' },
                  { d: 90, t: '90 días' },
                  { d: 365, t: '1 año' },
                  { d: 0, t: 'Todo' },
                ].map(({ d, t }) => (
                  <button
                    key={d}
                    onClick={() => setMetricsDias(d)}
                    className={`h-10 px-4 rounded-xl border font-bold text-xs transition-colors ens-focus ${
                      metricsDias === d
                        ? 'bg-azul border-azul text-white'
                        : 'bg-white border-borde text-tinta-suave hover:bg-cian hover:text-tinta'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <button onClick={() => fetchMetrics()} className={UI.btnGhost}>
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingMetrics ? (
              <p className="py-16 text-center text-sm text-tinta-suave animate-pulse">Calculando métricas…</p>
            ) : !metrics || metrics.resumen.pedidos === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-borde">
                <BarChart3 className="w-10 h-10 text-borde mx-auto mb-3" />
                <p className="font-bold text-tinta-suave">Todavía no hay ventas en este periodo</p>
                <p className="text-xs text-tinta-suave mt-1">
                  Cuando entren pedidos pagados, aquí aparecen los productos y las ciudades.
                </p>
              </div>
            ) : (
              <>
                {/* Evolución mensual: barras proporcionales, sin librería. */}
                <div className={`${UI.card} space-y-4`}>
                  <div>
                    <h3 className="font-black text-base text-tinta flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-azul" /> Últimos 12 meses
                    </h3>
                    <p className="text-xs text-tinta-suave mt-0.5">
                      Recaudo por mes. Pasa el cursor por cada barra para ver la cifra exacta.
                    </p>
                  </div>

                  {(() => {
                    const tope = Math.max(...metrics.meses.map((m: any) => m.ingresos), 1);
                    return (
                      <div className="flex items-end gap-1.5 sm:gap-3 h-44 pt-2">
                        {metrics.meses.map((m: any) => (
                          <div key={m.mes} className="flex-1 flex flex-col items-center justify-end gap-2 h-full group">
                            <span className="text-[10px] font-bold text-azul opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              ${Math.round(m.ingresos / 1000)}k
                            </span>
                            <div
                              title={`${m.etiqueta}: $${m.ingresos.toLocaleString('es-CO')} · ${m.pedidos} pedidos`}
                              style={{ height: `${Math.max((m.ingresos / tope) * 100, m.ingresos > 0 ? 4 : 1)}%` }}
                              className={`w-full rounded-t-lg transition-colors ${
                                m.ingresos > 0 ? 'bg-celeste group-hover:bg-azul' : 'bg-borde'
                              }`}
                            />
                            <span className="text-[10px] font-bold text-tinta-suave capitalize">{m.etiqueta}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ranking reutilizable: producto, ciudad, clienta… */}
                  {[
                    {
                      titulo: 'Productos más vendidos',
                      Icon: ShoppingBag,
                      filas: metrics.productos,
                      unidad: 'unidades',
                      pista: 'Suma de unidades en pedidos pagados.',
                    },
                    {
                      titulo: 'Ciudades que más piden',
                      Icon: MapPin,
                      filas: metrics.ciudades,
                      unidad: 'pedidos',
                      pista: 'Útil para decidir dónde conviene bajar el flete.',
                    },
                    {
                      titulo: 'Presentaciones preferidas',
                      Icon: Layers,
                      filas: metrics.presentaciones,
                      unidad: 'unidades',
                      pista: 'Qué tamaño se lleva la gente. Sirve para producción.',
                    },
                    {
                      titulo: 'Clientas que más compran',
                      Icon: Users,
                      filas: metrics.clientas,
                      unidad: 'pedidos',
                      pista: 'Ordenadas por lo que han gastado en total.',
                    },
                  ].map(({ titulo, Icon, filas, unidad, pista }) => (
                    <div key={titulo} className={`${UI.card} space-y-4`}>
                      <div>
                        <h3 className="font-black text-base text-tinta flex items-center gap-2">
                          <Icon className="w-5 h-5 text-azul" /> {titulo}
                        </h3>
                        <p className="text-xs text-tinta-suave mt-0.5">{pista}</p>
                      </div>

                      {filas.length === 0 ? (
                        <p className="py-8 text-center text-xs text-tinta-suave italic">Sin datos en este periodo.</p>
                      ) : (
                        <ol className="space-y-2.5">
                          {filas.map((f: any, i: number) => {
                            const tope = filas[0].unidades || 1;
                            return (
                              <li key={f.nombre} className="flex items-center gap-3">
                                <span className="w-5 shrink-0 text-[11px] font-black text-tinta-suave tabular-nums">
                                  {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline justify-between gap-3">
                                    <p className="text-xs font-bold text-tinta truncate">{f.nombre}</p>
                                    <p className="text-xs text-tinta-suave shrink-0 tabular-nums">
                                      <span className="font-black text-tinta">{f.unidades}</span> {unidad}
                                      <span className="hidden sm:inline">
                                        {' '}
                                        · ${f.ingresos.toLocaleString('es-CO')}
                                      </span>
                                    </p>
                                  </div>
                                  {/* La barra da la proporción de un vistazo:
                                      una tabla de números sola no la muestra. */}
                                  <div className="mt-1 h-1.5 rounded-full bg-cian overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-azul"
                                      style={{ width: `${Math.max((f.unidades / tope) * 100, 3)}%` }}
                                    />
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>

                {metrics.resumen.sinPagar > 0 && (
                  <div className={`${UI.card} flex items-start gap-3`}>
                    <Sparkles className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-tinta">
                        {metrics.resumen.sinPagar} pedido{metrics.resumen.sinPagar === 1 ? '' : 's'} se quedó sin pagar
                      </p>
                      <p className="text-xs text-tinta-suave mt-0.5">
                        No entran en las cifras de arriba. Están en el módulo Pedidos como «Orden generada» y se pueden
                        recuperar con una llamada.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'hero' && (
          <div className="space-y-6">
            {/* Vista previa: la misma composición de la portada, a escala.
                Editar a ciegas un bloque tan visible es pedir problemas. */}
            <div className={`${UI.card} space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borde pb-4">
                <div>
                  <h2 className="font-black text-xl text-tinta flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-azul" /> Vista previa
                  </h2>
                  <p className="text-xs text-tinta-suave mt-0.5">
                    Así se ve arriba del todo en la portada. Usa las flechas para recorrer las diapositivas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href="/" target="_blank" rel="noreferrer" className={UI.btnGhost}>
                    <ExternalLink className="w-4 h-4" /> Ver en el sitio
                  </a>
                  <button onClick={openNewHeroSlide} className={UI.btnPrimary}>
                    <Plus className="w-4 h-4" /> Nueva diapositiva
                  </button>
                </div>
              </div>

              {heroActivas.length === 0 ? (
                <div className="py-12 text-center bg-cian rounded-2xl border border-dashed border-borde">
                  <Layers className="w-10 h-10 text-borde mx-auto mb-3" />
                  <p className="font-bold text-tinta-suave">No hay diapositivas encendidas</p>
                  <p className="text-xs text-tinta-suave mt-1 max-w-md mx-auto">
                    La portada está mostrando el hero que trae el sitio de fábrica. Crea una diapositiva o
                    enciende alguna de las de abajo para reemplazarlo.
                  </p>
                </div>
              ) : (
                (() => {
                  const slide = heroActivas[Math.min(heroPreview, heroActivas.length - 1)] || heroActivas[0];
                  return (
                    <div className="relative rounded-2xl border border-borde bg-celeste overflow-hidden">
                      <div className="grid sm:grid-cols-[0.95fr_1.05fr] gap-4 items-end p-5 sm:p-7 min-h-[240px]">
                        <div className="pb-2 sm:pb-6">
                          {slide.eyebrow && <p className="ens-eyebrow text-azul">{slide.eyebrow}</p>}
                          <p className="mt-2 font-display text-tinta text-2xl sm:text-3xl leading-tight">
                            {slide.title}
                          </p>
                          {slide.subtitle && (
                            <p className="mt-2.5 text-xs sm:text-sm text-tinta-suave leading-relaxed max-w-sm">
                              {slide.subtitle}
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {slide.primaryLabel && (
                              <span className="inline-flex items-center h-9 px-4 rounded-full bg-azul text-white text-xs font-extrabold uppercase tracking-wider">
                                {slide.primaryLabel}
                              </span>
                            )}
                            {slide.secondaryLabel && (
                              <span className="inline-flex items-center h-9 px-4 rounded-full bg-white text-azul border border-borde text-xs font-extrabold uppercase tracking-wider">
                                {slide.secondaryLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Alto fijo en vez de la relación real del PNG: a lo
                            ancho del panel, el aspecto 3:2 hacía una vista
                            previa larguísima que tapaba el resto del módulo. */}
                        <div className="relative w-full h-36 sm:h-48 self-end">
                          {slide.image ? (
                            // <img> a propósito: la imagen la escribe el panel y
                            // puede ser cualquier URL, no solo un dominio de los
                            // permitidos en next.config.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={slide.image}
                              alt={slide.imageAlt || ''}
                              className="absolute inset-0 w-full h-full object-contain object-bottom"
                            />
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-tinta-suave text-xs">
                              Sin imagen
                            </div>
                          )}
                        </div>
                      </div>

                      {heroActivas.length > 1 && (
                        <div className="absolute bottom-3 left-5 flex items-center gap-2">
                          <button
                            onClick={() =>
                              setHeroPreview((i) => (i - 1 + heroActivas.length) % heroActivas.length)
                            }
                            aria-label="Diapositiva anterior"
                            className="w-8 h-8 grid place-items-center rounded-full bg-white/90 border border-borde text-azul hover:bg-white transition-colors ens-focus"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setHeroPreview((i) => (i + 1) % heroActivas.length)}
                            aria-label="Diapositiva siguiente"
                            className="w-8 h-8 grid place-items-center rounded-full bg-white/90 border border-borde text-azul hover:bg-white transition-colors ens-focus"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-azul bg-white/90 border border-borde rounded-full px-2.5 py-1">
                            {Math.min(heroPreview, heroActivas.length - 1) + 1} / {heroActivas.length}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Ritmo del carrusel */}
            <div className={`${UI.card} space-y-4`}>
              <div>
                <h3 className="font-black text-base text-tinta flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-azul" /> Cada cuánto cambia
                </h3>
                <p className="text-xs text-tinta-suave mt-0.5">
                  Solo aplica con dos o más diapositivas encendidas. El carrusel se detiene mientras alguien
                  pasa el mouse por encima o navega con el teclado.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[0, 4, 5, 6, 8, 10, 15].map((s) => {
                  const activo = heroInterval === s * 1000;
                  return (
                    <button
                      key={s}
                      onClick={() => handleSaveHeroInterval(s)}
                      disabled={savingHero}
                      className={`h-10 px-4 rounded-xl border font-bold text-xs transition-colors ens-focus disabled:opacity-50 ${
                        activo
                          ? 'bg-azul border-azul text-white'
                          : 'bg-white border-borde text-tinta-suave hover:bg-cian hover:text-tinta'
                      }`}
                    >
                      {s === 0 ? 'No avanzar solo' : `${s} s`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de diapositivas */}
            <div className={`${UI.card} space-y-4`}>
              <h3 className="font-black text-base text-tinta flex items-center gap-2">
                <Layers className="w-5 h-5 text-azul" /> Diapositivas
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cian text-azul border border-borde">
                  {heroSlides.length}
                </span>
              </h3>

              {loadingHero ? (
                <p className="py-12 text-center text-sm text-tinta-suave animate-pulse">Cargando la portada…</p>
              ) : heroSlides.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-borde">
                  <Layers className="w-10 h-10 text-borde mx-auto mb-3" />
                  <p className="font-bold text-tinta-suave">Todavía no hay diapositivas</p>
                  <p className="text-xs text-tinta-suave mt-1">
                    La primera viene precargada con el hero actual: solo tienes que ajustarla.
                  </p>
                  <button onClick={openNewHeroSlide} className={`${UI.btnPrimary} mt-4 mx-auto`}>
                    <Plus className="w-4 h-4" /> Crear la primera
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {heroSlides.map((slide, i) => (
                    <li
                      key={slide.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border transition-colors ${
                        slide.isActive ? 'bg-white border-borde' : 'bg-cian border-dashed border-borde'
                      }`}
                    >
                      {/* Orden */}
                      <div className="flex sm:flex-col items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveHeroSlide(slide, 'up')}
                          disabled={i === 0 || busyHeroId === slide.id}
                          aria-label="Subir"
                          className="w-7 h-7 grid place-items-center rounded-lg border border-borde text-tinta-suave hover:text-azul hover:bg-cian disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-black text-tinta-suave tabular-nums">{i + 1}</span>
                        <button
                          onClick={() => handleMoveHeroSlide(slide, 'down')}
                          disabled={i === heroSlides.length - 1 || busyHeroId === slide.id}
                          aria-label="Bajar"
                          className="w-7 h-7 grid place-items-center rounded-lg border border-borde text-tinta-suave hover:text-azul hover:bg-cian disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Miniatura */}
                      <div className="w-24 h-16 shrink-0 rounded-xl bg-celeste border border-borde overflow-hidden grid place-items-center">
                        {slide.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={slide.image} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-borde" />
                        )}
                      </div>

                      {/* Datos */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-tinta truncate">{slide.title}</p>
                          {slide.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-celeste text-azul border border-borde">
                              <CheckCircle2 className="w-3 h-3" /> En la portada
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amarillo text-tinta border border-borde">
                              Apagada
                            </span>
                          )}
                        </div>
                        {slide.eyebrow && <p className="text-[11px] text-azul font-bold mt-0.5">{slide.eyebrow}</p>}
                        {slide.subtitle && (
                          <p className="text-xs text-tinta-suave mt-1 line-clamp-2">{slide.subtitle}</p>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleHeroSlide(slide)}
                          disabled={busyHeroId === slide.id}
                          className={UI.btnGhost}
                        >
                          {slide.isActive ? 'Apagar' : 'Encender'}
                        </button>
                        <button onClick={() => openEditHeroSlide(slide)} className={UI.btnGhost}>
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteHeroSlide(slide)}
                          disabled={busyHeroId === slide.id}
                          title="Eliminar"
                          className="p-2.5 rounded-xl text-tinta-suave hover:text-secondary hover:bg-cian transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Invitar: dos campos a la vista, sin modal. Sumar a alguien al
                panel tiene que costar menos que buscar el botón. */}
            <div className={`${UI.card} space-y-4`}>
              <div className="flex items-center justify-between gap-4 border-b border-borde pb-4">
                <div>
                  <h2 className="font-black text-xl text-tinta flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-azul" /> Invitar a alguien al panel
                  </h2>
                  <p className="text-xs text-tinta-suave mt-0.5">
                    Le llega un correo con un enlace de un solo uso. Ninguna contraseña viaja por correo.
                  </p>
                </div>
                <button onClick={fetchTeam} title="Actualizar" className={UI.btnGhost}>
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                <div className="sm:col-span-3">
                  <span className="ens-eyebrow text-tinta-suave block mb-1.5">Con qué acceso entra</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['ADMIN', 'ASISTENTE'] as const).map((r) => {
                      const elegido = inviteForm.role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setInviteForm({ ...inviteForm, role: r })}
                          aria-pressed={elegido}
                          className={`text-left p-3.5 rounded-xl border transition-colors ens-focus ${
                            elegido ? 'bg-cian border-azul' : 'bg-white border-borde hover:bg-cian'
                          }`}
                        >
                          <span className="flex items-center gap-2 font-bold text-sm text-tinta">
                            {r === 'ADMIN' ? (
                              <ShieldCheck className="w-4 h-4 text-azul" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-azul" />
                            )}
                            {NOMBRE_ROL[r]}
                          </span>
                          <span className="block text-xs text-tinta-suave mt-1">
                            {r === 'ADMIN'
                              ? 'El panel completo, incluido el catálogo, los envíos y este mismo módulo.'
                              : 'Solo pedidos, seguimiento y tips. No puede anular pedidos ni invitar a nadie.'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="invite-name" className="ens-eyebrow text-tinta-suave block mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    id="invite-name"
                    type="text"
                    required
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                    placeholder="Laura Restrepo"
                    className={UI.input}
                  />
                </div>
                <div>
                  <label htmlFor="invite-email" className="ens-eyebrow text-tinta-suave block mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="laura@ensueno.com.co"
                    className={UI.input}
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={sendingInvite} className={`${UI.btnPrimary} w-full sm:w-auto`}>
                    <Send className="w-4 h-4" />
                    {sendingInvite ? 'Enviando…' : 'Enviar invitación'}
                  </button>
                </div>
              </form>

              <p className="text-[10px] text-tinta-suave">
                El enlace vence en 48 horas y sirve una sola vez. Si el correo ya tiene cuenta de clienta,
                se le suma el acceso al panel sin perder su historial.
              </p>

              {lastInviteLink && (
                <div className="bg-amarillo/40 border border-borde rounded-2xl p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-tinta-suave">
                    Correo en modo simulación
                  </p>
                  <p className="text-xs text-tinta-suave mt-1">
                    No hay <span className="font-bold">RESEND_API_KEY</span> configurada, así que el correo no salió.
                    Pásale este enlace a la persona:
                  </p>
                  <code className="block mt-2 text-[11px] text-azul break-all bg-white rounded-xl border border-borde p-2.5">
                    {lastInviteLink}
                  </code>
                </div>
              )}
            </div>

            {/* Administradores activos */}
            <div className={`${UI.card} space-y-4`}>
              <h3 className="font-black text-base text-tinta flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-azul" /> Con acceso al panel
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cian text-azul border border-borde">
                  {adminsList.length}
                </span>
              </h3>

              {loadingTeam ? (
                <p className="py-10 text-center text-sm text-tinta-suave animate-pulse">Cargando el equipo…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-borde text-tinta-suave font-bold uppercase bg-cian">
                        <th className="py-3 px-4">Nombre</th>
                        <th className="py-3 px-4">Correo</th>
                        <th className="py-3 px-4">Con acceso desde</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borde">
                      {adminsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-tinta-suave italic">
                            No hay administradores registrados.
                          </td>
                        </tr>
                      ) : (
                        adminsList.map((adm) => {
                          const esYo = adm.id === currentAdminId;
                          return (
                            <tr key={adm.id} className="hover:bg-cian transition-colors">
                              <td className="py-4 px-4 font-bold text-tinta">
                                <span className="inline-flex items-center gap-2 flex-wrap">
                                  {adm.fullName}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-borde ${
                                      adm.role === 'ADMIN' ? 'bg-amarillo text-tinta' : 'bg-cian text-azul'
                                    }`}
                                  >
                                    {NOMBRE_ROL[adm.role as RolPanel] || adm.role}
                                  </span>
                                  {esYo && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-celeste text-azul border border-borde">
                                      Tú
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-tinta-suave">{adm.email}</td>
                              <td className="py-4 px-4 text-tinta-suave tabular-nums">
                                {new Date(adm.createdAt).toLocaleDateString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="py-4 px-4 text-right">
                                {esYo ? (
                                  <span className="text-tinta-suave italic">—</span>
                                ) : (
                                  <button
                                    onClick={() => handleRevokeAdmin(adm)}
                                    disabled={busyTeamId === adm.id}
                                    className={UI.btnDanger}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {busyTeamId === adm.id ? 'Quitando…' : 'Quitar acceso'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Invitaciones sin responder */}
            <div className={`${UI.card} space-y-4`}>
              <h3 className="font-black text-base text-tinta flex items-center gap-2">
                <Mail className="w-5 h-5 text-azul" /> Invitaciones pendientes
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cian text-azul border border-borde">
                  {invitesList.length}
                </span>
              </h3>

              {loadingTeam ? (
                <p className="py-10 text-center text-sm text-tinta-suave animate-pulse">Cargando invitaciones…</p>
              ) : invitesList.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-borde">
                  <Mail className="w-10 h-10 text-borde mx-auto mb-3" />
                  <p className="font-bold text-tinta-suave">No hay invitaciones sin responder</p>
                  <p className="text-xs text-tinta-suave mt-1">Las que envíes aparecerán aquí hasta que se activen.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-borde text-tinta-suave font-bold uppercase bg-cian">
                        <th className="py-3 px-4">Persona</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Invitó</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borde">
                      {invitesList.map((inv) => (
                        <tr key={inv.id} className="hover:bg-cian transition-colors">
                          <td className="py-4 px-4">
                            <p className="font-bold text-tinta">{inv.fullName}</p>
                            <p className="text-tinta-suave">{inv.email}</p>
                            <span
                              className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-borde ${
                                inv.role === 'ADMIN' ? 'bg-amarillo text-tinta' : 'bg-cian text-azul'
                              }`}
                            >
                              {NOMBRE_ROL[inv.role as RolPanel] || inv.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amarillo text-tinta border border-borde">
                              Pendiente
                            </span>
                            <p className="text-tinta-suave mt-1">{inviteTimeLeft(inv.expiresAt)}</p>
                          </td>
                          <td className="py-4 px-4 text-tinta-suave">{inv.invitedBy}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleInviteAction(inv, 'resend')}
                                disabled={busyTeamId === inv.id}
                                title="Reenviar el correo con un enlace nuevo"
                                className={UI.btnGhost}
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Reenviar
                              </button>
                              <button
                                onClick={() => handleInviteAction(inv, 'revoke')}
                                disabled={busyTeamId === inv.id}
                                title="Anular el enlace"
                                className={UI.btnDanger}
                              >
                                <X className="w-3.5 h-3.5" /> Cancelar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE REGISTRO DE CONTACTO */}
      {followTarget && (
        <div className="fixed inset-0 z-[99999] bg-tinta/70 p-4 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center">
            <form
              onSubmit={handleSaveFollowUp}
              className="bg-white border border-borde max-w-lg w-full rounded-3xl p-6 sm:p-8 text-tinta shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-start justify-between border-b border-borde pb-4 gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-azul bg-cian px-3 py-1 rounded-full border border-borde">
                    {followKind === 'feedback' ? 'Opinión de la clienta' : 'Oferta de recompra'}
                  </span>
                  <h3 className="font-black text-xl text-tinta mt-1.5">{followTarget.cliente}</h3>
                  <p className="text-xs text-tinta-suave mt-0.5">
                    {followTarget.orderNumber} · {followTarget.productos.join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFollowTarget(null)}
                  className="text-tinta-suave hover:text-tinta p-1.5 rounded-full hover:bg-cian transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cómo terminó el contacto */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-2">
                  ¿Cómo terminó?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(followKind === 'feedback'
                    ? [
                        ['CONTACTADA', 'Contestó'],
                        ['SIN_RESPUESTA', 'No contestó'],
                        ['NO_INTERESA', 'No quiso opinar'],
                      ]
                    : [
                        ['VA_A_COMPRAR', 'Va a comprar'],
                        ['CONTACTADA', 'Lo va a pensar'],
                        ['NO_QUIERE', 'No quiere'],
                      ]
                  ).map(([valor, texto]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setFollowForm({ ...followForm, status: valor })}
                      className={`h-11 px-3 rounded-xl border font-bold text-xs transition-colors ens-focus ${
                        followForm.status === valor
                          ? 'bg-azul border-azul text-white'
                          : 'bg-white border-borde text-tinta-suave hover:bg-cian hover:text-tinta'
                      }`}
                    >
                      {texto}
                    </button>
                  ))}
                </div>
              </div>

              {followKind === 'feedback' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-2">
                      Por dónde la contactaste
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['LLAMADA', 'WHATSAPP', 'EMAIL'].map((canal) => (
                        <button
                          key={canal}
                          type="button"
                          onClick={() => setFollowForm({ ...followForm, channel: canal })}
                          className={`h-11 rounded-xl border font-bold text-xs capitalize transition-colors ens-focus ${
                            followForm.channel === canal
                              ? 'bg-celeste border-azul text-azul'
                              : 'bg-white border-borde text-tinta-suave hover:bg-cian'
                          }`}
                        >
                          {canal.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Las notas solo tienen sentido si contestó. */}
                  {followForm.status === 'CONTACTADA' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        ['productRating', '¿Qué le pareció el producto?'],
                        ['processRating', '¿Y el proceso de compra?'],
                      ].map(([campo, etiqueta]) => (
                        <div key={campo}>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-2">
                            {etiqueta}
                          </label>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                aria-label={`${n} de 5`}
                                onClick={() => setFollowForm({ ...followForm, [campo]: n })}
                                className="p-0.5 ens-focus rounded"
                              >
                                <StarIcon
                                  className={`w-7 h-7 transition-colors ${
                                    n <= followForm[campo] ? 'text-amarillo fill-amarillo' : 'text-borde'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                      Qué dijo
                    </label>
                    <textarea
                      rows={3}
                      value={followForm.comment}
                      onChange={(e) => setFollowForm({ ...followForm, comment: e.target.value })}
                      placeholder="«Le encantó el olor pero la tapa se le derramó en el bolso…»"
                      className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                    />
                    <p className="text-[10px] text-tinta-suave mt-1">
                      Textual, si puedes. Es lo que después sirve para mejorar el producto.
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Notas de la llamada
                  </label>
                  <textarea
                    rows={4}
                    value={followForm.notes}
                    onChange={(e) => setFollowForm({ ...followForm, notes: e.target.value })}
                    placeholder="«Pidió que la llamemos en dos semanas, cuando se le acabe la mantequilla.»"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-borde flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFollowTarget(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-tinta-suave hover:bg-cian transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFollowUp}
                  className="btn-ensueno-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50"
                >
                  {savingFollowUp ? 'Guardando...' : 'Guardar contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DIAPOSITIVA DEL HERO */}
      {showHeroForm && (
        <div className="fixed inset-0 z-[99999] bg-tinta/70 p-4 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center">
            <form
              onSubmit={handleSaveHeroSlide}
              className="bg-white border border-borde max-w-2xl w-full rounded-3xl p-6 sm:p-8 text-tinta shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-borde pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-azul bg-cian px-3 py-1 rounded-full border border-borde">
                    {editingHeroId ? 'Editar diapositiva' : 'Nueva diapositiva'}
                  </span>
                  <h3 className="font-black text-xl text-tinta mt-1">Hero de la portada</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHeroForm(false)}
                  className="text-tinta-suave hover:text-tinta p-1.5 rounded-full hover:bg-cian transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Texto */}
              <div className="p-4 bg-cian rounded-2xl border border-borde space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-tinta-suave flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Texto
                </h4>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Antetítulo
                  </label>
                  <input
                    type="text"
                    value={heroForm.eyebrow}
                    onChange={(e) => setHeroForm({ ...heroForm, eyebrow: e.target.value })}
                    placeholder="Cuidado pediátrico · Colombia"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-white focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">La línea pequeña en azul, encima del titular.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Titular *
                  </label>
                  <input
                    type="text"
                    required
                    value={heroForm.title}
                    onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                    placeholder="El cuidado más tierno para tu bebé"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-white focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">
                    Va en la tipografía grande. Entre 4 y 9 palabras se ve mejor.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={heroForm.subtitle}
                    onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                    placeholder="Tres esenciales sin alcohol, sin parabenos y probados dermatológicamente."
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-white focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>
              </div>

              {/* Imagen */}
              <div className="p-4 bg-cian rounded-2xl border border-borde space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-tinta-suave flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Imagen
                </h4>

                <ImageUploader
                  section="hero"
                  aspect="wide"
                  required
                  label="Imagen"
                  value={heroForm.image}
                  onChange={(url) => setHeroForm({ ...heroForm, image: url })}
                  hint="PNG con fondo transparente y apaisado (relación 3:2), como el actual."
                />

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Texto alternativo
                  </label>
                  <input
                    type="text"
                    value={heroForm.imageAlt}
                    onChange={(e) => setHeroForm({ ...heroForm, imageAlt: e.target.value })}
                    placeholder="Mamá y bebé con la Colonia Ensueño"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-white focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">
                    Lo que lee quien no puede ver la foto. Describe la escena en pocas palabras.
                  </p>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={heroForm.showMascot}
                    onChange={(e) => setHeroForm({ ...heroForm, showMascot: e.target.checked })}
                    className="w-4 h-4 rounded accent-azul"
                  />
                  <span className="text-xs font-bold text-tinta-suave">
                    Mostrar la estrellita en la esquina superior derecha
                  </span>
                </label>
              </div>

              {/* Botones */}
              <div className="p-4 bg-cian rounded-2xl border border-borde space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-tinta-suave flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Botones
                </h4>
                <p className="text-[10px] text-tinta-suave -mt-2">
                  Deja el texto vacío para que ese botón no aparezca. En el enlace puedes poner una ruta
                  (<span className="font-bold">/tips</span>) o un ancla de la portada (
                  <span className="font-bold">#productos</span>).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                      Botón principal
                    </label>
                    <input
                      type="text"
                      value={heroForm.primaryLabel}
                      onChange={(e) => setHeroForm({ ...heroForm, primaryLabel: e.target.value })}
                      placeholder="Ver productos"
                      className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-white focus:outline-none focus:ring-2 focus:ring-celeste"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                      Su enlace
                    </label>
                    <input
                      type="text"
                      value={heroForm.primaryHref}
                      onChange={(e) => setHeroForm({ ...heroForm, primaryHref: e.target.value })}
                      placeholder="#productos"
                      className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-white focus:outline-none focus:ring-2 focus:ring-celeste"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                      Botón secundario
                    </label>
                    <input
                      type="text"
                      value={heroForm.secondaryLabel}
                      onChange={(e) => setHeroForm({ ...heroForm, secondaryLabel: e.target.value })}
                      placeholder="Leer los tips"
                      className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-white focus:outline-none focus:ring-2 focus:ring-celeste"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                      Su enlace
                    </label>
                    <input
                      type="text"
                      value={heroForm.secondaryHref}
                      onChange={(e) => setHeroForm({ ...heroForm, secondaryHref: e.target.value })}
                      placeholder="/tips"
                      className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-white focus:outline-none focus:ring-2 focus:ring-celeste"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heroForm.isActive}
                  onChange={(e) => setHeroForm({ ...heroForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded accent-azul"
                />
                <span className="text-xs font-bold text-tinta-suave">Mostrarla en la portada</span>
              </label>

              <div className="pt-4 border-t border-borde flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowHeroForm(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-tinta-suave hover:bg-cian transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingHero}
                  className="btn-ensueno-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50"
                >
                  {savingHero ? 'Guardando...' : editingHeroId ? 'Guardar cambios' : 'Crear diapositiva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN Y CREACIÓN COMPLETA DE PRODUCTOS */}
      {showProductModal && (
        <div className="fixed inset-0 z-[99999] bg-tinta/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-borde max-w-2xl w-full rounded-3xl p-6 sm:p-8 text-tinta shadow-2xl space-y-6 relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-borde pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-azul bg-cian px-3 py-1 rounded-full border border-borde">
                  {editingProduct ? 'Editar Producto Existente' : 'Nuevo Producto Catálogo'}
                </span>
                <h3 className="font-black text-xl text-tinta mt-1">
                  {editingProduct ? `Modificar "${editingProduct.name}"` : 'Crear Producto para Inicio & Detalle'}
                </h3>
              </div>

              <button
                onClick={() => setShowProductModal(false)}
                className="text-tinta-suave hover:text-tinta-suave p-1.5 rounded-full hover:bg-cian transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-5 text-xs font-semibold">
              {/* Sección 1: Datos Básicos */}
              <div className="space-y-3 p-4 bg-cian rounded-2xl border border-borde">
                <h4 className="font-bold text-tinta text-xs uppercase tracking-wide flex items-center gap-1.5 text-azul">
                  <Sparkles className="w-4 h-4 text-azul" /> Información Principal
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Nombre del Producto *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="Ej. Colonia Ensueño Lavanda & Manzanilla"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta font-bold focus:ring-2 focus:ring-celeste"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Subtítulo / Eslogan *</label>
                    <input
                      type="text"
                      value={productForm.subtitle}
                      onChange={(e) => setProductForm({ ...productForm, subtitle: e.target.value })}
                      placeholder="Ej. Bruma suave relajante para antes de dormir"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta focus:ring-2 focus:ring-celeste"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Categoría</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta font-bold"
                    >
                      <option value="sueno">🌙 Sueño & Descanso</option>
                      <option value="piel">🌸 Piel Delicada</option>
                      <option value="higiene">🛁 Higiene & Baño</option>
                      <option value="kits">🎁 Kits & Regalos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Etiqueta / Badge Promocional</label>
                    <input
                      type="text"
                      value={productForm.badge}
                      onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                      placeholder="Ej. MÁS VENDIDO, 15% OFF, NUEVO"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta focus:ring-2 focus:ring-celeste"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Precios y Oferta */}
              <div className="space-y-3 p-4 bg-cian rounded-2xl border border-borde">
                <h4 className="font-bold text-secondary text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-secondary" /> Precios y Estado de Promoción
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Precio de Venta ($ COP) *</label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      placeholder="28500"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-azul font-black focus:ring-2 focus:ring-celeste text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">
                      ¿Está en Oferta / Promoción?
                    </label>
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, isPromo: !productForm.isPromo })}
                      className={`w-full py-2.5 rounded-xl text-xs font-black transition-all ${
                        productForm.isPromo
                          ? 'bg-secondary text-white shadow-sm'
                          : 'bg-borde text-tinta-suave hover:bg-borde'
                      }`}
                    >
                      {productForm.isPromo ? '🔥 SÍ (EN PROMOCIÓN)' : 'NO (PRECIO REGULAR)'}
                    </button>
                  </div>

                  {productForm.isPromo && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-secondary mb-1">
                        Precio Anterior / Sin Descuento ($ COP)
                      </label>
                      <input
                        type="number"
                        value={productForm.originalPrice}
                        onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                        placeholder="Ej. 35000"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-tinta font-bold focus:ring-2 focus:ring-celeste"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 3: Imágenes */}
              <div className="space-y-3 p-4 bg-cian rounded-2xl border border-borde">
                <h4 className="font-bold text-tinta text-xs uppercase tracking-wide flex items-center gap-1.5 text-azul">
                  <ImageIcon className="w-4 h-4 text-azul" /> Imágenes del Producto
                </h4>

                <div className="space-y-4">
                  <ImageUploader
                    section="productos"
                    required
                    label="Imagen principal"
                    value={productForm.image}
                    onChange={(url) => setProductForm({ ...productForm, image: url })}
                    hint="La que sale en el catálogo y como portada de la ficha."
                  />

                  {/* Galería: el campo sigue siendo una lista separada por comas,
                      pero se administra con miniaturas en vez de a mano. */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                      Imágenes adicionales
                    </label>

                    {(() => {
                      const galeria = String(productForm.additionalImages || '')
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean);

                      const guardar = (lista: string[]) =>
                        setProductForm({ ...productForm, additionalImages: lista.join(', ') });

                      return (
                        <>
                          {galeria.length > 0 && (
                            <ul className="flex flex-wrap gap-2 mb-3">
                              {galeria.map((url: string, i: number) => (
                                <li
                                  key={`${url}-${i}`}
                                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-borde bg-white"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => guardar(galeria.filter((_: string, j: number) => j !== i))}
                                    title="Quitar"
                                    className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-white/90 border border-borde text-tinta-suave hover:text-secondary transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          <ImageUploader
                            section="productos"
                            label="Agregar otra"
                            value=""
                            onChange={(url) => url && guardar([...galeria, url])}
                            hint="Se van sumando a la galería de la ficha. Puedes subirlas de a una."
                          />
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Sección 4: Opciones de Producto (Tallas y Fragancias) */}
              <div className="space-y-3 p-4 bg-cian rounded-2xl border border-borde">
                <h4 className="font-bold text-azul text-xs uppercase tracking-wide">
                  Opciones Seleccionables (Tallas & Aromas)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">
                      Presentaciones / Tallas (Separadas por coma)
                    </label>
                    <input
                      type="text"
                      value={productForm.sizes}
                      onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                      placeholder="150ml:28500, 250ml:39900, Pack x3"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta font-bold"
                    />
                    <p className="text-[10px] text-tinta-suave mt-1">
                      Para cobrar distinto por presentación, escribe{' '}
                      <span className="font-bold text-azul">250ml:39900</span>. La que no
                      lleve precio se cobra al precio base de arriba.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">
                      Fragancias / Aromas (Separadas por coma)
                    </label>
                    <input
                      type="text"
                      value={productForm.fragrances}
                      onChange={(e) => setProductForm({ ...productForm, fragrances: e.target.value })}
                      placeholder="Flores Silvestres, Manzanilla, Sin Fragancia"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 5: Detalles Médicos, Beneficios e Ingredientes */}
              <div className="space-y-3 p-4 bg-cian rounded-2xl border border-borde">
                <h4 className="font-bold text-tinta text-xs uppercase tracking-wide flex items-center gap-1.5 text-azul">
                  <ShieldCheck className="w-4 h-4 text-azul" /> Detalles Clínicos y Descripción
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Descripción Completa *</label>
                    <textarea
                      rows={3}
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Escribe la descripción del producto..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta focus:ring-2 focus:ring-celeste"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-azul mb-1">
                      🛡️ Composición de la fórmula *
                    </label>
                    <input
                      type="text"
                      value={productForm.pediatricGuarantee}
                      onChange={(e) => setProductForm({ ...productForm, pediatricGuarantee: e.target.value })}
                      placeholder="Ej. Vegano, sin parabenos, sin colorantes"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-azul font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Proclamas aprobadas</label>
                    <input
                      type="text"
                      value={productForm.safetyInfo}
                      onChange={(e) => setProductForm({ ...productForm, safetyInfo: e.target.value })}
                      placeholder="Ej. Dermatológicamente testeado • Libre de Alcohol • Hipoalergénico"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-tinta-suave mb-1">
                        Beneficios (Separados por coma)
                      </label>
                      <textarea
                        rows={2}
                        value={productForm.benefits}
                        onChange={(e) => setProductForm({ ...productForm, benefits: e.target.value })}
                        placeholder="Induce sueño profundo, Calma irritaciones"
                        className="w-full px-3.5 py-2 rounded-xl border border-borde bg-white text-tinta"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-tinta-suave mb-1">
                        Ingredientes (Separados por coma)
                      </label>
                      <textarea
                        rows={2}
                        value={productForm.ingredients}
                        onChange={(e) => setProductForm({ ...productForm, ingredients: e.target.value })}
                        placeholder="Aceite esencial de lavanda, Extracto de manzanilla"
                        className="w-full px-3.5 py-2 rounded-xl border border-borde bg-white text-tinta"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 6: Visibilidad */}
              <div className="p-4 bg-amarillo rounded-2xl border border-borde flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Star className="w-6 h-6 text-tertiary fill-amarillo shrink-0" />
                  <div>
                    <h5 className="font-extrabold text-tinta text-xs">Visibilidad en 2da Sección de Inicio</h5>
                    <p className="text-[11px] text-tinta">
                      Muestra este producto en los esenciales de la página principal.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setProductForm({ ...productForm, isFeatured: !productForm.isFeatured })}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shrink-0 ${
                    productForm.isFeatured
                      ? 'bg-tertiary text-white shadow-sm'
                      : 'bg-borde text-tinta-suave'
                  }`}
                >
                  {productForm.isFeatured ? '⭐ MOSTRAR EN INICIO' : 'SOLO EN CATÁLOGO'}
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-borde flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-tinta-suave hover:bg-cian transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={isSavingProduct}
                className="btn-ensueno-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 transition-transform"
              >
                {isSavingProduct
                  ? 'Guardando...'
                  : editingProduct
                  ? 'Guardar Cambios de Producto'
                  : 'Crear & Publicar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN Y CREACIÓN DE PROMOCIONES Y COMBOS (SECCIÓN 3 INICIO) */}
      {showPromoModal && (
        <div className="fixed inset-0 z-[99999] bg-tinta/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-borde max-w-2xl w-full rounded-3xl p-6 sm:p-8 text-tinta shadow-2xl space-y-6 relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-borde pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-tinta bg-amarillo px-3 py-1 rounded-full border border-borde">
                  {editingPromo ? 'Editar Promoción / Combo' : 'Nueva Promoción para Sección 3 Inicio'}
                </span>
                <h3 className="font-black text-xl text-tinta mt-1">
                  {editingPromo ? `Modificar "${editingPromo.title}"` : 'Crear Combo Promocional'}
                </h3>
              </div>

              <button
                onClick={() => setShowPromoModal(false)}
                className="text-tinta-suave hover:text-tinta-suave p-1.5 rounded-full hover:bg-cian transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-5 text-xs font-semibold">
              {/* Sección 1: Información de la Oferta */}
              <div className="space-y-3 p-4 bg-amarillo rounded-2xl border border-borde">
                <h4 className="font-bold text-tinta text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-tertiary" /> Título y Eslogan de la Oferta
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Título de la Promoción *</label>
                    <input
                      type="text"
                      value={promoForm.title}
                      onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                      placeholder="Ej. Trío de Pañitos Húmedos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta font-bold focus:ring-2 focus:ring-celeste"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Eslogan / Tagline Superior</label>
                    <input
                      type="text"
                      value={promoForm.tagline}
                      onChange={(e) => setPromoForm({ ...promoForm, tagline: e.target.value })}
                      placeholder="Ej. Paga 2 y Lleva 3, Combo Dueto Fragancia"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Etiqueta Destacada / Badge</label>
                    <input
                      type="text"
                      value={promoForm.badge}
                      onChange={(e) => setPromoForm({ ...promoForm, badge: e.target.value })}
                      placeholder="Ej. OFERTA ESTRELLA ⭐, REGALO GRATIS 🎁"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Descripción de la Oferta</label>
                    <textarea
                      rows={3}
                      value={promoForm.subtitle}
                      onChange={(e) => setPromoForm({ ...promoForm, subtitle: e.target.value })}
                      placeholder="Ej. Lleva 3 paquetes de Pañitos Húmedos Ensueño y paga solo 2..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Precios y Mensaje de Ahorro */}
              <div className="space-y-3 p-4 bg-cian rounded-2xl border border-borde">
                <h4 className="font-bold text-azul text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-azul" /> Precios y Mensaje de Ahorro
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Precio Promocional ($ COP) *</label>
                    <input
                      type="number"
                      value={promoForm.price}
                      onChange={(e) => setPromoForm({ ...promoForm, price: e.target.value })}
                      placeholder="37800"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-azul font-black text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">Precio Original Sin Oferta ($ COP)</label>
                    <input
                      type="number"
                      value={promoForm.originalPrice}
                      onChange={(e) => setPromoForm({ ...promoForm, originalPrice: e.target.value })}
                      placeholder="56700"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta-suave font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-azul mb-1">
                      Texto Destacado de Ahorro
                    </label>
                    <input
                      type="text"
                      value={promoForm.savingText}
                      onChange={(e) => setPromoForm({ ...promoForm, savingText: e.target.value })}
                      placeholder="Ej. Ahorras $18.900 COP o Pañitos Húmedos GRATIS"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-azul font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Multimedia (Imagen & Video) */}
              <div className="space-y-3 p-4 bg-cian rounded-2xl border border-borde">
                <h4 className="font-bold text-tinta text-xs uppercase tracking-wide flex items-center gap-1.5 text-azul">
                  <ImageIcon className="w-4 h-4 text-azul" /> Multimedia del Artículo (Imagen & Video)
                </h4>

                <div className="space-y-3">
                  <ImageUploader
                    section="promociones"
                    label="Imagen promocional"
                    value={promoForm.imageUrl}
                    onChange={(url) => setPromoForm({ ...promoForm, imageUrl: url })}
                    hint="La que acompaña al combo en la portada."
                  />

                  <div>
                    <label className="block text-[11px] font-bold text-tinta-suave mb-1">
                      🎬 URL Video Promocional (MP4, WebM o YouTube)
                    </label>
                    <input
                      type="url"
                      value={promoForm.videoUrl}
                      onChange={(e) => setPromoForm({ ...promoForm, videoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... o https://midominio.com/video.mp4"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-borde bg-white text-tinta"
                    />
                    {promoForm.videoUrl && (
                      <div className="mt-2 w-full h-36 rounded-xl overflow-hidden bg-tinta/70 border border-borde relative">
                        {promoForm.videoUrl.includes('youtube.com') || promoForm.videoUrl.includes('youtu.be') ? (
                          <iframe
                            src={promoForm.videoUrl.replace('watch?v=', 'embed/')}
                            className="w-full h-full border-0"
                            title="Vista previa video"
                          />
                        ) : (
                          <video src={promoForm.videoUrl} controls className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 4: Tipo de Artículo */}
              <div className="p-4 bg-celeste rounded-2xl border border-borde flex items-center justify-between gap-3">
                <div>
                  <h5 className="font-extrabold text-azul text-xs">🛍️ Producto Independiente de Promoción</h5>
                  <p className="text-[11px] text-azul">
                    Este combo se agregará al carrito como un producto armado independiente con su propio título, precio final, imágenes y videos.
                  </p>
                </div>
                <span className="bg-azul text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
                  Combo Autónomo
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-borde flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-tinta-suave hover:bg-cian transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSavePromo}
                disabled={isSavingPromo}
                className="px-6 py-2.5 rounded-xl bg-tertiary hover:bg-tertiary text-white text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 transition-transform"
              >
                {isSavingPromo
                  ? 'Guardando...'
                  : editingPromo
                  ? 'Guardar Cambios de la Promoción'
                  : 'Crear & Publicar Promoción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Cuenta */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-tinta/70 flex items-center justify-center p-4">
          <div className="bg-white border border-borde max-w-md w-full rounded-3xl p-6 text-tinta shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-borde pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-azul" />
                <h3 className="font-bold text-lg text-tinta">Cambiar Contraseña Admin</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-tinta-suave hover:text-tinta-suave p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-tinta-suave uppercase mb-1">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-cian border border-borde text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta-suave uppercase mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 rounded-xl bg-cian border border-borde text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta-suave uppercase mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full px-4 py-2.5 rounded-xl bg-cian border border-borde text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-celeste"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl border border-borde text-xs font-semibold text-tinta-suave hover:bg-cian"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-6 py-2 rounded-xl bg-azul hover:bg-azul-hondo text-white font-bold text-xs shadow-md"
                >
                  {isChangingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN Y EDICIÓN DE TIPS */}
      {showTipForm && (
        <div className="fixed inset-0 z-[99999] bg-tinta/70 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
            <form
              onSubmit={handleSaveTip}
              className="bg-white border border-borde max-w-3xl w-full rounded-3xl p-6 sm:p-8 text-tinta shadow-2xl space-y-6 relative my-4"
            >
              <div className="flex items-start justify-between gap-4 border-b border-borde pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-azul bg-cian px-3 py-1 rounded-full border border-borde">
                    {editingTipId ? 'Editar tip' : 'Nuevo tip'}
                  </span>
                  <h3 className="font-black text-xl text-tinta mt-1.5">
                    {editingTipId ? 'Modificar guía del blog' : 'Crear guía para el blog'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTipForm(false)}
                  className="text-tinta-suave hover:text-tinta-suave p-1.5 rounded-full hover:bg-cian transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* --- Contenido principal --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={tipForm.title}
                    onChange={(e) => setTipForm({ ...tipForm, title: e.target.value })}
                    placeholder="La rutina de 10 minutos para dormirse sin llanto"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={tipForm.subtitle}
                    onChange={(e) => setTipForm({ ...tipForm, subtitle: e.target.value })}
                    placeholder="Tres pasos sencillos para señalizar el descanso"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={tipForm.category}
                    onChange={(e) => setTipForm({ ...tipForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  >
                    <option value="sueno">Sueño Infantil</option>
                    <option value="piel">Piel Delicada</option>
                    <option value="higiene">Higiene &amp; Cuidados</option>
                    <option value="rutinas">Rutinas Diarias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Tiempo de lectura
                  </label>
                  <input
                    type="text"
                    value={tipForm.readTime}
                    onChange={(e) => setTipForm({ ...tipForm, readTime: e.target.value })}
                    placeholder="4 min lectura"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Autor
                  </label>
                  <input
                    type="text"
                    value={tipForm.author}
                    onChange={(e) => setTipForm({ ...tipForm, author: e.target.value })}
                    placeholder="Dra. Mariana Restrepo"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Cargo del autor
                  </label>
                  <input
                    type="text"
                    value={tipForm.authorRole}
                    onChange={(e) => setTipForm({ ...tipForm, authorRole: e.target.value })}
                    placeholder="Pediatra y Especialista en Sueño Infantil"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Fecha mostrada
                  </label>
                  <input
                    type="text"
                    value={tipForm.date}
                    onChange={(e) => setTipForm({ ...tipForm, date: e.target.value })}
                    placeholder="24 Jul 2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">Si lo dejas vacío se usa la de hoy.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={tipForm.sortOrder}
                    onChange={(e) => setTipForm({ ...tipForm, sortOrder: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">Menor número aparece primero.</p>
                </div>
              </div>

              {/* --- Portada: imagen o video --- */}
              <div className="border-t border-borde pt-5 space-y-4">
                <h4 className="font-black text-sm text-tinta flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-azul" /> Portada del artículo
                </h4>

                <ImageUploader
                  section="tips"
                  aspect="wide"
                  label="Imagen de portada"
                  value={tipForm.image}
                  onChange={(url) => setTipForm({ ...tipForm, image: url })}
                  hint="Se ve en el listado de /tips y encabezando el artículo."
                />

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-secondary" /> Link de YouTube
                  </label>
                  <input
                    type="url"
                    value={tipForm.videoUrl}
                    onChange={(e) => setTipForm({ ...tipForm, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">
                    Si pones un video, reemplaza a la imagen en el artículo. Acepta formato normal,
                    corto (youtu.be) o Shorts.
                  </p>

                  {/* Previsualización real del embed */}
                  {tipForm.videoUrl && (
                    tipVideoEmbed(tipForm.videoUrl) ? (
                      <div className="mt-3 relative aspect-video rounded-2xl overflow-hidden border border-borde bg-tinta/70">
                        <iframe
                          src={tipVideoEmbed(tipForm.videoUrl)!}
                          title="Vista previa del video"
                          className="absolute inset-0 w-full h-full border-0"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] font-bold text-secondary">
                        No reconocemos ese link de YouTube. Revísalo.
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* --- Texto --- */}
              <div className="border-t border-borde pt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Resumen
                  </label>
                  <textarea
                    rows={2}
                    value={tipForm.summary}
                    onChange={(e) => setTipForm({ ...tipForm, summary: e.target.value })}
                    placeholder="Lo que aparece en la tarjeta del listado."
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Contenido
                  </label>
                  <textarea
                    rows={8}
                    value={tipForm.content}
                    onChange={(e) => setTipForm({ ...tipForm, content: e.target.value })}
                    placeholder={'Primer párrafo.\n\nSegundo párrafo.\n\nTercer párrafo.'}
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste leading-relaxed"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">
                    Separa los párrafos con una línea en blanco.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-tinta-suave mb-1.5">
                    Etiquetas
                  </label>
                  <input
                    type="text"
                    value={tipForm.tags}
                    onChange={(e) => setTipForm({ ...tipForm, tags: e.target.value })}
                    placeholder="rutina, sueño, recién nacido"
                    className="w-full px-4 py-2.5 rounded-xl border border-borde text-sm bg-cian focus:outline-none focus:ring-2 focus:ring-celeste"
                  />
                  <p className="text-[10px] text-tinta-suave mt-1">Separadas por comas.</p>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tipForm.isPublished}
                    onChange={(e) => setTipForm({ ...tipForm, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded accent-azul"
                  />
                  <span className="text-xs font-bold text-tinta-suave">
                    Publicado (visible en el sitio)
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-borde pt-5">
                <button
                  type="button"
                  onClick={() => setShowTipForm(false)}
                  className="px-6 py-2.5 rounded-xl border border-borde text-tinta-suave hover:bg-cian font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTip}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-azul hover:bg-azul-hondo text-white font-bold text-xs shadow-md disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {savingTip ? 'Guardando…' : editingTipId ? 'Guardar cambios' : 'Crear tip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
