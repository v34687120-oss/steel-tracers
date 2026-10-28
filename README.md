# Steel Tracers — сайт

Статический сайт без бэкенда: HTML + CSS + JS. Данные техники и рендеры
генерируются из Unity, поэтому сайт всегда совпадает с игрой.

## Локальный просмотр

Нужен любой статический сервер (из-за `fetch` JSON):

```powershell
python -m http.server 8080 -d site
```

Открыть <http://localhost:8080>.

## Обновление после патча игры

1. В Unity выполнить `Steel Tracers → Экспорт данных для сайта`
   (или в batch: `-executeMethod STWebExport.Run`).
2. Скопировать `site/data/tanks.json` и `site/assets/tanks/*.png` из проекта.
3. Обновить `site/config.js`: `version`, `updated`, `downloadSize`, `downloadUrl`.
4. Положить новую сборку в `site/downloads/SteelTracers-Windows.zip`
   или указать внешнюю ссылку (GitHub Releases, свой сервер).
5. Загрузить папку `site` на хостинг.

## Публикация

Пароль сайта: `TRACER` (6 заглавных букв). Меняется в `config.js` через
SHA-256-хеш `passwordHash`.

Важно: это клиентский парольный экран. Он закрывает страницу от случайных
посетителей, но не является серверной авторизацией: исходники и архив
сборки на GitHub Pages всё ещё доступны по прямым ссылкам. Для настоящей
защиты нужен Cloudflare Access, Netlify Password Protection или свой сервер
с авторизацией.

Вариант 1 — GitHub Pages:

- создать репозиторий и запушить проект;
- Settings → Pages → Branch: `main`, Folder: `/site`;
- сайт будет на `https://<user>.github.io/<repo>/`.

Файл сборки больше 100 МБ GitHub Pages не примет. В этом случае сборку
лучше выложить в GitHub Releases, а в `config.js` указать прямую ссылку:

```js
downloadUrl: "https://github.com/<user>/<repo>/releases/latest/download/SteelTracers-Windows.zip"
```

Вариант 2 — Netlify / Cloudflare Pages:

- подключить репозиторий;
- publish directory: `site`;
- сборка не нужна (static).

Вариант 3 — свой сервер: просто раздать папку `site` по HTTP.

## Что не хранится в git

- `site/downloads/*.zip` — сборка игры (большая, обновляется отдельно).
- Секреты и токены хостинга.
