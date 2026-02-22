CREATE TABLE "urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"original" text NOT NULL,
	"short" varchar(10) NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"created" timestamp DEFAULT now(),
	CONSTRAINT "urls_original_unique" UNIQUE("original"),
	CONSTRAINT "urls_short_unique" UNIQUE("short")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" varchar(1024) NOT NULL,
	"created" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;