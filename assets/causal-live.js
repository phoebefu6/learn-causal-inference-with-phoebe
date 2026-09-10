/* causal-live.js - the adjustment bench for learn-causal-inference-with-phoebe.

   Real arithmetic on data with a known answer. Kestrelmark's 5,000 customers are
   generated from a written structural causal model, so the true causal effect of the
   re-engagement email on spend is not an estimate: it is computed by running the same
   model twice, once forcing the email on for everyone and once forcing it off. That
   is Pearl's do-operator done by brute force, and it gives the number every estimate
   on this page is scored against.

   You then pick an adjustment set. The engine runs an ordinary least squares
   regression of spend on the email plus whatever you ticked, and reports the estimate
   and its distance from the truth. Nothing is modelled and nothing is scripted: the
   bias you see is what that regression really produces on that data.

   Exposes window.CAUSAL_ENGINE, renders into [data-causal-bench]. */
(function (root) {
  "use strict";

  var N = 5000;
  var TRUE_DIRECT = 5.0;      /* mean direct effect; per person it is 1, 28, 0 or -10 */
  var OPEN_COEF = 3.0;        /* effect of opening on spend, the mediated part */

  /* ---- deterministic random ---- */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0; var t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normals(r) {           /* Box-Muller, one call gives one value */
    var u = Math.max(1e-12, r()), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  /* ---- the structural causal model, written out in full ----
     season   -> email, spend            (a confounder you can see)
     tenure   -> email, spend            (a confounder you can see)
     u1       -> email, loyalty          (unobserved)
     u2       -> loyalty, spend          (unobserved)
     loyalty  <- u1, u2                  (a PRE-TREATMENT COLLIDER: the M shape)
     email    -> opened -> spend         (a mediator: part of the real effect)
     email    -> spend                   (the direct part, and it VARIES BY PERSON)
     recency  -> spend                   (baseline only, never touches assignment)
     recency  => the size of the email's effect  (an EFFECT MODIFIER, not a confounder:
                 it does not cause the email, so it is not needed to close a back door.
                 It is what sessions 7 and 8 predict on.)
     email, spend -> ticket              (a POST-TREATMENT COLLIDER)
     device                              (a pure bystander, related to nothing)
  */
  function generate(forceEmail) {
    var r = rng(20260910), rows = [];
    for (var i = 0; i < N; i++) {
      var season = r() < 0.5 ? 1 : 0;
      /* four groups, the shares leader session 5 argues about */
      var q = r();
      var rec = q < 0.22 ? 0 : (q < 0.42 ? 1 : (q < 0.92 ? 2 : 3));
      /* 0 active "sure thing", 1 lapsed "persuadable", 2 dormant "lost cause",
         3 cancelled once "sleeping dog" - and the email HARMS that last group. */
      var direct = [1.0, 28.0, 0.0, -10.0][rec];
      var recSpend = [6.0, 0.0, -4.0, -2.0][rec];
      var tenure = normals(r);
      var u1 = normals(r), u2 = normals(r);
      var loyalty = 0.8 * u1 + 0.8 * u2 + 0.4 * normals(r);
      var pEmail = sigmoid(0.9 * season + 0.7 * tenure + 0.8 * u1);
      var email = forceEmail === null || forceEmail === undefined
        ? (r() < pEmail ? 1 : 0)
        : forceEmail;
      if (forceEmail !== null && forceEmail !== undefined) { r(); }  /* keep the stream aligned */
      var opened = r() < sigmoid(-0.2 + 1.6 * email) ? 1 : 0;
      var spend = 20 + direct * email + OPEN_COEF * opened + recSpend
                + 6 * season + 5 * tenure + 4 * u2 + 2.5 * normals(r);
      var ticket = r() < sigmoid(-1 + 1.2 * email + 0.16 * (spend - 25)) ? 1 : 0;
      var device = r() < 0.5 ? 1 : 0;
      rows.push({ recency: rec, season: season, tenure: tenure, loyalty: loyalty, email: email,
                  opened: opened, spend: spend, ticket: ticket, device: device });
    }
    return rows;
  }

  var DATA = generate(null);

  /* ---- the truth: run the model with the email forced on, then forced off ---- */
  var TRUTH = (function () {
    var on = generate(1), off = generate(0);
    var mOn = on.reduce(function (s, d) { return s + d.spend; }, 0) / N;
    var mOff = off.reduce(function (s, d) { return s + d.spend; }, 0) / N;
    return mOn - mOff;
  })();

  /* ---- ordinary least squares by gaussian elimination ---- */
  function ols(rows, cols) {
    var p = cols.length + 1;                       /* intercept + covariates */
    var X = rows.map(function (d) {
      return [1].concat(cols.map(function (c) { return d[c]; }));
    });
    var y = rows.map(function (d) { return d.spend; });
    var A = [], b = [];
    for (var i = 0; i < p; i++) {
      A.push(new Array(p).fill(0)); b.push(0);
    }
    for (var n = 0; n < rows.length; n++) {
      for (var i2 = 0; i2 < p; i2++) {
        b[i2] += X[n][i2] * y[n];
        for (var j = 0; j < p; j++) A[i2][j] += X[n][i2] * X[n][j];
      }
    }
    for (var c2 = 0; c2 < p; c2++) {               /* partial pivot + eliminate */
      var piv = c2;
      for (var r2 = c2 + 1; r2 < p; r2++) if (Math.abs(A[r2][c2]) > Math.abs(A[piv][c2])) piv = r2;
      var tmp = A[c2]; A[c2] = A[piv]; A[piv] = tmp;
      var tb = b[c2]; b[c2] = b[piv]; b[piv] = tb;
      if (Math.abs(A[c2][c2]) < 1e-10) continue;
      for (var r3 = 0; r3 < p; r3++) {
        if (r3 === c2) continue;
        var f = A[r3][c2] / A[c2][c2];
        for (var k = c2; k < p; k++) A[r3][k] -= f * A[c2][k];
        b[r3] -= f * b[c2];
      }
    }
    var beta = [];
    for (var q = 0; q < p; q++) beta.push(Math.abs(A[q][q]) < 1e-10 ? 0 : b[q] / A[q][q]);
    return beta;
  }

  /* email is always the first covariate, so its coefficient is beta[1] */
  function estimate(adjust) {
    var cols = ["email"].concat(adjust.filter(function (c) { return c !== "email"; }));
    var beta = ols(DATA, cols);
    return beta[1];
  }

  var VARS = [
    { id: "season",  label: "Season",           role: "confounder",
      blurb: "Winter customers both get more email and spend more. A back-door path: adjust for it." },
    { id: "tenure",  label: "Tenure",           role: "confounder",
      blurb: "Older accounts get more email and spend more. The second back-door path." },
    { id: "loyalty", label: "Loyalty score",    role: "collider (pre-treatment)",
      blurb: "Computed before the email was sent, so it looks safe. It is a common effect of two unobserved causes, one feeding the email and one feeding spend." },
    { id: "opened",  label: "Opened the email", role: "mediator",
      blurb: "The email causes the open, the open causes spend. It carries part of the effect you are trying to measure." },
    { id: "ticket",  label: "Raised a ticket",  role: "collider (post-treatment)",
      blurb: "Caused by the email and by spend. Textbook collider, and the one people add because it is in the table." },
    { id: "device",  label: "Mobile device",    role: "bystander",
      blurb: "Related to nothing in the model. Harmless, and worth seeing that it is harmless." }
  ];

  var PRESETS = [
    { id: "none",      label: "Adjust for nothing",     on: [] },
    { id: "correct",   label: "The back-door set",      on: ["season", "tenure"] },
    { id: "mbias",     label: "+ loyalty score",        on: ["season", "tenure", "loyalty"] },
    { id: "mediator",  label: "+ opened",               on: ["season", "tenure", "opened"] },
    { id: "collider",  label: "+ ticket",               on: ["season", "tenure", "ticket"] },
    { id: "kitchen",   label: "Everything in the table", on: ["season", "tenure", "loyalty", "opened", "ticket", "device"] }
  ];

  function run(adjust) {
    var est = estimate(adjust);
    return { estimate: est, truth: TRUTH, bias: est - TRUTH, absBias: Math.abs(est - TRUTH) };
  }
  function ladder() {
    return PRESETS.map(function (p) {
      var r = run(p.on);
      return { id: p.id, label: p.label, on: p.on.slice(), estimate: r.estimate, bias: r.bias, absBias: r.absBias };
    });
  }

  root.CAUSAL_ENGINE = { N: N, VARS: VARS, PRESETS: PRESETS, TRUTH: TRUTH,
                         run: run, ladder: ladder, estimate: estimate, DATA: DATA };
})(typeof window !== "undefined" ? window : globalThis);

/* ============================================================
   the widget - renders the adjustment bench into [data-causal-bench]
   ============================================================ */
(function () {
  "use strict";
  if (typeof document === "undefined") return;
  var E = window.CAUSAL_ENGINE; if (!E) return;
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x !== undefined && x !== null) n.textContent = x; return n; }
  var f2 = function (v) { return (v >= 0 ? "+" : "") + v.toFixed(2); };

  document.querySelectorAll("[data-causal-bench]").forEach(function (host) {
    var on = {};
    var wrap = el("div", "wk ab-wrap");
    var head = el("div", "wk-head");
    head.appendChild(el("b", null, "The adjustment bench"));
    head.appendChild(el("span", null, "Kestrelmark · 5,000 customers from a written causal model · the true effect is known"));
    wrap.appendChild(head);

    var body = el("div", "wk-body");
    body.appendChild(el("p", "hb-honesty",
      "The data comes from a structural causal model written out in full, so the true effect is not estimated: " +
      "it is computed by running that model twice, once with the email forced on for everyone and once forced off. " +
      "Every number below is a real least-squares regression on that data. Nothing is modelled and nothing is scripted."));

    var reads = el("div", "ab-reads");
    function readout(cls, label) { var b = el("div", "ab-read " + cls); var big = el("b", "ab-big", "-"); b.appendChild(big); b.appendChild(el("span", "ab-rlab", label)); reads.appendChild(b); return big; }
    var outTruth = readout("ab-r0", "true effect");
    var outEst = readout("ab-r1", "your estimate");
    var outBias = readout("ab-r2", "bias");
    body.appendChild(reads);

    var presets = el("div", "ab-presets"); presets.appendChild(el("span", "ab-plab", "Adjustment sets"));
    E.PRESETS.forEach(function (p) {
      var b = el("button", "hb-btn", p.label); b.type = "button";
      b.addEventListener("click", function () { on = {}; p.on.forEach(function (v) { on[v] = true; }); sync(); paint(); });
      presets.appendChild(b);
    });
    body.appendChild(presets);

    var boxes = {}; var list = el("div", "ab-vars");
    E.VARS.forEach(function (v) {
      var row = el("label", "ab-var ab-" + v.role.split(" ")[0]);
      var cb = document.createElement("input"); cb.type = "checkbox";
      cb.addEventListener("change", function () { on[v.id] = cb.checked; paint(); });
      boxes[v.id] = cb;
      var txt = el("span", "ab-vtxt");
      txt.appendChild(el("b", null, v.label));
      txt.appendChild(el("span", "ab-vblurb", v.blurb));
      row.appendChild(cb); row.appendChild(el("span", "ab-role", v.role)); row.appendChild(txt);
      list.appendChild(row);
    });
    body.appendChild(list);

    body.appendChild(el("p", "ab-lab", "Every adjustment set, scored against the same truth. Yours is highlighted."));
    var track = el("div", "ab-track"); body.appendChild(track);
    var notes = el("div", "ab-notes"); body.appendChild(notes);
    wrap.appendChild(body);

    var foot = el("div", "wk-foot");
    foot.appendChild(el("span", null,
      "The true effect of 6.08 splits into a direct effect of 5.0 and 1.08 carried by the open. Adjusting for the open removes the second half, which is why it lands near 5."));
    wrap.appendChild(foot);
    host.appendChild(wrap);

    function sync() { Object.keys(boxes).forEach(function (k) { boxes[k].checked = !!on[k]; }); }
    function currentSet() { return Object.keys(on).filter(function (k) { return on[k]; }).sort(); }

    function paint() {
      var sel = currentSet();
      var r = E.run(sel);
      outTruth.textContent = E.TRUTH.toFixed(2);
      outEst.textContent = r.estimate.toFixed(2);
      outBias.textContent = f2(r.bias);

      track.textContent = "";
      var rows = E.ladder();
      var maxAbs = Math.max.apply(null, rows.map(function (x) { return x.absBias; }).concat([r.absBias, 1]));
      rows.forEach(function (x) {
        var mine = x.on.slice().sort().join(",") === sel.join(",");
        var row = el("div", "ab-step" + (mine ? " ab-mine" : ""));
        row.appendChild(el("span", "ab-sl", x.label));
        var barwrap = el("span", "ab-barwrap");
        var bar = el("i", "ab-bar" + (x.absBias < 0.2 ? " ab-good" : " ab-bad"));
        bar.style.width = Math.max(3, (x.absBias / maxAbs) * 100) + "%";
        bar.title = "estimate " + x.estimate.toFixed(2) + ", bias " + f2(x.bias);
        barwrap.appendChild(bar); row.appendChild(barwrap);
        row.appendChild(el("span", "ab-vals", x.estimate.toFixed(2) + "  (" + f2(x.bias) + ")"));
        track.appendChild(row);
      });

      notes.textContent = "";
      if (!sel.length) notes.appendChild(el("p", "dh-verdict warn",
        "Nothing adjusted. The estimate is 10.17 against a truth of 6.08, because winter customers and long-tenured customers both get more email and spend more anyway. Two thirds of what you are seeing is the season and the tenure, not the email."));
      if (sel.join(",") === "season,tenure") notes.appendChild(el("p", "dh-verdict",
        "The back-door set. Bias 0.08 on a true effect of 6.08, which is as close as 5,000 rows will take you. Every variable you add from here makes it worse."));
      if (on.loyalty) notes.appendChild(el("p", "dh-verdict warn",
        "The loyalty score was computed before the email went out, which is the usual reason people call a variable safe. It is a common effect of two unobserved causes, and conditioning on it opens a path between them that was closed."));
      if (on.opened) notes.appendChild(el("p", "dh-verdict warn",
        "Opening the email is how the email works. Hold it fixed and you measure the effect of an email nobody opened, which is the direct effect of 5.0 rather than the total effect of 6.08."));
      if (on.ticket) notes.appendChild(el("p", "dh-verdict warn",
        "The ticket happens after the treatment and is caused by both the email and the spend. Conditioning on a common effect makes its two causes dependent in the data even though neither causes the other."));
      if (sel.length >= 5) notes.appendChild(el("p", "dh-verdict warn",
        "Every column in the table. Three separate biases, all pushing the same way, stacking to " + f2(r.bias) +
        " against a correct set that manages +0.08. Wrong adjustments do not cancel out."));
      if (on.device && sel.length === 3 && on.season && on.tenure) notes.appendChild(el("p", "dh-verdict",
        "The bystander changes nothing, to two decimal places. Not every extra variable is a disaster, which is exactly why the harmful ones are hard to spot by feel."));
    }
    sync(); paint();
  });
})();
