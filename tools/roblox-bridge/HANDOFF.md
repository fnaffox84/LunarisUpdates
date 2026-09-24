# Notatka dla kolejnej sesji Claude

Status: bridge z tego folderu został uruchomiony i przetestowany —
`GET /health` przez tunel cloudflared odpowiada `401 {"error":"unauthorized"}`
bez tokena, czyli serwer żyje i auth działa poprawnie.

## Jak działać dalej

Tunel cloudflared (`trycloudflare.com`) jest **efemeryczny** — dostaje nowy
losowy adres za każdym uruchomieniem `cloudflared tunnel`. Nie zakładaj, że
stary URL z poprzedniej rozmowy nadal działa. Zawsze poproś właściciela repo
o świeży URL + `BRIDGE_TOKEN` z jego lokalnego `.env`, jeśli chcesz stąd
wywoływać bridge.

Przykładowe wywołanie po dostaniu obu wartości:

```bash
curl -H "Authorization: Bearer <BRIDGE_TOKEN>" https://<tunel>.trycloudflare.com/health
```

## Jeśli sieć w tej sesji blokuje `trycloudflare.com` / `apis.roblox.com`

To ustawienie środowiska (Network access → Domain allowlist), nie coś do
naprawienia w kodzie. Zobacz `read_documentation` z topicem
`environment.network`, albo poproś użytkownika o zmianę w menu środowiska.
Zmiana czasem wymaga restartu sesji, żeby proxy ją podłapało.

## Nigdy nie proś o wklejanie sekretów jako zrzutu ekranu

`ROBLOX_API_KEY` i `BRIDGE_TOKEN` widoczne na screenshocie w czacie liczą
się jako spalone — jeśli to się powtórzy, przypomnij o resecie klucza w
https://create.roblox.com/dashboard/credentials.
