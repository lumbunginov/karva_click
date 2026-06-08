<?php
declare(strict_types=1);

// ── Router ───────────────────────────────────────────────────────────────────
$path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');

if ($path === '') {
    header('Location: https://karva.id', true, 302);
    exit;
}

$slug = strtok($path, '/') ?: '';
$slug = preg_replace('/[^a-zA-Z0-9\-_]/', '', $slug);

if ($slug === '') {
    header('Location: https://karva.id', true, 302);
    exit;
}

// ── Debug mode (akses /slug?debug=1) ─────────────────────────────────────────
if (isset($_GET['debug'])) {
    debugPage($slug);
    exit;
}

// ── Fetch & render ───────────────────────────────────────────────────────────
$page = fetchPage($slug);

if ($page === null) {
    sendError(404, 'Halaman tidak ditemukan');
    exit;
}

renderPage($page);

// ── Functions ────────────────────────────────────────────────────────────────

function httpGet(string $url): array
{
    // Coba cURL dulu (lebih andal di shared hosting)
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => ['Accept: application/json', 'User-Agent: karva.click/1.0'],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body   = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error  = curl_error($ch);
        curl_close($ch);
        return ['body' => $body ?: '', 'status' => $status, 'error' => $error];
    }

    // Fallback: file_get_contents
    $ctx  = stream_context_create(['http' => [
        'method'        => 'GET',
        'header'        => "Accept: application/json\r\nUser-Agent: karva.click/1.0\r\n",
        'timeout'       => 10,
        'ignore_errors' => true,
    ]]);
    $body   = @file_get_contents($url, false, $ctx);
    $status = 200;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('/^HTTP\/[\d.]+ (\d+)/', $h, $m)) { $status = (int) $m[1]; break; }
    }
    return ['body' => $body ?: '', 'status' => $status, 'error' => $body === false ? 'file_get_contents failed' : ''];
}

function fetchPage(string $slug): ?array
{
    $url    = 'https://karva.id/api/pages/' . rawurlencode($slug);
    $result = httpGet($url);

    if ($result['status'] !== 200 || $result['body'] === '') return null;

    $data = json_decode($result['body'], true);
    if (!is_array($data)) return null;

    $page = $data['data'] ?? $data;

    if (($page['status'] ?? '') !== 'published')        return null;
    if (($page['visibility'] ?? 'public') !== 'public') return null;

    return $page;
}

function debugPage(string $slug): void
{
    $url    = 'https://karva.id/api/pages/' . rawurlencode($slug);
    $result = httpGet($url);

    header('Content-Type: text/plain; charset=utf-8');
    echo "=== karva.click debug ===\n\n";
    echo "Slug     : {$slug}\n";
    echo "URL      : {$url}\n";
    echo "cURL     : " . (function_exists('curl_init') ? 'tersedia' : 'TIDAK ADA') . "\n";
    echo "fopen    : " . (ini_get('allow_url_fopen') ? 'on' : 'off') . "\n";
    echo "HTTP Status : {$result['status']}\n";
    echo "cURL Error  : " . ($result['error'] ?: '-') . "\n\n";
    echo "=== Response Body ===\n";
    $pretty = json_encode(json_decode($result['body']), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    echo $pretty ?: $result['body'];
}

function sendError(int $code, string $message): void
{
    http_response_code($code);
    echo '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>' . $code . '</title>'
        . '<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;'
        . 'height:100vh;margin:0;background:#f5f5f5}.box{text-align:center;color:#555}'
        . '.box h1{font-size:4rem;margin:0;color:#6366f1}.box p{font-size:1.1rem;margin:.75rem 0}'
        . '.box a{color:#6366f1;font-size:.9rem}</style>'
        . '</head><body><div class="box"><h1>' . $code . '</h1>'
        . '<p>' . htmlspecialchars($message) . '</p>'
        . '<a href="https://karva.id">← Kembali ke karva.id</a>'
        . '</div></body></html>';
}

function renderPage(array $page): void
{
    $title    = e($page['title'] ?? 'Landing Page');
    $bgColor  = e($page['bg_color'] ?? '#ffffff');
    $bgImage  = $page['bg_image_url'] ?? null;
    $blocks   = is_array($page['blocks'] ?? null) ? $page['blocks'] : [];

    $bodyStyle = 'background-color:' . $bgColor . ';';
    if ($bgImage) {
        $bodyStyle .= 'background-image:url(' . e($bgImage) . ');'
            . 'background-size:cover;background-position:center;background-attachment:fixed;';
    }
    ?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title><?= $title ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; color: #1a1a2e; min-height: 100vh; <?= $bodyStyle ?> }
        .page-wrapper { max-width: 680px; margin: 0 auto; padding: 2rem 1rem 4rem; }
        .block { margin-bottom: 1.5rem; }

        /* Hero */
        .block-hero { text-align: center; padding: 3.5rem 1.5rem; border-radius: 12px; }
        .block-hero h1 { font-size: clamp(1.75rem, 5vw, 2.5rem); font-weight: 700; line-height: 1.2; }
        .block-hero p { font-size: 1.05rem; margin-top: .75rem; opacity: .85; }
        .block-hero .cta { display: inline-block; margin-top: 1.5rem; padding: .75rem 2rem;
            border-radius: 8px; text-decoration: none; font-weight: 600;
            background: #F6821F; color: #fff; transition: opacity .2s; }
        .block-hero .cta:hover { opacity: .85; }

        /* Text */
        .block-text { line-height: 1.75; font-size: 1rem; }
        .block-text p { margin-bottom: .875rem; }
        .block-text h1, .block-text h2, .block-text h3 { font-weight: 600; margin: 1rem 0 .5rem; }
        .block-text ul, .block-text ol { padding-left: 1.5rem; margin-bottom: .875rem; }
        .block-text a { color: #6366f1; }

        /* Image */
        .block-image { text-align: center; }
        .block-image img { max-width: 100%; border-radius: 8px; display: inline-block; }
        .block-image figcaption { font-size: .85rem; opacity: .6; margin-top: .5rem; }

        /* Button */
        .block-button { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: center; }
        .btn { display: inline-block; padding: .7rem 1.75rem; border-radius: 8px;
            text-decoration: none; font-weight: 600; font-size: .95rem; transition: opacity .2s; }
        .btn:hover { opacity: .85; }
        .btn-primary { background: #F6821F; color: #fff; }
        .btn-secondary { background: transparent; color: #F6821F; border: 2px solid #F6821F; }

        /* Cards */
        .block-cards { display: grid; gap: 1rem; grid-template-columns: repeat(2, 1fr); }
        .block-cards.cols-3 { grid-template-columns: repeat(3, 1fr); }
        .card-item { background: rgba(255,255,255,.85); border-radius: 10px;
            padding: 1.25rem; border: 1px solid rgba(0,0,0,.08); }
        .card-item .icon { font-size: 1.5rem; margin-bottom: .5rem; }
        .card-item h3 { font-weight: 600; font-size: .95rem; }
        .card-item p { font-size: .875rem; opacity: .7; margin-top: .25rem; line-height: 1.5; }

        /* Video */
        .block-video { border-radius: 10px; overflow: hidden; aspect-ratio: 16/9; }
        .block-video iframe { width: 100%; height: 100%; border: 0; }

        /* Divider */
        .block-divider hr { border: none; border-top: 1px solid rgba(0,0,0,.12); }

        /* Countdown */
        .block-countdown { text-align: center; padding: 1rem 0; }
        .countdown-label { font-size: .875rem; opacity: .65; margin-bottom: .75rem; }
        .countdown-timer { display: flex; justify-content: center; gap: 1.5rem; }
        .countdown-unit { text-align: center; }
        .countdown-num { font-size: 2.5rem; font-weight: 700; line-height: 1; }
        .countdown-sub { font-size: .7rem; opacity: .5; text-transform: uppercase;
            letter-spacing: .08em; margin-top: .25rem; }

        /* Social Links */
        .block-social { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: center; }
        .social-link { display: inline-flex; align-items: center; gap: .4rem;
            padding: .5rem 1.1rem; border-radius: 8px;
            background: rgba(0,0,0,.06); text-decoration: none; color: inherit;
            font-size: .9rem; font-weight: 500; transition: background .2s; }
        .social-link:hover { background: rgba(0,0,0,.12); }

        @media (max-width: 480px) {
            .block-cards.cols-3 { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
</head>
<body>
<div class="page-wrapper">
<?php foreach ($blocks as $block): ?>
<?= renderBlock($block) ?>
<?php endforeach; ?>
</div>
<?= renderCountdownScript() ?>
</body>
</html>
    <?php
}

function renderBlock(array $block): string
{
    $type  = $block['type'] ?? '';
    $data  = $block['data'] ?? [];
    $style = $block['style'] ?? [];

    $inner = match ($type) {
        'hero'         => renderHero($data, $style),
        'text'         => renderText($data, $style),
        'image'        => renderImage($data),
        'button'       => renderButton($data),
        'cards'        => renderCards($data),
        'video'        => renderVideo($data),
        'divider'      => renderDivider($data),
        'countdown'    => renderCountdown($data),
        'html'         => renderHtml($data),
        'social_links' => renderSocialLinks($data),
        default        => '',
    };

    if ($inner === '') return '';
    return '<div class="block">' . $inner . '</div>' . "\n";
}

function renderHero(array $d, array $s): string
{
    $bgColor     = e($s['bg'] ?? $d['bg_color'] ?? 'transparent');
    $titleColor  = e($s['title']['color'] ?? '');
    $inlineStyle = "background-color:{$bgColor};";

    if (!empty($d['bg_image_url'])) {
        $inlineStyle .= 'background-image:url(' . e($d['bg_image_url']) . ');'
            . 'background-size:cover;background-position:center;color:#fff;';
    } elseif ($titleColor) {
        $inlineStyle .= "color:{$titleColor};";
    }

    $html = '<div class="block-hero" style="' . $inlineStyle . '">';
    if (!empty($d['title']))    $html .= '<h1>' . e($d['title']) . '</h1>';
    if (!empty($d['subtitle'])) $html .= '<p>' . e($d['subtitle']) . '</p>';
    if (!empty($d['cta_text']) && !empty($d['cta_url'])) {
        $html .= '<a href="' . e($d['cta_url']) . '" class="cta" rel="noopener">'
            . e($d['cta_text']) . '</a>';
    }
    return $html . '</div>';
}

function renderText(array $d, array $s): string
{
    $content = $d['content'] ?? '';
    if ($content === '') return '';
    $color = e($s['body']['color'] ?? '');
    $style = $color ? ' style="color:' . $color . ';"' : '';
    return '<div class="block-text"' . $style . '>' . $content . '</div>';
}

function renderImage(array $d): string
{
    if (empty($d['url'])) return '';
    $maxH    = isset($d['max_height']) ? 'max-height:' . (int) $d['max_height'] . 'px;' : '';
    $fit     = e($d['object_fit'] ?? 'contain');
    $caption = $d['caption'] ?? '';
    $html    = '<figure class="block-image">'
        . '<img src="' . e($d['url']) . '" alt="' . e($caption) . '" '
        . 'style="object-fit:' . $fit . ';' . $maxH . '">';
    if ($caption) $html .= '<figcaption>' . e($caption) . '</figcaption>';
    return $html . '</figure>';
}

function renderButton(array $d): string
{
    $buttons = $d['buttons'] ?? [];
    if (empty($buttons)) return '';
    $html = '<div class="block-button">';
    foreach ($buttons as $btn) {
        $cls  = (($btn['style'] ?? 'primary') === 'secondary') ? 'btn-secondary' : 'btn-primary';
        $html .= '<a href="' . e($btn['url'] ?? '#') . '" class="btn ' . $cls . '" rel="noopener">'
            . e($btn['label'] ?? '') . '</a>';
    }
    return $html . '</div>';
}

function renderCards(array $d): string
{
    $items = $d['items'] ?? [];
    if (empty($items)) return '';
    $cols     = (int) ($d['columns'] ?? 2);
    $colClass = $cols >= 3 ? 'cols-3' : '';
    $html     = '<div class="block-cards ' . $colClass . '">';
    foreach ($items as $item) {
        $html .= '<div class="card-item">';
        if (!empty($item['icon']))        $html .= '<div class="icon">' . e($item['icon']) . '</div>';
        if (!empty($item['title']))       $html .= '<h3>' . e($item['title']) . '</h3>';
        if (!empty($item['description'])) $html .= '<p>' . e($item['description']) . '</p>';
        $html .= '</div>';
    }
    return $html . '</div>';
}

function renderVideo(array $d): string
{
    $embed = toEmbedUrl($d['url'] ?? '');
    if (!$embed) return '';
    return '<div class="block-video">'
        . '<iframe src="' . e($embed) . '" '
        . 'allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" '
        . 'allowfullscreen></iframe></div>';
}

function toEmbedUrl(string $url): ?string
{
    if (preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_\-]+)/', $url, $m)) {
        return 'https://www.youtube.com/embed/' . $m[1];
    }
    if (preg_match('/vimeo\.com\/(\d+)/', $url, $m)) {
        return 'https://player.vimeo.com/video/' . $m[1];
    }
    return null;
}

function renderDivider(array $d): string
{
    $spacing = $d['spacing'] ?? 'md';
    $px      = is_numeric($spacing) ? (int) $spacing : match ($spacing) {
        'sm'    => 12,
        'lg'    => 32,
        default => 20,
    };
    return '<div class="block-divider" style="padding:' . $px . 'px 0"><hr></div>';
}

$_countdownItems = [];

function renderCountdown(array $d): string
{
    global $_countdownItems;
    $id     = 'cd-' . count($_countdownItems);
    $label  = e($d['label'] ?? '');
    $_countdownItems[] = ['id' => $id, 'target' => $d['target_date'] ?? ''];

    $html = '<div class="block-countdown">';
    if ($label) $html .= '<div class="countdown-label">' . $label . '</div>';
    $html .= '<div class="countdown-timer" id="' . $id . '">';
    foreach ([['data-d', 'Hari'], ['data-h', 'Jam'], ['data-m', 'Menit'], ['data-s', 'Detik']] as [$attr, $sub]) {
        $html .= '<div class="countdown-unit">'
            . '<div class="countdown-num" ' . $attr . '>--</div>'
            . '<div class="countdown-sub">' . $sub . '</div></div>';
    }
    return $html . '</div></div>';
}

function renderCountdownScript(): string
{
    global $_countdownItems;
    if (empty($_countdownItems)) return '';
    $json = json_encode($_countdownItems, JSON_UNESCAPED_UNICODE);
    return <<<HTML
<script>
(function(){
  var timers={$json};
  timers.forEach(function(t){
    var el=document.getElementById(t.id);
    if(!el||!t.target)return;
    var target=new Date(t.target).getTime();
    function tick(){
      var diff=target-Date.now();
      if(diff<=0){el.innerHTML='<div class="countdown-unit"><div class="countdown-num">Selesai</div></div>';return;}
      var d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),
          m=Math.floor(diff%3600000/60000),s=Math.floor(diff%60000/1000);
      el.querySelector('[data-d]').textContent=String(d).padStart(2,'0');
      el.querySelector('[data-h]').textContent=String(h).padStart(2,'0');
      el.querySelector('[data-m]').textContent=String(m).padStart(2,'0');
      el.querySelector('[data-s]').textContent=String(s).padStart(2,'0');
      setTimeout(tick,1000);
    }
    tick();
  });
})();
</script>
HTML;
}

function renderHtml(array $d): string
{
    return $d['content'] ?? '';
}

function renderSocialLinks(array $d): string
{
    $links = $d['links'] ?? $d['items'] ?? [];
    if (empty($links)) return '';
    $html = '<div class="block-social">';
    foreach ($links as $link) {
        $url   = e($link['url'] ?? '#');
        $label = e($link['label'] ?? $link['platform'] ?? '');
        $html .= '<a href="' . $url . '" class="social-link" rel="noopener nofollow" target="_blank">'
            . $label . '</a>';
    }
    return $html . '</div>';
}

function e(mixed $v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}
