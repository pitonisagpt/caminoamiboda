"""
Seed the first three blog posts for Camino a mi Boda.
Run from the project root: cd backend && python scripts/seed_blog.py
"""
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.blog_post import BlogPost

POSTS = [
    {
        "title": "¿Cuánto cuesta un carro clásico para boda en Medellín?",
        "slug": "cuanto-cuesta-carro-clasico-boda-medellin",
        "excerpt": "Todo lo que necesitas saber sobre el precio de un carro clásico para bodas en Medellín: rangos reales, qué incluye el servicio y cómo reservar sin sorpresas.",
        "content_md": """\
Si estás planeando tu boda en Medellín y quieres llegar en un carro clásico, la primera pregunta que surge es inevitable: **¿cuánto cuesta?**

La respuesta honesta es que depende de varios factores — pero en este artículo te damos los rangos reales para que puedas planear tu presupuesto sin vueltas.

## ¿Cuál es el precio de un carro clásico para boda en Medellín?

En Camino a mi Boda, nuestros vehículos clásicos tienen un precio que varía entre **COP $1.000.000 y $3.000.000** dependiendo del vehículo, la duración del servicio y la zona del evento.

Este rango cubre la gran mayoría de bodas: desde ceremonias íntimas hasta celebraciones completas con sesión de fotos incluida.

## ¿Qué factores afectan el precio?

### 1. El tipo de vehículo
No todos los carros clásicos tienen el mismo valor. Un Chevrolet de los años 50 restaurado, un Ford Mustang vintage o un Buick Riviera de los 60s tienen precios distintos. A mayor exclusividad del vehículo, mayor el costo.

### 2. La duración del servicio
¿Solo necesitas el carro para el momento de la ceremonia? ¿O quieres que te acompañe desde la casa, en la sesión de fotos y hasta la recepción? A más horas de servicio, el precio se ajusta.

### 3. La zona del evento
Bodas en Medellín tienen un precio diferente a eventos en el Oriente Antioqueño (Llanogrande, El Carmen de Viboral, Rionegro). El desplazamiento se incluye en la cotización.

### 4. La fecha
Temporadas altas como diciembre, febrero y Semana Santa tienen mayor demanda. Reservar con anticipación te asegura disponibilidad y evita que el vehículo que quieres ya esté agendado.

## ¿Qué incluye el servicio?

Nuestro servicio incluye:

- **Conductor profesional** presentado y puntual
- **Vehículo decorado** según el estilo de la boda
- **Coordinación logística** del recorrido
- **Fotos y videos** durante el traslado (el momento más fotogénico del día)

## ¿Vale la pena el gasto?

Un carro clásico no es un gasto más — es una de las inversiones que más aparece en las fotos y videos de la boda. Décadas después, ese vehículo sigue siendo parte de la historia que cuentas.

Y en términos de presupuesto: representa menos del 3% del costo total de una boda promedio, con un impacto visual que ningún otro detalle logra igualar.

## ¿Cómo reservar?

El proceso es simple:

1. Escríbenos por WhatsApp con tu fecha y ciudad
2. Te confirmamos disponibilidad en menos de 24 horas
3. Seleccionas el vehículo y coordinamos los detalles
4. Firmas contrato y aseguras tu fecha con un depósito

No dejes para mañana lo que puedes reservar hoy — los carros clásicos se agotan rápido en temporada alta.

[Consultar disponibilidad y precio →](https://wa.me/573147372030)
""",
    },
    {
        "title": "Carro clásico, vintage o moderno: ¿cuál elegir para tu boda?",
        "slug": "carro-clasico-vintage-moderno-boda",
        "excerpt": "¿No sabes si elegir un carro clásico, vintage o moderno para tu boda? Te explicamos la diferencia real y cuál se adapta mejor a cada estilo de celebración.",
        "content_md": """\
Una de las preguntas que más nos hacen las parejas cuando empiezan a planear su boda es: *"¿cuál es la diferencia entre un carro clásico y un vintage?"* — y tiene todo el sentido, porque los términos se usan de forma distinta según quién los use.

Aquí te lo explicamos sin tecnicismos, para que puedas elegir con seguridad.

## Carro clásico: el más solicitado

Cuando hablamos de carros **clásicos**, nos referimos a vehículos fabricados entre los años **1940 y 1979**, generalmente americanos o europeos, que han sido restaurados y mantenidos en excelentes condiciones.

Piensa en un Chevrolet Bel Air de los 50s, un Ford Galaxie de los 60s o un Buick Riviera de los 70s. Son vehículos con personalidad, con curvas dramáticas, con esa energía que hace que todos en el camino volteen a mirar.

**Ideal para:** bodas con ambiente romántico, elegante o retro. Funcionan perfectamente en cualquier tipo de venue, desde iglesias históricas hasta haciendas del Oriente Antioqueño.

**Por qué es el más popular:** versátil, fotogénico y disponible en varios rangos de precio.

## Carro vintage: para los que buscan lo más exclusivo

El término **vintage** se reserva para vehículos aún más antiguos — anteriores a los años 40. Son piezas de colección, más difíciles de encontrar y generalmente más costosas.

Su presencia es única: nadie más en tu boda llegará en un vehículo así. Son la opción para parejas que quieren que el transporte sea, en sí mismo, el protagonista.

**Ideal para:** bodas temáticas, producción audiovisual, quinceañeras de gran escala.

**Consideración:** al ser vehículos más antiguos, la disponibilidad es limitada. Si tienes en mente este estilo, reserva con mucha anticipación.

## Carro moderno: funcional y elegante

Los vehículos **modernos de lujo** (SUVs premium, sedanes de alta gama) son la opción cuando la prioridad es la comodidad y la practicidad sobre el impacto visual.

Son perfectos como vehículo de apoyo para invitados especiales, para el transporte del novio o para eventos donde el recorrido es largo y el confort es primordial.

**Ideal para:** eventos corporativos, transporte de invitados VIP, activaciones de marca.

## ¿Cuál es el más fotogénico?

Sin dudarlo: el **carro clásico** gana esta categoría. Sus líneas, colores y tamaño crean composiciones que los fotógrafos aman capturar. Las fotos con el vehículo se convierten en las más compartidas del álbum.

## ¿Cuál se adapta mejor al Oriente Antioqueño?

Las haciendas, jardines y salones de eventos de Llanogrande y El Carmen de Viboral fueron hechos para complementar un carro clásico. El contraste entre la naturaleza verde del oriente y la carrocería de un Chevrolet de los 60s es, sencillamente, impresionante.

## ¿Todavía no sabes cuál elegir?

No tienes que decidirlo solo. Cuéntanos tu fecha, el estilo de tu boda y el venue, y te asesoramos sobre qué vehículo se adapta mejor a tu visión.

[Hablar con un asesor →](https://wa.me/573147372030)
""",
    },
    {
        "title": "Bodas en el Oriente Antioqueño: los mejores lugares y cómo llegar con estilo",
        "slug": "bodas-oriente-antioqueno-lugares-carro-clasico",
        "excerpt": "El Oriente Antioqueño es el destino favorito para bodas en Antioquia. Te contamos los mejores venues y por qué llegar en un carro clásico cambia todo el día.",
        "content_md": """\
El Oriente Antioqueño se ha convertido en el epicentro de las bodas más bonitas de Colombia. Sus haciendas, jardines y salones de eventos ofrecen algo que pocas regiones del país pueden igualar: naturaleza exuberante, arquitectura colonial y una temperatura que hace que el día sea perfecto.

Y si ya elegiste el Oriente como destino para tu boda, hay un detalle que puede elevar toda la experiencia: **la llegada**.

## Los mejores lugares para bodas en el Oriente Antioqueño

### Llanogrande (Rionegro)
La zona más solicitada del Oriente. A 45 minutos de Medellín por la autopista, Llanogrande concentra docenas de haciendas y clubes campestres que reciben bodas todo el año. La combinación de infraestructura moderna con entorno natural la hace la opción más versátil.

Venues destacados: Club Llanogrande, Hacienda El Dorado, Club de Golf del Llano.

### El Carmen de Viboral
Conocido por su cerámica y su ambiente tranquilo, El Carmen de Viboral tiene venues más íntimos y paisajes aún más verdes. Es la elección de parejas que prefieren una boda más auténtica y menos concurrida.

La carretera que llega a El Carmen, rodeada de montañas y flores, es en sí misma una oportunidad fotográfica que pocas rutas en el país ofrecen.

### La Ceja y La Unión
Municipios con tradición agrícola y haciendas antiguas perfectas para bodas campestres. Menos turísticos que Llanogrande, lo que significa mayor exclusividad y precios más accesibles en los venues.

### Marinilla y El Peñol
Para parejas aventureras: imagina llegar a tu boda con el Embalse del Peñol de fondo. Venues cerca de la Piedra del Peñol ofrecen vistas únicas que no existen en ningún otro lugar de Colombia.

## ¿Por qué llegar en un carro clásico al Oriente?

La respuesta tiene dos partes: **las fotos y la experiencia**.

### Las fotos
El contraste visual entre la carrocería de un carro clásico de los 60s y el verde del Oriente Antioqueño es el tipo de imagen que aparece en las primeras páginas de los álbumes de boda. Los fotógrafos lo saben, las parejas lo confirman después: las fotos con el vehículo terminan siendo las más compartidas.

### La experiencia
Llegar a tu boda en un carro clásico es un momento que no se olvida. Es esa diferencia entre "llegamos" y *llegamos*. El ruido del motor, las miradas de los invitados, el ritual de bajar del vehículo — todo suma al recuerdo del día.

## ¿Cómo funciona el servicio para bodas en el Oriente?

Desde Medellín hasta cualquier venue del Oriente Antioqueño, nos encargamos de todo:

- **Coordinación de ruta** con tiempo de llegada exacto
- **Conductor puntual** y presentado
- **Vehículo decorado** según el estilo de la boda
- **Sesión de fotos en ruta** en los puntos más fotogénicos del trayecto

El precio incluye el desplazamiento hasta la zona — no hay cobros sorpresa al llegar.

## Disponibilidad limitada en temporada alta

Los fines de semana de diciembre, febrero y Semana Santa se agotan primero. Si tu boda está en alguna de estas temporadas, lo mejor es confirmar la reserva con **mínimo 3 meses de anticipación**.

¿Ya tienes venue y fecha? Escríbenos hoy y verificamos disponibilidad.

[Consultar disponibilidad para el Oriente →](https://wa.me/573147372030)
""",
    },
]


def main() -> None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        inserted = 0
        for data in POSTS:
            exists = db.query(BlogPost).filter(BlogPost.slug == data["slug"]).first()
            if exists:
                print(f"  skip (ya existe): {data['slug']}")
                continue
            post = BlogPost(
                title=data["title"],
                slug=data["slug"],
                excerpt=data["excerpt"],
                content_md=data["content_md"],
                published=True,
                published_at=now,
            )
            db.add(post)
            inserted += 1
            print(f"  + {data['slug']}")
        db.commit()
        print(f"\nListo: {inserted} post(s) insertado(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
