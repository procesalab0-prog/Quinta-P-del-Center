# Quinta P del Center — Sistema de Club de Pádel

## Visión general

Sistema web para un club de pádel con dos aplicaciones:

1. **App del Cliente** — el socio crea su cuenta, obtiene su tarjeta de lealtad digital con QR (con el estilo del club), acumula sellos/puntos, ve avisos y torneos, y puede solicitar reservas de cancha.
2. **Panel de Administración** — el staff escanea el QR del socio para registrar visitas y canjear premios, gestiona reservas de canchas, publica avisos y torneos, y ve reportes.

Todo corre sobre **Supabase** (autenticación, base de datos Postgres, Row Level Security y Realtime).

---

## 1. Núcleo del sistema (MVP — lo que vendes primero)

### App del Cliente
- **Registro / inicio de sesión** con email + contraseña (Supabase Auth). Opcional: login con Google.
- **Tarjeta de lealtad digital**:
  - Diseño con la identidad del club (logo, colores, textura de cancha).
  - Código QR único por socio (encodea el `member_id`).
  - Contador visual de sellos (ej. tarjeta de 10 visitas = 1 renta gratis) o puntos.
  - Nivel de socio (Bronce / Plata / Oro) según visitas acumuladas.
- **Historial**: visitas registradas, puntos ganados, premios canjeados.
- **Perfil**: nombre, teléfono, foto, categoría de juego (1ª a 5ª fuerza).

### Panel de Administración
- **Escáner de QR** (cámara del celular/tablet del staff, sin hardware extra):
  - Al escanear muestra la ficha del socio: nombre, foto, nivel, sellos actuales.
  - Botones: **Registrar visita** (+1 sello / puntos) y **Canjear premio**.
  - Protección anti-duplicado: no permite dos sellos al mismo socio en X minutos.
- **Gestión de socios**: buscar, ver historial, ajustar puntos manualmente, desactivar cuentas.
- **Roles**: `admin` (dueño, acceso total) y `staff` (solo escanear y reservas).

---

## 2. Implementaciones adicionales recomendadas

### Para la página del cliente
- **Avisos y noticias**: banner/lista de avisos publicados por el club (mantenimiento, horarios especiales, promos del bar).
- **Torneos**:
  - Cartel del torneo (imagen), fecha, categorías, costo de inscripción.
  - Botón "Inscribirme" (individual o con pareja) → el admin ve la lista de inscritos.
  - Notificación en la app cuando se publica un torneo nuevo.
- **Reserva de canchas desde la app**: el socio ve disponibilidad por día/hora y solicita reserva; el admin confirma (o auto-confirmación si el club lo permite).
- **Promociones dirigidas**: cupones para socios que no vienen hace 30 días ("te extrañamos: 20% en tu próxima renta").
- **Cumpleaños**: aviso automático con beneficio (ej. hora de cancha gratis en tu mes).
- **Ranking del club** (fase 2): tabla de posiciones por categoría, resultados de torneos internos.

### Para el panel de administración
- **Calendario de reservas de canchas**:
  - Vista día/semana por cancha (grid de horarios).
  - Crear, editar, mover y cancelar reservas; marcar pagado/no pagado.
  - Reservas recurrentes (ej. "los Pérez, martes 8pm fijo").
  - Bloqueo de horarios (mantenimiento, clases, torneos).
- **Gestión de torneos**: crear torneo, categorías, cupos, ver/exportar inscritos, marcar pagos de inscripción.
- **Gestión de avisos**: crear/editar/programar avisos con imagen, fijar aviso destacado.
- **Dashboard con métricas**:
  - Visitas del día/semana/mes, socios nuevos, socios activos vs. inactivos.
  - Ocupación de canchas por horario (para detectar horas muertas y lanzar promos).
  - Premios canjeados (costo del programa de lealtad).
- **Configuración del programa de lealtad**: cuántos sellos por premio, qué premios hay, vigencia de puntos — editable sin tocar código.
- **Clases y coaches** (fase 2): agenda de profesores, paquetes de clases con su propio contador en la tarjeta.
- **Punto de venta simple** (fase 3): cobrar renta + productos del bar y que sume puntos automáticamente.

### Priorización sugerida
| Fase | Contenido | Objetivo |
|------|-----------|----------|
| 1 (MVP) | Cuentas, tarjeta QR, escáner, sellos/premios, avisos | Vender e implantar rápido |
| 2 | Reservas de canchas (admin + cliente), torneos con inscripción | Volver el sistema indispensable |
| 3 | Dashboard avanzado, promos automáticas, ranking, POS | Justificar mensualidad a largo plazo |

---

## 3. Arquitectura técnica

- **Frontend**: una sola app web (React/Next.js o similar) con dos áreas: `/` (cliente, PWA instalable en el celular) y `/admin` (panel staff). PWA evita costos de App Store/Play Store.
- **Backend**: Supabase
  - **Auth**: cuentas de socios y staff.
  - **Postgres + RLS**: cada socio solo ve sus datos; staff/admin según rol.
  - **Realtime**: el calendario de reservas y el contador de sellos se actualizan en vivo.
  - **Storage**: logos, carteles de torneos, fotos de perfil.
  - **Edge Functions**: lógica sensible (registrar visita, canjear premio) para que nadie pueda darse sellos a sí mismo.
- **QR**: se genera en el cliente (librería `qrcode`) con un token firmado o el UUID del socio; el escáner del admin usa la cámara (librería `html5-qrcode` o `zxing`).

Ver `docs/03-guia-supabase.md` para el esquema SQL completo y la configuración paso a paso.
