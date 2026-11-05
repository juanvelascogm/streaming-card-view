(() => {
  const state = { q: "" };
  const people = new Map(); // href -> { directors, cast } | "pending"
  let list, toast, io;

  const num = (t) => { const m = /(\d+)\s*%/.exec(t || ""); return m ? +m[1] : null; };
  const cls = (n) => n == null ? "na" : n >= 75 ? "hi" : n >= 60 ? "mid" : "lo";
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function read() {
    return [...document.querySelectorAll(".flex-container")].map((c) => {
      const a = c.querySelector('[data-qa="discovery-media-list-item-caption"]');
      if (!a) return null;
      const t = (s) => c.querySelector(s)?.textContent.trim() || "";
      return {
        href: a.getAttribute("href"),
        title: t('[data-qa="discovery-media-list-item-title"]'),
        img: c.querySelector("rt-img")?.getAttribute("src") || "",
        critics: num(c.querySelector('[slot="criticsScore"]')?.textContent),
        audience: num(c.querySelector('[slot="audienceScore"]')?.textContent),
        certified: c.querySelector("score-icon-critics")?.getAttribute("certified") === "true",
        date: t('[data-qa="discovery-media-list-item-start-date"]').replace(/^Streaming\s*/i, ""),
        play: c.querySelector("play-button"),
      };
    }).filter(Boolean);
  }

  const score = (n, label, star) =>
    `<div class="score ${cls(n)}">${star ? '<span class="cert">★</span>' : ""}${n == null ? "—" : n + "%"}<small>${label}</small></div>`;

  function whoHtml(href) {
    const p = people.get(href);
    if (!p || p === "pending") return `<div class="who loading">Loading details…</div>`;
    const genres = p.genres.length ? `<div class="genres">${p.genres.map((g) => `<span>${esc(g)}</span>`).join("")}</div>` : "";
    const synopsis = p.synopsis ? `<p class="synopsis">${esc(p.synopsis)}</p>` : "";
    const dir = p.directors.length ? `<div class="who"><b>Dir.</b>${esc(p.directors.join(", "))}</div>` : "";
    const cast = p.cast.length ? `<div class="who"><b>Cast</b>${esc(p.cast.join(", "))}</div>` : "";
    return genres + synopsis + dir + cast || `<div class="who loading">No details</div>`;
  }

  let items = [];
  function render() {
    items = read().filter((m) => m.title.toLowerCase().includes(state.q));
    list.innerHTML = items.length
      ? `<div class="grid">${items.map((m, i) => `
        <div class="card" data-i="${i}">
          <div class="posterwrap"><a class="poster" href="${m.href}"><img loading="lazy" src="${m.img.replace(/\d+x\d+(?=\/v2)/, "480x720")}" alt=""></a>${m.play ? '<button class="play" data-act="trailer" title="Play trailer" aria-label="Play trailer">▶</button>' : ""}</div>
          <div class="info">
            <div class="head">
              <div class="headtext">
                <button class="title" title="Click to copy name">${esc(m.title)}</button>
                <div class="date">Streaming ${m.date}</div>
              </div>
              <div class="scores">${score(m.critics, "CRITICS", m.certified)}${score(m.audience, "AUDIENCE")}</div>
            </div>
            <div class="who-wrap" data-href="${m.href}">${whoHtml(m.href)}</div>
          </div>
        </div>`).join("")}</div>`
      : `<div class="empty">No movies match.</div>`;
    io.disconnect();
    list.querySelectorAll(".who-wrap").forEach((el) => io.observe(el));
  }

  async function loadPeople(href) {
    if (people.has(href)) return;
    people.set(href, "pending");
    try {
      const html = await fetch(href).then((r) => r.text());
      const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
      const movie = ld.find((x) => x["@type"] === "Movie") || {};
      const directors = (movie.director || []).map((d) => d.name);
      const names = [...html.matchAll(/data-qa="person-name"[^>]*>\s*([^<]+?)\s*</g)].map((m) => m[1]);
      people.set(href, {
        directors, genres: movie.genre || [], synopsis: new DOMParser().parseFromString(html, "text/html").querySelector('[data-qa="synopsis-value"]')?.textContent.trim() || "",
        cast: names.filter((n) => !directors.includes(n)).slice(0, 5),
      });
    } catch { people.set(href, { directors: [], genres: [], synopsis: "", cast: [] }); }
    list.querySelectorAll(`.who-wrap[data-href="${href}"]`).forEach((el) => (el.innerHTML = whoHtml(href)));
  }

  function copy(text) {
    return navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.append(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove();
      return ok ? undefined : Promise.reject();
    });
  }

  function flash(msg) {
    toast.textContent = msg; toast.classList.add("on");
    clearTimeout(flash.t); flash.t = setTimeout(() => toast.classList.remove("on"), 1400);
  }

  function build() {
    const grid = document.querySelector('[data-qa="discovery-media-list"]');
    const filters = document.querySelector(".discovery-filters");
    if (!grid || !filters || document.getElementById("rtv")) return;

    const root = document.createElement("div");
    root.id = "rtv";
    root.innerHTML = `<div class="list"></div><button class="more">Load more</button>`;
    grid.parentNode.insertBefore(root, grid);
    list = root.querySelector(".list");

    const bar = document.createElement("div");
    bar.id = "rtv-bar";
    bar.innerHTML = '<a href="/">🍅 Rotten Tomatoes</a><span>/</span><a href="/browse/movies_at_home/">Movies at Home</a><a href="/browse/movies_in_theaters/">In Theaters</a><a href="/tv">TV</a>';
    document.body.prepend(bar);

    toast = document.createElement("div"); toast.id = "rtv-toast"; document.body.append(toast);

    const search = document.createElement("input");
    search.id = "rtv-search"; search.placeholder = "Filter titles…";
    search.addEventListener("input", () => { state.q = search.value.toLowerCase(); render(); });
    filters.prepend(search);

    io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { io.unobserve(e.target); loadPeople(e.target.dataset.href); }
    }), { rootMargin: "400px" });

    list.addEventListener("click", (e) => {
      const card = e.target.closest(".card"); if (!card) return;
      const m = items[+card.dataset.i];
      if (e.target.closest(".title")) {
        copy(m.title).then(() => flash(`Copied “${m.title}”`), () => flash("Copy failed"));
      } else if (e.target.closest('[data-act="trailer"]')) {
        m.play.click(); // reuse RT's own trailer overlay
      }
    });
    root.querySelector(".more").addEventListener("click", () =>
      document.querySelector('[data-qa="dlp-load-more-button"]')?.click());

    document.documentElement.style.setProperty("--rtv-bg", getComputedStyle(document.body).backgroundColor);

    // trailer lightbox: click outside the player or press Esc to close
    const closeTrailer = () => document.getElementById("video-overlay-centered-close")?.click();
    const trailerOpen = () => document.getElementById("video-overlay-centered-wrap")?.classList.contains("centered");
    document.addEventListener("click", (e) => {
      if (trailerOpen() && !e.target.closest("#video-overlay-centered-wrap, [data-act=trailer], #onetrust-consent-sdk")) closeTrailer();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && trailerOpen()) closeTrailer(); });

    document.documentElement.classList.add("rtv-on");
    render();
    new MutationObserver(() => { clearTimeout(build.t); build.t = setTimeout(render, 150); })
      .observe(grid, { childList: true, subtree: true });
  }

  build();
  if (!document.getElementById("rtv")) {
    const w = new MutationObserver(() => { build(); if (document.getElementById("rtv")) w.disconnect(); });
    w.observe(document.body, { childList: true, subtree: true });
  }
})();
