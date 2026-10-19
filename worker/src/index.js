const ORIGIN = 'https://karva.id';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' || path === '') {
      return Response.redirect(ORIGIN, 302);
    }

    // /page/:slug → redirect ke /:slug (canonical URL)
    const pageMatch = path.match(/^\/page\/([^/]+)\/?$/);
    if (pageMatch) {
      return Response.redirect(`${url.origin}/${pageMatch[1]}`, 301);
    }

    const slug = path.split('/').filter(Boolean)[0] ?? '';
    if (!slug) return Response.redirect(ORIGIN, 302);

    const page = await fetchPage(slug);
    if (!page) return notFound();

    return new Response(renderPage(page), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};

async function fetchPage(slug) {
  try {
    const res = await fetch(`${ORIGIN}/api/pages/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'karva.click/2.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const page = json.data ?? json;
    if (page.status !== 'published') return null;
    if ((page.visibility ?? 'public') !== 'public') return null;
    return page;
  } catch {
    return null;
  }
}

function e(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPage(page) {
  const title = e(page.title ?? 'Landing Page');
  const bgColor = e(page.bg_color ?? '#ffffff');
  const bgImage = page.bg_image_url ?? null;
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];

  let bodyStyle = `background-color:${bgColor};`;
  if (bgImage) bodyStyle += `background-image:url(${e(bgImage)});background-size:cover;background-position:center;`;

  const blocksHtml = blocks.map(renderBlock).filter(Boolean).join('\n');
  const countdownScript = renderCountdownScript(blocks);

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="icon" type="image/png" sizes="32x32" href="https://karva.id/favicon-32x32.png">
<link rel="apple-touch-icon" href="https://karva.id/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;min-height:100vh}
body{font-family:'Outfit',sans-serif;color:#1a1a2e;background:#000}
.page-wrapper{max-width:480px;margin:0 auto;min-height:100vh;padding:2rem 1rem 4rem;${bodyStyle}}
.block{margin-bottom:1.5rem}
.block-hero{text-align:center;padding:3.5rem 1.5rem;border-radius:12px}
.block-hero h1{font-size:clamp(1.75rem,5vw,2.5rem);font-weight:700;line-height:1.2}
.block-hero p{font-size:1.05rem;margin-top:.75rem;opacity:.85}
.block-hero .cta{display:inline-block;margin-top:1.5rem;padding:.75rem 2rem;border-radius:8px;text-decoration:none;font-weight:600;background:#F6821F;color:#fff;transition:opacity .2s}
.block-hero .cta:hover{opacity:.85}
.block-text{line-height:1.75;font-size:1rem}
.block-text p{margin-bottom:.875rem}
.block-text h1,.block-text h2,.block-text h3{font-weight:600;margin:1rem 0 .5rem}
.block-text ul,.block-text ol{padding-left:1.5rem;margin-bottom:.875rem}
.block-text a{color:#6366f1}
.block-image{text-align:center}
.block-image img{max-width:100%;border-radius:8px;display:inline-block}
.block-image figcaption{font-size:.85rem;opacity:.6;margin-top:.5rem}
.block-button{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center}
.btn{display:inline-block;padding:.7rem 1.75rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:.95rem;transition:opacity .2s}
.btn:hover{opacity:.85}
.btn-primary{background:#F6821F;color:#fff}
.btn-secondary{background:transparent;color:#F6821F;border:2px solid #F6821F}
.block-cards{display:grid;gap:1rem;grid-template-columns:repeat(2,1fr)}
.block-cards.cols-3{grid-template-columns:repeat(3,1fr)}
.card-item{background:rgba(255,255,255,.85);border-radius:10px;padding:1.25rem;border:1px solid rgba(0,0,0,.08)}
.card-item .icon{font-size:1.5rem;margin-bottom:.5rem}
.card-item h3{font-weight:600;font-size:.95rem}
.card-item p{font-size:.875rem;opacity:.7;margin-top:.25rem;line-height:1.5}
.block-video{border-radius:10px;overflow:hidden;aspect-ratio:16/9}
.block-video iframe{width:100%;height:100%;border:0}
.block-divider hr{border:none;border-top:1px solid rgba(0,0,0,.12)}
.block-countdown{text-align:center;padding:1rem 0}
.countdown-label{font-size:.875rem;opacity:.65;margin-bottom:.75rem}
.countdown-timer{display:flex;justify-content:center;gap:1.5rem}
.countdown-unit{text-align:center}
.countdown-num{font-size:2.5rem;font-weight:700;line-height:1}
.countdown-sub{font-size:.7rem;opacity:.5;text-transform:uppercase;letter-spacing:.08em;margin-top:.25rem}
.block-social{display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;padding:1.5rem 1.5rem}
.social-link{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;color:inherit;transition:opacity .2s}
.social-link:hover{opacity:.7}
@media(max-width:480px){.block-cards.cols-3{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="page-wrapper">
${blocksHtml}
</div>
${countdownScript}
</body>
</html>`;
}

function renderBlock(block) {
  const type = block.type ?? '';
  const data = block.data ?? {};
  const style = block.style ?? {};
  let inner = '';
  if (type === 'hero') inner = renderHero(data, style);
  else if (type === 'text') inner = renderText(data, style);
  else if (type === 'image') inner = renderImage(data);
  else if (type === 'button') inner = renderButton(data);
  else if (type === 'cards') inner = renderCards(data);
  else if (type === 'video') inner = renderVideo(data);
  else if (type === 'divider') inner = renderDivider(data);
  else if (type === 'countdown') inner = renderCountdown(data);
  else if (type === 'html') inner = data.content ?? '';
  else if (type === 'social_links') inner = renderSocialLinks(data);
  if (!inner) return '';
  return `<div class="block">${inner}</div>`;
}

function renderHero(d, s) {
  const bg = e(s.bg ?? d.bg_color ?? 'transparent');
  const titleColor = e(s.title?.color ?? '');
  let inlineStyle = `background-color:${bg};`;
  if (d.bg_image_url) inlineStyle += `background-image:url(${e(d.bg_image_url)});background-size:cover;background-position:center;color:#fff;`;
  else if (titleColor) inlineStyle += `color:${titleColor};`;
  let html = `<div class="block-hero" style="${inlineStyle}">`;
  if (d.title) html += `<h1>${e(d.title)}</h1>`;
  if (d.subtitle) html += `<p>${e(d.subtitle)}</p>`;
  if (d.cta_text && d.cta_url) html += `<a href="${e(d.cta_url)}" class="cta" rel="noopener">${e(d.cta_text)}</a>`;
  return html + '</div>';
}

function renderText(d, s) {
  const content = d.content ?? '';
  if (!content) return '';
  const color = e(s.body?.color ?? '');
  const style = color ? ` style="color:${color};"` : '';
  return `<div class="block-text"${style}>${content}</div>`;
}

function renderImage(d) {
  if (!d.url) return '';
  const caption = d.caption ?? '';
  // Sistem baru: img_width_value/unit, img_height_value, img_align (lihat ImageBlockRenderer.vue di karva.id).
  const isNew = d.img_width_value !== undefined;

  let imgEl;
  if (isNew) {
    const widthVal  = Math.max(1, Number(d.img_width_value ?? 100) || 100);
    const widthUnit = d.img_width_unit === 'px' ? 'px' : '%';
    let imgStyle = `width:${widthVal}${widthUnit};`;
    if (d.img_height_value) {
      imgStyle += `height:${parseInt(d.img_height_value)}px;object-fit:${e(d.object_fit ?? 'cover')};`;
    } else {
      imgStyle += 'height:auto;';
    }
    const align   = d.img_align ?? 'center';
    const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
    imgEl = `<div style="display:flex;justify-content:${justify}"><img src="${e(d.url)}" alt="${e(caption)}" style="${imgStyle}"></div>`;
  } else {
    const maxH = d.max_height ? `max-height:${parseInt(d.max_height)}px;` : '';
    const fit  = e(d.object_fit ?? 'contain');
    imgEl = `<img src="${e(d.url)}" alt="${e(caption)}" style="object-fit:${fit};${maxH}">`;
  }

  let html = `<figure class="block-image">${imgEl}`;
  if (caption) html += `<figcaption>${e(caption)}</figcaption>`;
  return html + '</figure>';
}

function renderButton(d) {
  const buttons = d.buttons ?? [];
  if (!buttons.length) return '';
  let html = '<div class="block-button">';
  for (const btn of buttons) {
    const cls = (btn.style ?? 'primary') === 'secondary' ? 'btn-secondary' : 'btn-primary';
    html += `<a href="${e(btn.url ?? '#')}" class="btn ${cls}" rel="noopener">${e(btn.label ?? '')}</a>`;
  }
  return html + '</div>';
}

function renderCards(d) {
  const items = d.items ?? [];
  if (!items.length) return '';
  const cols = parseInt(d.columns ?? 2);
  const colClass = cols >= 3 ? 'cols-3' : '';
  let html = `<div class="block-cards ${colClass}">`;
  for (const item of items) {
    html += '<div class="card-item">';
    if (item.icon) html += `<div class="icon">${e(item.icon)}</div>`;
    if (item.title) html += `<h3>${e(item.title)}</h3>`;
    if (item.description) html += `<p>${e(item.description)}</p>`;
    html += '</div>';
  }
  return html + '</div>';
}

function renderVideo(d) {
  const embed = toEmbedUrl(d.url ?? '');
  if (!embed) return '';
  return `<div class="block-video"><iframe src="${e(embed)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>`;
}

function toEmbedUrl(url) {
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

function renderDivider(d) {
  const spacing = d.spacing ?? 'md';
  const px = isNaN(spacing) ? (spacing === 'sm' ? 12 : spacing === 'lg' ? 32 : 20) : parseInt(spacing);
  const isSpacer = d.style === 'spacer' || parseInt(d.thickness ?? 1) === 0;
  if (isSpacer) return `<div style="padding:${px}px 0"></div>`;
  return `<div class="block-divider" style="padding:${px}px 0"><hr></div>`;
}

let _cdId = 0;
function renderCountdown(d) {
  const id = `cd-${_cdId++}`;
  const label = e(d.label ?? '');
  let html = '<div class="block-countdown">';
  if (label) html += `<div class="countdown-label">${label}</div>`;
  html += `<div class="countdown-timer" id="${id}" data-target="${e(d.target_date ?? '')}">`;
  for (const [attr, sub] of [['data-d','Hari'],['data-h','Jam'],['data-m','Menit'],['data-s','Detik']]) {
    html += `<div class="countdown-unit"><div class="countdown-num" ${attr}>--</div><div class="countdown-sub">${sub}</div></div>`;
  }
  return html + '</div></div>';
}

function renderCountdownScript(blocks) {
  const hasCountdown = blocks.some(b => b.type === 'countdown');
  if (!hasCountdown) return '';
  return `<script>
(function(){
  document.querySelectorAll('.countdown-timer[data-target]').forEach(function(el){
    var target=new Date(el.dataset.target).getTime();
    if(!target)return;
    function tick(){
      var diff=target-Date.now();
      if(diff<=0){el.innerHTML='<div class="countdown-unit"><div class="countdown-num">Selesai</div></div>';return;}
      var d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000),s=Math.floor(diff%60000/1000);
      el.querySelector('[data-d]').textContent=String(d).padStart(2,'0');
      el.querySelector('[data-h]').textContent=String(h).padStart(2,'0');
      el.querySelector('[data-m]').textContent=String(m).padStart(2,'0');
      el.querySelector('[data-s]').textContent=String(s).padStart(2,'0');
      setTimeout(tick,1000);
    }
    tick();
  });
})();
<\/script>`;
}

const SOCIAL_ICONS = {
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  tiktok: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
  youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>`,
  twitter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.539zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`,
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  telegram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  website: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  shopee: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  tokopedia: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
};

function renderSocialLinks(d) {
  const links = d.links ?? d.items ?? [];
  if (!links.length) return '';
  let html = '<div class="block-social">';
  for (const link of links) {
    const url = e(link.url ?? '#');
    const platform = String(link.platform ?? '').toLowerCase();
    const label = e(link.label ?? link.platform ?? '');
    // Gunakan warna custom dari icon_color jika ada
    const color = link.icon_color ? ` style="color:${e(link.icon_color)}"` : '';
    const icon = SOCIAL_ICONS[platform] ?? SOCIAL_ICONS.website;
    html += `<a href="${url}" class="social-link" title="${e(platform)}" rel="noopener nofollow" target="_blank"${color}>${icon}</a>`;
  }
  return html + '</div>';
}

function notFound() {
  return new Response(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}.box{text-align:center;color:#555}.box h1{font-size:4rem;margin:0;color:#6366f1}.box p{font-size:1.1rem;margin:.75rem 0}.box a{color:#6366f1;font-size:.9rem}</style></head><body><div class="box"><h1>404</h1><p>Halaman tidak ditemukan</p><a href="https://karva.id">← Kembali ke karva.id</a></div></body></html>`, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
