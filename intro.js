(function () {
  var root = document.documentElement;
  if (!root.classList.contains("has-intro")) return;
  if (root.dataset.intro === "outline") return;

  var BUBBLE = {
    M: [
      "11111111",
      "11111111",
      "11011011",
      "11011011",
      "11011011",
      "11000011",
      "11000011",
      "11000011"
    ],
    E: [
      "11111111",
      "11111111",
      "11000000",
      "11111110",
      "11111110",
      "11000000",
      "11111111",
      "11111111"
    ],
    C: [
      "01111111",
      "11111111",
      "11000000",
      "11000000",
      "11000000",
      "11000000",
      "11111111",
      "01111111"
    ],
    H: [
      "11000011",
      "11000011",
      "11000011",
      "11111111",
      "11111111",
      "11000011",
      "11000011",
      "11000011"
    ],
    A: [
      "01111110",
      "11111111",
      "11000011",
      "11111111",
      "11111111",
      "11000011",
      "11000011",
      "11000011"
    ],
    N: [
      "11000011",
      "11100011",
      "11110011",
      "11011011",
      "11001111",
      "11000111",
      "11000011",
      "11000011"
    ],
    I: [
      "11111111",
      "11111111",
      "00011000",
      "00011000",
      "00011000",
      "00011000",
      "11111111",
      "11111111"
    ],
    Z: [
      "11111111",
      "11111111",
      "00000110",
      "00001100",
      "00011000",
      "00110000",
      "01100000",
      "11111111"
    ]
  };
  var WORD = "MECHANIZE";
  var CHUNK_COLORS = ["#c4512c", "#1f6f62", "#3c4f86"];

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

  function gearRadius(ang) {
    var frac = (ang / (Math.PI * 2)) * 8;
    frac = frac - Math.floor(frac);
    var d = Math.abs(frac - 0.5);
    if (d < 0.15) return 1;
    if (d > 0.32) return 0.7;
    return 0.7 + (1 - 0.7) * ((0.32 - d) / 0.17);
  }

  function buildGearSamples() {
    var samples = [];
    var step = 0.028;
    var thick = 0.2;
    var hole = 0.34;
    for (var y = -1.02; y <= 1.02; y += step) {
      for (var x = -1.02; x <= 1.02; x += step) {
        var r = Math.hypot(x, y);
        if (r < hole + 0.01 || r > 1.01) continue;
        if (r > gearRadius(Math.atan2(y, x)) + 0.01) continue;
        samples.push({ x: x, y: y, z: thick, nx: 0, ny: 0, nz: 1 });
        samples.push({ x: x, y: y, z: -thick, nx: 0, ny: 0, nz: -1 });
      }
    }
    for (var a = 0; a < Math.PI * 2; a += 0.03) {
      var rad = gearRadius(a);
      var c = Math.cos(a);
      var s = Math.sin(a);
      for (var z = -thick; z <= thick; z += 0.04) {
        samples.push({ x: c * rad, y: s * rad, z: z, nx: c, ny: s, nz: 0 });
        samples.push({ x: c * hole, y: s * hole, z: z, nx: -c, ny: -s, nz: 0 });
      }
    }
    return samples;
  }

  function renderGear(samples, ax, ay, metrics, radius, capture) {
    var cols = Math.ceil(window.innerWidth / metrics.w);
    var rows = Math.ceil(window.innerHeight / metrics.h);
    var zbuf = new Float32Array(cols * rows);
    zbuf.fill(-99);
    var chars = new Array(cols * rows);
    for (var i = 0; i < chars.length; i++) chars[i] = " ";
    var cosS = Math.cos(ax);
    var sinS = Math.sin(ax);
    var cosT = Math.cos(ay);
    var sinT = Math.sin(ay);
    var midX = window.innerWidth / 2;
    var midY = window.innerHeight / 2;
    for (var s = 0; s < samples.length; s++) {
      var p = samples[s];
      var y1 = p.x * sinS + p.y * cosS;
      var z1 = p.z;
      var ny1 = p.nx * sinS + p.ny * cosS;
      var nz1 = p.nz;
      var x2 = p.x * cosS - p.y * sinS;
      var y2 = y1 * cosT - z1 * sinT;
      var z2 = y1 * sinT + z1 * cosT;
      var nz2 = ny1 * sinT + nz1 * cosT;
      if (nz2 <= 0.04) continue;
      var persp = 4 / (4 - z2 * 0.15);
      var px = midX + x2 * persp * radius;
      var py = midY + y2 * persp * radius;
      var sx = Math.floor(px / metrics.w);
      var sy = Math.floor(py / metrics.h);
      if (sx < 0 || sy < 0 || sx >= cols || sy >= rows) continue;
      var idx = sy * cols + sx;
      if (z2 <= zbuf[idx]) continue;
      zbuf[idx] = z2;
      chars[idx] = WORD.charAt((sx + sy * 3) % WORD.length);
    }
    var cells = null;
    if (capture) {
      cells = [];
      for (var n = 0; n < chars.length; n++) {
        if (chars[n] === " ") continue;
        var sx = n % cols;
        var sy = Math.floor(n / cols);
        cells.push({
          x: (sx + 0.5) * metrics.w,
          y: (sy + 0.5) * metrics.h,
          ch: chars[n]
        });
      }
    }
    var lines = new Array(rows);
    for (var row = 0; row < rows; row++) {
      lines[row] = chars.slice(row * cols, row * cols + cols).join("");
    }
    return { text: lines.join("\n"), cells: cells };
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
      for (var row = 0; row < letter.rows.length; row++) {
        var line = letter.rows[row];
        for (var col = 0; col < line.length; col++) {
          if (line.charAt(col) !== "1") continue;
          points.push({
            x: letter.x + (col + 0.5) * charW - width / 2,
            y: (row + 0.5) * charH - height / 2,
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
    var radius = Math.min(window.innerWidth * 0.34, window.innerHeight * 0.36);
    radius = Math.max(118, Math.min(radius, 250));
    var metrics = measure(fontSize);
    var word = buildWord(metrics.w, metrics.h);
    var guard = 0;
    while ((word.width > window.innerWidth * 0.9 || word.height > window.innerHeight * 0.52) && fontSize > 8 && guard < 10) {
      fontSize *= 0.9;
      metrics = measure(fontSize);
      word = buildWord(metrics.w, metrics.h);
      guard++;
    }
    function gearCells(rad, w, h) {
      return (Math.PI * (rad * rad * 0.72 - Math.pow(rad * 0.34, 2))) / (w * h);
    }
    guard = 0;
    while (gearCells(radius, metrics.w, metrics.h) < word.points.length + 24 && fontSize > 8 && guard < 6) {
      fontSize -= 1;
      metrics = measure(fontSize);
      word = buildWord(metrics.w, metrics.h);
      guard++;
    }

    var samples = buildGearSamples();
    var view = document.createElement("pre");
    view.className = "gear-view";
    view.setAttribute("aria-hidden", "true");
    view.style.fontSize = fontSize + "px";
    view.style.lineHeight = metrics.h + "px";
    stage.appendChild(view);

    var spinMs = 1500;
    await new Promise(function (resolve) {
      var start = performance.now();
      function frame(now) {
        if (cancelled) return resolve();
        var elapsed = now - start;
        var t = Math.min(1, elapsed / spinMs);
        var spin = t * Math.PI * 2;
        var tilt = 0.42 + Math.sin(t * Math.PI * 2) * 0.1;
        var drawn = renderGear(samples, spin, tilt, metrics, radius, false);
        view.textContent = drawn.text;
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    if (cancelled) return;

    var last = renderGear(samples, Math.PI * 2, 0.42, metrics, radius, true);
    view.textContent = last.text;
    var cells = last.cells;
    view.remove();

    var originX = window.innerWidth / 2;
    var originY = window.innerHeight / 2;
    var glyphs = cells.map(function (cell) {
      var glyph = makeGlyph(cell.ch, cell.x, cell.y, fontSize);
      glyph._keep = false;
      glyph._inner.style.opacity = "1";
      glyph._inner.style.transform = "translate(-50%, -50%) scale(1)";
      return glyph;
    });
    void stage.offsetWidth;
    await wait(280);
    if (cancelled) return;

    var targets = word.points.map(function (point) {
      return {
        x: originX + point.x,
        y: originY + point.y,
        ch: point.ch
      };
    });
    matchTargets(glyphs, targets);
    void stage.offsetWidth;

    var ease = "cubic-bezier(.2,.75,.2,1)";
    glyphs.forEach(function (glyph) {
      if (glyph._keep) {
        var delay = Math.floor(Math.random() * 160);
        glyph.style.transition = "transform 780ms " + ease + " " + delay + "ms";
        glyph.style.transform = "translate(" + glyph._tx + "px, " + glyph._ty + "px)";
        glyph._x = glyph._tx;
        glyph._y = glyph._ty;
      } else {
        var dx = glyph._x - originX;
        var dy = glyph._y - originY;
        var len = Math.hypot(dx, dy) || 1;
        var kick = 70 + Math.random() * 80;
        glyph.style.transition = "transform 640ms ease, opacity 520ms ease";
        glyph.style.opacity = "0";
        glyph.style.transform = "translate(" + (glyph._x + (dx / len) * kick) + "px, " + (glyph._y + (dy / len) * kick) + "px)";
      }
    });

    await wait(780 + 160 + 40);
    if (cancelled) return;
    await wait(440);
    if (cancelled) return;

    var kept = glyphs.filter(function (glyph) { return glyph._keep; });
    for (var i = kept.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = kept[i];
      kept[i] = kept[j];
      kept[j] = swap;
    }
    var chunkSize = Math.ceil(kept.length / 3) || 1;
    kept.forEach(function (glyph, index) {
      glyph._chunk = Math.min(2, Math.floor(index / chunkSize));
    });

    var chunkStart = [0, 700, 1400];
    var longest = 0;
    kept.forEach(function (glyph) {
      var color = CHUNK_COLORS[glyph._chunk];
      var delay = chunkStart[glyph._chunk] + Math.floor(Math.random() * 500);
      var duration = 260;
      if (delay + duration > longest) longest = delay + duration;
      glyph._inner.animate([
        { color: "#1c1c1c", opacity: 1, offset: 0 },
        { color: color, opacity: 1, offset: 0.28 },
        { color: color, opacity: 1, offset: 0.5 },
        { color: color, opacity: 0, offset: 1 }
      ], { duration: duration, delay: delay, easing: "ease-out", fill: "forwards" });
    });

    await wait(Math.max(520, longest - 240));
    if (cancelled) return;
    finish();
  }

  run().catch(function () { finish(); });
  setTimeout(function () {
    if (!root.classList.contains("intro-done")) finish();
  }, 12000);
})();
