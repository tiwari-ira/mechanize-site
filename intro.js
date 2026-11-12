(function () {
  var root = document.documentElement;
  if (!root.classList.contains("has-intro")) return;

  var WORD = "MECHANIZE";
  var LETTERS = "MECHANIZE";
  var SYMBOLS = ["+", "+", "-", "*", "/", "."];
  var TEETH = 8;

  var intro = document.getElementById("intro");
  var stage = document.getElementById("stage");
  var skip = document.getElementById("skip-intro");
  var cancelled = false;
  var timers = [];

  function later(fn, ms) {
    return new Promise(function (resolve) {
      var id = setTimeout(function () {
        resolve();
        if (!cancelled) fn && fn();
      }, ms);
      timers.push(id);
    });
  }

  function wait(ms) {
    return later(null, ms);
  }

  function finish() {
    if (root.classList.contains("intro-done")) return;
    try { sessionStorage.setItem("mechanize-intro", "1"); } catch (e) {}
    root.classList.add("intro-done");
    window.dispatchEvent(new Event("mechanize:ready"));
    setTimeout(function () {
      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    }, 520);
    var main = document.querySelector("main");
    if (main && skip && document.activeElement === skip) {
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    }
  }

  function abort() {
    if (cancelled) return;
    cancelled = true;
    timers.forEach(clearTimeout);
    finish();
  }

  skip.addEventListener("click", abort);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") abort();
  });

  function measure(px) {
    var probe = document.createElement("span");
    probe.textContent = "M";
    probe.style.cssText = "position:absolute;visibility:hidden;font:500 " + px + "px/1 \"IBM Plex Mono\",\"Courier New\",ui-monospace,monospace;";
    document.body.appendChild(probe);
    var rect = probe.getBoundingClientRect();
    probe.remove();
    return { w: rect.width || px * 0.6, h: rect.height || px };
  }

  function buildGear(charW, charH, radius) {
    var points = [];
    function add(x, y, tip) {
      for (var i = 0; i < points.length; i++) {
        var dx = (x - points[i].x) / charW;
        var dy = (y - points[i].y) / charH;
        if (dx * dx + dy * dy < 1.2) return;
      }
      points.push({ x: x, y: y, tip: !!tip });
    }
    function ring(r) {
      var a = -Math.PI / 2;
      var guard = 0;
      while (a < Math.PI * 1.5 - 0.08 && guard < 500) {
        add(Math.cos(a) * r, Math.sin(a) * r, false);
        var tx = -Math.sin(a);
        var ty = Math.cos(a);
        var spacing = Math.abs(tx) * charW * 1.52 + Math.abs(ty) * charH * 1.14;
        a += Math.max(spacing, 8) / r;
        guard++;
      }
    }
    function line(x0, y0, x1, y1, tip) {
      var dx = x1 - x0;
      var dy = y1 - y0;
      var dist = Math.hypot(dx, dy) || 1;
      var ux = dx / dist;
      var uy = dy / dist;
      var spacing = Math.abs(ux) * charW * 1.45 + Math.abs(uy) * charH * 1.12;
      var steps = Math.max(1, Math.round(dist / spacing));
      for (var s = 0; s <= steps; s++) {
        var t = s / steps;
        add(x0 + dx * t, y0 + dy * t, tip && s === steps);
      }
    }

    ring(radius * 0.4);
    ring(radius * 0.72);

    var toothArc = (Math.PI * 2 / TEETH) * 0.17;
    for (var t = 0; t < TEETH; t++) {
      var a0 = -Math.PI / 2 + (t / TEETH) * Math.PI * 2;
      var left = a0 - toothArc;
      var right = a0 + toothArc;
      var root = radius * 0.73;
      var tip = radius;
      line(Math.cos(left) * root, Math.sin(left) * root, Math.cos(left) * tip, Math.sin(left) * tip, true);
      line(Math.cos(right) * root, Math.sin(right) * root, Math.cos(right) * tip, Math.sin(right) * tip, false);
      line(Math.cos(left) * tip, Math.sin(left) * tip, Math.cos(right) * tip, Math.sin(right) * tip, false);
    }

    return points.map(function (p) {
      return {
        x: p.x,
        y: p.y,
        tip: p.tip,
        angle: Math.atan2(p.y, p.x),
        r: Math.hypot(p.x, p.y)
      };
    });
  }

  function assignCharacters(cells, cx, cy) {
    cells.forEach(function (cell, index) {
      cell.ch = LETTERS[index % LETTERS.length];
      cell.angle = Math.atan2(cell.y - cy, cell.x - cx);
      cell.r = Math.hypot(cell.x - cx, cell.y - cy);
      cell.keep = false;
    });

    var used = new Set();
    var picks = [];
    for (var i = 0; i < WORD.length; i++) {
      var letter = WORD[i];
      var candidates = cells.filter(function (cell) {
        return cell.ch === letter && !used.has(cell);
      });
      if (!candidates.length) {
        candidates = cells.filter(function (cell) { return !used.has(cell); });
      }
      var best = candidates[0];
      var bestScore = -Infinity;
      candidates.forEach(function (cell) {
        var sep = Math.PI;
        picks.forEach(function (pick) {
          var d = Math.abs(cell.angle - pick.angle);
          if (d > Math.PI) d = Math.PI * 2 - d;
          sep = Math.min(sep, d);
        });
        var score = (picks.length ? sep : 0) + cell.r * 0.05;
        if (score > bestScore) {
          bestScore = score;
          best = cell;
        }
      });
      best.ch = letter;
      best.keep = true;
      best.wordIndex = i;
      used.add(best);
      picks.push(best);
    }

    cells.forEach(function (cell, index) {
      if (cell.keep) return;
      if (cell.tip) cell.ch = "+";
      else if ((index * 5) % 17 === 0) cell.ch = SYMBOLS[index % SYMBOLS.length];
    });

    return picks;
  }

  function makeGlyph(ch, x, y, size) {
    var glyph = document.createElement("span");
    glyph.className = "glyph";
    var inner = document.createElement("span");
    inner.className = "glyph-ch";
    inner.textContent = ch;
    inner.style.fontSize = size + "px";
    inner.style.opacity = "0";
    inner.style.transform = "translate(-50%, -50%) scale(0.45)";
    glyph.appendChild(inner);
    glyph.style.transform = "translate(" + x + "px, " + y + "px)";
    glyph._inner = inner;
    glyph._x = x;
    glyph._y = y;
    stage.appendChild(glyph);
    return glyph;
  }

  function pointOf(glyph) {
    var rect = glyph._inner.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  async function run() {
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        document.fonts.load("500 20px \"IBM Plex Mono\""),
        wait(420)
      ]);
    }
    if (cancelled) return;

    var radius = Math.min(window.innerWidth * 0.33, window.innerHeight * 0.34);
    radius = Math.max(118, Math.min(radius, 240));
    var fontSize = Math.max(11, Math.min(16, radius / 15));
    if (window.innerWidth < 520) fontSize = Math.max(10, Math.min(13, radius / 14));
    var metrics = measure(fontSize);
    var cells = buildGear(metrics.w, metrics.h, radius);
    var picks = assignCharacters(cells, 0, 0);

    var originX = window.innerWidth / 2;
    var originY = window.innerHeight / 2;
    var glyphs = cells.map(function (cell) {
      var x = originX + cell.x;
      var y = originY + cell.y;
      var glyph = makeGlyph(cell.ch, x, y, fontSize);
      glyph._keep = cell.keep;
      glyph._wordIndex = cell.wordIndex;
      glyph._cell = cell;
      return glyph;
    });

    var sweep = glyphs.slice().sort(function (a, b) {
      var aa = (a._cell.angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
      var bb = (b._cell.angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
      return aa - bb || b._cell.r - a._cell.r;
    });

    await new Promise(function (resolve) {
      var start = performance.now();
      var duration = 620;
      var cursor = 0;
      function frame(now) {
        if (cancelled) return resolve();
        var count = Math.min(sweep.length, Math.floor(((now - start) / duration) * sweep.length));
        while (cursor < count) {
          var inner = sweep[cursor]._inner;
          inner.style.transition = "opacity 90ms linear, transform 150ms ease-out";
          inner.style.opacity = "1";
          inner.style.transform = "translate(-50%, -50%) scale(1)";
          cursor++;
        }
        if (cursor < sweep.length) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    if (cancelled) return;

    await wait(90);
    if (cancelled) return;

    stage.style.transition = "transform 240ms cubic-bezier(.2,.75,.2,1)";
    stage.style.transform = "rotate(14deg)";
    await wait(250);
    if (cancelled) return;
    stage.style.transition = "transform 170ms cubic-bezier(.2,.8,.2,1)";
    stage.style.transform = "rotate(8deg)";
    await wait(190);
    if (cancelled) return;

    var spots = glyphs.map(function (glyph) {
      var p = pointOf(glyph);
      return { glyph: glyph, x: p.x, y: p.y };
    });
    stage.style.transition = "none";
    stage.style.transform = "none";
    spots.forEach(function (spot) {
      spot.glyph.style.transition = "none";
      spot.glyph.style.transform = "translate(" + spot.x + "px, " + spot.y + "px)";
      spot.glyph._x = spot.x;
      spot.glyph._y = spot.y;
    });
    void stage.offsetWidth;

    var wordSize = Math.min(72, Math.max(34, window.innerWidth * 0.068));
    var wordMetrics = measure(wordSize);
    var tracking = wordSize * 0.14;
    var advance = wordMetrics.w + tracking;
    var total = advance * WORD.length - tracking;
    if (total > window.innerWidth * 0.9) {
      var scale = (window.innerWidth * 0.9) / total;
      wordSize *= scale;
      wordMetrics = measure(wordSize);
      tracking = wordSize * 0.14;
      advance = wordMetrics.w + tracking;
      total = advance * WORD.length - tracking;
    }
    var wordX = (window.innerWidth - total) / 2 + wordMetrics.w / 2;
    var wordY = window.innerHeight / 2;
    var ease = "cubic-bezier(.22,.8,.24,1)";

    glyphs.forEach(function (glyph) {
      if (glyph._keep) {
        var delay = glyph._wordIndex * 34;
        var x = wordX + glyph._wordIndex * advance;
        glyph.style.transition = "transform 840ms " + ease + " " + delay + "ms";
        glyph._inner.style.transition = "font-size 840ms " + ease + " " + delay + "ms";
        glyph.style.transform = "translate(" + x + "px, " + wordY + "px)";
        glyph._inner.style.fontSize = wordSize + "px";
        glyph._x = x;
        glyph._y = wordY;
      } else {
        var dx = glyph._x - originX;
        var dy = glyph._y - originY;
        var len = Math.hypot(dx, dy) || 1;
        var drift = 16;
        glyph.style.transition = "transform 560ms ease, opacity 420ms ease";
        glyph.style.opacity = "0";
        glyph.style.transform = "translate(" + (glyph._x + (dx / len) * drift) + "px, " + (glyph._y + (dy / len) * drift) + "px)";
      }
    });

    await wait(840 + 34 * (WORD.length - 1) + 40);
    if (cancelled) return;
    await wait(380);
    if (cancelled) return;

    var exits = [
      { kind: "fade", delay: 0, duration: 260 },
      { kind: "flicker", delay: 90, duration: 420 },
      { kind: "rise", delay: 40, duration: 480 },
      { kind: "slow", delay: 150, duration: 620 },
      { kind: "flicker", delay: 70, duration: 380 },
      { kind: "rise", delay: 20, duration: 440 },
      { kind: "fade", delay: 180, duration: 240 },
      { kind: "rise", delay: 110, duration: 560 },
      { kind: "slow", delay: 60, duration: 520 }
    ];

    picks.sort(function (a, b) { return a.wordIndex - b.wordIndex; });
    var wordGlyphs = glyphs.filter(function (glyph) { return glyph._keep; })
      .sort(function (a, b) { return a._wordIndex - b._wordIndex; });

    var longest = 0;
    wordGlyphs.forEach(function (glyph, index) {
      var exit = exits[index];
      var end = exit.delay + exit.duration;
      if (end > longest) longest = end;
      if (exit.kind === "flicker") {
        glyph._inner.animate([
          { opacity: 1 },
          { opacity: 0.12, offset: 0.22 },
          { opacity: 0.9, offset: 0.45 },
          { opacity: 0.05, offset: 0.68 },
          { opacity: 0 }
        ], { duration: exit.duration, delay: exit.delay, easing: "linear", fill: "forwards" });
      } else if (exit.kind === "rise") {
        glyph.animate([
          { transform: "translate(" + glyph._x + "px, " + glyph._y + "px)", opacity: 1 },
          { transform: "translate(" + glyph._x + "px, " + (glyph._y - 11) + "px)", opacity: 0 }
        ], { duration: exit.duration, delay: exit.delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
      } else {
        glyph._inner.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: exit.duration, delay: exit.delay, easing: "ease", fill: "forwards" }
        );
      }
    });

    await wait(Math.max(220, Math.min(longest - 180, 460)));
    if (cancelled) return;
    finish();
  }

  run().catch(function () { finish(); });
  setTimeout(function () {
    if (!root.classList.contains("intro-done")) finish();
  }, 7000);
})();
