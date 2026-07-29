/**
 * Migración one-off para los permisos por usuario.
 *
 * Corre ANTES o DESPUÉS de `pnpm db:push` (crea la tabla si no existe con la
 * misma forma que el schema de drizzle) y deja el sistema andando sin que
 * nadie pierda acceso:
 *
 *   npx tsx lib/db/migrate-permissions.ts
 *
 * - A los usuarios con rol `noticias` les da permisos de Noticias y les pasa
 *   el rol a `admin` (el rol especial desaparece).
 * - A los usuarios con rol `admin` que todavía no tienen permisos cargados les
 *   otorga todos los permisos, incluidas las cursadas de todas las sedes.
 *
 * Es idempotente: se puede correr más de una vez sin efectos adicionales.
 */
import "dotenv/config";
import { Pool } from "pg";
import { RESOURCES } from "../permissions";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Tabla de permisos
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        resource text NOT NULL,
        sede_id uuid REFERENCES sedes(id) ON DELETE CASCADE,
        actions text[] NOT NULL DEFAULT ARRAY[]::text[],
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS user_permissions_user_id_idx
        ON user_permissions (user_id)
    `);

    const noticias = RESOURCES.find((r) => r.key === "noticias")!;
    const acciones = (resource: (typeof RESOURCES)[number]) =>
      resource.actions.map((a) => a.key);

    // 2. Rol "noticias" -> admin con permisos solo de Noticias
    const { rows: usuariosNoticias } = await client.query<{ id: string }>(
      `SELECT id FROM "user" WHERE role = 'noticias'`
    );

    for (const usuario of usuariosNoticias) {
      await client.query(
        `INSERT INTO user_permissions (user_id, resource, sede_id, actions)
         VALUES ($1, 'noticias', NULL, $2)`,
        [usuario.id, acciones(noticias)]
      );
    }

    if (usuariosNoticias.length > 0) {
      await client.query(
        `UPDATE "user" SET role = 'admin' WHERE role = 'noticias'`
      );
    }

    // 3. Admins existentes sin permisos -> todos los permisos
    const { rows: admins } = await client.query<{ id: string }>(
      `SELECT id FROM "user" u
        WHERE u.role = 'admin'
          AND NOT EXISTS (
            SELECT 1 FROM user_permissions p WHERE p.user_id = u.id
          )`
    );

    const { rows: sedes } = await client.query<{ id: string }>(
      `SELECT id FROM sedes`
    );

    for (const admin of admins) {
      for (const resource of RESOURCES) {
        if (resource.perSede) {
          for (const sede of sedes) {
            await client.query(
              `INSERT INTO user_permissions (user_id, resource, sede_id, actions)
               VALUES ($1, $2, $3, $4)`,
              [admin.id, resource.key, sede.id, acciones(resource)]
            );
          }
        } else {
          await client.query(
            `INSERT INTO user_permissions (user_id, resource, sede_id, actions)
             VALUES ($1, $2, NULL, $3)`,
            [admin.id, resource.key, acciones(resource)]
          );
        }
      }
    }

    await client.query("COMMIT");

    console.log(
      `Listo: ${usuariosNoticias.length} usuario(s) del rol "noticias" migrado(s), ` +
        `${admins.length} admin(s) con permisos completos (${sedes.length} sede(s)).`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
