import { pgTable, serial, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const designStatusEnum = pgEnum("design_status", ["pending", "interpreting", "ready", "error"]);

export const designsTable = pgTable("designs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rawDescription: text("raw_description").notNull(),
  structuredData: jsonb("structured_data"),
  status: designStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDesignSchema = createInsertSchema(designsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectDesignSchema = createSelectSchema(designsTable);

export type InsertDesign = z.infer<typeof insertDesignSchema>;
export type Design = typeof designsTable.$inferSelect;
