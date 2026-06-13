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
  arrived_at DATE NOT NULL,
  food VARCHAR(40) NOT NULL DEFAULT '',
  color CHAR(7) NOT NULL DEFAULT '#8fd2c8',
  traits JSON NOT NULL,
  memory TEXT NOT NULL,
  photos JSON NOT NULL,
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
  arrived_at DATE NOT NULL,
  food VARCHAR(40) NOT NULL DEFAULT '',
  color CHAR(7) NOT NULL DEFAULT '#8fd2c8',
  traits JSON NOT NULL,
  memory TEXT NOT NULL,
  photos JSON NOT NULL,
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

INSERT IGNORE INTO residents
  (public_id, name, nickname, player_name, region, arrived_at, food, color, traits, memory, photos, visibility, source, published_at)
VALUES
  (
    'seed-1',
    '芝麻',
    '黑芝麻汤圆',
    '示例玩家',
    '月光谷',
    '2024-11-02',
    '小米穗',
    '#3b2f2f',
    CAST('["胆小", "爱囤粮", "会把纸巾做成被子"]' AS JSON),
    '它总是把最喜欢的小米穗拖进窝里，露出半截尾巴，以为谁都看不见。',
    CAST('[]' AS JSON),
    'public',
    'seed',
    '2024-11-02 00:00:00'
  ),
  (
    'seed-2',
    '奶盖',
    '盖盖',
    '示例玩家',
    '瓜子环',
    '2025-03-18',
    '南瓜籽',
    '#f3dfc0',
    CAST('["亲人", "爱跑轮", "听见袋子声会冲出来"]' AS JSON),
    '它跑轮的时候像一颗小小的行星，认真、热烈，整个夜晚都被它转亮了。',
    CAST('[]' AS JSON),
    'public',
    'seed',
    '2025-03-18 00:00:00'
  ),
  (
    'seed-3',
    '团子',
    '白糯米',
    '示例玩家',
    '棉花云',
    '2025-08-09',
    '冻干豆腐',
    '#f8f1e8',
    CAST('["慢吞吞", "爱睡", "喜欢把脸埋进木屑"]' AS JSON),
    '团子睡醒时会迷迷糊糊地坐着，像刚从云里滚出来的一小团月光。',
    CAST('[]' AS JSON),
    'public',
    'seed',
    '2025-08-09 00:00:00'
  ),
  (
    'seed-4',
    '栗子',
    '小栗',
    '示例玩家',
    '瓜子环',
    '2026-01-21',
    '苹果干',
    '#9f6a45',
    CAST('["机灵", "越狱高手", "会认真洗脸"]' AS JSON),
    '它每次洗脸都像在准备一场重要会面，胡须一抖一抖，郑重得让人想笑。',
    CAST('[]' AS JSON),
    'public',
    'seed',
    '2026-01-21 00:00:00'
  ),
  (
    'seed-5',
    '小星星',
    '星宝',
    '示例玩家',
    '月光谷',
    '2026-05-12',
    '燕麦片',
    '#c8b7a6',
    CAST('["温柔", "爱钻袖口", "喜欢安静听人说话"]' AS JSON),
    '它趴在掌心的时候很轻，像有一颗小星星短暂停在了这里。',
    CAST('[]' AS JSON),
    'public',
    'seed',
    '2026-05-12 00:00:00'
  );
