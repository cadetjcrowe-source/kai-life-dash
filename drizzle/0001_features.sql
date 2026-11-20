CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#9a9aa3' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "kit_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"text" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kit_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '🎒' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "shot_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"best_time" text DEFAULT 'any' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shot" boolean DEFAULT false NOT NULL,
	"shot_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_assignment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_list_id_kit_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."kit_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kit_items_list_idx" ON "kit_items" USING btree ("list_id");--> statement-breakpoint
-- Data: starting categories (editable in Settings). Existing names in
-- tasks/events/projects are kept too.
INSERT INTO "categories" ("name", "color", "sort_order") VALUES
  ('Study', '#6E8FD8', 0), ('Work', '#D69A5C', 1), ('Personal', '#5FAFAA', 2),
  ('Health', '#7FA37A', 3), ('Creative', '#B184C9', 4), ('Other', '#9A9AA3', 5)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "categories" ("name", "sort_order")
  SELECT DISTINCT c, 100 FROM (
    SELECT "category" AS c FROM "tasks" UNION SELECT "category" FROM "events" UNION SELECT "category" FROM "projects"
  ) used
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
-- Data: one starter packing list (edit or delete it in the app).
WITH l AS (
  INSERT INTO "kit_lists" ("name", "emoji", "sort_order") VALUES ('Weekend away', '🎒', 0)
  RETURNING "id"
)
INSERT INTO "kit_items" ("list_id", "text", "sort_order")
SELECT l."id", i.text, i.ord FROM l CROSS JOIN (VALUES
  ('Phone charger', 0), ('Toothbrush & wash kit', 1), ('Change of clothes', 2),
  ('Jacket', 3), ('Medication', 4), ('Headphones', 5), ('Wallet / bank card', 6)
) AS i(text, ord);
