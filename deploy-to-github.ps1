# workout-pwa を GitHub にアップロードするスクリプト
# 実行前に: 1) Git をインストール 2) GitHub で workout-pwa リポジトリを新規作成
# 使い方: .\deploy-to-github.ps1 -GitHubUsername "あなたのユーザー名"

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername
)

$ErrorActionPreference = "Stop"
$repoName = "workout-pwa"
$remoteUrl = "https://github.com/$GitHubUsername/$repoName.git"

Write-Host "=== workout-pwa を GitHub にアップロード ===" -ForegroundColor Cyan
Write-Host "リポジトリ: $remoteUrl" -ForegroundColor Gray
Write-Host ""

# Git の存在確認
try {
    $gitVersion = git --version
    Write-Host "[OK] $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[エラー] Git がインストールされていません。" -ForegroundColor Red
    Write-Host "https://git-scm.com/download/win からインストールし、ターミナルを再起動してください。" -ForegroundColor Yellow
    exit 1
}

# プロジェクトディレクトリに移動
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 既存の .git があれば削除して初期化し直す（初回用）
if (Test-Path ".git") {
    Write-Host "[情報] 既存の Git リポジトリを検出" -ForegroundColor Gray
} else {
    Write-Host "[1/5] Git を初期化..." -ForegroundColor Cyan
    git init
}

Write-Host "[2/5] ファイルをステージング..." -ForegroundColor Cyan
git add .

Write-Host "[3/5] 初回コミット..." -ForegroundColor Cyan
git commit -m "Initial commit: 筋トレ管理PWA" 2>$null
if ($LASTEXITCODE -ne 0) {
    # コミットする変更がない場合
    $status = git status --short
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "[情報] コミットする変更がありません（既に最新です）" -ForegroundColor Gray
    } else {
        Write-Host "[エラー] コミットに失敗しました" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[4/5] メインブランチを設定..." -ForegroundColor Cyan
git branch -M main 2>$null

# リモートの設定
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "[情報] リモートを更新: $remoteUrl" -ForegroundColor Gray
    git remote set-url origin $remoteUrl
} else {
    Write-Host "[4.5/5] リモートリポジトリを追加..." -ForegroundColor Cyan
    git remote add origin $remoteUrl
}

Write-Host "[5/5] GitHub にプッシュ..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== 完了 ===" -ForegroundColor Green
    Write-Host "https://github.com/$GitHubUsername/$repoName で確認できます" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "[エラー] プッシュに失敗しました" -ForegroundColor Red
    Write-Host "以下を確認してください:" -ForegroundColor Yellow
    Write-Host "  1. GitHub で workout-pwa リポジトリを新規作成済みか" -ForegroundColor Gray
    Write-Host "  2. GitHub にログインしているか（認証情報）" -ForegroundColor Gray
    Write-Host "  3. リポジトリが空の状態で作成したか（README など追加していない）" -ForegroundColor Gray
    exit 1
}
