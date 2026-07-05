# Quinta Padel Center

Sistema web para club de pádel: tarjeta de lealtad digital con QR, panel de administración con escáner, avisos, torneos y reservas de canchas. Backend en Supabase. Diseño importado desde Claude Design (tema oscuro + verde lima, tipografía Oswald/Inter).

## La aplicación

- **App del cliente** (`/`): registro/login, tarjeta de lealtad con QR, sellos en tiempo real, avisos, torneos con inscripción, reserva de canchas, perfil e historial. PWA instalable en el celular.
- **Panel admin** (`/admin`): escáner QR con cámara, calendario de reservas por cancha, gestión de socios (ajuste de sellos, roles), torneos y avisos con imágenes, dashboard de métricas y configuración del programa de lealtad.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ para producción
```

La conexión a Supabase está en `src/lib/supabase.js` (URL + publishable key, ambas públicas; la seguridad la da RLS). Puedes sobreescribirlas con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Despliegue (Vercel/Netlify)

Es una SPA de Vite: build `npm run build`, carpeta `dist/`. Configura el rewrite de todas las rutas a `index.html` (en Vercel se detecta solo con `vercel.json` incluido).

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/01-funcionalidades.md](docs/01-funcionalidades.md) | Alcance del sistema, funcionalidades del cliente y del admin, fases y arquitectura |
| [docs/02-prompt-claude-design.md](docs/02-prompt-claude-design.md) | Prompt listo para pasar a Claude Design (diseño con temática de pádel) |
| [docs/03-guia-supabase.md](docs/03-guia-supabase.md) | Guía paso a paso para configurar Supabase (auth, tablas, seguridad, QR) |
| [docs/04-plan-de-venta.md](docs/04-plan-de-venta.md) | Plan de venta: paquetes, pago inicial, mantenimiento mensual y guion de presentación |
| [supabase/schema.sql](supabase/schema.sql) | Esquema SQL completo listo para pegar en el SQL Editor de Supabase |
