@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   roblox-bridge - pelny setup
echo ============================================
echo.

REM --- 1. Sprawdz Node.js -----------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo [BLAD] Nie znaleziono Node.js w PATH.
    echo Pobierz i zainstaluj z https://nodejs.org/ ^(wersja LTS^), potem uruchom ten plik ponownie.
    pause
    exit /b 1
)
echo [OK] Node.js znaleziony:
node --version
echo.

REM --- 2. Zaleznosci -------------------------------------------------------
echo Instaluje zaleznosci npm...
call npm install
if errorlevel 1 (
    echo [BLAD] npm install sie nie powiodlo.
    pause
    exit /b 1
)
echo [OK] Zaleznosci zainstalowane.
echo.

REM --- 3. Plik .env ---------------------------------------------------------
if not exist ".env" (
    copy /y ".env.example" ".env" >nul
    echo [OK] Utworzono .env z .env.example.

    REM wygeneruj losowy token bridge (32 bajty hex) przez node
    for /f "delims=" %%T in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set BRIDGE_TOKEN=%%T
    powershell -Command "(Get-Content '.env') -replace 'BRIDGE_TOKEN=change-me-to-a-long-random-string', 'BRIDGE_TOKEN=%BRIDGE_TOKEN%' | Set-Content '.env'"
    echo [OK] Wygenerowano losowy BRIDGE_TOKEN.
) else (
    echo [OK] .env juz istnieje, nie nadpisuje.
)
echo.

echo ------------------------------------------------------------
echo Otworze teraz .env w Notatniku. Uzupelnij:
echo   ROBLOX_API_KEY   - z https://create.roblox.com/dashboard/credentials
echo   ROBLOX_UNIVERSE_ID / ROBLOX_PLACE_ID
echo   STUDIO_MCP_BAT   - zwykle %%LOCALAPPDATA%%\Roblox\mcp.bat
echo Zapisz plik i zamknij Notatnik, zeby kontynuowac.
echo ------------------------------------------------------------
pause
notepad ".env"

echo.
echo ============================================
echo   Startuje bridge...
echo ============================================
start "roblox-bridge server" cmd /k npm start

REM --- 4. cloudflared tunnel (opcjonalnie) ----------------------------------
where cloudflared >nul 2>nul
if errorlevel 1 (
    echo.
    echo [INFO] cloudflared nie znaleziony w PATH - tunel nie zostanie uruchomiony automatycznie.
    echo Pobierz go z https://github.com/cloudflare/cloudflared/releases/latest
    echo i uruchom recznie: cloudflared tunnel --url http://localhost:8787
) else (
    echo.
    echo Startuje tunel cloudflared...
    start "roblox-bridge tunnel" cmd /k cloudflared tunnel --url http://localhost:8787
    echo [OK] Sprawdz drugie okno terminala - tam pojawi sie publiczny URL tunelu.
)

echo.
echo Gotowe. Publiczny URL tunelu + Twoj BRIDGE_TOKEN z .env przekaz do zdalnej sesji Claude.
pause
