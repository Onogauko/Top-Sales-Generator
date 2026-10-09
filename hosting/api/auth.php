<?php
// GET                         -> status login + CSRF token
// POST ?action=login          -> {password}
// POST ?action=logout
// POST ?action=change_password -> {currentPassword, newPassword}
require __DIR__ . '/../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $admin = is_admin();
    respond(['admin' => $admin, 'mustChange' => $admin && must_change_password(), 'csrf' => csrf_token()]);
}

require_post_csrf();
$in = input();

switch ($_GET['action'] ?? '') {
    case 'login':
        $ip = client_ip();
        db()->prepare('DELETE FROM tsg_login_attempts WHERE attempted_at < ?')->execute([time() - LOGIN_WINDOW_SECONDS]);
        $stmt = db()->prepare('SELECT COUNT(*) FROM tsg_login_attempts WHERE ip = ?');
        $stmt->execute([$ip]);
        if ((int)$stmt->fetchColumn() >= LOGIN_MAX_FAILS) {
            fail('Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.', 429);
        }

        $hash = setting_value('admin_password_hash');
        if (!$hash || !password_verify((string)($in['password'] ?? ''), $hash)) {
            db()->prepare('INSERT INTO tsg_login_attempts (ip, attempted_at) VALUES (?, ?)')->execute([$ip, time()]);
            fail('Password salah!', 401);
        }

        db()->prepare('DELETE FROM tsg_login_attempts WHERE ip = ?')->execute([$ip]);
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['last_activity'] = time();
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        respond(['admin' => true, 'mustChange' => must_change_password(), 'csrf' => $_SESSION['csrf']]);

    case 'logout':
        $_SESSION = [];
        session_regenerate_id(true);
        respond(['admin' => false, 'csrf' => csrf_token()]);

    case 'change_password':
        require_admin(true);
        $current = (string)($in['currentPassword'] ?? '');
        $new = (string)($in['newPassword'] ?? '');
        if (!password_verify($current, (string)setting_value('admin_password_hash'))) fail('Password lama salah.', 400);
        if (strlen($new) < MIN_PASSWORD_LENGTH) fail('Password baru minimal ' . MIN_PASSWORD_LENGTH . ' karakter.', 400);
        if ($new === $current) fail('Password baru harus berbeda dari password lama.', 400);
        set_setting('admin_password_hash', password_hash($new, PASSWORD_DEFAULT));
        set_setting('admin_must_change', '0');
        respond(['mustChange' => false]);

    default:
        fail('Aksi tidak dikenal.', 404);
}
