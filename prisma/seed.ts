import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('[seed.ts] Error de configuración: La variable de entorno DATABASE_URL es obligatoria para la siembra (seeding).');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando carga de datos (Seeding)...');

  // 1. Crear usuario Administrador
  const seedPassword = process.env.ADMIN_SEED_PASSWORD || 'AdminEnsueno2026*';
  const adminPasswordHash = await bcrypt.hash(seedPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ensueno.com.co' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
    create: {
      email: 'admin@ensueno.com.co',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      motherProfile: {
        create: {
          fullName: 'Administrador Ensueño',
          phone: '+57 300 000 0000',
          city: 'Bogotá',
          department: 'Cundinamarca',
        },
      },
    },
  });
  console.log('✅ Usuario Administrador creado/actualizado:', admin.email);

  // 2. Sembrar los 6 Productos Estrella con URLs de Imágenes Editables
  const products = [
    {
      slug: 'panitos-humedos',
      name: 'Pañitos Húmedos Ensueño',
      subtitle: 'Limpieza pura con extracto de algodón orgánico y manzanilla',
      category: 'higiene',
      price: 18900,
      originalPrice: 22000,
      image: 'https://res.cloudinary.com/io8kzyuj/image/upload/ensueno/productos/panitos-humedos.webp',
      additionalImages: [
        'https://res.cloudinary.com/io8kzyuj/image/upload/ensueno/productos/panitos-humedos.webp',
      ],
      badge: 'ESENCIAL DIARIO',
      fragrances: ['Manzanilla & Algodón', 'Sin Fragancia'],
      sizes: ['Paquete x80 telas', 'Pack x3 Paquetes'],
      description:
        'Pañitos ultra-gruesos y resistentes elaborados con fibras de algodón 100% natural. Enriquecidos con agua pura desmineralizada y extracto de manzanilla para limpiar la piel delicada del bebé sin causar irritación ni enrojecimientos.',
      benefits: [
        'Tejido ultra-suave resistente de 3 capas',
        'Sin alcohol, parabenos ni perfume sintético',
        'Fórmula con 99% de agua purificada',
        'Cierre hermético tipo tapa rígida para conservar la humedad',
      ],
      ingredients: [
        'Agua Purificada (99%)',
        'Extracto de Flor de Manzanilla',
        'Glicerina Vegetal Humectante',
        'Extracto de Fibras de Algodón Orgánico',
      ],
      safetyInfo: 'Dermatológicamente comprobados • Hipoalergénicos • Probados en pieles sensibles',
      inStock: true,
      isFeatured: true,
      sortOrder: 1,
    },
    {
      slug: 'colonia-ensueno',
      name: 'Colonia Ensueño',
      subtitle: 'El aroma dulce que abraza sus días con caricias de flor de azahar',
      category: 'sueno',
      price: 28500,
      originalPrice: 32000,
      image: 'https://res.cloudinary.com/io8kzyuj/image/upload/ensueno/productos/colonia.webp',
      additionalImages: ['https://res.cloudinary.com/io8kzyuj/image/upload/ensueno/productos/colonia.webp'],
      badge: 'AROMA FAVORITO',
      fragrances: ['Flores Silvestres & Lavanda', 'Brisa de Nube'],
      sizes: ['150ml', '250ml'],
      description:
        'Brisa fresca con notas de lavanda suave, flor de azahar y sutiles toques cítricos. Formulada sin alcohol para perfumar delicadamente la ropita, el peluche o la piel de tu bebé después del baño.',
      benefits: [
        'Fórmula 0% alcohol que respeta la barrera cutánea',
        'Aroma científicamente testeado para inducir calma',
        'No mancha la ropa ni genera alergias',
      ],
      ingredients: [
        'Agua Desionizada',
        'Esencia Natural de Lavanda de Provenza',
        'Extracto de Flor de Azahar',
        'Aceite de Ricino Hidrogenado',
      ],
      safetyInfo: 'Dermatológicamente comprobados • Hipoalergénicos • Probados en pieles sensibles',
      inStock: true,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      slug: 'mantequilla-corporal-ensueno',
      name: 'Mantequilla Corporal Ensueño',
      subtitle: 'Hidratación profunda 24h con Avena Coloidal & Manteca de Karité',
      category: 'piel',
      price: 32000,
      originalPrice: 38000,
      image: 'https://res.cloudinary.com/io8kzyuj/image/upload/ensueno/productos/mantequilla-corporal.webp',
      additionalImages: ['https://res.cloudinary.com/io8kzyuj/image/upload/ensueno/productos/mantequilla-corporal.webp'],
      badge: 'ULTRA HUMECTANTE',
      fragrances: ['Algodón & Karité', 'Sin Fragancia'],
      sizes: ['250ml', '500ml con dosificador'],
      description:
        'Loción corporal de textura suave que se absorbe al instante sin dejar sensación grasosa. Nutre en profundidad la piel frágil del lactante, protegiéndola contra la resequedad del viento y cambios de temperatura.',
      benefits: [
        'Humectación continua clínicamente probada por 24 horas',
        'Restaura la capa lipídica natural de la piel',
        'Fórmula hipoalergénica probada en pieles sensibles y atópicas',
      ],
      ingredients: [
        'Avena Coloidal Orgánica',
        'Manteca de Karité Bio',
        'Aceite de Jojoba',
        'Vitamina E y Pantenol Pro-V5',
      ],
      safetyInfo: 'Dermatológicamente comprobados • Hipoalergénicos • Probados en pieles sensibles',
      inStock: true,
      isFeatured: true,
      sortOrder: 3,
    },
    {
      slug: 'balsamo-sueno-ensueno',
      name: 'Bálsamo de Sueño Reparador',
      subtitle: 'Masaje nocturno de lavanda y manzanilla para un descanso ininterrumpido',
      category: 'sueno',
      price: 24900,
      originalPrice: 29000,
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop',
      additionalImages: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop'],
      badge: 'RUTINA NOCTURNA',
      fragrances: ['Lavanda de Provenza & Manzanilla'],
      sizes: ['50g', '100g'],
      description:
        'Bálsamo suave para masajes en pechito, espaldita y plantas de los pies. Sus aceites esenciales puros ayudan a relajar los músculos y preparar el sistema nervioso del bebé para un sueño profundo.',
      benefits: [
        'Facilita la transición al sueño profundo',
        'Textura que se derrite al contacto con la piel',
        '100% ingredientes de origen botánico natural',
      ],
      ingredients: ['Cera de Abeja Orgánica', 'Aceite de Lavanda', 'Aceite de Manzanilla Romana', 'Aceite de Almendras Dulces'],
      safetyInfo: 'Dermatológicamente comprobados • Hipoalergénicos • Probados en pieles sensibles',
      inStock: true,
      isFeatured: true,
      sortOrder: 4,
    },
    {
      slug: 'jabon-bano-ensueno',
      name: 'Jabón Líquido Baño Relajante',
      subtitle: 'Fórmula sin lágrimas con caléndula y proteína de leche',
      category: 'higiene',
      price: 26000,
      originalPrice: 30000,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop',
      additionalImages: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop'],
      badge: 'SIN LÁGRIMAS',
      fragrances: ['Caléndula & Miel Suave'],
      sizes: ['300ml', '500ml'],
      description:
        'Gel de baño 2 en 1 para cuerpo y cabello. Limpia con delicadeza manteniendo el pH fisiológico de la piel sin irritar los ojos del bebé.',
      benefits: [
        'Fórmula oftalmológicamente probada Sin Lágrimas',
        'Limpia cabello y piel en un solo paso',
        'Espuma cremosa y fácil de enjuagar',
      ],
      ingredients: ['Agua de Caléndula', 'Proteína Hidrolizada de Leche', 'Tensoactivos Botánicos Suaves'],
      safetyInfo: 'Dermatológicamente comprobados • Hipoalergénicos • Probados en pieles sensibles',
      inStock: true,
      isFeatured: true,
      sortOrder: 5,
    },
    {
      slug: 'kit-sueno-dorado',
      name: 'Kit Completo Sueño Dorado',
      subtitle: 'La rutina completa de 4 pasos para noches tranquilas y piel protegida',
      category: 'kits',
      price: 79900,
      originalPrice: 101400,
      image: 'https://images.unsplash.com/photo-1512290900673-700204753051?q=80&w=800&auto=format&fit=crop',
      additionalImages: ['https://images.unsplash.com/photo-1512290900673-700204753051?q=80&w=800&auto=format&fit=crop'],
      badge: 'AHORRA 20%',
      fragrances: ['Línea Lavanda & Manzanilla'],
      sizes: ['Kit Edición Especial con Neceser Gratis'],
      description:
        'El regalo y aliado perfecto para mamás. Incluye Pañitos Húmedos, Colonia, Mantequilla Corporal y Bálsamo de Sueño a un precio especial con bolsa organizadora de regalo.',
      benefits: [
        'Incluye los 4 productos esenciales de la rutina nocturna',
        'Neceser impermeable de transporte de regalo',
        'Excelente opción para regalo de Baby Shower',
      ],
      ingredients: ['Combinación completa de ingredientes naturales de la línea Ensueño'],
      safetyInfo: 'Dermatológicamente comprobados • Hipoalergénicos • Probados en pieles sensibles',
      inStock: true,
      isFeatured: true,
      sortOrder: 6,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: prod,
      create: prod,
    });
  }
  console.log('✅ 6 Productos Estrella sembrados en la BD con URLs de imágenes.');

  // 3. Sembrar Promociones Dinámicas con URLs de Imagen Banner
  const promotions = [
    {
      title: 'Promoción Noches Tranquilas: 20% OFF en Kits',
      subtitle: 'Lleva el Kit Sueño Dorado y recibe envío gratis a toda Colombia',
      code: 'SUENO2026',
      discountPercent: 20,
      imageUrl: 'https://images.unsplash.com/photo-1512290900673-700204753051?q=80&w=1200&auto=format&fit=crop',
      targetBabyStage: 'Recién Nacido',
      isActive: true,
    },
    {
      title: 'Especial Etapa Embarazo - Kit Mamá Primeriza',
      subtitle: 'Prepárate para la llegada de tu bebé con cuidados puros',
      code: 'MAMA20',
      discountPercent: 15,
      imageUrl: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=1200&auto=format&fit=crop',
      targetBabyStage: 'Embarazo',
      isActive: true,
    },
  ];

  for (const promo of promotions) {
    await prisma.promotion.upsert({
      where: { code: promo.code },
      update: promo,
      create: promo,
    });
  }
  console.log('✅ Promociones sembradas.');

  console.log('🎉 Carga de datos completada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
