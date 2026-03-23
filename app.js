/* ════════════════════════════════
   HELPERS
════════════════════════════════ */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitLine(line) {
  const r = []; let cur = '', q = false;
  for (const c of line) {
    if (c === '"') q = !q;
    else if (c === ',' && !q) { r.push(cur); cur = ''; }
    else cur += c;
  }
  r.push(cur);
  return r;
}

/* ════════════════════════════════
   NAV / PAGE SWITCHING
════════════════════════════════ */
function switchPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');

  document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
  const tabEl = document.getElementById('tab-' + id);
  if (tabEl) tabEl.classList.add('active');

  document.querySelectorAll('.drawer-link').forEach(l => l.classList.remove('active'));
  const drawerEl = document.getElementById('drawer-' + id);
  if (drawerEl) drawerEl.classList.add('active');

  closeNav();
}

function toggleNav() {
  const nav = document.getElementById('mainNav');
  const overlay = document.getElementById('navOverlay');
  const btn = document.getElementById('hamburger');
  const isOpen = nav.classList.contains('open');
  nav.classList.toggle('open', !isOpen);
  overlay.classList.toggle('show', !isOpen);
  btn.classList.toggle('open', !isOpen);
}

function closeNav() {
  document.getElementById('mainNav').classList.remove('open');
  document.getElementById('navOverlay').classList.remove('show');
  document.getElementById('hamburger').classList.remove('open');
}

/* ════════════════════════════════
   CHARACTERS
════════════════════════════════ */
let allChars = [];

function parseCharCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const hdr = lines[0].split(',').map(h => h.trim().toLowerCase());
  const iN = hdr.indexOf('name'), iT = hdr.indexOf('type'),
        iI = hdr.indexOf('image'), iL = hdr.indexOf('link');
  if (iN < 0) return [];
  return lines.slice(1).map(l => {
    const c = splitLine(l);
    return {
      name:  (c[iN] || '').trim(),
      type:  iT >= 0 ? (c[iT] || '').trim() : '',
      image: iI >= 0 ? (c[iI] || '').trim() : '',
      link:  iL >= 0 ? (c[iL] || '').trim() : '',
    };
  }).filter(r => r.name);
}

async function loadChars() {
  try {
    const res = await fetch('data.csv');
    if (!res.ok) throw new Error(res.status);
    allChars = parseCharCSV(await res.text());
    rebuildFilter();
    const t = getTypes();
    document.getElementById('headerSub').textContent =
      allChars.length + ' anh hùng' + (t.length ? ' · ' + t.length + ' môn phái' : '');
    renderChars();
  } catch {
    document.getElementById('headerSub').textContent = 'Không thể tải dữ liệu';
    document.getElementById('grid').innerHTML = `
      <div class="state-msg">
        <div class="icon">⚠</div>
        <p>Không tìm thấy file dữ liệu</p>
        <small>Đặt file <code>data.csv</code> cùng thư mục với <code>index.html</code></small>
      </div>`;
  }
}

function getTypes() {
  return [...new Set(allChars.map(c => c.type).filter(Boolean))].sort();
}

function rebuildFilter() {
  const sel = document.getElementById('filterType');
  sel.innerHTML = '<option value="">Tất cả môn phái</option>';
  getTypes().forEach(t => {
    const o = document.createElement('option');
    o.value = t; o.textContent = t;
    sel.appendChild(o);
  });
}

function renderChars() {
  const q  = document.getElementById('searchInput').value.trim().toLowerCase();
  const ft = document.getElementById('filterType').value;
  const list = allChars.filter(c =>
    (!q  || c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)) &&
    (!ft || c.type === ft)
  );

  document.getElementById('countLabel').textContent =
    allChars.length ? list.length + ' / ' + allChars.length + ' nhân vật' : '';

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  if (!list.length) {
    grid.innerHTML = `<div class="state-msg"><div class="icon">🔍</div><p>Không tìm thấy kết quả</p><small>Thử thay đổi từ khoá hoặc bộ lọc</small></div>`;
    return;
  }

  list.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'card bracketed';
    card.style.animationDelay = Math.min(i * 40, 500) + 'ms';

    const imgHtml = c.image
      ? `<img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy"
           onerror="this.parentElement.innerHTML='<div class=card-img-placeholder>⚔</div>'">`
      : `<div class="card-img-placeholder">⚔</div>`;

    const zoom     = c.image ? `<div class="zoom-hint">⤢</div>` : '';
    const nameHtml = c.link
      ? `<a href="${esc(c.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(c.name)}</a>`
      : esc(c.name);

    card.innerHTML = `
      <div class="br-tl"></div><div class="br-tr"></div>
      <div class="br-bl"></div><div class="br-br"></div>
      <div class="card-inner">
        <div class="card-img">${imgHtml}${zoom}</div>
        <div class="card-body">
          ${c.type ? `<div class="card-type">${esc(c.type)}</div>` : ''}
          <div class="card-name">${nameHtml}</div>
        </div>
      </div>`;

    if (c.image) card.addEventListener('click', () => openLightbox(c));
    grid.appendChild(card);
  });
}

/* ════════════════════════════════
   NOTICES
════════════════════════════════ */
let allNotices = [];

function parseNoticeCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const hdr = lines[0].split(',').map(h => h.trim().toLowerCase());
  const iD = hdr.indexOf('date'), iT = hdr.indexOf('type'),
        iTi = hdr.indexOf('title'), iC = hdr.indexOf('content');
  if (iTi < 0) return [];
  return lines.slice(1).map(l => {
    const c = splitLine(l);
    return {
      date:    iD  >= 0 ? (c[iD]  || '').trim() : '',
      type:    iT  >= 0 ? (c[iT]  || '').trim() : 'Thông báo',
      title:   (c[iTi] || '').trim(),
      content: iC  >= 0 ? (c[iC]  || '').trim() : '',
    };
  }).filter(r => r.title);
}

const SAMPLE_NOTICES = [
  {
    date: '18/03/2025', type: 'Khẩn',
    title: 'Họp bang khẩn tối nay 20:00',
    content: 'Toàn thể bang hội tập hợp tại sân bang lúc 20:00 tối nay.\n\nNội dung:\n• Phân công nhiệm vụ bang chiến tuần này\n• Bầu phó bang chủ mới thay thế Thiên Long\n• Thảo luận liên minh với bang Thiên Hạ\n\nVắng mặt không lý do sẽ bị trừ 200 điểm cống hiến.\n\nTham gia họp qua: ##link##Discord Bang##link##https://discord.gg/example##link##',
  },
  {
    date: '15/03/2025', type: 'Sự kiện',
    title: 'Bang chiến Chủ Nhật 16/03 — Lịch tập hợp',
    content: 'Lịch bang chiến tuần này:\n\n• 19:30 — Tập hợp đầy đủ tại cổng thành Lạc Dương\n• 19:45 — Phân đội, nhận nhiệm vụ từng nhóm\n• 20:00 — Khai chiến chính thức\n\nYêu cầu:\n• Mang đủ đạn dược, thuốc hồi phục\n• Không AFK giữa trận\n• Bật mic Discord khi tham chiến\n\nAi không tham gia được, liên hệ phó bang trước 18:00.',
  },
  {
    date: '10/03/2025', type: 'Thông báo',
    title: 'Quy định nộp cống hàng tuần — cập nhật mới',
    content: 'Từ tuần này áp dụng mức cống mới:\n\n• Thành viên thường: tối thiểu 500 lượng/tuần\n• Tứ đại hộ pháp: tối thiểu 1.000 lượng/tuần\n• Phó bang chủ: tối thiểu 1.500 lượng/tuần\n\nDeadline: 23:59 Chủ Nhật mỗi tuần.\nThành viên không đạt lần 1 sẽ bị nhắc nhở, lần 2 xem xét kick bang.',
  },
  {
    date: '05/03/2025', type: 'Quy tắc',
    title: 'Nội quy bang hội — phiên bản 2.0',
    content: '1. Không KS (Kill Steal) thành viên trong bang dưới mọi hình thức\n2. Không spam kênh bang chat, dùng kênh đúng mục đích\n3. Tôn trọng lẫn nhau, không chửi tục hay xúc phạm\n4. Tích cực tham gia sự kiện bang — mỗi tuần ít nhất 2 buổi\n5. Mọi thắc mắc liên hệ trực tiếp bang chủ hoặc phó bang\n\nXem thêm tại: ##link##Fanpage bang##link##https://facebook.com/example##link##',
  },
  {
    date: '01/03/2025', type: 'Thông báo',
    title: 'Chào mừng thành viên mới tháng 3',
    content: 'Bang hội xin chào mừng các thành viên mới gia nhập trong tháng 3:\n\n• Bạch Vân Kiếm — Võ Đang\n• Huyết Liên Hoa — Nga My\n• Thiết Mộc Lan — Thiếu Lâm\n• Phong Vũ Lãng — Cái Bang\n\nCác bạn mới vui lòng đọc kỹ nội quy và liên hệ phó bang để được hướng dẫn nhiệm vụ tuần đầu.',
  },
];

async function loadNotices() {
  try {
    const res = await fetch('notices.csv');
    if (!res.ok) throw new Error(res.status);
    allNotices = parseNoticeCSV(await res.text());
  } catch {
    allNotices = SAMPLE_NOTICES;
  }
  renderNotices();
}

function parseContent(raw) {
  const escaped = esc(raw).replace(/\\n/g, '\n');
  return escaped.replace(/##link##(.+?)##link##(.+?)##link##/g, (_, label, url) => {
    return `<a href="${esc(url.trim())}" target="_blank" rel="noopener"
      style="color:var(--gold-light);text-decoration:underline;text-decoration-color:var(--gold-dim);text-underline-offset:3px;"
      >${label.trim()}</a>`;
  });
}

function renderNotices() {
  const list = document.getElementById('noticeList');
  list.innerHTML = '';

  if (!allNotices.length) {
    list.innerHTML = `<div class="notices-empty"><div class="icon">📭</div><p>Chưa có thông báo nào</p></div>`;
    return;
  }

  const badge = document.getElementById('noticeBadge');
  badge.textContent = allNotices.length;
  badge.classList.add('show');

  const drawerBadge = document.getElementById('drawerNoticeBadge');
  if (drawerBadge) { drawerBadge.textContent = allNotices.length; drawerBadge.classList.add('show'); }

  allNotices.forEach((n, i) => {
    const card = document.createElement('div');
    card.className = 'notice-card';
    card.dataset.type = n.type;
    card.style.animationDelay = Math.min(i * 40, 400) + 'ms';

    card.innerHTML = `
      <div class="notice-header" onclick="toggleNotice(this.parentElement)">
        <span class="notice-type-badge">${esc(n.type)}</span>
        <span class="notice-title">${esc(n.title)}</span>
        ${n.date ? `<span class="notice-date">${esc(n.date)}</span>` : ''}
        <span class="notice-chevron">▾</span>
      </div>
      <div class="notice-body">
        <div class="notice-body-title">${esc(n.title)}</div>
        <div class="notice-content">${parseContent(n.content)}</div>
      </div>`;

    list.appendChild(card);

    if (i === 0) {
      card.classList.add('open');
      card.querySelector('.notice-body').style.maxHeight = 'none';
    }
  });
}

function toggleNotice(card) {
  const body = card.querySelector('.notice-body');
  const isOpen = card.classList.contains('open');
  if (isOpen) {
    body.style.maxHeight = body.scrollHeight + 'px';
    requestAnimationFrame(() => { body.style.maxHeight = '0'; });
    card.classList.remove('open');
  } else {
    card.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 'px';
    body.addEventListener('transitionend', () => {
      if (card.classList.contains('open')) body.style.maxHeight = 'none';
    }, { once: true });
  }
}

/* ════════════════════════════════
   LIGHTBOX
════════════════════════════════ */
const STEP = 0.25, MIN = 0.25, MAX = 4;
let lbScale = 1, lbBase = 0;

function openLightbox(c) {
  const img = document.getElementById('lbImg');
  img.src = c.image;
  const nameHtml = c.link
    ? `<a href="${esc(c.link)}" target="_blank" rel="noopener"
        style="color:var(--gold-light);text-decoration:none">${esc(c.name)} ↗</a>`
    : esc(c.name);
  document.getElementById('lbCaption').innerHTML =
    nameHtml + (c.type ? `<span>${esc(c.type)}</span>` : '');
  img.onload = () => { lbScale = 1; fitImage(); updateLabel(); };
  if (img.complete && img.naturalWidth) { lbScale = 1; fitImage(); updateLabel(); }
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fitImage() {
  const vp = document.getElementById('lbViewport');
  const img = document.getElementById('lbImg');
  const nW = img.naturalWidth || 800, nH = img.naturalHeight || 600;
  lbBase = nW * Math.min((vp.clientWidth - 40) / nW, (vp.clientHeight - 40) / nH, 1);
  applyScale();
}
function applyScale()  { document.getElementById('lbImg').style.width = (lbBase * lbScale) + 'px'; }
function updateLabel() { document.getElementById('lbScaleLabel').textContent = Math.round(lbScale * 100) + '%'; }
function zoomBy(d)     { lbScale = Math.min(MAX, Math.max(MIN, lbScale + d)); applyScale(); updateLabel(); }
function resetZoom()   {
  lbScale = 1; applyScale(); updateLabel();
  const vp = document.getElementById('lbViewport');
  vp.scrollTop = 0; vp.scrollLeft = 0;
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
  lbScale = 1;
}

/* ── Lightbox controls ── */
document.getElementById('lbZoomIn') .addEventListener('click', () => zoomBy(+STEP));
document.getElementById('lbZoomOut').addEventListener('click', () => zoomBy(-STEP));
document.getElementById('lbReset')  .addEventListener('click', resetZoom);
document.getElementById('lbViewport').addEventListener('wheel', e => {
  e.preventDefault(); zoomBy(e.deltaY < 0 ? +STEP : -STEP);
}, { passive: false });

/* ── Drag pan + pinch zoom ── */
(() => {
  const vp = document.getElementById('lbViewport');
  let drag = false, sx, sy, sl, st;

  vp.addEventListener('mousedown', e => {
    drag = true; vp.classList.add('dragging');
    sx = e.clientX; sy = e.clientY;
    sl = vp.scrollLeft; st = vp.scrollTop;
  });
  window.addEventListener('mousemove', e => {
    if (!drag) return;
    vp.scrollLeft = sl - (e.clientX - sx);
    vp.scrollTop  = st - (e.clientY - sy);
  });
  window.addEventListener('mouseup', () => { drag = false; vp.classList.remove('dragging'); });

  let t0;
  vp.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { t0 = e.touches[0]; sl = vp.scrollLeft; st = vp.scrollTop; }
  }, { passive: true });
  vp.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && t0) {
      vp.scrollLeft = sl - (e.touches[0].clientX - t0.clientX);
      vp.scrollTop  = st - (e.touches[0].clientY - t0.clientY);
    }
  }, { passive: true });

  let id = 0, is = 1;
  vp.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      id = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      is = lbScale;
    }
  }, { passive: true });
  vp.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      lbScale = Math.min(MAX, Math.max(MIN, is * (d / id)));
      applyScale(); updateLabel();
    }
  }, { passive: true });
})();

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

/* ════════════════════════════════
   VŨ KHÍ — TÍNH DAME
════════════════════════════════ */

// Multipliers for +1 through +7
const MULT = [1.01, 1.01, 1.03, 1.04, 1.05, 1.06, 1.10];

// Apply multipliers from level 0 up to `cap` levels, floor each step
function applyLevels(base, cap) {
  let val = Math.floor(base);
  for (let i = 0; i < cap; i++) {
    val = Math.floor(val * MULT[i]);
  }
  return val;
}

// Reverse: given dame at `cap`, estimate base (floor-based)
// We reverse the floor chain using ceil to undo floor(x * m) ≈ x = ceil(result / m)
function reverseLevel(dame, cap) {
  let val = dame;
  for (let i = cap - 1; i >= 0; i--) {
    val = Math.ceil(val / MULT[i]);
  }
  return val;
}

function calcForward() {
  const minRaw = document.getElementById('dameMinInput').value;
  const maxRaw = document.getElementById('dameMaxInput').value;
  const resultWrap = document.getElementById('forwardResult');
  const tbody = document.getElementById('forwardBody');

  if (!minRaw && !maxRaw) { resultWrap.style.display = 'none'; return; }

  const dMin = parseFloat(minRaw) || 0;
  const dMax = parseFloat(maxRaw) || 0;

  resultWrap.style.display = 'block';
  tbody.innerHTML = '';

  // Row 0: base
  const tr0 = document.createElement('tr');
  tr0.innerHTML = `
    <td><span class="cap-badge goc">Gốc</span></td>
    <td class="dame-range">${Math.floor(dMin).toLocaleString()} – ${Math.floor(dMax).toLocaleString()}</td>
    <td class="multiplier">—</td>`;
  tbody.appendChild(tr0);

  // Rows +1 to +7
  let curMin = Math.floor(dMin);
  let curMax = Math.floor(dMax);

  for (let i = 0; i < 7; i++) {
    curMin = Math.floor(curMin * MULT[i]);
    curMax = Math.floor(curMax * MULT[i]);
    const pct = '+' + Math.round((MULT[i] - 1) * 100) + '%';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="cap-badge">+${i + 1}</span></td>
      <td class="dame-range">${curMin.toLocaleString()} – ${curMax.toLocaleString()}</td>
      <td class="multiplier">${pct}</td>`;
    tbody.appendChild(tr);
  }
}

function calcReverse() {
  const dameRaw = document.getElementById('dameCurrentInput').value;
  const capRaw  = document.getElementById('dameCapInput').value;
  const resultBox = document.getElementById('reverseResult');
  const resultVal = document.getElementById('reverseValue');

  if (!dameRaw || !capRaw) { resultBox.style.display = 'none'; return; }

  const dame = parseFloat(dameRaw) || 0;
  const cap  = parseInt(capRaw, 10);
  const base = reverseLevel(dame, cap);

  resultBox.style.display = 'flex';
  resultVal.textContent = base.toLocaleString();
}
loadChars();
loadNotices();
