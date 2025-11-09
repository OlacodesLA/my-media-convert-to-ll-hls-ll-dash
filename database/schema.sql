-- Ultra Fast Social Platform Database Schema
-- Optimized for high-performance streaming and social media features
-- NOTE: This legacy MySQL schema is retained for reference. Use Prisma migrations for the authoritative PostgreSQL schema.

CREATE DATABASE IF NOT EXISTS social_platform;
USE social_platform;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_image_url VARCHAR(500),
    bio TEXT,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);

-- Posts table with optimized structure for streaming
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    caption TEXT,
    media_type ENUM('image', 'video') NOT NULL,
    
    -- Original media URLs
    original_media_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Streaming URLs for optimal performance
    dash_manifest_url VARCHAR(500),
    hls_playlist_url VARCHAR(500),
    
    -- Media metadata for optimization
    duration_seconds INT,
    file_size_bytes BIGINT,
    resolution VARCHAR(20), -- e.g., "1920x1080"
    bitrate_kbps INT,
    
    -- Engagement metrics
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    
    -- Processing status
    processing_status ENUM('uploading', 'processing', 'ready', 'failed') DEFAULT 'uploading',
    processing_job_id VARCHAR(100), -- AWS MediaConvert job ID
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_media_type (media_type),
    INDEX idx_processing_status (processing_status),
    INDEX idx_created_at (created_at),
    INDEX idx_likes_count (likes_count),
    INDEX idx_views_count (views_count)
);

-- Comments table
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id INT NULL, -- For nested comments
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Likes table
CREATE TABLE likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    post_id INT NULL,
    comment_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_post_like (user_id, post_id),
    UNIQUE KEY unique_comment_like (user_id, comment_id),
    INDEX idx_user_id (user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_comment_id (comment_id)
);

-- Follows table
CREATE TABLE follows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_follow (follower_id, following_id),
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id)
);

-- FFmpeg processing logs table for tracking local video processing
CREATE TABLE processing_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    processing_type ENUM('video', 'image') NOT NULL,
    status ENUM('started', 'completed', 'failed') DEFAULT 'started',
    input_file_url VARCHAR(500) NOT NULL,
    output_urls JSON,
    error_message TEXT,
    processing_time_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_status (status),
    INDEX idx_processing_type (processing_type)
);

-- Create indexes for optimal performance
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_media_type_created ON posts(media_type, created_at DESC);
CREATE INDEX idx_posts_processing_created ON posts(processing_status, created_at DESC);

-- Insert sample user for testing
INSERT INTO users (username, email, password_hash, bio) VALUES 
('testuser', 'test@example.com', '$2b$10$example_hash', 'Test user for development');
