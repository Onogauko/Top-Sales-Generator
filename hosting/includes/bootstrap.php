<?php
// Dipakai semua endpoint api/*.php: session, koneksi DB, helper JSON, CSRF, cek admin.
declare(strict_types=1);

ini_set('display_errors', '0');

const ADMIN_IDLE_SECONDS = 8 * 3600;   // admin otomatis logout setelah 8 jam tidak aktif
const LOGIN_MAX_FAILS = 5;             // maks gagal login per IP ...
const LOGIN_WINDOW_SECONDS = 15 * 60;  // ... dalam 15 menit
const MIN_PASSWORD_LENGTH = 8;

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('tsg_session');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

set_exception_handler(function (Throwable $e) {
    error_log('[top-sales] ' . $e);
    fail(db_error_hint($e) ?? 'Terjadi kesalahan server (detail ada di file error_log di folder api/).', 500);
});

// Pesan yang jelas untuk kesalahan setup database yang umum (tanpa membocorkan password).
function db_error_hint(Throwable $e): ?string
{
    if (!$e instanceof PDOException) return null;
    $code = (int)($e->errorInfo[1] ?? $e->getCode());
    $hints = [
        1045 => 'Login database ditolak: cek user & password di config/db.php (pakai nama user lengkap dengan awalan cPanel).',
        1044 => 'User database belum punya akses ke database ini: cPanel > MySQL Databases > Add User To Database, centang ALL PRIVILEGES.',
        1049 => 'Database tidak ditemukan: cek nama database di config/db.php (pakai nama lengkap dengan awalan cPanel).',
        2002 => 'Tidak bisa terhubung ke server database: cek host di config/db.php (biasanya localhost).',
        2005 => 'Host database tidak dikenal: cek host di config/db.php (biasanya localhost).',
        1153 => 'Data terlalu besar untuk database (max_allowed_packet MySQL). Hubungi hosting untuk menaikkan max_allowed_packet.',
        1146 => 'Tabel belum ada: jalankan database/schema.sql di phpMyAdmin, pada database yang sama dengan config/db.php.',
    ];
    return isset($hints[$code]) ? 'Database: ' . $hints[$code] : null;
}

function respond(array $data = []): void
{
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400, array $extra = []): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message] + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $file = __DIR__ . '/../config/db.php';
        if (!is_file($file)) fail('config/db.php belum dibuat (salin dari config/db.example.php).', 500);
        $c = require $file;
        $dsn = $c['dsn'] ?? "mysql:host={$c['host']};dbname={$c['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $c['user'] ?? null, $c['pass'] ?? null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function input(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($data) ? $data : [];
}

function setting(string $key): ?array
{
    $stmt = db()->prepare('SELECT v, updated_at FROM tsg_settings WHERE k = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function setting_value(string $key): ?string
{
    $row = setting($key);
    return $row ? $row['v'] : null;
}

function set_setting(string $key, string $value): int
{
    $now = time();
    db()->prepare('REPLACE INTO tsg_settings (k, v, updated_at) VALUES (?, ?, ?)')->execute([$key, $value, $now]);
    return $now;
}

// Session hanya dimulai saat dibutuhkan (login/CSRF/cek admin). Request publik (config, data)
// tidak membuat session, supaya request paralel saat halaman dibuka tidak saling menimpa cookie.
function start_session(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function require_post_csrf(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method tidak diizinkan.', 405);
    if (!hash_equals(csrf_token(), $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        fail('Sesi kadaluarsa, silakan refresh halaman.', 403, ['csrfExpired' => true]);
    }
}

function is_admin(): bool
{
    start_session();
    if (empty($_SESSION['admin'])) return false;
    if (time() - ($_SESSION['last_activity'] ?? 0) > ADMIN_IDLE_SECONDS) {
        unset($_SESSION['admin']);
        return false;
    }
    $_SESSION['last_activity'] = time();
    return true;
}

function must_change_password(): bool
{
    return setting_value('admin_must_change') === '1';
}

// $allowMustChange: true hanya untuk endpoint ganti password.
function require_admin(bool $allowMustChange = false): void
{
    if (!is_admin()) fail('Silakan login admin.', 401);
    if (!$allowMustChange && must_change_password()) fail('Ganti password admin terlebih dahulu.', 403);
}

function client_ip(): string
{
    return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}
