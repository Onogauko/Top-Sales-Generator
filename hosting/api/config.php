<?php
// GET  -> konfigurasi divisi & store (publik, dipakai semua user)
// POST -> simpan konfigurasi {config, version} (admin + CSRF)
require __DIR__ . '/../includes/bootstrap.php';

// Rapikan & validasi: nama divisi huruf besar, kode dept angka, kolom store huruf Excel, tanpa duplikat.
function normalize_config($c): array
{
    $divisions = [];
    foreach ((is_array($c['divisions'] ?? null) ? $c['divisions'] : []) as $name => $codes) {
        $div = strtoupper(trim((string)$name));
        $clean = [];
        foreach (is_array($codes) ? $codes : [] as $code) {
            $code = trim((string)$code);
            if (preg_match('/^\d+$/', $code) && !in_array($code, $clean, true)) $clean[] = $code;
        }
        if ($div !== '' && $clean) $divisions[$div] = $clean;
    }

    $stores = [];
    $seen = [];
    foreach ((is_array($c['stores'] ?? null) ? $c['stores'] : []) as $s) {
        $col = strtoupper(trim((string)($s['col'] ?? '')));
        if (!preg_match('/^[A-Z]{1,3}$/', $col) || isset($seen[$col])) continue;
        $seen[$col] = true;
        $stores[] = ['col' => $col, 'name' => trim((string)($s['name'] ?? ''))];
    }

    return ['divisions' => $divisions, 'stores' => $stores];
}

function config_payload(?array $row): array
{
    $config = $row ? json_decode($row['v'], true) : ['divisions' => [], 'stores' => []];
    // (object): divisi kosong tetap dikirim sebagai {} bukan []
    return ['config' => ['divisions' => (object)$config['divisions'], 'stores' => $config['stores']],
            'version' => $row ? (int)$row['updated_at'] : 0];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(config_payload(setting('config')));
}

require_post_csrf();
require_admin();
$in = input();

$clean = normalize_config($in['config'] ?? null);
if (!$clean['stores']) fail('Minimal harus ada 1 kolom store.');

$json = json_encode($clean, JSON_UNESCAPED_UNICODE);
$current = setting('config');
$version = max(time(), ($current ? (int)$current['updated_at'] : 0) + 1);
if ($current) {
    // Update hanya jika versi masih sama dengan yang dimuat admin ini (atomik),
    // supaya tidak menimpa perubahan admin lain yang tersimpan sesudahnya.
    $stmt = db()->prepare('UPDATE tsg_settings SET v = ?, updated_at = ? WHERE k = ? AND updated_at = ?');
    $stmt->execute([$json, $version, 'config', (int)($in['version'] ?? -1)]);
    if ($stmt->rowCount() === 0) {
        fail('Konfigurasi baru saja diubah di tempat lain. Data terbaru sudah dimuat, silakan ulangi perubahan Anda.', 409);
    }
} else {
    db()->prepare('INSERT INTO tsg_settings (k, v, updated_at) VALUES (?, ?, ?)')->execute(['config', $json, $version]);
}

respond(config_payload(['v' => $json, 'updated_at' => $version]));
