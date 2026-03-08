# GitHub へのアップロード手順

リポジトリ名: **workout-pwa**

---

## クイックスタート（推奨）

### 1. Git をインストール

未インストールの場合: https://git-scm.com/download/win  
インストール後、**ターミナルを再起動**してください。

### 2. GitHub でリポジトリを作成

1. https://github.com/new にアクセス
2. **Repository name** に `workout-pwa` と入力
3. **Public** を選択
4. **README / .gitignore は追加しない**（空のリポジトリで作成）
5. **Create repository** をクリック

### 3. スクリプトを実行

PowerShell でプロジェクトフォルダを開き、以下を実行（`YOUR_USERNAME` をあなたの GitHub ユーザー名に置き換え）:

```powershell
cd "c:\Users\udaic\OneDrive\デスクトップ\workout"
.\deploy-to-github.ps1 -GitHubUsername YOUR_USERNAME
```

これで初期化からプッシュまで一括で実行されます。

---

## 方法1: 手動でコマンドを実行

### 1. GitHub でリポジトリを作成

1. https://github.com/new にアクセス
2. **Repository name** に `workout-pwa` と入力
3. **Public** を選択
4. **「Add a README file」はチェックしない**（既に README があるため）
5. **Create repository** をクリック

### 2. ローカルで Git を初期化してプッシュ

プロジェクトフォルダで、**PowerShell** または **コマンドプロンプト** を開き、以下を順に実行してください。

```powershell
# プロジェクトフォルダに移動
cd "c:\Users\udaic\OneDrive\デスクトップ\workout"

# Git を初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: 筋トレ管理PWA"

# メインブランチの名前を設定（GitHub のデフォルトに合わせる）
git branch -M main

# リモートリポジトリを追加（YOUR_USERNAME をあなたのGitHubユーザー名に置き換え）
git remote add origin https://github.com/YOUR_USERNAME/workout-pwa.git

# プッシュ
git push -u origin main
```

**注意**: `YOUR_USERNAME` をあなたの GitHub ユーザー名に置き換えてください。  
例: `https://github.com/udaic/workout-pwa.git`

---

## 方法2: GitHub Desktop を使う（GUI）

1. **GitHub Desktop** をインストール: https://desktop.github.com/
2. GitHub にログイン
3. **File** → **Add local repository** でこのフォルダを選択
4. 「This directory does not appear to be a Git repository」と出たら **create a repository** をクリック
5. **Publish repository** をクリック
6. Repository name に `workout-pwa` と入力して **Publish**

---

## 方法3: GitHub の Web から新規作成してからクローン

1. GitHub で `workout-pwa` リポジトリを新規作成（README なし）
2. 作成したリポジトリの **Code** → **HTTPS** の URL をコピー
3. ローカルで以下を実行:

```powershell
cd "c:\Users\udaic\OneDrive\デスクトップ"
git clone https://github.com/YOUR_USERNAME/workout-pwa.git workout-pwa-temp
# 既存の workout フォルダの内容を workout-pwa-temp にコピー（node_modules と dist を除く）
# その後 workout-pwa-temp で git add . && git commit -m "Initial commit" && git push
```

---

## 認証について

`git push` 時に認証を求められた場合:

- **HTTPS**: GitHub のユーザー名と、**Personal Access Token (PAT)** を入力
- **SSH**: SSH キーを GitHub に登録済みなら、`git@github.com:USERNAME/workout-pwa.git` をリモート URL に指定

PAT の作成: GitHub → Settings → Developer settings → Personal access tokens
