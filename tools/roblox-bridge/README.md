# roblox-bridge

Mały serwer HTTP, który uruchamiasz **lokalnie na swoim PC** (tam, gdzie masz
Roblox Studio). Wystawia dwie rzeczy:

- `/opencloud/*` — proxy do oficjalnego Roblox Open Cloud API (Twój klucz API
  siedzi tylko w lokalnym `.env`, nigdy nie wysyłasz go do zdalnej sesji).
- `/mcp/*` — sterowanie żywą sesją Roblox Studio przez ten sam mechanizm co
  `mcp.bat` (Model Context Protocol), tyle że wystawiony po HTTP zamiast
  stdio, żeby zdalna sesja Claude mogła się z nim komunikować przez tunel.

## Uruchomienie

```bash
cd tools/roblox-bridge
npm install
cp .env.example .env
```

Wypełnij `.env`:

- `BRIDGE_TOKEN` — wymyśl długi losowy ciąg, np. `openssl rand -hex 32`
- `ROBLOX_API_KEY` — z https://create.roblox.com/dashboard/credentials
- `STUDIO_MCP_BAT` — ścieżka do `mcp.bat`, zwykle
  `%LOCALAPPDATA%\Roblox\mcp.bat`

Start:

```bash
npm start
```

Serwer wystartuje na `http://127.0.0.1:8787` (albo porcie z `PORT`).

## Udostępnienie na zewnątrz (żeby zdalna sesja mogła się dobić)

Bridge sam w sobie słucha tylko lokalnie. Żeby zdalna sesja Claude (w
chmurze) mogła go wywołać, potrzebujesz tunelu, np.:

```bash
cloudflared tunnel --url http://localhost:8787
```

albo `ngrok http 8787`. Dostaniesz publiczny URL — podaj go zdalnej sesji
razem z `BRIDGE_TOKEN` (nigdy nie wklejaj tokena/klucza API na stałe do kodu
w repo).

Każde żądanie musi mieć nagłówek:

```
Authorization: Bearer <BRIDGE_TOKEN>
```

## Endpointy

- `GET /health` — sprawdzenie, czy bridge żyje
- `GET /opencloud/config` — zwraca skonfigurowany `universeId`
- `POST /opencloud/<ścieżka Open Cloud>` — body: `{ "method": "GET|POST|...",
  "payload": {...} }`, np. `POST /opencloud/datastores/v1/universes/123/standard-datastores/...`
- `POST /mcp/start` / `POST /mcp/stop` — uruchamia/zatrzymuje sesję Studio MCP
- `GET /mcp/status` — czy sesja żyje
- `POST /mcp/call` — body: `{ "method": "...", "params": {...} }`, przekazywane
  1:1 do żywej sesji Roblox Studio

## Bezpieczeństwo

- Nie commituj `.env` (jest w `.gitignore`).
- Token bridge chroni **każdy** endpoint — bez niego wszystko zwraca 401.
- Tunel wystawiasz tylko na czas pracy; wyłącz go, gdy skończysz.
