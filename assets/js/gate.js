/*
 * Парольный экран сайта.
 * Пароль: 6 символов, заглавные буквы. В коде хранится только SHA-256.
 * Это барьер от случайных посетителей, а не серверная авторизация:
 * статический GitHub Pages не умеет настоящие приватные страницы.
 */
(() => {
  'use strict';

  const cfg = window.STEEL_TRACERS_CONFIG || {};
  const expected = String(cfg.passwordHash || '').toLowerCase();

  const gate = document.getElementById('gate');
  const form = document.getElementById('gate-form');
  const input = document.getElementById('gate-password');
  const error = document.getElementById('gate-error');

  if (!gate || !form || !input) return;

  const unlock = () => {
    gate.hidden = true;
    document.body.classList.remove('gate-locked');
    try { sessionStorage.setItem('st_access', 'open'); } catch (e) { /* приватный режим */ }
  };

  let alreadyOpen = false;
  try { alreadyOpen = sessionStorage.getItem('st_access') === 'open'; } catch (e) { /* ignore */ }

  if (alreadyOpen || !expected) {
    unlock();
    return;
  }

  const sha256 = (text) => {
    const data = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', data).then((buffer) =>
      Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(''));
  };

  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim().toUpperCase();

    if (value.length !== 6) {
      error.textContent = 'Пароль должен состоять из 6 символов.';
      return;
    }

    if (!crypto.subtle) {
      error.textContent = 'Браузер не поддерживает проверку пароля.';
      return;
    }

    sha256(value).then((hash) => {
      if (hash !== expected) {
        error.textContent = 'Неверный пароль.';
        input.select();
        return;
      }

      error.textContent = '';
      unlock();
    }).catch(() => {
      error.textContent = 'Не удалось проверить пароль.';
    });
  });

  setTimeout(() => input.focus(), 80);
})();
