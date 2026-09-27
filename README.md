# ImaCoco ミニサイト

ImaCocoの作品を見せる、スマートフォン中心の1ページ静的サイトです。
「ミニサイトは売り場、STORESはレジ」の考え方で、サイト内に決済はなく、作品ごとの外部ページへつなぎます。

> **状態：公開前の制作版です。** 正式な画像・映像・作品・行き先リンクが未設定のため、公開できる完成版ではありません。

## プレビューの開き方

**いちばん簡単な方法（MacBook Air）**
Finderで `imacoco-site` フォルダを開き、`index.html` をダブルクリックします。ブラウザで表示されます。

**本番に近い形で見る方法**（ターミナル）
```
cd imacoco-site
npx http-server -p 8765 -c-1 .
```
ブラウザで `http://127.0.0.1:8765/` を開きます。止めるときは `Ctrl + C`。

## ファイル構成

| ファイル | 役割 | ふだん触るか |
|---|---|---|
| `content/ja.js` | 文章・画像・映像・リンクのすべて | **ここだけ触る** |
| `assets/` | 画像・映像を置く場所 | 素材を入れる |
| `index.html` | ページの骨組み | 触らない |
| `css/style.css` | 見た目（色は先頭の `:root` で調整） | 基本触らない |
| `js/main.js` | 表示・メニュー・映像の動き | 触らない |
| `tools/check.cjs` | 表示確認スクリプト（開発用・公開不要） | — |
| `screenshots/` | 確認時のスクリーンショット（公開不要） | — |

## 差し替え方（`content/ja.js`）

### 文章
`"…"` の中を書き換えます。`【仮の文章・要確認】` の印がある文は、仮に作成した文です。

### 画像
1. 画像を `assets/` に入れる（例：`assets/hero.jpg`）。幅1600px前後・JPEGまたはWebPで、1枚500KB以下が目安です。
2. 該当する `media: null` を次のように書き換えます。
```js
media: { type: "image", src: "assets/hero.jpg", alt: "画像の内容を短く", width: 1600, height: 2000 }
```
`width` / `height` は画像の実寸です（表示のガタつき防止）。`alt` は画面を見られない人向けの説明です。

### 映像
```js
media: { type: "video", src: "assets/hero.mp4", poster: "assets/hero-poster.jpg",
         alt: "映像の内容を短く", width: 1080, height: 1350, autoplay: true }
```
- 音声は再生しません（常に消音）。
- `poster` は静止画の代替です。必ず用意してください。「動きを減らす」設定の端末や、映像が読めない場合はこの静止画を表示します。
- 再生／一時停止ボタンが自動で付きます。
- MP4（H.264）で、10秒前後・数MB以内が目安です。

### 作品を追加する
`works.items` の `[]` の中に、上から順に書きます。
```js
items: [
  {
    title: "作品名",
    text: "短い紹介文",
    media: { type: "image", src: "assets/works/sample.jpg", alt: "…", width: 1200, height: 1500 },
    links: [{ label: "STORESで見る", url: "https://…" }]
  }
]
```
作品が1つ以上あると、「準備ができたものから…」の文は自動で消えます。PCでは画像の左右が交互になります。

### リンク
- `https://` で始まる実在のURLだけ表示されます。`#` や空欄は表示されません。
- 行き先が未確定なら、その行を書かないでください。
- 外部リンクは新しいタブで開きます。
- 作品以外の公式の行き先（YouTubeなど）は `works.destinations` に `{ label, note, url }` で追加します。
- AI Groveの試し読みなどは、実在するページができたら `aiGrove.links` に追加します。

### AI Groveについて
- 「制作中」の表示は `aiGrove.status` です。出版の形・時期・価格が決まるまで「販売中」「発売決定」などに変えないでください。
- ImaCoco Groveとは別作品のため、色調（夜の森）を分けています。

## 英語版を追加するとき
1. `content/ja.js` を複製して `content/en.js` を作り、`window.IMACOCO_CONTENT` の中身を英語にし、`lang: "en"` にする。
2. `en/index.html` を作り、`index.html` を複製して、読み込み先を `../content/en.js`、`../css/style.css`、`../js/main.js` に変える。

## 表示確認（開発用）
```
cd imacoco-site
npx http-server -p 8765 -c-1 . &
NODE_PATH=$(npm root -g) node tools/check.cjs
```
幅390／768／1440pxでのはみ出し、画像、コントラスト、リンク、メニュー、キーボード操作、映像操作、動きを減らす設定、コンソールエラーを確認し、`screenshots/` に画像を保存します。
