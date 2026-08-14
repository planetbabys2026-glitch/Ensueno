import { prisma } from '@/lib/prisma';
import { Promotion } from '@/types';
import { parseSizePrices } from '@/lib/pricing';

/*
 * Este repositorio habla solo con PostgreSQL. No hay copia en memoria ni datos
 * de ejemplo detrás.
 *
 * Antes sí los había: cada consulta iba envuelta en un try/catch que, ante
 * cualquier error de Prisma, devolvía `MOCK_PRODUCTS` e `INITIAL_PROMOTIONS`.
 * En la práctica eso convertía un fallo en una mentira silenciosa: cuando el
 * cliente de Prisma quedó desfasado, la tienda pasó a servir tres productos
 * inventados —con calificación 4.9 y "142 reseñas" escritas a mano— sin que
 * nada fallara a la vista. Un catálogo falso que se puede añadir al carrito es
 * peor que una página que dice que no pudo cargar, así que ahora el error sube.
 */

/**
 * Qué productos entran en una consulta. La tienda siempre pide `activos`; el
 * panel es el único que puede pedir `archivados` para restaurarlos.
 */
export type ProductScope = 'activos' | 'archivados' | 'todos';

/**
 * Calificación real de un producto a partir de sus reseñas.
 *
 * Sin reseñas devuelve 0, no 5.0. Un producto recién creado no vale cinco
 * estrellas: `StarRating` lee `reviewsCount` y con 0 pinta las estrellas vacías
 * y el texto "Sin reseñas", que es lo que corresponde hasta que alguien opine.
 */
function calificacionReal(reviews: { rating: number }[]) {
  const reviewsCount = reviews.length;
  const rating =
    reviewsCount > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1))
      : 0;
  return { rating, reviewsCount };
}

export class ProductRepository {
  /**
   * Lista de productos. Si PostgreSQL falla, el error sube: la tienda muestra
   * su página de error en vez de un catálogo inventado.
   */
  async getProducts(category?: string, query?: string, scope: ProductScope = 'activos') {
    const where: any = {};
    // Los archivados solo salen si se piden a propósito.
    if (scope === 'activos') where.archivedAt = null;
    if (scope === 'archivados') where.archivedAt = { not: null };
    if (category && category !== 'todos') {
      where.category = category;
    }
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { subtitle: { contains: query, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        reviews: {
          select: { rating: true },
        },
      },
    });

    return products.map((p) => {
      const { reviews, ...rest } = p;
      return { ...rest, ...calificacionReal(reviews) };
    });
  }

  /**
   * Obtiene un producto por ID o Slug. Un producto archivado se comporta como
   * inexistente: la ficha responde 404 en vez de vender algo retirado.
   */
  async getProductById(idOrSlug: string, incluirArchivados = false) {
    // Handle Combos/Promotions seamlessly
    if (idOrSlug.startsWith('combo-') || idOrSlug.startsWith('promo-')) {
      const realPromoId = idOrSlug.replace('combo-', '');
      const promo =
        (await prisma.promotion.findUnique({ where: { id: realPromoId } })) ||
        (await prisma.promotion.findUnique({ where: { id: idOrSlug } }));

      if (promo) {
        const promoReviews = await prisma.review.findMany({
          where: { productId: `combo-${promo.id}` },
          select: { rating: true },
        });
        const { rating: avgRating, reviewsCount } = calificacionReal(promoReviews);

        return {
          id: `combo-${promo.id}`,
          slug: `combo-${promo.id}`,
          name: promo.title,
          subtitle: promo.tagline || promo.subtitle || 'Combo Especial de Promoción',
          category: 'kits',
          price: promo.price || 0,
          originalPrice: promo.originalPrice || null,
          rating: avgRating,
          reviewsCount,
          image: promo.imageUrl || 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop&q=80',
          badge: promo.badge || 'COMBO',
          fragrances: ['Combo Especial'],
          sizes: ['Pack Completo'],
          description: promo.subtitle || promo.description || '',
          benefits: promo.savingText ? [promo.savingText] : ['Ahorro Especial'],
          ingredients: [],
          safetyInfo: 'Dermatológicamente testeado • Hipoalergénico',
          inStock: true,
        };
      }
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        ...(incluirArchivados ? {} : { archivedAt: null }),
      },
      include: {
        reviews: { select: { rating: true } },
      },
    });

    if (!product) return null;

    const { reviews, ...rest } = product;
    return { ...rest, ...calificacionReal(reviews) };
  }

  /**
   * Crea un nuevo producto completo
   */
  async createProduct(data: any) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const productData = {
      name: data.name,
      subtitle: data.subtitle || '',
      category: data.category || 'sueno',
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
      image: data.image,
      additionalImages: data.additionalImages || [],
      badge: data.badge || null,
      fragrances: Array.isArray(data.fragrances) ? data.fragrances : typeof data.fragrances === 'string' ? data.fragrances.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      // Las presentaciones pueden venir como "150ml:28500, 250ml:39900": el
      // precio por variante viaja en el mismo campo y se separa aquí.
      ...(() => {
        const { sizes, sizePrices } = parseSizePrices(data.sizes);
        return { sizes, sizePrices: data.sizePrices ?? sizePrices };
      })(),
      description: data.description || '',
      benefits: Array.isArray(data.benefits) ? data.benefits : typeof data.benefits === 'string' ? data.benefits.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      ingredients: Array.isArray(data.ingredients) ? data.ingredients : typeof data.ingredients === 'string' ? data.ingredients.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      safetyInfo: data.safetyInfo || 'Dermatológicamente testeado',
      pediatricGuarantee: data.pediatricGuarantee || 'Vegano, libre de crueldad animal, sin parabenos, sin colorantes, sin sulfatos',
      inStock: data.inStock !== false,
      isFeatured: data.isFeatured !== false,
      slug,
    };

    return prisma.product.create({ data: productData });
  }

  /**
   * Actualiza un producto existente
   */
  async updateProduct(id: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice ? Number(data.originalPrice) : null;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.additionalImages !== undefined) updateData.additionalImages = data.additionalImages;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.safetyInfo !== undefined) updateData.safetyInfo = data.safetyInfo;
    if (data.pediatricGuarantee !== undefined) updateData.pediatricGuarantee = data.pediatricGuarantee;
    if (data.inStock !== undefined) updateData.inStock = Boolean(data.inStock);
    if (data.isFeatured !== undefined) updateData.isFeatured = Boolean(data.isFeatured);
    // `archived` es la palanca del panel; `archivedAt` es cómo se guarda.
    if (data.archived !== undefined) {
      updateData.archivedAt = data.archived ? new Date() : null;
    }

    if (data.fragrances !== undefined) {
      updateData.fragrances = Array.isArray(data.fragrances) ? data.fragrances : typeof data.fragrances === 'string' ? data.fragrances.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }
    if (data.sizes !== undefined) {
      const { sizes, sizePrices } = parseSizePrices(data.sizes);
      updateData.sizes = sizes;
      // `sizePrices` explícito gana; si no, se deriva de lo escrito en sizes.
      // Se asigna siempre para que borrar un precio en el panel lo borre de verdad.
      updateData.sizePrices = data.sizePrices !== undefined ? data.sizePrices : sizePrices;
    } else if (data.sizePrices !== undefined) {
      updateData.sizePrices = data.sizePrices;
    }
    if (data.benefits !== undefined) {
      updateData.benefits = Array.isArray(data.benefits) ? data.benefits : typeof data.benefits === 'string' ? data.benefits.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }
    if (data.ingredients !== undefined) {
      updateData.ingredients = Array.isArray(data.ingredients) ? data.ingredients : typeof data.ingredients === 'string' ? data.ingredients.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }

    return prisma.product.update({ where: { id }, data: updateData });
  }

  /**
   * Actualiza únicamente la imagen
   */
  async updateProductImage(id: string, mainImage: string, additionalImages?: string[]) {
    return this.updateProduct(id, { image: mainImage, ...(additionalImages ? { additionalImages } : {}) });
  }

  /**
   * Archiva un producto: lo saca de la tienda sin borrarlo.
   *
   * No es `delete` por una razón dura, no por gusto: `OrderItem.product` no
   * declara `onDelete`, así que Postgres lo trata como RESTRICT y un producto
   * con una sola venta no se puede borrar. Antes ese error caía en el catch,
   * se filtraba `memoryProducts` (que no contiene lo de la base) y se devolvía
   * `true`: el panel cantaba "eliminado" y el producto seguía en la tienda.
   */
  async archiveProduct(id: string) {
    return prisma.product.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  /** Devuelve un producto archivado a la tienda. */
  async restoreProduct(id: string) {
    return prisma.product.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  /**
   * Obtiene promociones activas
   */
  async getPromotions(targetStage?: string, includeAll: boolean = false) {
    const where: any = includeAll ? {} : { isActive: true };
    if (targetStage) {
      where.targetBabyStage = targetStage;
    }

    return prisma.promotion.findMany({
      where,
      include: { product: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Crea una nueva promoción / combo
   */
  async createPromotion(data: any) {
    const promoData = {
      title: data.title,
      subtitle: data.subtitle || null,
      code: data.code || null,
      badge: data.badge || 'OFERTA ESPECIAL ✨',
      badgeColor: data.badgeColor || 'secondary',
      tagline: data.tagline || '',
      description: data.description || '',
      savingText: data.savingText || '',
      price: data.price ? Number(data.price) : null,
      originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop&q=80',
      videoUrl: data.videoUrl || null,
      targetBabyStage: data.targetBabyStage || null,
      productId: data.productId || null,
      isActive: data.isActive !== false,
      sortOrder: data.sortOrder ? Number(data.sortOrder) : 0,
    };

    return prisma.promotion.create({ data: promoData });
  }

  /**
   * Actualiza una promoción / combo existente
   */
  async updatePromotion(id: string, data: any) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.badgeColor !== undefined) updateData.badgeColor = data.badgeColor;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.savingText !== undefined) updateData.savingText = data.savingText;
    if (data.price !== undefined) updateData.price = data.price ? Number(data.price) : null;
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice ? Number(data.originalPrice) : null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
    if (data.targetBabyStage !== undefined) updateData.targetBabyStage = data.targetBabyStage;
    if (data.productId !== undefined) updateData.productId = data.productId;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);

    return prisma.promotion.update({ where: { id }, data: updateData });
  }

  /**
   * Elimina una promoción por ID
   */
  async deletePromotion(id: string) {
    await prisma.promotion.delete({ where: { id } });
    return true;
  }
}

export const productRepository = new ProductRepository();
