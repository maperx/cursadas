# Cursadas - FCVS UADER

Sistema de gestion de cursadas y ocupacion de aulas para la Facultad de Ciencias de la Vida y la Salud (FCVS) de la Universidad Autonoma de Entre Rios (UADER).

Permite administrar carreras, asignaturas, aulas, horarios de cursada, examenes e inscripciones de estudiantes. Incluye vistas de calendario semanal, diaria y por aula para visualizar la ocupacion de espacios.

## Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Base de datos:** PostgreSQL con Drizzle ORM
- **Autenticacion:** Better Auth (email/password + Google OAuth)
- **UI:** Tailwind CSS 4, Radix UI, Lucide icons
- **Validacion:** Zod + React Hook Form
- **Email:** Nodemailer

## Roles

| Rol | Acceso |
|-----|--------|
| **Admin** | Panel completo: carreras, asignaturas, aulas, cursadas, inscripciones, usuarios |
| **Docente** | Ver sus catedras asignadas |
| **Estudiante** | Ver cursadas disponibles, inscribirse, ver sus inscripciones |

## Requisitos

- Node.js 20+
- PostgreSQL 15+

## Instalacion local

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd cursadas

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver seccion Variables de entorno)

# 4. Crear la base de datos y aplicar el schema
npm run db:push

# 5. (Opcional) Cargar datos de ejemplo
npm run db:seed

# 6. Iniciar el servidor de desarrollo
npm run dev
```

La aplicacion estara disponible en `http://localhost:3000`.

## Variables de entorno

```env
# Base de datos PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/cursadas

# Better Auth - secret de al menos 32 caracteres
BETTER_AUTH_SECRET=tu-secret-minimo-32-caracteres-aqui
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# Codigo que deben ingresar los docentes al registrarse
DOCENTE_REGISTER_CODE=codigo-docente

# SMTP para envio de emails (verificacion, reset de password)
SMTP_HOST=smtp.tuservidor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@tudominio.com
SMTP_PASS=tu-password
SMTP_FROM=Cursadas <noreply@tudominio.com>
```

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de produccion |
| `npm start` | Iniciar servidor de produccion |
| `npm run lint` | Ejecutar ESLint |
| `npm run db:generate` | Generar migraciones de Drizzle |
| `npm run db:migrate` | Ejecutar migraciones |
| `npm run db:push` | Aplicar schema directamente a la DB |
| `npm run db:studio` | Abrir Drizzle Studio (GUI para la DB) |
| `npm run db:seed` | Cargar datos de ejemplo |

## Deploy a produccion

### Opcion 1: Vercel (recomendado)

1. Subir el repositorio a GitHub/GitLab.
2. Importar el proyecto en [vercel.com](https://vercel.com).
3. Configurar las variables de entorno en el dashboard de Vercel:
   - `DATABASE_URL` — usar un servicio como [Neon](https://neon.tech), [Supabase](https://supabase.com) o [Railway](https://railway.com) para PostgreSQL.
   - `BETTER_AUTH_SECRET` — generar con `openssl rand -hex 32`.
   - `BETTER_AUTH_URL` y `NEXT_PUBLIC_BETTER_AUTH_URL` — la URL del dominio de produccion (ej: `https://cursadas.vercel.app`).
   - El resto de variables de `.env.example`.
4. Ejecutar las migraciones contra la base de datos de produccion:
   ```bash
   DATABASE_URL=<url-produccion> npm run db:push
   ```
5. Vercel hace deploy automaticamente en cada push a `main`.

### Opcion 2: VPS / servidor propio

```bash
# 1. Clonar y configurar
git clone <url-del-repo>
cd cursadas
npm install
cp .env.example .env
# Editar .env con los valores de produccion

# 2. Aplicar schema a la base de datos
npm run db:push

# 3. Build de produccion
npm run build

# 4. Iniciar el servidor
npm start
# Por defecto escucha en el puerto 3000
```

Para mantener el proceso corriendo, usar un process manager como `pm2`:

```bash
npm install -g pm2
pm2 start npm --name cursadas -- start
pm2 save
pm2 startup
```

Configurar un reverse proxy con Nginx o Caddy para servir en el puerto 80/443 con HTTPS.

### Opcion 3: Docker

Crear un `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

> Para usar el output standalone, agregar `output: "standalone"` en `next.config.ts`.

```bash
docker build -t cursadas .
docker run -p 3000:3000 --env-file .env cursadas
```
