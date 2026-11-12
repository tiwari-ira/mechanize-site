(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var booted = false;

  function boot() {
    if (booted) return;
    booted = true;
    typeMainHeading();
    prepareSections();
    initVideos();
  }

  function typeMainHeading() {
    var chip = document.querySelector("[data-typewriter]");
    if (!chip) return;
    var text = chip.getAttribute("data-typewriter") || chip.textContent.trim();
    if (reduce) {
      chip.textContent = text;
      return;
    }

    chip.textContent = "";
    chip.classList.add("chip-lg");
    var sizer = document.createElement("span");
    sizer.className = "tw-sizer";
    sizer.setAttribute("aria-hidden", "true");
    sizer.textContent = text + "_";

    var line = document.createElement("span");
    line.className = "tw-line";
    line.setAttribute("aria-hidden", "true");
    var typed = document.createElement("span");
    var cursor = document.createElement("span");
    cursor.className = "tw-cursor";
    cursor.textContent = "_";
    line.append(typed, cursor);

    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;

    chip.append(sizer, line, sr);

    var index = 0;
    var timer = setInterval(function () {
      index += 1;
      typed.textContent = text.slice(0, index);
      if (index >= text.length) {
        clearInterval(timer);
        setTimeout(function () { cursor.classList.add("is-done"); }, 420);
      }
    }, 46);
  }

  function prepareSections() {
    var nodes = document.querySelectorAll("[data-reveal]");
    if (!nodes.length || reduce) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35, rootMargin: "0px 0px -8% 0px" });

    nodes.forEach(function (chip) {
      var text = chip.textContent.trim();
      var rect = chip.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) return;

      chip.setAttribute("aria-hidden", "true");
      chip.textContent = "";
      chip.classList.add("will-reveal");
      for (var i = 0; i < text.length; i++) {
        var span = document.createElement("span");
        span.className = "ch";
        span.setAttribute("aria-hidden", "true");
        span.textContent = text[i] === " " ? "\u00a0" : text[i];
        span.style.animationDelay = (i * 28) + "ms";
        chip.appendChild(span);
      }
      var sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = text;
      chip.removeAttribute("aria-hidden");
      chip.appendChild(sr);
      observer.observe(chip);
    });
  }

  function reveal(chip) {
    chip.classList.add("is-in");
  }

  function initVideos() {
    var pool = [
      { model: "claude-opus-4-8", rom: "varooom-3d-gameplay", label: "Claude Opus 4.8" },
      { model: "claude-opus-4-8", rom: "celeste-gameplay", label: "Claude Opus 4.8" },
      { model: "claude-opus-4-8", rom: "bulletgba-gameplay", label: "Claude Opus 4.8" },
      { model: "gpt-5-5", rom: "varooom-3d-gameplay", label: "GPT-5.5" },
      { model: "gpt-5-5", rom: "celeste-gameplay", label: "GPT-5.5" },
      { model: "gpt-5-5", rom: "bulletgba-gameplay", label: "GPT-5.5" },
      { model: "claude-fable-5", rom: "celeste-gameplay", label: "Claude Fable 5" },
      { model: "claude-fable-5", rom: "bulletgba-gameplay", label: "Claude Fable 5" }
    ];

    var group = document.querySelector(".gba-videos");
    if (!group) return;

    var index = Math.floor(Math.random() * pool.length);
    try {
      var last = sessionStorage.getItem("gba_hero_idx");
      if (last !== null && pool.length > 1 && String(index) === last) {
        index = (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
      }
      sessionStorage.setItem("gba_hero_idx", String(index));
    } catch (e) {}

    var pick = pool[index];
    var base = "https://videos.gbaeval.com/" + pick.model + "/" + pick.rom;
    group.querySelectorAll("video[data-kind]").forEach(function (video) {
      var want = base + "." + video.getAttribute("data-kind") + ".mp4";
      if (video.getAttribute("src") !== want) {
        video.setAttribute("src", want);
        video.load();
      }
    });
    var label = group.querySelector("[data-role='cand-label']");
    if (label) label.textContent = pick.label;

    var videos = Array.prototype.slice.call(group.querySelectorAll("video"));
    function toggle() {
      var anyPlaying = videos.some(function (video) { return !video.paused; });
      videos.forEach(function (video) {
        if (anyPlaying) video.pause();
        else video.play().catch(function () {});
      });
    }
    group.addEventListener("click", toggle);
    group.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  }

  if (document.documentElement.classList.contains("has-intro")) {
    window.addEventListener("mechanize:ready", boot, { once: true });
    setTimeout(boot, 7200);
  } else {
    boot();
  }
})();
