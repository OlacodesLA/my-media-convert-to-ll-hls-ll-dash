-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_parent_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_follower_id_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_following_id_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_post_id_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "processing_logs" DROP CONSTRAINT "processing_logs_post_id_fkey";

-- DropIndex
DROP INDEX "idx_posts_media_type_created";

-- DropIndex
DROP INDEX "idx_posts_processing_created";

-- DropIndex
DROP INDEX "idx_posts_user_created";

-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "original_media_url" SET DATA TYPE TEXT,
ALTER COLUMN "thumbnail_url" SET DATA TYPE TEXT,
ALTER COLUMN "dash_manifest_url" SET DATA TYPE TEXT,
ALTER COLUMN "hls_playlist_url" SET DATA TYPE TEXT,
ALTER COLUMN "resolution" SET DATA TYPE TEXT,
ALTER COLUMN "processing_job_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "processing_logs" ALTER COLUMN "input_file_url" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "password_hash" SET DATA TYPE TEXT,
ALTER COLUMN "profile_image_url" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "idx_posts_user_created" ON "posts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_posts_media_type_created" ON "posts"("media_type", "created_at");

-- CreateIndex
CREATE INDEX "idx_posts_processing_created" ON "posts"("processing_status", "created_at");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_logs" ADD CONSTRAINT "processing_logs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
