/* UMM Journal — shared behaviour for the blog main page and article template.
   Everything is progressive: pages are fully readable without JavaScript. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.matchMedia('(min-width: 1081px)');

  /* ---------------- Header: mega menus ---------------- */
  const triggers = $$('.site-nav__trigger[aria-controls]');
  let openId = null, closeTimer = null;
  const panel = id => document.getElementById(id);
  function openMega(id) {
    clearTimeout(closeTimer);
    if (openId === id) return;
    closeMega(true);
    const p = panel(id); if (!p) return;
    p.classList.add('is-open');
    triggers.forEach(t => t.setAttribute('aria-expanded', String(t.getAttribute('aria-controls') === id)));
    openId = id;
  }
  function closeMega(now) {
    const run = () => {
      if (!openId) return;
      panel(openId)?.classList.remove('is-open');
      triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
      openId = null;
    };
    clearTimeout(closeTimer);
    now ? run() : (closeTimer = setTimeout(run, 180));
  }
  triggers.forEach(t => {
    const id = t.getAttribute('aria-controls');
    t.addEventListener('click', () => (openId === id ? closeMega(true) : openMega(id)));
    t.addEventListener('mouseenter', () => { if (desktop.matches && window.matchMedia('(hover: hover)').matches) openMega(id); });
    t.addEventListener('mouseleave', () => closeMega());
    const p = panel(id);
    if (p) {
      p.addEventListener('mouseenter', () => clearTimeout(closeTimer));
      p.addEventListener('mouseleave', () => closeMega());
    }
  });
  document.addEventListener('click', e => {
    if (openId && !e.target.closest('.site-nav, .mega')) closeMega(true);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (openId) { const t = triggers.find(x => x.getAttribute('aria-controls') === openId); closeMega(true); t?.focus(); }
    if (mobile?.classList.contains('is-open')) toggleMobile(false);
  });

  /* Hide the pill nav when scrolling down, show it when scrolling up */
  const nav = $('.site-nav');
  let lastY = window.scrollY;
  function onScrollNav() {
    const y = window.scrollY;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 40);
      const hide = y > 320 && y > lastY + 4 && !openId;
      if (hide) nav.dataset.hidden = 'true';
      else if (y < lastY - 4 || y < 320) nav.dataset.hidden = 'false';
    }
    if (openId && Math.abs(y - lastY) > 2 && y > 200) closeMega(true);
    lastY = y;
  }

  /* ---------------- Mobile menu (built from the mega menus) ---------------- */
  let toggleMobile = () => {};
  const mobile = $('#mobile-menu');
  const toggle = $('.menu-toggle');
  if (mobile && toggle) {
    const logo = $('.site-logo img');
    const cta = $('.site-header__actions .umm-cta');
    const top = document.createElement('div');
    top.className = 'mobile-menu__top';
    top.innerHTML = `<img src="${logo?.getAttribute('src') || ''}" alt="UMM"><button class="mobile-menu__close" type="button" aria-label="Close menu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
    mobile.append(top);
    $$('.mega').forEach(m => {
      const d = document.createElement('details');
      const s = document.createElement('summary');
      s.textContent = m.dataset.label || '';
      const ul = document.createElement('ul');
      $$('.mega__links > li:not(.mega__feature) > a', m).forEach(a => {
        const li = document.createElement('li');
        li.append(a.cloneNode(true));
        ul.append(li);
      });
      d.append(s, ul);
      mobile.append(d);
    });
    if (cta) mobile.append(cta.cloneNode(true));
    const close = $('.mobile-menu__close', mobile);
    toggleMobile = open => {
      mobile.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.documentElement.style.overflow = open ? 'hidden' : '';
      (open ? close : toggle).focus();
    };
    toggle.addEventListener('click', () => toggleMobile(true));
    close.addEventListener('click', () => toggleMobile(false));
  }

  /* ---------------- Reveal on scroll ---------------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('is-in'));

  /* ---------------- Back to top + progress ring + reading bar ---------------- */
  const toTop = $('[data-to-top]');
  const ring = $('[data-to-top-ring]');
  const bar = $('[data-read-progress]');
  const articleBody = $('[data-article-body]');
  function onScrollProgress() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (toTop) toTop.classList.toggle('is-visible', window.scrollY > 600);
    if (ring) ring.style.strokeDashoffset = String(100 - p * 100);
    if (bar && articleBody) {
      const r = articleBody.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const read = Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.25) / Math.max(1, total)));
      bar.style.transform = `scaleX(${read})`;
    }
  }
  toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScrollNav(); onScrollProgress(); ticking = false; });
  }, { passive: true });
  onScrollProgress();

  /* ---------------- Blog main page: filters ---------------- */
  const grid = $('[data-post-grid]');
  if (grid) {
    const items = $$(':scope > li', grid);
    const chips = $$('[data-filter-cat]');
    const search = $('[data-filter-search]');
    const industry = $('[data-filter-industry]');
    const status = $('[data-filter-status]');
    const empty = $('[data-empty-state]');
    const more = $('[data-load-more]');
    const moreBtn = $('[data-load-more-btn]');
    const moreCount = $('[data-load-more-count]');
    const moreStatus = $('[data-load-more-status]');
    const PAGE = 6;
    const state = { cat: 'all', ind: 'all', q: '', limit: PAGE };
    const pad = n => String(n).padStart(2, '0');
    const defaultNote = status?.textContent || '';

    // chip counts (total articles per topic)
    chips.forEach(c => {
      const cat = c.dataset.filterCat;
      const n = cat === 'all' ? items.length : items.filter(li => li.dataset.category === cat).length;
      const el = $('.count', c); if (el) el.textContent = pad(n);
    });

    function apply() {
      const q = state.q.trim().toLowerCase();
      const browsing = state.cat === 'all' && state.ind === 'all' && !q;
      const matches = items.filter(li => {
        if (browsing && li.hasAttribute('data-featured')) return false;
        if (state.cat !== 'all' && li.dataset.category !== state.cat) return false;
        if (state.ind !== 'all' && !(li.dataset.industries || '').split(/\s+/).includes(state.ind)) return false;
        if (q && !li.textContent.toLowerCase().includes(q)) return false;
        return true;
      });
      items.forEach(li => { li.hidden = true; });
      matches.slice(0, state.limit).forEach(li => { li.hidden = false; $('.reveal', li)?.classList.add('is-in'); });
      const shown = Math.min(matches.length, state.limit);
      empty?.classList.toggle('is-visible', matches.length === 0);
      if (more) {
        const rest = matches.length - shown;
        more.hidden = rest <= 0;
        if (moreCount) moreCount.textContent = `+${rest}`;
        if (moreStatus) moreStatus.textContent = `Showing ${shown} of ${matches.length} articles`;
      }
      if (status) status.textContent = browsing ? defaultNote : `${matches.length} ${matches.length === 1 ? 'perspective' : 'perspectives'} found.`;
    }
    chips.forEach(c => c.addEventListener('click', () => {
      state.cat = c.dataset.filterCat; state.limit = PAGE;
      chips.forEach(x => x.setAttribute('aria-pressed', String(x === c)));
      apply();
    }));
    industry?.addEventListener('change', () => { state.ind = industry.value; state.limit = PAGE; apply(); });
    search?.addEventListener('input', () => { state.q = search.value; state.limit = PAGE; apply(); });
    moreBtn?.addEventListener('click', () => { state.limit += PAGE; apply(); });
    $('[data-filter-reset]')?.addEventListener('click', () => {
      state.cat = 'all'; state.ind = 'all'; state.q = ''; state.limit = PAGE;
      if (search) search.value = '';
      if (industry) industry.value = 'all';
      chips.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.filterCat === 'all')));
      apply();
    });
    apply();
  }

  /* ---------------- Article template ---------------- */
  const prose = $('[data-article-body]');
  if (prose) {
    // 1. Table of contents from every <h2> in the article body (add data-toc="false" to skip one)
    const list = $('[data-toc-list]');
    const slug = s => s.toLowerCase().replace(/[’'"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const heads = $$('h2', prose).filter(h => h.dataset.toc !== 'false');
    const links = [];
    heads.forEach(h => {
      if (!h.id) h.id = slug(h.dataset.tocLabel || h.textContent);
      if (!list) return;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = (h.dataset.tocLabel || h.textContent).replace(/\.$/, '');
      li.append(a); list.append(li); links.push(a);
    });
    const tocDetails = $('.toc details');
    const syncToc = () => { if (tocDetails) tocDetails.open = desktop.matches; };
    syncToc(); desktop.addEventListener?.('change', syncToc);
    if (links.length) {
      // current section = last heading above 35% of the viewport
      const spy = () => {
        let current = heads[0].id;
        heads.forEach(h => { if (h.getBoundingClientRect().top < window.innerHeight * 0.35) current = h.id; });
        links.forEach(a => a.setAttribute('aria-current', String(a.hash === `#${current}`)));
      };
      window.addEventListener('scroll', () => requestAnimationFrame(spy), { passive: true });
      spy();
    }

    // 2. Reading time: <span data-reading-time="auto"></span>
    const words = (prose.textContent || '').trim().split(/\s+/).length;
    $$('[data-reading-time="auto"]').forEach(el => { el.textContent = `${Math.max(1, Math.round(words / 200))} min read`; });

    // 3. Share links (use the canonical URL when present)
    const canonical = $('link[rel="canonical"]')?.href;
    const url = canonical && !canonical.includes('{{') ? canonical : location.href.split('#')[0];
    const title = $('h1')?.textContent.trim() || document.title;
    const enc = encodeURIComponent;
    const targets = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
      x: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      whatsapp: `https://wa.me/?text=${enc(`${title} ${url}`)}`,
    };
    $$('[data-share]').forEach(a => { const t = targets[a.dataset.share]; if (t) a.href = t; });
    const toast = $('[data-share-toast]');
    $('[data-share-copy]')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); if (toast) toast.textContent = 'Link copied.'; }
      catch { if (toast) toast.textContent = url; }
      setTimeout(() => { if (toast) toast.textContent = ''; }, 2400);
    });
  }
})();
