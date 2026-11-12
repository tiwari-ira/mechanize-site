(function () {
  var root = document.documentElement;
  if (!root.classList.contains("has-intro")) return;
  if (root.dataset.intro === "outline") return;

  var LETTERS = "MECHANIZE";
  var SYMBOLS = ["+", "-", "*", "/"];
  var BUBBLE = {
    M: [
      "11....11",
      "111..111",
      "11.11.11",
      "11..1.11",
      "11....11",
      "11....11",
      "11....11",
      "11....11"
    ],
    E: [
      "11111111",
      "11......",
      "11......",
      "1111111.",
      "11......",
      "11......",
      "11......",
      "11111111"
    ],
    C: [
      ".1111111",
      "11......",
      "11......",
      "11......",
      "11......",
      "11......",
      "11......",
      ".1111111"
    ],
    H: [
      "11....11",
      "11....11",
      "11....11",
      "11111111",
      "11....11",
      "11....11",
      "11....11",
      "11....11"
    ],
    A: [
      ".111111.",
      "11....11",
      "11....11",
      "11111111",
      "11....11",
      "11....11",
      "11....11",
      "11....11"
    ],
    N: [
      "11....11",
      "111...11",
      "11.1..11",
      "11..1.11",
      "11...111",
      "11....11",
      "11....11",
      "11....11"
    ],
    I: [
      "11111111",
      "...11...",
      "...11...",
      "...11...",
      "...11...",
      "...11...",
      "...11...",
      "11111111"
    ],
    Z: [
      "11111111",
      ".....111",
      "....11..",
      "...11...",
      "..11....",
      ".11.....",
      "111.....",
      "11111111"
    ]
  };
  var WORD = "MECHANIZE";
  var BATCHES = [[0, 1], [2, 3, 4], [5, 6], [7, 8]];

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
    try { sessionStorage.setItem("mechanize-intro-filled", "1"); } catch (e) {}
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

  function inGear(px, py, radius) {
    var r = Math.hypot(px, py);
    var ang = Math.atan2(py, px);
    var frac = ((ang + Math.PI) / (Math.PI * 2)) * 8;
    frac = frac - Math.floor(frac);
    var tooth = Math.abs(frac - 0.5) < 0.2;
    var outer = tooth ? radius : radius * 0.7;
    var inner = radius * 0.34;
    return r <= outer && r >= inner;
  }

  function buildFilledGear(charW, charH, radius) {
    var cells = [];
    var cols = Math.ceil((radius * 2) / charW) + 1;
    var rows = Math.ceil((radius * 2) / charH) + 1;
    var cx = (cols - 1) / 2;
    var cy = (rows - 1) / 2;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var px = (x - cx) * charW;
        var py = (y - cy) * charH;
        if (!inGear(px, py, radius)) continue;
        var index = cells.length;
        cells.push({
          x: px,
          y: py,
          angle: Math.atan2(py, px),
          r: Math.hypot(px, py),
          ch: index % 15 === 0 ? SYMBOLS[index % SYMBOLS.length] : LETTERS[index % LETTERS.length]
        });
      }
    }
    return cells;
  }

  function buildWord(charW, charH) {
    var letterW = 8 * charW;
    var maxW = window.innerWidth * 0.9;
    var gap = (maxW - WORD.length * letterW) / (WORD.length - 1);
    gap = Math.max(charW * 0.65, Math.min(gap, charW * 2.1));
    var letters = [];
    var width = 0;
    for (var i = 0; i < WORD.length; i++) {
      var rows = BUBBLE[WORD[i]];
      var letterW = rows[0].length * charW;
      letters.push({ rows: rows, x: width, index: i });
      width += letterW;
      if (i < WORD.length - 1) width += gap;
    }
    var height = letters[0].rows.length * charH;
    var points = [];
    letters.forEach(function (letter) {
      var batch = 0;
      for (var b = 0; b < BATCHES.length; b++) {
        if (BATCHES[b].indexOf(letter.index) !== -1) batch = b;
      }
      for (var row = 0; row < letter.rows.length; row++) {
        var line = letter.rows[row];
        for (var col = 0; col < line.length; col++) {
          if (line.charAt(col) !== "1") continue;
          points.push({
            x: letter.x + (col + 0.5) * charW - width / 2,
            y: (row + 0.5) * charH - height / 2,
            batch: batch,
            letter: letter.index,
            ch: WORD.charAt(letter.index)
          });
        }
      }
    });
    return { points: points, width: width, height: height };
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

  function matchTargets(glyphs, targets) {
    var used = new Array(glyphs.length);
    targets.forEach(function (target) {
      var best = -1;
      var bestD = Infinity;
      for (var i = 0; i < glyphs.length; i++) {
        if (used[i]) continue;
        var dx = glyphs[i]._x - target.x;
        var dy = glyphs[i]._y - target.y;
        var d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) return;
      used[best] = true;
      glyphs[best]._keep = true;
      glyphs[best]._tx = target.x;
      glyphs[best]._ty = target.y;
      glyphs[best]._batch = target.batch;
      glyphs[best]._inner.textContent = target.ch;
    });
  }

  async function run() {
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        document.fonts.load("500 20px \"IBM Plex Mono\""),
        wait(420)
      ]);
    }
    if (cancelled) return;

    var fontSize = window.innerWidth < 520 ? 12 : 15;
    var radius = Math.min(window.innerWidth * 0.36, window.innerHeight * 0.34);
    radius = Math.max(124, Math.min(radius, 250));
    var metrics = measure(fontSize);
    var word = buildWord(metrics.w, metrics.h);
    var guard = 0;
    while ((word.width > window.innerWidth * 0.9 || word.height > window.innerHeight * 0.52) && fontSize > 8 && guard < 10) {
      fontSize *= 0.9;
      metrics = measure(fontSize);
      word = buildWord(metrics.w, metrics.h);
      guard++;
    }
    var cells = buildFilledGear(metrics.w, metrics.h, radius);
    guard = 0;
    while (cells.length < word.points.length + 8 && fontSize > 8 && guard < 6) {
      fontSize -= 1;
      metrics = measure(fontSize);
      word = buildWord(metrics.w, metrics.h);
      cells = buildFilledGear(metrics.w, metrics.h, radius);
      guard++;
    }

    var originX = window.innerWidth / 2;
    var originY = window.innerHeight / 2;
    var glyphs = cells.map(function (cell) {
      var glyph = makeGlyph(cell.ch, originX + cell.x, originY + cell.y, fontSize);
      glyph._cell = cell;
      glyph._keep = false;
      return glyph;
    });

    var sweep = glyphs.slice().sort(function (a, b) {
      var aa = (a._cell.angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
      var bb = (b._cell.angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
      return aa - bb || a._cell.r - b._cell.r;
    });

    await new Promise(function (resolve) {
      var start = performance.now();
      var duration = 680;
      var cursor = 0;
      function frame(now) {
        if (cancelled) return resolve();
        var count = Math.min(sweep.length, Math.floor(((now - start) / duration) * sweep.length) + 1);
        while (cursor < count) {
          var inner = sweep[cursor]._inner;
          inner.style.transition = "opacity 70ms linear, transform 120ms ease-out";
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

    await wait(80);
    if (cancelled) return;

    stage.style.transition = "transform 240ms cubic-bezier(.2,.75,.2,1)";
    stage.style.transform = "rotate(12deg)";
    await wait(250);
    if (cancelled) return;
    stage.style.transition = "transform 160ms cubic-bezier(.2,.8,.2,1)";
    stage.style.transform = "rotate(7deg)";
    await wait(180);
    if (cancelled) return;

    glyphs.forEach(function (glyph) {
      var p = pointOf(glyph);
      glyph._x = p.x;
      glyph._y = p.y;
    });
    stage.style.transition = "none";
    stage.style.transform = "none";
    glyphs.forEach(function (glyph) {
      glyph.style.transition = "none";
      glyph.style.transform = "translate(" + glyph._x + "px, " + glyph._y + "px)";
    });
    void stage.offsetWidth;

    var targets = word.points.map(function (point) {
      return {
        x: originX + point.x,
        y: originY + point.y,
        batch: point.batch,
        ch: point.ch
      };
    });
    matchTargets(glyphs, targets);

    var ease = "cubic-bezier(.22,.8,.24,1)";
    glyphs.forEach(function (glyph, index) {
      if (glyph._keep) {
        var delay = (index % 9) * 16;
        glyph.style.transition = "transform 860ms " + ease + " " + delay + "ms";
        glyph.style.transform = "translate(" + glyph._tx + "px, " + glyph._ty + "px)";
        glyph._x = glyph._tx;
        glyph._y = glyph._ty;
      } else {
        var dx = glyph._x - originX;
        var dy = glyph._y - originY;
        var len = Math.hypot(dx, dy) || 1;
        glyph.style.transition = "transform 520ms ease, opacity 420ms ease";
        glyph.style.opacity = "0";
        glyph.style.transform = "translate(" + (glyph._x + (dx / len) * 22) + "px, " + (glyph._y + (dy / len) * 22) + "px)";
      }
    });

    await wait(860 + 16 * 8 + 40);
    if (cancelled) return;
    await wait(340);
    if (cancelled) return;

    var kept = glyphs.filter(function (glyph) { return glyph._keep; });
    var batchStart = [0, 460, 920, 1380];
    var longest = 0;
    kept.forEach(function (glyph) {
      var batch = glyph._batch || 0;
      var jitter = (Math.round(glyph._x + glyph._y) % 5) * 32;
      var delay = batchStart[batch] + jitter;
      var duration = batch === 1 || batch === 2 ? 680 : 560;
      if (delay + duration > longest) longest = delay + duration;
      if (batch === 2) {
        glyph._inner.animate([
          { opacity: 1 },
          { opacity: 0.15, offset: 0.3 },
          { opacity: 0.85, offset: 0.5 },
          { opacity: 0 }
        ], { duration: duration, delay: delay, easing: "linear", fill: "forwards" });
      } else if (batch === 1) {
        glyph.animate([
          { transform: "translate(" + glyph._x + "px, " + glyph._y + "px)", opacity: 1 },
          { transform: "translate(" + glyph._x + "px, " + (glyph._y - 14) + "px)", opacity: 0 }
        ], { duration: duration, delay: delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
      } else {
        glyph._inner.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: duration, delay: delay, easing: "ease", fill: "forwards" }
        );
      }
    });

    await wait(Math.max(480, longest - 520));
    if (cancelled) return;
    finish();
  }

  run().catch(function () { finish(); });
  setTimeout(function () {
    if (!root.classList.contains("intro-done")) finish();
  }, 9000);
})();
