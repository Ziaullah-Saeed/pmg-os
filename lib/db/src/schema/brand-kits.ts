import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandKitsTable = pgTable("brand_kits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  primaryColor: text("primary_color").notNull().default("#DC2626"),
  secondaryColor: text("secondary_color").notNull().default("#1E3A5F"),
  accentColor: text("accent_color").notNull().default("#F59E0B"),
  backgroundColor: text("background_color").notNull().default("#0F172A"),
  textColor: text("text_color").notNull().default("#F8FAFC"),
  headingFont: text("heading_font").notNull().default("Inter"),
  bodyFont: text("body_font").notNull().default("Inter"),
  logoUrl: text("logo_url"),
  iconUrl: text("icon_url"),
  watermarkUrl: text("watermark_url"),
  tonOfVoice: text("tone_of_voice").notNull().default("Professional, authoritative, cybersecurity-expert"),
  guidelines: text("guidelines"),
  tagline: text("tagline").default("Securing Your Digital Future"),
  industry: text("industry").default("Cybersecurity & IT Services"),
  companyName: text("company_name").default("PMG Group LLC"),
  colorPalette: jsonb("color_palette").$type<string[]>().default([]),
  fontPairs: jsonb("font_pairs").$type<{ heading: string; body: string }[]>().default([]),
  metadata: jsonb("metadata"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBrandKitSchema = createInsertSchema(brandKitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export type BrandKit = typeof brandKitsTable.$inferSelect;
