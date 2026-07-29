/**
 * Migración one-off para la incorporación de la entidad Sedes.
 *
 * Corre ANTES de `pnpm db:push` (o `npm run db:push`): crea las tablas y
 * columnas nuevas con los datos ya cargados, para que el push no falle al
 * agregar columnas NOT NULL sobre tablas con filas existentes.
 *
 *   npx tsx lib/db/migrate-sedes.ts
 *
 * Es idempotente: se puede correr más de una vez sin efectos adicionales.
 */
import "dotenv/config";
import { Pool } from "pg";

const SEDES_INICIALES = [
  { slug: "parana", name: "Paraná" },
  { slug: "ramirez", name: "Ramírez" },
  { slug: "gualeguay", name: "Gualeguay" },
  { slug: "villaguay", name: "Villaguay" },
  { slug: "concordia", name: "Concordia" },
];

// Sede a la que se asignan las aulas y carreras que ya existían.
const SEDE_POR_DEFECTO = "Paraná";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Tabla de sedes
    await client.query(`
      CREATE TABLE IF NOT EXISTS sedes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        address text,
        visible boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    for (const sede of SEDES_INICIALES) {
      await client.query(
        `INSERT INTO sedes (name)
         SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM sedes WHERE name = $1)`,
        [sede.name]
      );
    }

    const { rows: defaultRows } = await client.query<{ id: string }>(
      `SELECT id FROM sedes WHERE name = $1`,
      [SEDE_POR_DEFECTO]
    );
    const sedeDefaultId = defaultRows[0]?.id;
    if (!sedeDefaultId) {
      throw new Error(`No se encontró la sede "${SEDE_POR_DEFECTO}"`);
    }

    // 2. Junction carreras <-> sedes: todas las carreras existentes a la sede
    //    por defecto.
    await client.query(`
      CREATE TABLE IF NOT EXISTS carrera_sedes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        carrera_id uuid NOT NULL REFERENCES carreras(id) ON DELETE CASCADE,
        sede_id uuid NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
        CONSTRAINT carrera_sedes_carrera_id_sede_id_unique UNIQUE (carrera_id, sede_id)
      )
    `);

    const { rowCount: carrerasAsignadas } = await client.query(
      `INSERT INTO carrera_sedes (carrera_id, sede_id)
       SELECT c.id, $1 FROM carreras c
       WHERE NOT EXISTS (SELECT 1 FROM carrera_sedes cs WHERE cs.carrera_id = c.id)
       ON CONFLICT DO NOTHING`,
      [sedeDefaultId]
    );

    // 3. aulas.sede_id (backfill a la sede por defecto y luego NOT NULL)
    await client.query(`ALTER TABLE aulas ADD COLUMN IF NOT EXISTS sede_id uuid`);
    const { rowCount: aulasBackfilled } = await client.query(
      `UPDATE aulas SET sede_id = $1 WHERE sede_id IS NULL`,
      [sedeDefaultId]
    );
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE aulas
          ADD CONSTRAINT aulas_sede_id_sedes_id_fk
          FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await client.query(`ALTER TABLE aulas ALTER COLUMN sede_id SET NOT NULL`);

    // 4. regimen_solicitudes: enum sede -> FK sede_id
    const { rows: sedeColumn } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'regimen_solicitudes' AND column_name = 'sede'`
    );
    let solicitudesMigradas = 0;

    await client.query(
      `ALTER TABLE regimen_solicitudes ADD COLUMN IF NOT EXISTS sede_id uuid`
    );

    if (sedeColumn.length > 0) {
      // El enum guardaba el slug ("parana"); se mapea al nombre de la sede.
      for (const sede of SEDES_INICIALES) {
        const { rowCount } = await client.query(
          `UPDATE regimen_solicitudes s
           SET sede_id = (SELECT id FROM sedes WHERE name = $1)
           WHERE s.sede::text = $2 AND s.sede_id IS NULL`,
          [sede.name, sede.slug]
        );
        solicitudesMigradas += rowCount ?? 0;
      }
    }

    // Cualquier solicitud sin sede resuelta queda en la sede por defecto.
    await client.query(
      `UPDATE regimen_solicitudes SET sede_id = $1 WHERE sede_id IS NULL`,
      [sedeDefaultId]
    );

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE regimen_solicitudes
          ADD CONSTRAINT regimen_solicitudes_sede_id_sedes_id_fk
          FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await client.query(
      `ALTER TABLE regimen_solicitudes ALTER COLUMN sede_id SET NOT NULL`
    );
    await client.query(`ALTER TABLE regimen_solicitudes DROP COLUMN IF EXISTS sede`);
    await client.query(`DROP TYPE IF EXISTS regimen_sede`);

    await client.query("COMMIT");

    console.log("Migración de sedes completada:");
    console.log(`  - sedes disponibles: ${SEDES_INICIALES.map((s) => s.name).join(", ")}`);
    console.log(`  - carreras asignadas a ${SEDE_POR_DEFECTO}: ${carrerasAsignadas ?? 0}`);
    console.log(`  - aulas asignadas a ${SEDE_POR_DEFECTO}: ${aulasBackfilled ?? 0}`);
    console.log(`  - solicitudes de régimen migradas: ${solicitudesMigradas}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error en la migración de sedes:", error);
  process.exit(1);
});
