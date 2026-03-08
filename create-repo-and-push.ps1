# Create workout-pwa repo on GitHub and force push
# Set GITHUB_TOKEN first: https://github.com/settings/tokens (repo scope)

$ErrorActionPreference = "Stop"
$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "Error: GITHUB_TOKEN not set" -ForegroundColor Red
    Write-Host "1. Create token at https://github.com/settings/tokens (repo scope)" -ForegroundColor Yellow
    Write-Host "2. Run: `$env:GITHUB_TOKEN = 'your-token'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    exit 1
}

$repoName = "workout-pwa"
$env:Path = "C:\Program Files\Git\bin;" + $env:Path

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Creating GitHub repo..." -ForegroundColor Cyan
$body = @{ name = $repoName; private = $false } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers @{ Authorization = "token $token"; "Content-Type" = "application/json" } -Body $body
    Write-Host "Created: $($response.html_url)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 422) {
        Write-Host "Repo already exists, continuing..." -ForegroundColor Gray
    } else {
        throw
    }
}

$username = (Invoke-RestMethod -Uri "https://api.github.com/user" -Headers @{ Authorization = "token $token" }).login
$pushUrl = "https://${token}@github.com/${username}/${repoName}.git"

git remote remove origin 2>$null
git remote add origin $pushUrl
Write-Host "Force pushing..." -ForegroundColor Cyan
git push -u origin main --force

git remote set-url origin "https://github.com/${username}/${repoName}.git"

Write-Host "Done: https://github.com/$username/$repoName" -ForegroundColor Green
