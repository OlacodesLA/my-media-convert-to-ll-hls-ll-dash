-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('uploading', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "ProcessingType" AS ENUM ('video', 'image');

-- CreateEnum
CREATE TYPE "ProcessingLogStatus" AS ENUM ('started', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL,
  "email" VARCHAR(100) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "profile_image_url" VARCHAR(500),
  "bio" TEXT,
  "followers_count" INTEGER NOT NULL DEFAULT 0,
  "following_count" INTEGER NOT NULL DEFAULT 0,
  "posts_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_username_key" UNIQUE ("username"),
  CONSTRAINT "users_email_key" UNIQUE ("email")
);

CREATE INDEX "idx_users_username" ON "users" ("username");
CREATE INDEX "idx_users_email" ON "users" ("email");
CREATE INDEX "idx_users_created_at" ON "users" ("created_at");

-- CreateTable
CREATE TABLE "posts" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "caption" TEXT,
  "media_type" "MediaType" NOT NULL,
  "original_media_url" VARCHAR(500),
  "thumbnail_url" VARCHAR(500),
  "dash_manifest_url" VARCHAR(500),
  "hls_playlist_url" VARCHAR(500),
  "duration_seconds" INTEGER,
  "file_size_bytes" BIGINT,
  "resolution" VARCHAR(20),
  "bitrate_kbps" INTEGER,
  "likes_count" INTEGER NOT NULL DEFAULT 0,
  "comments_count" INTEGER NOT NULL DEFAULT 0,
  "shares_count" INTEGER NOT NULL DEFAULT 0,
  "views_count" INTEGER NOT NULL DEFAULT 0,
  "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'uploading',
  "processing_job_id" VARCHAR(100),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_posts_user_id" ON "posts" ("user_id");
CREATE INDEX "idx_posts_media_type" ON "posts" ("media_type");
CREATE INDEX "idx_posts_processing_status" ON "posts" ("processing_status");
CREATE INDEX "idx_posts_created_at" ON "posts" ("created_at");
CREATE INDEX "idx_posts_likes_count" ON "posts" ("likes_count");
CREATE INDEX "idx_posts_views_count" ON "posts" ("views_count");
CREATE INDEX "idx_posts_user_created" ON "posts" ("user_id", "created_at" DESC);
CREATE INDEX "idx_posts_media_type_created" ON "posts" ("media_type", "created_at" DESC);
CREATE INDEX "idx_posts_processing_created" ON "posts" ("processing_status", "created_at" DESC);

-- CreateTable
CREATE TABLE "comments" (
  "id" SERIAL PRIMARY KEY,
  "post_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "parent_comment_id" INTEGER,
  "likes_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_comments_post_id" ON "comments" ("post_id");
CREATE INDEX "idx_comments_user_id" ON "comments" ("user_id");
CREATE INDEX "idx_comments_created_at" ON "comments" ("created_at");

-- CreateTable
CREATE TABLE "likes" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "post_id" INTEGER,
  "comment_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_post_like" UNIQUE ("user_id", "post_id"),
  CONSTRAINT "unique_comment_like" UNIQUE ("user_id", "comment_id")
);

CREATE INDEX "idx_likes_user_id" ON "likes" ("user_id");
CREATE INDEX "idx_likes_post_id" ON "likes" ("post_id");
CREATE INDEX "idx_likes_comment_id" ON "likes" ("comment_id");

-- CreateTable
CREATE TABLE "follows" (
  "id" SERIAL PRIMARY KEY,
  "follower_id" INTEGER NOT NULL,
  "following_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_follow" UNIQUE ("follower_id", "following_id")
);

CREATE INDEX "idx_follows_follower_id" ON "follows" ("follower_id");
CREATE INDEX "idx_follows_following_id" ON "follows" ("following_id");

-- CreateTable
CREATE TABLE "processing_logs" (
  "id" SERIAL PRIMARY KEY,
  "post_id" INTEGER NOT NULL,
  "processing_type" "ProcessingType" NOT NULL,
  "status" "ProcessingLogStatus" NOT NULL DEFAULT 'started',
  "input_file_url" VARCHAR(500) NOT NULL,
  "output_urls" JSONB,
  "error_message" TEXT,
  "processing_time_seconds" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "processing_logs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_processing_logs_post_id" ON "processing_logs" ("post_id");
CREATE INDEX "idx_processing_logs_status" ON "processing_logs" ("status");
CREATE INDEX "idx_processing_logs_processing_type" ON "processing_logs" ("processing_type");

-- Insert initial user for development/testing
INSERT INTO "users" (username, email, password_hash, bio)
VALUES ('testuser', 'test@example.com', '$2b$10$example_hash', 'Test user for development');


