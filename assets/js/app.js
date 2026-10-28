(() => {
  'use strict';

  const cfg = window.STEEL_TRACERS_CONFIG || {};
  const state = { nation: 'all', className: 'all', query: '', tanks: [] };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const grid = $('#tank-grid');
  const empty = $('#tank-empty');
  const visibleCount = $('#visible-count');
  const recordsBody = $('#records-body');
  const modal = $('#tank-modal');
  const modalContent = $('#modal-content');

  const asset = (url) => `${url}?v=${encodeURIComponent(cfg.version || '1')}`;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const num = (value, digits = 0) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('ru-RU', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  };

  const shellType = (type) => ({
    AP: 'Бронебойный',
    HE: 'Осколочно-фугасный',
    HEAT: 'Кумулятивный'
  }[type] || type);

  function initHeader() {
    const header = $('.site-header');
    const toggle = $('#nav-toggle');
    const nav = $('#site-nav');

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    toggle?.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    $$('#site-nav a').forEach((link) => link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded', 'false');
    }));
  }

  function initConfig() {
    const version = cfg.version || '0.9.0';
    const updated = cfg.updated || '—';
    const size = cfg.downloadSize || '—';

    ['version-badge', 'download-version'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = version;
    });

    const date = document.getElementById('download-date');
    if (date) date.textContent = updated;

    const sizeEl = document.getElementById('download-size');
    if (sizeEl) sizeEl.textContent = size;

    const button = $('#download-button');
    const note = $('#download-note');
    const url = (cfg.downloadUrl || '').trim();

    if (!button) return;

    if (!url) {
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('is-disabled');
      button.href = '#download';
      if (note) note.textContent = 'Ссылка на сборку появится здесь после публикации файла.';
      return;
    }

    button.href = url;

    // Локальная ссылка: если архива ещё нет, честно говорим об этом,
    // а не отправляем пользователя на 404.
    if (url.startsWith('downloads/') && location.protocol !== 'file:') {
      fetch(url, { method: 'HEAD', cache: 'no-store' })
        .then((response) => {
          if (response.ok) return;
          button.classList.add('is-disabled');
          button.setAttribute('aria-disabled', 'true');
          if (note) note.textContent = 'Сборка ещё не загружена на сервер. Файл появится здесь после публикации.';
        })
        .catch(() => { /* офлайн-просмотр: ссылку не трогаем */ });
    }

    document.getElementById('year').textContent = String(new Date().getFullYear());
  }

  function initFilters() {
    $$('#nation-tabs .tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        state.nation = tab.dataset.nation;
        $$('#nation-tabs .tab').forEach((other) => {
          const active = other === tab;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-selected', String(active));
        });
        render();
      });
    });

    $('#class-filter')?.addEventListener('change', (event) => {
      state.className = event.target.value;
      render();
    });

    let timer = 0;
    $('#tank-search')?.addEventListener('input', (event) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.query = event.target.value.trim().toLowerCase();
        render();
      }, 120);
    });
  }

  function matches(tank) {
    if (state.nation !== 'all' && tank.nation !== state.nation) return false;
    if (state.className !== 'all' && tank.class !== state.className) return false;
    if (!state.query) return true;

    return `${tank.name} ${tank.class} ${tank.nationName}`.toLowerCase().includes(state.query);
  }

  function card(tank) {
    return `
      <button class="tank-card" data-nation="${esc(tank.nation)}" data-slug="${esc(tank.slug)}" type="button" style="animation-delay:${Math.random() * 90}ms">
        <span class="tank-card-img">
          <span class="nation-tag">${esc(tank.nationName)}</span>
          <span class="br-badge">${esc(num(tank.br, 1))}</span>
          <img src="${esc(asset(tank.image))}" alt="${esc(tank.name)}" loading="lazy">
        </span>
        <span class="tank-card-body">
          <span class="tank-card-class">${esc(tank.class)} · Ур. ${esc(tank.tier)}</span>
          <span class="tank-card-name">${esc(tank.name)}</span>
          <span class="tank-card-stats">
            <span>Скорость<b>${esc(num(tank.speed))} км/ч</b></span>
            <span>Лоб<b>${esc(num(tank.armor.front))} мм</b></span>
            <span>Пробитие<b>${esc(num(tank.shells?.[0]?.pen))} мм</b></span>
          </span>
        </span>
      </button>`;
  }

  function renderRecords() {
    if (!recordsBody || state.tanks.length === 0) return;

    const best = (getter, direction) => {
      const sign = direction === 'min' ? -1 : 1;
      return state.tanks.reduce((winner, tank) => {
        if (!winner) return tank;
        return sign * getter(tank) > sign * getter(winner) ? tank : winner;
      }, null);
    };

    const bestShell = (tank, key) => {
      const shells = tank.shells || [];
      return shells.reduce((value, shell) => Math.max(value, Number(shell[key]) || 0), 0);
    };

    const rows = [
      ['Самая быстрая', best((t) => t.speed, 'max'), (t) => num(t.speed) + ' км/ч'],
      ['Самая тяжёлая', best((t) => t.mass, 'max'), (t) => num(t.mass, 1) + ' т'],
      ['Самая лёгкая', best((t) => t.mass, 'min'), (t) => num(t.mass, 1) + ' т'],
      ['Лучшая лобовая броня', best((t) => t.armor.front, 'max'), (t) => num(t.armor.front) + ' мм'],
      ['Лучшее пробитие', best((t) => bestShell(t, 'pen'), 'max'), (t) => num(bestShell(t, 'pen')) + ' мм'],
      ['Самый большой урон', best((t) => bestShell(t, 'damage'), 'max'), (t) => num(bestShell(t, 'damage')) + ' ед.'],
      ['Самый большой калибр', best((t) => t.caliber || 0, 'max'), (t) => num(t.caliber) + ' мм'],
      ['Самый большой экипаж', best((t) => t.crew, 'max'), (t) => num(t.crew) + ' чел.'],
      ['Самый высокий БР', best((t) => t.br, 'max'), (t) => num(t.br, 1)],
      ['Самая дешёвая покупка', best((t) => t.gold, 'min'), (t) => num(t.gold) + ' Gold']
    ].filter((row) => row[1]);

    recordsBody.innerHTML = rows.map(([category, tank, value]) => `
      <tr>
        <td class="record-category">${esc(category)}</td>
        <td>
          <span class="record-tank">
            <img src="${esc(asset(tank.image))}" alt="" loading="eager">
            <b>${esc(tank.name)}</b>
          </span>
        </td>
        <td class="record-nation">${esc(tank.nationName)} · ${esc(tank.class)}</td>
        <td class="record-value">${esc(value(tank))}</td>
      </tr>`).join('');

    const counter = document.getElementById('records-count');
    if (counter) counter.textContent = String(rows.length);
  }

  function render() {
    if (!grid) return;

    const list = state.tanks.filter(matches);
    grid.innerHTML = list.map(card).join('');

    if (visibleCount) visibleCount.textContent = String(list.length);
    if (empty) empty.hidden = list.length > 0;
  }

  function openTank(slug) {
    const tank = state.tanks.find((item) => item.slug === slug);
    if (!tank || !modal || !modalContent) return;

    const shells = (tank.shells || []).map((shell) => `
      <div class="shell-row">
        <b>${esc(shell.name)}</b>
        <span>${esc(num(shell.pen))} мм / ${esc(num(shell.damage))}</span>
        <span>${esc(shellType(shell.type))} · ${esc(shell.ammo)} шт.</span>
      </div>`).join('');

    const crew = (tank.crewList || []).map((name) => `<li><span>${esc(name)}</span></li>`).join('');

    modalContent.innerHTML = `
      <div class="modal-hero"><img src="${esc(asset(tank.image))}" alt="${esc(tank.name)}"></div>
      <div class="modal-head">
        <div class="modal-kicker">${esc(tank.nationName)} · ${esc(tank.class)} · Уровень ${esc(tank.tier)}</div>
        <h2>${esc(tank.name)}</h2>
        <p>Боевой рейтинг ${esc(num(tank.br, 1))} · исследование ${esc(num(tank.xp))} XP · покупка ${esc(num(tank.gold))} Gold</p>
      </div>
      <div class="modal-body">
        <div class="modal-stats">
          <div><span>Скорость</span><strong>${esc(num(tank.speed))} км/ч</strong></div>
          <div><span>Перезарядка</span><strong>${esc(num(tank.reload, 1))} с</strong></div>
          <div><span>Масса</span><strong>${esc(num(tank.mass, 1))} т</strong></div>
          <div><span>Экипаж</span><strong>${esc(num(tank.crew))} чел.</strong></div>
        </div>
        <div class="modal-columns">
          <div>
            <h3>Бронирование</h3>
            <ul class="spec-list">
              <li><span>Лоб корпуса</span><b>${esc(num(tank.armor.front))} мм</b></li>
              <li><span>Борт</span><b>${esc(num(tank.armor.side))} мм</b></li>
              <li><span>Корма</span><b>${esc(num(tank.armor.rear))} мм</b></li>
              <li><span>Крыша</span><b>${esc(num(tank.armor.roof))} мм</b></li>
              <li><span>Башня (лоб)</span><b>${esc(num(tank.armor.turret))} мм</b></li>
            </ul>
          </div>
          <div>
            <h3>Орудие и ход</h3>
            <ul class="spec-list">
              <li><span>Скорость поворота башни</span><b>${esc(num(tank.turret))} °/с</b></li>
              <li><span>Углы наведения</span><b>${esc(tank.elevation)}</b></li>
              <li><span>Сектор орудия</span><b>${esc(num(tank.yaw))}°</b></li>
              <li><span>Разгон</span><b>${esc(num(tank.accel, 1))} м/с²</b></li>
              <li><span>Поворот корпуса</span><b>${esc(num(tank.turn))} °/с</b></li>
            </ul>
          </div>
        </div>
        <h3 style="margin-top:24px;font-family:var(--font-display);text-transform:uppercase;color:var(--amber-2)">Боеприпасы</h3>
        ${shells || '<p class="download-note">Нет данных.</p>'}
        <h3 style="margin-top:24px;font-family:var(--font-display);text-transform:uppercase;color:var(--amber-2)">Экипаж</h3>
        <ul class="spec-list">${crew || '<li><span>Нет данных</span></li>'}</ul>
        <p class="modal-desc">${esc(tank.description)}</p>
      </div>`;

    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');

    document.body.style.overflow = 'hidden';
  }

  function initModal() {
    grid?.addEventListener('click', (event) => {
      const cardEl = event.target.closest('.tank-card');
      if (cardEl) openTank(cardEl.dataset.slug);
    });

    const close = () => {
      if (modal?.open) modal.close();
      else modal?.removeAttribute('open');
      document.body.style.overflow = '';
    };

    $('#modal-close')?.addEventListener('click', close);
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    modal?.addEventListener('close', () => { document.body.style.overflow = ''; });
  }

  async function boot() {
    initHeader();
    initConfig();
    initFilters();
    initModal();

    try {
      const response = await fetch('data/tanks.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.tanks = Array.isArray(data.tanks) ? data.tanks : [];

      const total = document.getElementById('stat-tanks');
      if (total) total.textContent = String(state.tanks.length);

      render();
      renderRecords();
    } catch (error) {
      if (grid) {
        grid.innerHTML = '<p class="tank-empty">Не удалось загрузить данные техники. Открой сайт через локальный сервер или проверь data/tanks.json.</p>';
      }
      console.error('Steel Tracers: не удалось загрузить каталог', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

