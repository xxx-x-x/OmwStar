CREATE DATABASE IF NOT EXISTS `omwstar`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `omwstar`;

CREATE TABLE IF NOT EXISTS residents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(32) NOT NULL,
  name VARCHAR(32) NOT NULL,
  nickname VARCHAR(40) NOT NULL DEFAULT '',
  player_name VARCHAR(40) NOT NULL DEFAULT '',
  region ENUM('月光谷', '瓜子环', '棉花云', '星砂海', '蜜糖丘', '软绒原') NOT NULL DEFAULT '月光谷',
  presence ENUM('star', 'earth') NOT NULL DEFAULT 'star',
  arrived_at DATE NOT NULL,
  food VARCHAR(40) NOT NULL DEFAULT '',
  color CHAR(7) NOT NULL DEFAULT '#8fd2c8',
  traits JSON NOT NULL,
  memory TEXT NOT NULL,
  photos JSON NOT NULL,
  spread_image VARCHAR(255) NOT NULL DEFAULT '',
  visibility ENUM('private', 'public') NOT NULL DEFAULT 'public',
  source ENUM('seed', 'submission', 'admin') NOT NULL DEFAULT 'submission',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME NULL,
  douyin VARCHAR(40) NOT NULL DEFAULT '',
  xiaohongshu VARCHAR(40) NOT NULL DEFAULT '',
  bilibili VARCHAR(40) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_residents_public_id (public_id),
  KEY idx_residents_visibility_published (visibility, published_at),
  KEY idx_residents_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(32) NOT NULL,
  resident_id BIGINT UNSIGNED NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  name VARCHAR(32) NOT NULL,
  nickname VARCHAR(40) NOT NULL DEFAULT '',
  breed VARCHAR(40) NOT NULL DEFAULT '',
  player_name VARCHAR(40) NOT NULL DEFAULT '',
  region ENUM('月光谷', '瓜子环', '棉花云', '星砂海', '蜜糖丘', '软绒原') NOT NULL DEFAULT '月光谷',
  presence ENUM('star', 'earth') NOT NULL DEFAULT 'star',
  arrived_at DATE NOT NULL,
  food VARCHAR(40) NOT NULL DEFAULT '',
  color CHAR(7) NOT NULL DEFAULT '#8fd2c8',
  traits JSON NOT NULL,
  memory TEXT NOT NULL,
  photos JSON NOT NULL,
  spread_image VARCHAR(255) NOT NULL DEFAULT '',
  public_consent TINYINT(1) NOT NULL DEFAULT 0,
  reviewer_note VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  douyin VARCHAR(40) NOT NULL DEFAULT '',
  xiaohongshu VARCHAR(40) NOT NULL DEFAULT '',
  bilibili VARCHAR(40) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_submissions_public_id (public_id),
  KEY idx_submissions_status_created (status, created_at),
  CONSTRAINT fk_submissions_resident
    FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resident_lights (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  visitor_key CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_resident_lights_visitor (resident_id, visitor_key),
  KEY idx_resident_lights_created (created_at),
  CONSTRAINT fk_resident_lights_resident
    FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resident_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(32) NOT NULL,
  resident_id BIGINT UNSIGNED NOT NULL,
  author VARCHAR(32) NOT NULL DEFAULT '匿名旅鼠',
  message VARCHAR(280) NOT NULL,
  status ENUM('pending', 'approved', 'hidden') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_resident_notes_public_id (public_id),
  KEY idx_resident_notes_resident_status (resident_id, status, created_at),
  CONSTRAINT fk_resident_notes_resident
    FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS time_capsules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(32) NOT NULL,
  resident_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  deliver_at DATE NOT NULL,
  status ENUM('pending', 'sent', 'canceled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_time_capsules_public_id (public_id),
  KEY idx_time_capsules_due (status, deliver_at),
  CONSTRAINT fk_time_capsules_resident
    FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- End of schema.
