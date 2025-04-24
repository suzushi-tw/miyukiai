-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "user_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "Model" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" text DEFAULT '1.0' NOT NULL,
	"modelType" text NOT NULL,
	"baseModel" text NOT NULL,
	"tags" text,
	"license" text,
	"userId" text NOT NULL,
	"fileUrl" text NOT NULL,
	"fileSize" bigint NOT NULL,
	"fileName" text NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ModelImage" (
	"id" text PRIMARY KEY NOT NULL,
	"modelId" text NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Role" (
	"userId" varchar(256) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"canDelete" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"page" varchar(256) DEFAULT 'default' NOT NULL,
	"threadId" integer,
	"author" varchar(256) NOT NULL,
	"content" json NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Rate" (
	"userId" varchar(256) NOT NULL,
	"commentId" integer NOT NULL,
	"like" boolean NOT NULL,
	CONSTRAINT "Rate_pkey" PRIMARY KEY("userId","commentId")
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Model" ADD CONSTRAINT "Model_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ModelImage" ADD CONSTRAINT "ModelImage_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "public"."Model"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."Comment"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Model_userId_idx" ON "Model" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "ModelImage_modelId_idx" ON "ModelImage" USING btree ("modelId" text_ops);--> statement-breakpoint
CREATE INDEX "Comment_page_idx" ON "Comment" USING btree ("page" text_ops);--> statement-breakpoint
CREATE INDEX "Rate_commentId_idx" ON "Rate" USING btree ("commentId" int4_ops);
*/