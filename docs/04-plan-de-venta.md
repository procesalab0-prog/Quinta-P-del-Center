# Plan de venta — Sistema Quinta P del Center

> Precios de referencia en MXN pensados para un club de pádel mediano en México.
> Ajusta según tu mercado; la estructura (pago inicial + mensualidad por niveles) es lo importante.

---

## 1. El discurso de venta (el problema que resuelves)

No vendas "una app", vende resultados:

- **Retención**: "El 70% de los clientes que vienen una vez no regresan. La tarjeta de lealtad les da una razón para volver: cada visita cuenta para su premio."
- **Datos**: "Hoy no sabes quiénes son tus clientes ni cuándo dejaron de venir. Con el sistema tienes su nombre, teléfono y frecuencia — y puedes reactivar a los que se enfrían."
- **Imagen**: "Tarjeta digital con el logo del club en el celular de cada socio = el club se ve profesional y moderno frente a la competencia."
- **Orden**: "Las reservas dejan de vivir en un cuaderno o en WhatsApp: calendario por cancha, pagos marcados, cero dobles reservas (el sistema las bloquea a nivel base de datos)."
- **Cero fricción**: "El staff solo escanea un QR con el celular que ya tienen. Sin hardware, sin tarjetas plásticas que se pierden."

## 2. Estructura de precios

### Pago inicial (desarrollo e implementación)

| Paquete | Incluye | Precio inicial |
|---------|---------|----------------|
| **Básico** | Cuentas + tarjeta QR con branding + escáner y sellos/premios + avisos y torneos (solo publicación) | **$25,000 MXN** |
| **Completo** ⭐ | Básico + reservas de canchas (admin) + inscripción a torneos + dashboard de métricas | **$40,000 MXN** |
| **Premium** | Completo + reservas desde la app del cliente + promos automáticas (inactivos, cumpleaños) + ranking | **$55,000 MXN** |

Al presentar, muestra los tres: el de en medio es el que quieres vender (efecto ancla).

**El pago inicial cubre**: diseño con la identidad del club, desarrollo, configuración de Supabase, carga inicial de datos (canchas, premios, horarios), capacitación al staff (1–2 sesiones) y 30 días de garantía post-lanzamiento.

**Condiciones**: 50% para arrancar, 50% contra entrega. Cambios de alcance se cotizan aparte.

### Mantenimiento mensual (ingreso recurrente — aquí está el negocio)

| Plan | Incluye | Mensual |
|------|---------|---------|
| **Esencial** | Hosting + Supabase Pro + respaldos + monitoreo + corrección de errores | **$1,500 MXN** |
| **Activo** ⭐ | Esencial + soporte WhatsApp en horario laboral + carga de torneos/avisos si el club lo pide + ajustes menores (hasta 3 hrs/mes) | **$2,500 MXN** |
| **Socio digital** | Activo + reporte mensual de métricas con recomendaciones + 1 mejora nueva por trimestre | **$4,000 MXN** |

**Tus costos reales mensuales** (~$700–900 MXN): Supabase Pro (~$25 USD), hosting frontend (Vercel gratis o ~$20 USD), dominio (~$20 USD/año). Margen sano incluso en el plan Esencial.

**Cláusulas clave del contrato**:
- Permanencia mínima de 6 o 12 meses en mantenimiento (o el precio inicial sube 20%).
- Si cancelan el mantenimiento: entrega de sus datos (export), pero el sistema deja de operar o se cotiza traspaso.
- La propiedad del código queda contigo (licencia de uso al club) → puedes **revender el mismo sistema a otros clubes** cambiando branding. Ese es el verdadero modelo de negocio: el segundo club te cuesta una fracción del esfuerzo.

### Extras cotizables aparte
- Cambios de diseño mayores o secciones nuevas: $600–800 MXN/hora.
- Punto de venta / cobros en línea (Stripe/MercadoPago): módulo de $15,000–25,000 MXN.
- App nativa en tiendas (si algún día la piden): cotización separada; la PWA cubre el 95% de los casos.

## 3. Guion de la presentación (30 min)

1. **Demo en vivo (10 min)** — nada vende más: regístrate como socio en tu celular, muestra la tarjeta con SU logo, escanea el QR desde otra pantalla y que vean caer el sello en tiempo real. Lleva la demo ya con el branding del club (por eso primero pasas el prompt a Claude Design).
2. **El problema (5 min)**: clientes que no regresan, reservas en cuaderno, cero datos.
3. **Paquetes (5 min)**: muestra los 3, recomienda el Completo.
4. **Mensualidad (5 min)**: véndela como "el sistema siempre encendido, respaldado y con soporte" — no como renta.
5. **Cierre (5 min)**: "Si firmamos esta semana, incluyo X" (ej. 3 meses de plan Activo al precio de Esencial, o el módulo de cumpleaños gratis). Fecha de entrega: 3–4 semanas el MVP.

## 4. Manejo de objeciones

- *"Está caro"* → divide entre socios: "Con 200 socios son $12.50 por socio al mes. Una sola renta de cancha recuperada por semana paga la mensualidad."
- *"¿Y si no lo usan los clientes?"* → "El staff lo impulsa: 'con tu QR esta visita cuenta para tu hora gratis'. El premio hace que ellos mismos pidan registrarse."
- *"Ya tengo Excel/WhatsApp"* → "Perfecto para empezar, pero no te dice quién dejó de venir ni evita dobles reservas. Esto sí, automáticamente."
- *"¿Puedo pagar solo una vez sin mensualidad?"* → "El sistema necesita servidor, respaldos y mantenimiento; sin eso se degrada. La mensualidad es lo que garantiza que funcione siempre." (No vendas sin recurrente: es tu negocio y su seguro.)

## 5. Resumen del año 1 (paquete Completo + plan Activo)

- Pago inicial: **$40,000 MXN**
- Mantenimiento: 12 × $2,500 = **$30,000 MXN**
- **Total año 1: $70,000 MXN**, con costos directos de ~$10,000 → y un producto replicable para venderle al siguiente club en semanas, no meses.
