/*
 * ImaCoco ミニサイト｜表示処理
 * 中身は content/ja.js（window.IMACOCO_CONTENT）から読み込みます。
 * 通常の更新でこのファイルを編集する必要はありません。
 */
(function () {
  "use strict";

  var content = window.IMACOCO_CONTENT;
  if (!content) return;

  var ui = content.ui || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- 小さな道具 ----------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === "className") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value === true ? "" : value);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function slot(name) {
    return document.querySelector('[data-slot="' + name + '"]');
  }

  function setText(name, value) {
    var node = slot(name);
    if (!node) return;
    if (value) node.textContent = value;
    else node.hidden = true;
  }

  function setParagraphs(name, list) {
    var node = slot(name);
    if (!node) return;
    var items = Array.isArray(list) ? list : list ? [list] : [];
    if (!items.length) {
      node.hidden = true;
      return;
    }
    items.forEach(function (text) {
      node.appendChild(el("p", { text: text }));
    });
  }

  // 実在するURLだけを通す（空・「#」・javascript: は表示しない）
  function isRealUrl(url) {
    return typeof url === "string" && /^(https?:\/\/|mailto:)/.test(url.trim());
  }

  function linkItem(link) {
    if (!link || !link.label || !isRealUrl(link.url)) return null;
    var external = /^https?:\/\//.test(link.url);
    var a = el("a", {
      href: link.url,
      target: external ? "_blank" : null,
      rel: external ? "noopener" : null
    }, [
      el("span", { className: "link__label", text: link.label }),
      external ? el("span", { className: "visually-hidden", text: ui.external || "" }) : null,
      el("span", { className: "link__arrow", "aria-hidden": "true", text: external ? "↗" : "→" })
    ]);
    var children = [a];
    if (link.note) children.push(el("span", { className: "link__note", text: link.note }));
    return el("li", null, children);
  }

  function fillLinks(name, links) {
    var node = slot(name);
    if (!node) return;
    (links || []).forEach(function (link) {
      var item = linkItem(link);
      if (item) node.appendChild(item);
    });
    if (!node.children.length) node.hidden = true;
  }

  // ---------- 画像・映像 ----------

  function placeholder(label, variant) {
    return el("div", {
      className: "placeholder" + (variant ? " placeholder--" + variant : ""),
      role: "img",
      "aria-label": label
    }, [el("span", { className: "placeholder__label", text: label })]);
  }

  function image(media, eager) {
    return el("img", {
      src: media.src,
      srcset: media.srcset || null,
      sizes: media.sizes || null,
      alt: media.alt || "",
      width: media.width || null,
      height: media.height || null,
      loading: eager ? "eager" : "lazy",
      decoding: "async",
      fetchpriority: eager ? "high" : null
    });
  }

  function video(media) {
    var wrap = el("div", { className: "video" });
    var v = el("video", {
      src: media.src,
      poster: media.poster || null,
      width: media.width || null,
      height: media.height || null,
      muted: true,
      loop: true,
      playsinline: true,
      preload: "metadata",
      "aria-label": media.alt || null
    });
    v.muted = true; // 音声は再生しない

    var button = el("button", { type: "button", className: "video__toggle", "aria-pressed": "false" }, [
      el("span", { className: "video__icon", "aria-hidden": "true" }),
      el("span", { className: "video__label", text: ui.play || "再生" })
    ]);

    function sync() {
      var playing = !v.paused;
      button.setAttribute("aria-pressed", playing ? "true" : "false");
      button.querySelector(".video__label").textContent = playing ? ui.pause : ui.play;
      wrap.classList.toggle("is-playing", playing);
    }

    button.addEventListener("click", function () {
      if (v.paused) {
        var p = v.play();
        if (p && p.catch) p.catch(sync);
      } else {
        v.pause();
        sync();
      }
    });
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);

    // 映像が読めない場合は静止画に置き換える
    v.addEventListener("error", function () {
      if (media.poster) {
        wrap.replaceWith(image({ src: media.poster, alt: media.alt, width: media.width, height: media.height }));
      } else {
        wrap.replaceWith(placeholder(ui.placeholder));
      }
    });

    // 動きを減らす設定では自動再生しない（静止画＝poster のまま）
    function applyMotionPreference() {
      if (media.autoplay && !reduceMotion.matches) {
        var p = v.play();
        if (p && p.catch) p.catch(sync);
      } else if (!v.paused) {
        v.pause();
      }
    }
    applyMotionPreference();
    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", applyMotionPreference);

    wrap.appendChild(v);
    wrap.appendChild(button);
    return wrap;
  }

  function mediaNode(media, opts) {
    opts = opts || {};
    if (!media || !media.src) return placeholder(opts.placeholderLabel || ui.placeholder, opts.variant);
    if (media.type === "video") return video(media);
    return image(media, opts.eager);
  }

  function fillMedia(name, media, opts) {
    var node = slot(name);
    if (!node) return;
    node.appendChild(mediaNode(media, opts));
    if (media && media.caption) node.appendChild(el("p", { className: "caption", text: media.caption }));
  }

  // ---------- 各セクション ----------

  function renderMeta() {
    document.documentElement.lang = content.lang || "ja";
    if (content.meta) {
      if (content.meta.title) document.title = content.meta.title;
      var desc = document.querySelector('meta[name="description"]');
      if (desc && content.meta.description) desc.setAttribute("content", content.meta.description);
    }
    document.querySelectorAll("[data-ui]").forEach(function (node) {
      var key = node.getAttribute("data-ui");
      if (ui[key]) node.textContent = ui[key];
    });
  }

  function renderNav() {
    var list = document.querySelector(".site-nav__list");
    (content.nav || []).forEach(function (item) {
      list.appendChild(el("li", null, [el("a", { href: item.href, text: item.label })]));
    });
  }

  function renderHero() {
    var hero = content.hero || {};
    setText("hero-eyebrow", hero.eyebrow);
    setText("hero-title", hero.title);
    setParagraphs("hero-lead", hero.lead);
    fillMedia("hero-media", hero.media, { eager: true, variant: "hero" });
  }

  function renderGrove() {
    var g = content.aiGrove || {};
    setText("grove-status", g.status);
    setText("grove-title", g.title);
    setText("grove-subtitle", g.subtitle);
    setText("grove-lead", g.lead);
    setParagraphs("grove-body", g.body);
    setText("grove-note", g.statusNote);
    fillMedia("grove-media", g.media, { variant: "grove", placeholderLabel: ui.placeholderAiGrove });
    fillLinks("grove-links", g.links);

    var dl = slot("grove-motifs");
    (g.motifs || []).forEach(function (m) {
      dl.appendChild(el("div", { className: "motif" }, [
        el("dt", { text: m.nature }),
        el("dd", { text: m.meaning })
      ]));
    });
    if (!dl.children.length) dl.hidden = true;
  }

  function renderWorks() {
    var w = content.works || {};
    setText("works-title", w.title);
    setText("works-lead", w.lead);

    var list = slot("works-items");
    (w.items || []).forEach(function (item, i) {
      if (!item || !item.title) return;
      var links = el("ul", { className: "link-list" });
      (item.links || []).forEach(function (link) {
        var li = linkItem(link);
        if (li) links.appendChild(li);
      });
      var titleId = "work-" + (i + 1);
      list.appendChild(el("article", { className: "work", "aria-labelledby": titleId }, [
        el("div", { className: "work__media" }, [mediaNode(item.media, { variant: "work" })]),
        el("div", { className: "work__text" }, [
          el("h3", { className: "work__title", id: titleId, text: item.title }),
          item.text ? el("p", { className: "work__desc", text: item.text }) : null,
          links.children.length ? links : null
        ])
      ]));
    });

    if (!list.children.length) {
      list.hidden = true;
      var empty = slot("works-empty");
      if (w.emptyNote) {
        empty.textContent = w.emptyNote;
        empty.hidden = false;
      }
    }
    fillLinks("works-destinations", w.destinations);
  }

  function renderFooter() {
    var f = content.footer || {};
    setText("footer-label", f.operatorLabel);
    setText("footer-operator", f.operator);
    setText("footer-note", f.operatorNote);
    setText("footer-copyright", f.copyright);
    fillLinks("footer-links", f.links);
  }

  // ---------- メニュー ----------

  function setupMenu() {
    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.getElementById("site-nav");
    var label = toggle.querySelector(".menu-toggle__label");
    var compact = window.matchMedia("(max-width: 767px)");

    toggle.hidden = false;
    header.classList.add("has-js");

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      header.classList.toggle("is-open", open);
      label.textContent = open ? ui.menuClose : ui.menuOpen;
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (header.classList.contains("is-open") && !header.contains(e.target)) setOpen(false);
    });

    function onResize() {
      if (!compact.matches) setOpen(false);
    }
    if (compact.addEventListener) compact.addEventListener("change", onResize);
  }

  // ---------- 控えめな表示演出 ----------

  function setupReveal() {
    if (reduceMotion.matches || !("IntersectionObserver" in window)) return;
    var targets = document.querySelectorAll(".grove__media, .work");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    targets.forEach(function (t) {
      t.classList.add("reveal");
      io.observe(t);
    });
  }

  renderMeta();
  renderNav();
  renderHero();
  renderGrove();
  renderWorks();
  renderFooter();
  setupMenu();
  setupReveal();
})();
