# FoodWise AI PowerShell Launcher
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
Write-Host "================================================================" -ForegroundColor DarkYellow
Write-Host "  Starting FoodWise AI — Intelligent Food Waste Reduction" -ForegroundColor DarkGreen
Write-Host "================================================================" -ForegroundColor DarkYellow
python server.py
