import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const noticias = pgTable("noticias", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  sidebar: boolean("sidebar").notNull().default(false),
  visible: boolean("visible").notNull().default(true),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
