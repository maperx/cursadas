import "dotenv/config";
import { db } from "./index";
import {
  user,
  carreras,
  aulas,
  asignaturas,
  cursadas,
  asignaturaDocentes,
  cursadaDocentes,
} from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Create Carreras
  const [carrera1, carrera2, carrera3] = await db
    .insert(carreras)
    .values([
      { name: "Ingeniería en Sistemas", color: "#3B82F6" },
      { name: "Licenciatura en Administración", color: "#10B981" },
      { name: "Contador Público", color: "#F59E0B" },
    ])
    .returning();

  console.log("Created carreras");

  // Create Users with role "docente"
  const [doc1, doc2, doc3, doc4] = await db
    .insert(user)
    .values([
      { id: "docente-1", name: "Dr. Juan Pérez", email: "jperez@universidad.edu", role: "docente", emailVerified: true },
      { id: "docente-2", name: "Ing. María García", email: "mgarcia@universidad.edu", role: "docente", emailVerified: true },
      { id: "docente-3", name: "Lic. Carlos López", email: "clopez@universidad.edu", role: "docente", emailVerified: true },
      { id: "docente-4", name: "Mg. Ana Martínez", email: "amartinez@universidad.edu", role: "docente", emailVerified: true },
    ])
    .returning();

  console.log("Created docente users");

  // Create Users with role "estudiante"
  await db.insert(user).values([
    { id: "estudiante-1", name: "Pedro Sánchez", email: "psanchez@estudiantes.edu", role: "estudiante", emailVerified: true },
    { id: "estudiante-2", name: "Laura Rodríguez", email: "lrodriguez@estudiantes.edu", role: "estudiante", emailVerified: true },
    { id: "estudiante-3", name: "Miguel Torres", email: "mtorres@estudiantes.edu", role: "estudiante", emailVerified: true },
  ]);

  console.log("Created estudiante users");

  // Create Aulas
  const [aula1, aula2, aula3, aula4] = await db
    .insert(aulas)
    .values([
      { name: "Aula 101", building: "Edificio A", capacity: 40 },
      { name: "Aula 102", building: "Edificio A", capacity: 30 },
      { name: "Laboratorio 1", building: "Edificio B", capacity: 25 },
      { name: "Aula Magna", building: "Edificio Central", capacity: 200 },
    ])
    .returning();

  console.log("Created aulas");

  // Create Asignaturas
  const [asig1, asig2, asig3, asig4] = await db
    .insert(asignaturas)
    .values([
      {
        name: "Programación I",
        carreraId: carrera1.id,
        startDate: "2024-03-01",
        endDate: "2024-07-15",
      },
      {
        name: "Base de Datos",
        carreraId: carrera1.id,
        startDate: "2024-03-01",
        endDate: "2024-07-15",
      },
      {
        name: "Administración General",
        carreraId: carrera2.id,
        startDate: "2024-03-01",
        endDate: "2024-07-15",
      },
      {
        name: "Contabilidad I",
        carreraId: carrera3.id,
        startDate: "2024-03-01",
        endDate: "2024-07-15",
      },
    ])
    .returning();

  console.log("Created asignaturas");

  // Link asignaturas with docentes
  await db.insert(asignaturaDocentes).values([
    { asignaturaId: asig1.id, userId: doc1.id },
    { asignaturaId: asig2.id, userId: doc2.id },
    { asignaturaId: asig3.id, userId: doc3.id },
    { asignaturaId: asig4.id, userId: doc4.id },
  ]);

  console.log("Linked asignaturas with docentes");

  // Create Cursadas
  const [curs1, curs2, curs3, curs4] = await db
    .insert(cursadas)
    .values([
      {
        aulaId: aula3.id,
        carreraId: carrera1.id,
        asignaturaId: asig1.id,
        daysOfWeek: [1, 3], // Lunes y Miércoles
        startTime: "08:00",
        durationMinutes: 120,
        commissionNumber: "A",
        weeklyRepetition: true,
      },
      {
        aulaId: aula1.id,
        carreraId: carrera1.id,
        asignaturaId: asig2.id,
        daysOfWeek: [2, 4], // Martes y Jueves
        startTime: "10:00",
        durationMinutes: 90,
        commissionNumber: "A",
        weeklyRepetition: true,
      },
      {
        aulaId: aula2.id,
        carreraId: carrera2.id,
        asignaturaId: asig3.id,
        daysOfWeek: [1, 5], // Lunes y Viernes
        startTime: "14:00",
        durationMinutes: 90,
        commissionNumber: "1",
        weeklyRepetition: true,
      },
      {
        aulaId: aula4.id,
        carreraId: carrera3.id,
        asignaturaId: asig4.id,
        daysOfWeek: [3], // Miércoles
        startTime: "18:00",
        durationMinutes: 180,
        commissionNumber: "Única",
        weeklyRepetition: true,
        notes: "Clase teórico-práctica",
      },
    ])
    .returning();

  console.log("Created cursadas");

  // Link cursadas with docentes
  await db.insert(cursadaDocentes).values([
    { cursadaId: curs1.id, userId: doc1.id },
    { cursadaId: curs2.id, userId: doc2.id },
    { cursadaId: curs3.id, userId: doc3.id },
    { cursadaId: curs4.id, userId: doc4.id },
  ]);

  console.log("Linked cursadas with docentes");

  console.log("Seed completed successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
