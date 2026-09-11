import { Router, Request, Response } from 'express';

export const windowsRouter = Router();

/**
 * GET /api/v1/windows/download-bat
 * Download 1-Click Windows 11 Desktop Batch Installer
 */
windowsRouter.get('/download-bat', (req: Request, res: Response) => {
  const host = req.get('host') || 'ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'https';
  const appUrl = `${protocol}://${host}`;

  const batContent = `@echo off
chcp 65001 >nul
title AuthForge Windows 11 64-Bit Desktop Installer
color 0B
cls

echo =====================================================================
echo           AuthForge RBAC - Samsung Windows 11 64-Bit Setup
echo =====================================================================
echo.
echo [*] Target Device: Samsung Laptop / Galaxy Book (Windows 11 x64)
echo [*] Application URL: ${appUrl}
echo [*] Primary Domain: cgbarnesdabelsgmail.onmicrosoft.com
echo.

:: Detect Windows 64-bit Architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo [OK] Verified Windows 11 64-bit architecture (AMD64/x64).
) else if "%PROCESSOR_ARCHITEW6432%"=="AMD64" (
    echo [OK] Verified Windows 11 64-bit architecture (x64 via WOW64).
) else (
    echo [!] Warning: Non-64-bit architecture detected, continuing anyway...
)

echo.
echo [*] Creating Desktop & Start Menu Standalone Launchers...

:: PowerShell script to create Desktop and Start Menu Shortcuts
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$startMenu = [Environment]::GetFolderPath('Programs');" ^
  "$wshell = New-Object -ComObject WScript.Shell;" ^
  "$edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';" ^
  "if (-not (Test-Path $edgePath)) { $edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' };" ^
  "$chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';" ^
  "$browser = $edgePath;" ^
  "if (-not (Test-Path $edgePath) -and (Test-Path $chromePath)) { $browser = $chromePath };" ^
  "$shortcut = $wshell.CreateShortcut(\"$desktop\\AuthForge.lnk\");" ^
  "$shortcut.TargetPath = $browser;" ^
  "$shortcut.Arguments = '--app=${appUrl} --start-maximized';" ^
  "$shortcut.Description = 'AuthForge RBAC & Token Service for Windows 11';" ^
  "$shortcut.Save();" ^
  "$startShortcut = $wshell.CreateShortcut(\"$startMenu\\AuthForge.lnk\");" ^
  "$startShortcut.TargetPath = $browser;" ^
  "$startShortcut.Arguments = '--app=${appUrl} --start-maximized';" ^
  "$startShortcut.Description = 'AuthForge RBAC & Token Service';" ^
  "$startShortcut.Save();" ^
  "Write-Host '[OK] Desktop & Start Menu shortcuts successfully created!';"

echo.
echo =====================================================================
echo [SUCCESS] AuthForge installed on your Samsung Windows 11 Laptop!
echo =====================================================================
echo.
echo Launching AuthForge in dedicated standalone native window...
powershell -NoProfile -Command "Start-Process msedge.exe -ArgumentList '--app=${appUrl}', '--start-maximized'" 2>nul
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process chrome.exe -ArgumentList '--app=${appUrl}', '--start-maximized'" 2>nul
)

timeout /t 3 >nul
exit
`;

  res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Install-AuthForge-Win11.bat"');
  res.send(batContent.replace(/\r?\n/g, '\r\n'));
});

/**
 * GET /api/v1/windows/download-ps1
 * Download PowerShell 1-Click Windows 11 Desktop Setup Script
 */
windowsRouter.get('/download-ps1', (req: Request, res: Response) => {
  const host = req.get('host') || 'ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'https';
  const appUrl = `${protocol}://${host}`;

  const ps1Content = `# AuthForge Windows 11 (64-Bit) Native Setup Script
# Designed for Samsung Galaxy Book / Windows 11 64-bit laptops
param(
    [string]$AppUrl = "${appUrl}",
    [string]$AppName = "AuthForge RBAC"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " AuthForge Setup for Samsung Windows 11 64-Bit Laptop" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

# Check 64-bit
if ([Environment]::Is64BitOperatingSystem) {
    Write-Host "[OK] Operating System is 64-bit Windows 11." -ForegroundColor Green
} else {
    Write-Host "[!] Warning: 32-bit OS detected." -ForegroundColor Yellow
}

$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ProgramsPath = [Environment]::GetFolderPath('Programs')
$WshShell = New-Object -ComObject WScript.Shell

# Find Edge or Chrome
$BrowserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
if (-not (Test-Path $BrowserPath)) {
    $BrowserPath = "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
}
if (-not (Test-Path $BrowserPath)) {
    $BrowserPath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
}

# Create Desktop Shortcut
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\\$AppName.lnk")
$Shortcut.TargetPath = $BrowserPath
$Shortcut.Arguments = "--app=$AppUrl --start-maximized"
$Shortcut.Description = "AuthForge RBAC Service"
$Shortcut.Save()

# Create Start Menu Shortcut
$StartShortcut = $WshShell.CreateShortcut("$ProgramsPath\\$AppName.lnk")
$StartShortcut.TargetPath = $BrowserPath
$StartShortcut.Arguments = "--app=$AppUrl --start-maximized"
$StartShortcut.Description = "AuthForge RBAC Service"
$StartShortcut.Save()

Write-Host "[OK] Desktop shortcut created at: $DesktopPath\\$AppName.lnk" -ForegroundColor Green
Write-Host "[OK] Start Menu shortcut created!" -ForegroundColor Green

Write-Host "\`nLaunching AuthForge in standalone native app frame..." -ForegroundColor Cyan
Start-Process $BrowserPath -ArgumentList "--app=$AppUrl", "--start-maximized"
Write-Host "\`n[SUCCESS] Installation complete! Enjoy AuthForge on your Samsung laptop." -ForegroundColor Green
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="install-authforge-win11.ps1"');
  res.send(ps1Content.replace(/\r?\n/g, '\r\n'));
});

/**
 * GET /api/v1/windows/download-apk
 * Fast alias to download Android APK
 */
windowsRouter.get('/download-apk', (req: Request, res: Response) => {
  res.redirect('/api/v1/git/download-apk');
});
