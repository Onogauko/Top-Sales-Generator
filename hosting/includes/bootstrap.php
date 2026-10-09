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
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

set_exception_handler(function (Throwable $e) {
    error_log('[top-sales] ' . $e);
    fail('Terjadi kesalahan server.', 500);
});

function respond(array $data = []): void
{
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
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

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function require_post_csrf(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method tidak diizinkan.', 405);
    if (!hash_equals(csrf_token(), $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        fail('Sesi kadaluarsa, silakan refresh halaman.', 403);
    }
}

function is_admin(): bool
{
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
