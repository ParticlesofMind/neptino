import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const encyclopediaEntries = pgTable("encyclopedia_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
