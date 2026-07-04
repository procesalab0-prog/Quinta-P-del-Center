# Prompt para Claude Design

Copia y pega el siguiente prompt (ajusta colores/logo del club antes de enviarlo):

---

Diseña un sistema web completo para un **club de pádel** llamado **Quinta P del Center**, con estética deportiva premium inspirada en el pádel: colores base **azul profundo (#0B2545) y verde césped sintético (#7CB518)** con acentos en **amarillo pelota de pádel (#F4D35E)**, texturas sutiles de red y césped sintético, tipografía moderna y deportiva (estilo Montserrat/Inter, títulos en bold condensed). Debe verse impecable en celular (mobile-first) y funcionar como PWA.

El sistema tiene **dos áreas**:

## 1) App del Cliente (mobile-first, instalable como PWA)

- **Pantalla de bienvenida / login / registro**: fondo con foto o ilustración de cancha de pádel desenfocada, logo del club al centro, botones grandes "Crear cuenta" e "Iniciar sesión".
- **Pantalla principal — Tarjeta de Lealtad** (la estrella del diseño):
  - Una tarjeta digital con proporción de tarjeta de crédito, con el branding del club: logo, degradado azul→verde, patrón sutil de red de pádel.
  - **Código QR grande y centrado** en la tarjeta (debe ser fácil de escanear), nombre del socio, número de socio y nivel (Bronce/Plata/Oro) con medalla o insignia.
  - Debajo de la tarjeta: **contador de sellos** visual — 10 círculos en forma de pelotas de pádel que se van "rellenando" con cada visita; al completar 10, animación de celebración y botón "Canjear premio".
  - Efecto de brillo/flip sutil en la tarjeta al tocarla.
- **Sección Avisos y Torneos**: cards con imagen del cartel del torneo, fecha destacada en un badge tipo calendario, categorías como chips, botón "Inscribirme". Los avisos generales en cards más sencillas con ícono de megáfono.
- **Sección Reservar Cancha**: selector de fecha horizontal (días de la semana), grid de horarios disponibles por cancha (disponible = verde, ocupado = gris, mi reserva = amarillo), confirmación con resumen.
- **Historial**: timeline de visitas, puntos y premios canjeados.
- **Perfil**: foto, datos, categoría de juego, botón cerrar sesión.
- **Navegación**: tab bar inferior con 4 íconos: Tarjeta, Reservas, Torneos/Avisos, Perfil.

## 2) Panel de Administración (tablet/desktop, también usable en celular)

- **Login de staff** sobrio, mismo branding.
- **Pantalla Escáner QR** (la más usada): visor de cámara a pantalla completa con marco guía; al escanear, aparece una tarjeta con la ficha del socio (foto, nombre, nivel, sellos actuales) y **dos botones grandes e inconfundibles**: "✓ Registrar visita" (verde) y "★ Canjear premio" (amarillo). Feedback claro de éxito (check animado + vibración) o error.
- **Calendario de Reservas**: vista semanal/diaria tipo grid — columnas = canchas, filas = horarios; bloques de reserva con nombre del cliente y estado de pago (pagado = verde sólido, pendiente = contorno); crear/editar reserva con modal; drag para mover (desktop).
- **Socios**: tabla con búsqueda, avatar, nivel, última visita, sellos; detalle con historial y ajuste manual de puntos.
- **Torneos y Avisos**: CRUD con vista previa de cómo lo verá el cliente; lista de inscritos por torneo con estado de pago.
- **Dashboard**: 4 tarjetas de KPIs (visitas hoy, socios activos, ocupación de canchas, premios canjeados) + gráfica de visitas por semana + mapa de calor de ocupación por horario.
- **Navegación**: sidebar colapsable con íconos: Escáner, Reservas, Socios, Torneos, Avisos, Dashboard, Configuración.

## Requisitos generales de diseño
- Modo claro por defecto; que los verdes/azules cumplan contraste AA.
- Botones de acción principales grandes (se usan de pie, con una mano, en la recepción del club).
- Estados vacíos ilustrados con temática de pádel ("Aún no tienes visitas — ¡ven a jugar!").
- Microinteracciones: sello que se estampa con animación al registrar visita, confeti al completar la tarjeta.
- Componentes reutilizables y consistentes entre área cliente y admin.
- Textos de la interfaz en español.

---

**Nota**: si ya tienes el logo y los colores reales del club, reemplaza la paleta indicada arriba por la oficial y adjunta el logo al prompt.
