/*
 * ImaCoco ミニサイト｜日本語版の中身
 * ------------------------------------------------------------
 * 文章・画像・映像・リンクは、このファイルだけで差し替えられます。
 * 書き方は README.md の「差し替え方」を参照してください。
 *
 * ・media を null にすると「差し替え位置」の枠が表示されます。
 * ・links / destinations / works.items が空なら、その部分は表示されません。
 *   行き先が決まっていないものは、ここに書かないでください（「#」も不可）。
 */
window.IMACOCO_CONTENT = {
  lang: "ja",

  meta: {
    title: "ImaCoco｜森の日常の、ひとつの瞬間",
    description:
      "森の世界「ImaCoco Grove」で暮らす存在の日常を、映像と作品であらわすImaCocoの作品サイト。制作中の観察図鑑「AI Grove」も紹介します。"
  },

  // 画面上部のメニュー（href はページ内の場所）
  nav: [
    { label: "ImaCoco", href: "#imacoco" },
    { label: "AI Grove", href: "#ai-grove" },
    { label: "作品", href: "#works" },
    { label: "運営", href: "#about" }
  ],

  // 1. ImaCocoの入口
  hero: {
    eyebrow: "ImaCoco Grove",
    // 【仮の文章・要確認】依頼文の事実だけで作成
    title: "森の日常の、ひとつの瞬間。",
    lead: [
      "ImaCocoは、森の世界「ImaCoco Grove」で暮らす存在の日常を、映像と作品であらわす実験です。",
      "説明より先に、その瞬間を見て、感じてください。"
    ],
    /*
     * 画像の例:
     * media: { type: "image", src: "assets/hero.jpg", alt: "…", width: 1600, height: 2000 }
     * 映像の例（音声は再生しません。poster は静止画の代替）:
     * media: { type: "video", src: "assets/hero.mp4", poster: "assets/hero-poster.jpg",
     *          alt: "…", width: 1080, height: 1350, autoplay: true }
     */
    media: null
  },

  // 2. AI Grove（ImaCoco Groveとは別の作品）
  aiGrove: {
    status: "制作中",
    title: "AI Grove",
    subtitle: "ことばの森の生態系",
    // 【仮の文章・要確認】
    lead: "AIの仕組みを、石・根・光・枝分かれで描く、アートブック／観察図鑑。",
    body: [
      "キャラクターは登場しません。会話するAIのことばの森だけでなく、異なる仕組みで動くAIも含めて、ひとつの生態系として観察します。",
      "淡々とした図鑑のページをめくるうちに、小さな発見がある一冊を目指しています。"
    ],
    // 観察の手がかり（自然物と、それが表すもの）
    motifs: [
      { nature: "石", meaning: "ことばの粒" },
      { nature: "根", meaning: "つながる文脈" },
      { nature: "光", meaning: "注目する場所" },
      { nature: "枝分かれ", meaning: "次にありうる道" }
    ],
    statusNote: "日本語で制作中です。出版の形・時期・価格は決まっていません。",
    // 正式素材（書影・見本ページなど）が用意できたら指定
    media: null,
    // 試し読みなど、実在するページができた場合だけ追加 { label: "…", url: "https://…" }
    links: []
  },

  // 3. ImaCocoの作品と行き先
  works: {
    title: "作品と行き先",
    lead: "気になった作品は、それぞれの紹介先・販売先でご覧いただけます。",
    /*
     * 作品を追加する例（上から順に表示）:
     * {
     *   title: "作品名",
     *   text: "短い紹介文",
     *   media: { type: "image", src: "assets/works/xxx.jpg", alt: "…", width: 1200, height: 1500 },
     *   links: [{ label: "STORESで見る", url: "https://…" }]
     * }
     */
    items: [],
    // items が空のときだけ表示する文
    emptyNote: "作品の紹介は、準備ができたものから順にここへ加わります。",
    // 作品以外の公式の行き先（YouTube・Instagram など）{ label, note, url }
    destinations: []
  },

  // 4. フッター
  footer: {
    operatorLabel: "運営",
    operator: "Office HABIT",
    operatorNote: "山口の小さな事務所",
    links: [
      { label: "Office HABIT 公式サイト", url: "https://habit-yamaguchi.jimdofree.com/" }
    ],
    copyright: "© Office HABIT"
  },

  // 画面の読み上げ・操作用の文言
  ui: {
    skip: "本文へ移動",
    menuOpen: "メニュー",
    menuClose: "閉じる",
    play: "映像を再生",
    pause: "映像を一時停止",
    placeholder: "画像・映像の差し替え位置",
    placeholderAiGrove: "正式素材の差し替え位置",
    external: "（新しいタブで開きます）",
    noscript: "このページの表示にはJavaScriptが必要です。"
  }
};
