import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  content: text("content").notNull(),
  author: varchar("author", { length: 100 }).default("system"),
  domain: varchar("domain", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const followUpsTable = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status", { length: 30 }).default("pending"),
  assignedTo: varchar("assigned_to", { length: 100 }),
  domain: varchar("domain", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const sopsTable = pgTable("sops", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  content: text("content").notNull(),
  version: varchar("version", { length: 20 }).default("1.0"),
  status: varchar("status", { length: 30 }).default("active"),
  domain: varchar("domain", { length: 50 }),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
