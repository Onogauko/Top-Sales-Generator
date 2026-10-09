<?php
// GET          -> info data sales terakhir di server {upload: {...} | null}
// GET ?id=N    -> isi CSV upload N, terkompresi gzip (biner; aman di-cache karena tidak pernah berubah)
// POST         -> simpan upload baru (admin + CSRF). Body: CSV terkompresi gzip.
//                 Header: X-Filename (URL-encoded), X-Sales-Until (YYYY-MM-DD), X-Row-Count
require __DIR__ . '/../includes/bootstrap.php';

const MAX_GZIP_BYTES = 30 * 1024 * 1024;
const MAX_CSV_BYTES = 300 * 1024 * 1024;
const KEEP_UPLOADS = 10; // upload lama selain 10 terakhir dihapus otomatis

function upload_meta(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'filename' => $row['filename'],
        'rowCount' => (int)$row['row_count'],
        'salesUntil' => $row['sales_until'],
        'uploadedAt' => (int)$row['uploaded_at'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = db()->prepare('SELECT data FROM tsg_uploads WHERE id = ?');
        $stmt->execute([(int)$_GET['id']]);
        $data = $stmt->fetchColumn();
        if ($data === false) fail('Data tidak ditemukan.', 404);
        if (is_resource($data)) $data = stream_get_contents($data);
        header('Content-Type: application/octet-stream');
        header('Cache-Control: private, max-age=31536000, immutable');
        echo $data;
        exit;
    }
    $row = db()->query('SELECT id, filename, row_count, sales_until, uploaded_at FROM tsg_uploads ORDER BY id DESC LIMIT 1')->fetch();
    respond(['upload' => $row ? upload_meta($row) : null]);
}

require_post_csrf();
require_admin();

$gz = file_get_contents('php://input');
if (($gz === false || $gz === '') && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    fail('File melebihi batas upload server (post_max_size = ' . ini_get('post_max_size') . '). Naikkan di cPanel > Select PHP Version > Options.', 413);
}
if ($gz === false || $gz === '') fail('File kosong.');
if (strlen($gz) > MAX_GZIP_BYTES) fail('File terlalu besar.', 413);
$csv = @gzdecode($gz, MAX_CSV_BYTES);
if ($csv === false || trim($csv) === '') fail('File tidak valid atau kosong.');

$salesUntil = (string)($_SERVER['HTTP_X_SALES_UNTIL'] ?? '');
$date = DateTime::createFromFormat('!Y-m-d', $salesUntil);
if (!$date || $date->format('Y-m-d') !== $salesUntil) fail('Isi tanggal "Data sales s/d" dengan benar.');

$filename = (string)preg_replace('/[\x00-\x1F\x7F]/u', '', basename(rawurldecode((string)($_SERVER['HTTP_X_FILENAME'] ?? 'data.csv'))));
$filename = $filename !== '' ? $filename : 'data.csv';
$filename = function_exists('mb_substr') ? mb_substr($filename, 0, 255) : substr($filename, 0, 255);
$rowCount = max(0, (int)($_SERVER['HTTP_X_ROW_COUNT'] ?? 0));
$now = time();

$stmt = db()->prepare('INSERT INTO tsg_uploads (filename, data, size_bytes, row_count, sales_until, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)');
$stmt->bindValue(1, $filename);
$stmt->bindValue(2, $gz, PDO::PARAM_LOB);
$stmt->bindValue(3, strlen($csv), PDO::PARAM_INT);
$stmt->bindValue(4, $rowCount, PDO::PARAM_INT);
$stmt->bindValue(5, $salesUntil);
$stmt->bindValue(6, $now, PDO::PARAM_INT);
$stmt->execute();
$id = (int)db()->lastInsertId();

db()->prepare('DELETE FROM tsg_uploads WHERE id <= ?')->execute([$id - KEEP_UPLOADS]);

respond(['upload' => upload_meta([
    'id' => $id, 'filename' => $filename, 'row_count' => $rowCount, 'sales_until' => $salesUntil, 'uploaded_at' => $now,
])]);
