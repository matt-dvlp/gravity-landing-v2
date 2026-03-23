<?php
// Copy this file to config.php and fill in your values
// config.php is gitignored — never commit it

if (!defined('APP_INIT')) { die('Direct access not permitted'); }

// Admin
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD_HASH', password_hash('change_me', PASSWORD_BCRYPT));

// Pollinations (server-side key for auto-generation, optional)
define('POLLINATIONS_API_KEY', 'sk_...');
define('POLLINATIONS_MODEL',   'gemini-fast');
define('PICTURES_MODEL',       'flux');

// Paths
define('BASE_PATH',    dirname(__DIR__));
define('LIBRARY_PATH', BASE_PATH . '/data/library');
define('DB_PATH',      BASE_PATH . '/data/db.sqlite');

// Generation
define('ENABLE_IMAGE_GENERATION', true);
define('MAX_IMAGES_PER_PAGE',     20);
define('MAX_RETRIES',             2);
define('API_TIMEOUT',             120);
define('GENERATION_COOLDOWN',     3600);

// App
define('APP_ENV',      'production');
define('APP_TIMEZONE', 'Asia/Taipei');
date_default_timezone_set(APP_TIMEZONE);
