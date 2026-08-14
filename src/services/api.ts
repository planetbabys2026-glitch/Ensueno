import { Product, Order, UserProfile, Tip } from '@/types';
import type { RolPanel } from '@/lib/permisos';

export const apiService = {
  async getProducts(category?: string, query?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('q', query);

    const res = await fetch(`/api/v1/products?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    return json.data || [];
  },

  async getProductById(id: string): Promise<Product | null> {
    const res = await fetch(`/api/v1/products/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  },

  async updateProductImage(id: string, image: string, additionalImages?: string[]) {
    const res = await fetch('/api/v1/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, image, additionalImages }),
    });
    return res.json();
  },

  async createProduct(data: Partial<Product>) {
    const res = await fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateProduct(id: string, data: Partial<Product>) {
    const res = await fetch('/api/v1/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    return res.json();
  },

  /** Productos retirados de la tienda. Fuera del panel responde 401 y da []. */
  async getArchivedProducts(): Promise<Product[]> {
    const res = await fetch('/api/v1/products?scope=archivados', { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  /** Retira el producto de la tienda. No lo borra: conserva su historial. */
  async deleteProduct(id: string) {
    const res = await fetch(`/api/v1/products?id=${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  /** Devuelve a la tienda un producto retirado. */
  async restoreProduct(id: string) {
    return this.updateProduct(id, { archived: false } as Partial<Product>);
  },

  async getPromotions(stage?: string, includeAll = false) {
    const params = new URLSearchParams();
    if (stage) params.append('stage', stage);
    if (includeAll) params.append('all', 'true');
    const res = await fetch(`/api/v1/promotions?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    return json.data || [];
  },

  async createPromotion(data: any) {
    const res = await fetch('/api/v1/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updatePromotion(id: string, data: any) {
    const res = await fetch('/api/v1/promotions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    return res.json();
  },

  async deletePromotion(id: string) {
    const res = await fetch(`/api/v1/promotions?id=${id}`, { method: 'DELETE' });
    return res.json();
  },

  // --- REVIEWS ---
  reviews: {
    async getByProductId(productId: string) {
      const res = await fetch(`/api/v1/reviews?productId=${productId}`, { cache: 'no-store' });
      const json = await res.json();
      return json.data || [];
    },
    async create(data: { productId: string; rating: number; comment: string }) {
      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async update(id: string, data: { rating: number; comment: string }) {
      const res = await fetch('/api/v1/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      return res.json();
    },
    async delete(id: string) {
      const res = await fetch(`/api/v1/reviews?id=${id}`, { method: 'DELETE' });
      return res.json();
    }
  },

  async createOrder(orderPayload: any): Promise<{ order: Order; mercadopago: any }> {
    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    const json = await res.json();
    if (!json.success) {
      const err = new Error(json.error || 'Error al crear orden') as any;
      err.pendingOrderNumber = json.pendingOrderNumber;
      throw err;
    }
    return { order: json.data, mercadopago: json.mercadopago };
  },

  async getUserOrders() {
    const res = await fetch('/api/v1/orders', { cache: 'no-store' });
    const json = await res.json();
    return json.data || [];
  },

  async login(email: string, password: string) {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async register(data: any) {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getCurrentUser() {
    const res = await fetch('/api/v1/auth/me', { cache: 'no-store' });
    return res.json();
  },

  async updateUserProfile(data: any) {
    const res = await fetch('/api/v1/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getSavedAddresses() {
    const res = await fetch('/api/v1/user/addresses', { cache: 'no-store' });
    return res.json();
  },

  async addSavedAddress(data: { title?: string; department: string; city: string; address: string; isDefault?: boolean }) {
    const res = await fetch('/api/v1/user/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateSavedAddress(data: { id: string; title?: string; department: string; city: string; address: string; isDefault?: boolean }) {
    const res = await fetch('/api/v1/user/addresses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSavedAddress(id: string) {
    const res = await fetch(`/api/v1/user/addresses?id=${id}`, { method: 'DELETE' });
    return res.json();
  },

  async requestPasswordReset(email: string) {
    const res = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  async verifyEmail(email: string, code: string) {
    const res = await fetch('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return res.json();
  },

  async resendVerificationCode(email: string) {
    const res = await fetch('/api/v1/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  async resetPassword(token: string, newPassword: string, email?: string) {
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, code: token, email, newPassword }),
    });
    return res.json();
  },

  async getAdminRemarketingData() {
    const res = await fetch('/api/v1/admin/remarketing', { cache: 'no-store' });
    return res.json();
  },

  // ---------------- Métricas y seguimiento ----------------

  async getAnalytics(dias = 0) {
    const res = await fetch(`/api/v1/admin/analytics${dias ? `?dias=${dias}` : ''}`, { cache: 'no-store' });
    return res.json();
  },

  async getFollowUps() {
    const res = await fetch('/api/v1/admin/followups', { cache: 'no-store' });
    return res.json();
  },

  async saveFollowUp(payload: Record<string, any>) {
    const res = await fetch('/api/v1/admin/followups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ---------------- Hero de la portada ----------------

  async getHero(includeAll = false) {
    const res = await fetch(`/api/v1/hero${includeAll ? '?includeAll=true' : ''}`, { cache: 'no-store' });
    return res.json();
  },

  async createHeroSlide(data: any) {
    const res = await fetch('/api/v1/hero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateHeroSlide(id: string, data: any) {
    const res = await fetch('/api/v1/hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    return res.json();
  },

  async moveHeroSlide(id: string, direction: 'up' | 'down') {
    const res = await fetch('/api/v1/hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'move', direction }),
    });
    return res.json();
  },

  async updateHeroConfig(intervalMs: number) {
    const res = await fetch('/api/v1/hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'config', intervalMs }),
    });
    return res.json();
  },

  async deleteHeroSlide(id: string) {
    const res = await fetch(`/api/v1/hero?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.json();
  },

  // ---------------- Equipo del panel ----------------

  async listAdminUsers() {
    const res = await fetch('/api/v1/admin/users', { cache: 'no-store' });
    return res.json();
  },

  async inviteAdminUser(fullName: string, email: string, role: RolPanel = 'ADMIN') {
    const res = await fetch('/api/v1/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, role }),
    });
    return res.json();
  },

  async updateAdminInvite(inviteId: string, action: 'resend' | 'revoke') {
    const res = await fetch('/api/v1/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, action }),
    });
    return res.json();
  },

  async revokeAdminUser(userId: string) {
    const res = await fetch(`/api/v1/admin/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    return res.json();
  },

  /** Valida el enlace de invitación antes de pedir la contraseña. */
  async getInvitation(token: string) {
    const res = await fetch(`/api/v1/auth/accept-invite?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
    return res.json();
  },

  async acceptInvitation(token: string, password: string) {
    const res = await fetch('/api/v1/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    return res.json();
  },

  async sendRemarketingReminder(motherEmail: string, motherName: string, babyName: string, productTitle?: string) {
    const res = await fetch('/api/v1/admin/remarketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_reminder',
        motherEmail,
        motherName,
        babyName,
        productTitle,
      }),
    });
    return res.json();
  },

  async getTips(category?: string, query?: string, includeAll = false): Promise<Tip[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('q', query);
    if (includeAll) params.append('includeAll', 'true');

    const res = await fetch(`/api/v1/tips?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    return json.data || [];
  },

  async createTip(data: Partial<Tip>) {
    const res = await fetch('/api/v1/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateTip(id: string, data: Partial<Tip>) {
    const res = await fetch('/api/v1/tips', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    return res.json();
  },

  async deleteTip(id: string) {
    const res = await fetch(`/api/v1/tips?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.json();
  },
};
