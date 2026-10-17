@echo off
title Sistema de Pontos de Coleta - Inicializador
chcp 65001 >nul
cls

echo ========================================================
echo   INICIANDO SISTEMA DE PONTOS DE COLETA
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo [ERRO] Node.js nao foi encontrado instalado no sistema.
  echo Por favor, instale o Node.js v18+ em https://nodejs.org/ e tente novamente.
  pause
  exit /b 1
)

echo [1/4] Liberando portas 3001 e 5173 caso estejam travadas...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [2/4] Iniciando Servidor Backend (porta 3001)...
start "Backend - Ponto de Coleta" /d "%~dp0server" cmd /k "npm run dev"

timeout /t 2 /nobreak >nul

echo [3/4] Iniciando Aplicacao Web Frontend (porta 5173)...
start "Frontend - Ponto de Coleta" /d "%~dp0client" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo [4/4] Abrindo navegador...
start http://localhost:5173

echo.
echo ========================================================
echo   SISTEMA EM EXECUCAO COM SUCESSO!
echo.
echo   - Site Publico: http://localhost:5173
echo   - Painel Admin: http://localhost:5173/admin/login
echo.
echo   Credenciais do Administrador:
echo   - E-mail: admin@pontodecoleta.com.br
echo   - Senha:  Admin@2026
echo.
echo   ATENCAO: Mantenha as janelas pretas (terminais)
echo   abertas em segundo plano para o sistema funcionar!
echo ========================================================
echo.
pause
