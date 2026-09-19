export interface CityPageData {
  /** URL slug — the frontend route (bodas-<slug>) and this key must stay
   * in sync with backend/app/routers/seo.py's _STATIC_PATHS. */
  slug: string;
  /** Short city name for compact contexts (footer links) — the full
   * `title` is a whole sentence, too long there. */
  shortLabel: string;
  shortLabel_en: string;
  title: string;
  title_en: string;
  metaDescription: string;
  metaDescription_en: string;
  heroSubtitle: string;
  heroSubtitle_en: string;
  introTitle: string;
  introTitle_en: string;
  introBody: string;
  introBody_en: string;
}

export const CITY_PAGES: CityPageData[] = [
  {
    slug: "medellin",
    shortLabel: "Medellín",
    shortLabel_en: "Medellín",
    title: "Alquiler de carros clásicos para bodas en Medellín",
    title_en: "Classic car rental for weddings in Medellín",
    metaDescription: "Carros clásicos, vintage y modernos con conductor para tu boda en Medellín. Flota con base en la ciudad, precios desde $760.000, disponibilidad en tiempo real.",
    metaDescription_en: "Classic, vintage and modern cars with a driver for your wedding in Medellín. City-based fleet, prices from $760,000 COP, real-time availability.",
    heroSubtitle: "Nuestra base de operaciones desde 2017 — la mayoría de la flota está en Medellín, lista para tu boda en la ciudad o el área metropolitana.",
    heroSubtitle_en: "Our home base since 2017 — most of the fleet is in Medellín, ready for your wedding in the city or the greater metro area.",
    introTitle: "Carros con conductor en Medellín y el área metropolitana",
    introTitle_en: "Cars with a driver in Medellín and the metro area",
    introBody: "Camino a mi Boda opera desde Medellín desde 2017. La mayor parte de nuestra colección de vehículos clásicos, vintage y modernos está en la ciudad, así que para una boda en Medellín, Envigado, Bello, Copacabana, Itagüí o Sabaneta normalmente no hay costo adicional de desplazamiento. El servicio incluye conductor y las 4 horas estándar de alquiler; puedes ampliar horas si tu evento lo necesita. Consulta el precio y la disponibilidad real de cada vehículo para tu fecha antes de escribirnos — no hace falta pedir cotización solo para ver un número.",
    introBody_en: "Camino a mi Boda has operated out of Medellín since 2017. Most of our classic, vintage and modern vehicle collection is based in the city, so for a wedding in Medellín, Envigado, Bello, Copacabana, Itagüí or Sabaneta there's usually no extra travel fee. The service includes a driver and the standard 4-hour rental window; you can add hours if your event needs it. Check the real price and availability for your date before reaching out — you don't need to request a quote just to see a number.",
  },
  {
    slug: "rionegro-llanogrande",
    shortLabel: "Rionegro y Llanogrande",
    shortLabel_en: "Rionegro and Llanogrande",
    title: "Alquiler de carros clásicos para bodas en Rionegro y Llanogrande",
    title_en: "Classic car rental for weddings in Rionegro and Llanogrande",
    metaDescription: "Carros clásicos, vintage y modernos con conductor para tu boda en Rionegro y Llanogrande. Toda la flota se desplaza al oriente antioqueño, precios desde $760.000.",
    metaDescription_en: "Classic, vintage and modern cars with a driver for your wedding in Rionegro and Llanogrande. The whole fleet travels to Eastern Antioquia, prices from $760,000 COP.",
    heroSubtitle: "El oriente antioqueño es una de las zonas con más bodas del año — nuestra flota completa se desplaza hasta allá regularmente.",
    heroSubtitle_en: "Eastern Antioquia is one of the busiest wedding regions all year round — our whole fleet regularly travels there.",
    introTitle: "Carros con conductor en Rionegro, Llanogrande y el oriente antioqueño",
    introTitle_en: "Cars with a driver in Rionegro, Llanogrande and Eastern Antioquia",
    introBody: "Llanogrande y Rionegro concentran una buena parte de las fincas y salones de eventos donde se celebran bodas en Antioquia, y es una de las zonas donde trabajamos con más frecuencia. Aunque la flota tiene su base en Medellín, cada vehículo ya tiene un precio específico para Llanogrande (lo verás marcado como \"LLA\" junto al de Medellín en cada ficha) — no es una selección reducida de autos \"disponibles en Rionegro\", es la colección completa. Cubrimos también La Ceja, El Retiro y Guarne; si tu evento es en otro municipio del oriente, escríbenos y lo revisamos.",
    introBody_en: "Llanogrande and Rionegro are home to many of the farms and event venues where weddings happen in Antioquia, and it's one of the areas we work in most often. The fleet is based in Medellín, but every vehicle already has a specific Llanogrande price (marked \"LLA\" next to the Medellín one on each listing) — it's not a smaller subset of cars \"available in Rionegro\", it's the full collection. We also cover La Ceja, El Retiro and Guarne; if your event is somewhere else in the region, reach out and we'll take a look.",
  },
  {
    slug: "carmen-de-viboral",
    shortLabel: "El Carmen de Viboral",
    shortLabel_en: "El Carmen de Viboral",
    title: "Alquiler de carros clásicos para bodas en El Carmen de Viboral",
    title_en: "Classic car rental for weddings in El Carmen de Viboral",
    metaDescription: "Carros clásicos, vintage y modernos con conductor para tu boda en El Carmen de Viboral. Flota completa disponible en el oriente antioqueño, precios desde $760.000.",
    metaDescription_en: "Classic, vintage and modern cars with a driver for your wedding in El Carmen de Viboral. Full fleet available in Eastern Antioquia, prices from $760,000 COP.",
    heroSubtitle: "Un pueblo con carácter propio — carros clásicos que combinan bien con la tradición y la calidez de El Carmen.",
    heroSubtitle_en: "A town with real character — classic cars that fit right in with El Carmen's tradition and warmth.",
    introTitle: "Carros con conductor en El Carmen de Viboral",
    introTitle_en: "Cars with a driver in El Carmen de Viboral",
    introBody: "El Carmen de Viboral es conocido en toda Colombia por su loza de cerámica pintada a mano, y también es un destino frecuente para bodas en fincas y salones del oriente antioqueño. Trabajamos ahí regularmente con la misma flota completa que usamos en Medellín y Rionegro — un carro clásico o vintage con conductor encaja naturalmente con el ambiente del pueblo. El servicio incluye las 4 horas estándar de alquiler; si necesitas más tiempo o tu evento es en una vereda específica, cuéntanos los detalles por WhatsApp.",
    introBody_en: "El Carmen de Viboral is known across Colombia for its hand-painted ceramics, and it's also a popular wedding destination for farms and venues across Eastern Antioquia. We work there regularly with the same full fleet we use in Medellín and Rionegro — a classic or vintage car with a driver fits naturally with the town's character. The service includes the standard 4-hour rental window; if you need more time or your event is in a specific rural area nearby, tell us the details on WhatsApp.",
  },
];

export function findCityPage(slug: string | undefined): CityPageData | null {
  return CITY_PAGES.find(c => c.slug === slug) ?? null;
}
