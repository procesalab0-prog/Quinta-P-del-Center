# Guía paso a paso: Supabase

Cómo montar todo el backend en Supabase, desde cero. El SQL completo está en `supabase/schema.sql` — se pega una sola vez en el editor SQL.

---

## Paso 1 — Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) → **Start your project** → crea cuenta (con GitHub es lo más rápido).
2. **New project**:
   - *Organization*: crea una, ej. "Quinta P del Center".
   - *Name*: `quinta-p-padel`.
   - *Database password*: genera una fuerte y **guárdala** (no la vuelves a ver).
   - *Region*: la más cercana al club (ej. `us-east-1` para México).
3. Espera ~2 minutos a que aprovisione.

## Paso 2 — Copiar las llaves para la app

En **Project Settings → API** copia:

- `Project URL` → variable `SUPABASE_URL`
- `anon public key` → variable `SUPABASE_ANON_KEY` (esta va en el frontend, es pública y segura **siempre que actives RLS**, ver Paso 5)
- `service_role key` → **solo** para Edge Functions/servidor. Jamás en el frontend.

En tu app frontend:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Paso 3 — Configurar la autenticación (cuentas de socios)

1. **Authentication → Providers → Email**: activado por defecto. Decide:
   - *Confirm email*: actívalo en producción (evita cuentas basura). Para desarrollo puedes apagarlo.
2. (Opcional) **Google login**: Authentication → Providers → Google → sigue el wizard (necesitas crear credenciales OAuth en Google Cloud Console y pegar Client ID/Secret).
3. **Authentication → URL Configuration**: pon la URL real de tu app en *Site URL* (ej. `https://quintap.club`) para que los correos de confirmación redirijan bien.
4. **Authentication → Emails**: personaliza las plantillas de correo con el nombre del club (en español).

Con esto, en el frontend el registro es una sola llamada:

```js
const { data, error } = await supabase.auth.signUp({
  email, password,
  options: { data: { full_name: nombre, phone: telefono } }
})
```

## Paso 4 — Crear las tablas

Ve a **SQL Editor → New query**, pega el contenido completo de [`supabase/schema.sql`](../supabase/schema.sql) y ejecuta (**Run**). Esto crea:

| Tabla | Para qué |
|-------|----------|
| `profiles` | Datos del socio (se crea sola al registrarse, vía trigger). Incluye `member_code` (el UUID que va en el QR), `role` (`member`/`staff`/`admin`), sellos y nivel. |
| `visits` | Cada visita registrada al escanear el QR. |
| `rewards` | Catálogo de premios configurables (ej. "10 sellos = 1 hora gratis"). |
| `redemptions` | Premios canjeados. |
| `announcements` | Avisos del club para la página del cliente. |
| `tournaments` | Torneos con cartel, fecha, categorías, costo. |
| `tournament_registrations` | Inscripciones de socios (con pareja). |
| `courts` | Las canchas del club. |
| `reservations` | Reservas con estado (pendiente/confirmada/cancelada) y pago. |
| `loyalty_settings` | Configuración del programa (sellos por premio, minutos anti-duplicado). |

El script también crea:

- **Trigger `on_auth_user_created`**: cuando alguien se registra en Auth, se crea automáticamente su fila en `profiles` con un `member_code` único (lo que encodea el QR).
- **Funciones RPC seguras** `register_visit(member_code)` y `redeem_reward(member_code, reward_id)`: solo las puede ejecutar staff/admin; validan el anti-duplicado y actualizan sellos de forma atómica. **El frontend nunca actualiza sellos directamente.**
- **Función `get_member_by_code(member_code)`**: lo que llama el escáner para mostrar la ficha del socio.

## Paso 5 — Activar la seguridad (Row Level Security)

El mismo `schema.sql` ya activa RLS y crea las políticas. El modelo es:

- **Socio (`member`)**: lee/edita solo su perfil; lee sus visitas, canjes y reservas; lee avisos y torneos activos; crea sus propias inscripciones y solicitudes de reserva.
- **Staff**: todo lo del socio + ejecutar el escáner (RPCs), ver todos los socios, gestionar reservas.
- **Admin**: todo + crear/editar avisos, torneos, premios, canchas y configuración.

Verifícalo: en **Table Editor**, cada tabla debe decir "RLS enabled". Prueba en **SQL Editor**:

```sql
select * from profiles; -- como admin del dashboard ves todo; desde la app cada quien ve lo suyo
```

## Paso 6 — Storage (imágenes)

1. **Storage → New bucket**: `public-assets` (público) → carteles de torneos, avisos, logo.
2. **New bucket**: `avatars` (público o privado según prefieras) → fotos de perfil.
3. Políticas: lectura pública en `public-assets`; en `avatars`, cada usuario solo sube a su carpeta (`{user_id}/…`). El `schema.sql` incluye estas políticas.

## Paso 7 — Realtime (opcional pero recomendado)

**Database → Replication → supabase_realtime**: activa las tablas `reservations` y `profiles`. Así el calendario del admin y el contador de sellos del cliente se actualizan en vivo sin recargar.

## Paso 8 — Flujo del QR de principio a fin

1. **Generar (app cliente)**: el QR encodea el `member_code` del perfil. Con la librería `qrcode`:
   ```js
   import QRCode from 'qrcode'
   const dataUrl = await QRCode.toDataURL(profile.member_code, { width: 320, margin: 1 })
   ```
2. **Escanear (admin)**: con `html5-qrcode` se lee el texto del QR → se llama:
   ```js
   const { data } = await supabase.rpc('get_member_by_code', { p_code: scannedText })
   // muestra ficha → botón "Registrar visita":
   await supabase.rpc('register_visit', { p_code: scannedText })
   ```
3. La RPC valida que quien llama es staff/admin, que no hay visita en los últimos N minutos, suma el sello, sube de nivel si corresponde, y devuelve el nuevo total.

## Paso 9 — Crear el primer administrador

Después de registrarte tú mismo en la app:

```sql
update profiles set role = 'admin' where id = (
  select id from auth.users where email = 'correo-del-dueño@gmail.com'
);
```

Desde el panel admin ya podrás promover a `staff` a los empleados.

## Paso 10 — Costos y plan

- **Plan Free**: 50,000 usuarios activos/mes, 500 MB de base de datos, 1 GB de storage — **suficiente para un club** (un club con 500 socios usa una fracción mínima).
- **Plan Pro ($25 USD/mes)**: respaldos diarios de 7 días, sin pausa por inactividad, más storage. Recomendado en producción una vez vendido — el proyecto Free se **pausa tras 1 semana sin actividad**, lo cual es inaceptable para un cliente que paga.
- Este costo lo absorbes dentro de la mensualidad que le cobras al club (ver `docs/04-plan-de-venta.md`).

## Checklist final antes de entregar

- [ ] RLS activado en todas las tablas (Table Editor lo muestra).
- [ ] `service_role key` no aparece en ningún archivo del frontend.
- [ ] Confirmación de email activada.
- [ ] *Site URL* apunta al dominio real.
- [ ] Respaldo: plan Pro o exportación semanal (`Database → Backups`).
- [ ] Cuenta admin del dueño creada y probada.
- [ ] Probado el flujo completo: registro → QR → escaneo → sello → canje.
