[engine.seointellect.ru](https://engine.seointellect.ru/?r=15408pNzMH) (партнерская ссылка)

# Установка Engine SEO Intellect

Engine SEO Интеллект — независимый open-source адаптер, который предоставляет 22 инструмента API Engine SEO Intellect через один MCP-сервер.

## Требования

- Node.js 20 или новее;
- аккаунт Engine SEO Интеллект и API-токен;
- MCP-клиент с поддержкой stdio или Streamable HTTP.

## Установка

```bash
git clone https://github.com/arseniigruzdev/engine-seointellect-mcp.git
cd engine-seointellect-mcp
npm ci
npm run build
```

Скопируйте пример настроек и укажите свой токен:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Откройте `.env` и заполните:

```dotenv
SEOINTELLECT_API_TOKEN=ваш-токен
```

Файл `.env` исключён из Git. Не публикуйте его и не вставляйте токен в issue, логи или скриншоты.

## Локальное подключение к Codex

Добавьте собранный сервер как stdio-MCP:

```bash
codex mcp add engine-seointellect-mcp -- node /абсолютный/путь/engine-seointellect-mcp/dist/index.js
```

На Windows:

```powershell
codex mcp add engine-seointellect-mcp -- node C:/absolute/path/engine-seointellect-mcp/dist/index.js
```

Проверка:

```bash
codex mcp list
```

После добавления перезапустите Codex. Сервер загрузит API-токен из локального `.env`; ключ не сохраняется в конфигурации Codex.

Альтернативная ручная настройка `~/.codex/config.toml`:

```toml
[mcp_servers.engine-seointellect-mcp]
command = "node"
args = ["C:/absolute/path/engine-seointellect-mcp/dist/index.js"]
tool_timeout_sec = 180
default_tools_approval_mode = "writes"
```

## Запуск локально

```bash
npm start
```

Процесс работает через stdio и не открывает сетевой порт.

## Частота запросов и ожидание результата

API Engine SEO Интеллект выполняет задачи асинхронно. MCP автоматически вызывает методы `check` и `get`, пока результат не будет готов.

- Интервал polling по умолчанию — **15 секунд** (`15000` мс).
- Не рекомендуется уменьшать интервал ниже 15 секунд: при живой проверке polling раз в 2 секунды вызвал HTTP `429 Too Many Attempts`.
- Запускайте задания последовательно, особенно если они используют один API-токен. Не отправляйте несколько тяжёлых задач одновременно.
- `wait_for_result=true` — дождаться результата внутри текущего вызова MCP.
- `wait_for_result=false` — сразу вернуть `task_id` без ожидания.
- Стандартный таймаут ожидания — 120 секунд. Если задача не закончилась, MCP вернёт статус `pending` и `task_id`; передайте этот `task_id` тому же инструменту, чтобы продолжить ожидание без создания новой задачи.
- Для `seo_text`, `headers`, `copywriter_brief` и других тяжёлых методов может потребоваться `timeout_ms` от `180000` до `300000`. Таймаут MCP-клиента должен быть больше этого значения.
- При HTTP 429 прекратите повторные запросы, подождите не менее 60 секунд и повторите один раз. Быстрые циклические повторы только продлевают блокировку.

Глобальные значения можно настроить в `.env`:

```dotenv
SEOINTELLECT_POLL_INTERVAL_MS=15000
SEOINTELLECT_RESULT_TIMEOUT_MS=120000
```

Параметры `poll_interval_ms` и `timeout_ms`, переданные конкретному инструменту, имеют приоритет над глобальными значениями.

## Docker и удалённый MCP

Для публичного сервера рекомендуется BYOK-режим: каждый пользователь передаёт собственный токен Engine SEO Интеллект, а сервер его не сохраняет.

```bash
docker build -t engine-seointellect-mcp .
docker run --rm -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e HOST=0.0.0.0 \
  -e MCP_HTTP_AUTH_MODE=byok \
  -e MCP_ALLOWED_HOSTS=mcp.example.com \
  engine-seointellect-mcp
```

Удалённый endpoint: `https://mcp.example.com/mcp`.

Конфигурация Codex для удалённого сервера:

```toml
[mcp_servers.engine-seointellect-mcp]
url = "https://mcp.example.com/mcp"
bearer_token_env_var = "SEOINTELLECT_API_TOKEN"
tool_timeout_sec = 180
default_tools_approval_mode = "writes"
```

## Проверка проекта

```bash
npm run check
npm audit
```

Тесты используют имитацию ответов API и не расходуют лимиты аккаунта.

## Обновление

```bash
git pull
npm ci
npm run build
```

После обновления перезапустите MCP-клиент или контейнер.
