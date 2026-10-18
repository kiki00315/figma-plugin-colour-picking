# colour-picking（Figma プラグイン）

選んだレイヤーの色を、**色見本ジェネレーター**で作った配色に一括で置き換える Figma プラグインです。

- 色見本ジェネレーター：https://kiki-portfolio.kiki-works.workers.dev/color-generator
- TypeScript で書いています（型定義は `@figma/plugin-typings`）

## 使い方

1. 色見本ジェネレーターで、気に入った配色を作ります
2. 「**色をコピー**」ボタンを押します（`#0B3954,#087E8B,…` の形でコピーされます）
3. Figma で、色を変えたいレイヤーやフレームを選びます
4. **Plugins → Development → colour-picking** を開き、入力欄に貼り付けます
5. 色の帯が出たら「**選んだレイヤーの色を置き換える**」を押します

元に戻したいときは **Cmd + Z**（Windows は Ctrl + Z）です。

### 置き換えのルール

- 対象は、選んだレイヤーと**その中のレイヤー**の「単色の塗り」と「線」です（グラデーションや画像は、そのまま残ります）
- 使われている色を暗い順に、パレットの色も暗い順に並べて、順番どうしで対応づけます
  - 例：選択の中に 3 色あれば、暗い色 → パレットの暗い色、真ん中 → 真ん中、明るい色 → 明るい色
  - 使われている色が 1 色だけなら、パレットの真ん中の色になります
- 色の不透明度（opacity）は、そのまま残ります
- 貼り付ける色は 2 色以上が必要です。`#` なしの 6 桁や、空白・改行区切りでも読み取れます

## 自分の Figma で動かす

Figma の**デスクトップアプリ**と Node.js が必要です（ブラウザ版では開発用のプラグインを読み込めません）。

```bash
git clone https://github.com/kiki00315/figma-plugin-colour-picking.git
cd figma-plugin-colour-picking
npm install
npm run build   # code.ts を code.js に変換する
```

そのあと Figma で **Plugins → Development → Import plugin from manifest…** を開き、`manifest.json` を選びます。

コードを直しながら試すときは `npm run watch` を動かしておくと、保存するたびに `code.js` が作り直されます。

## ファイル

| ファイル | 役割 |
|---|---|
| `manifest.json` | プラグインの設定（名前、読み込むファイルなど） |
| `code.ts` | Figma のレイヤーを読み書きする本体 |
| `ui.html` | 色を貼り付ける画面 |

`code.js` は `code.ts` から作られるファイルなので、リポジトリには入れていません。

## 開発用のコマンド

| コマンド | 内容 |
|---|---|
| `npm run build` | TypeScript を JavaScript に変換 |
| `npm run watch` | 保存のたびに自動で変換 |
| `npm run lint` | コードの書き方をチェック |
