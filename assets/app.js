/* The Blind Rhino — Rhino Mines microsite
 * Plain JS, no dependencies. Screens: intro -> game -> form -> coupon.
 */
(function () {
  'use strict';

  // ---------- CONFIG ----------
  var CONFIG = {
    // Number of X "mines" on the 5x5 board (3–8). Override with ?x=6 in the URL.
    mineCount: 5,
    // $ off per rhino found, capped at maxReward.
    maxReward: 10,
    // Minimum reward when a guest hits an X before finding a rhino (everyone wins).
    minReward: 1,
    // Days until the coupon expires.
    couponDays: 30,
    // Optional: POST each form submission as JSON to this URL
    // (e.g. a GoHighLevel inbound webhook). Leave '' to disable.
    webhookUrl: ''
  };

  var RH = 'assets/rhino.svg';
  var WM = 'assets/wordmark.svg';
  var DECO = 'assets/rhino-deco.svg';
  var N = 25;

  var qs = new URLSearchParams(location.search);
  var qx = parseInt(qs.get('x'), 10);
  if (qx >= 3 && qx <= 8) CONFIG.mineCount = qx;

  var app = document.getElementById('app');
  var timers = [];
  var S = {};

  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; if (S.iv) clearInterval(S.iv); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  var ARROW = function (color) {
    return '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="' + color + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
  var X_SVG = function (fill, cls, style) {
    return '<svg class="' + (cls || '') + '" ' + (style ? 'style="' + style + '" ' : '') + 'viewBox="0 0 40 40" aria-hidden="true"><rect x="16" y="1" width="8" height="38" rx="4" fill="' + fill + '" transform="rotate(45 20 20)"/><rect x="16" y="1" width="8" height="38" rx="4" fill="' + fill + '" transform="rotate(-45 20 20)"/></svg>';
  };
  var FOOTER = '<div class="footer"><span class="line"></span>POWERED BY AMPLYFY<span class="line"></span></div>';
  var PLAQUE = '<div class="plaque"><div class="shine" aria-hidden="true"></div><img class="wm-img" src="' + WM + '" alt="The Blind Rhino" width="4469" height="1365"></div>';
  var MINI_WM = '<img class="mini-wm" src="' + WM + '" alt="The Blind Rhino" width="4469" height="1365">';

  // ---------- STATE ----------
  function freshBoard() {
    var idx = [];
    for (var i = 0; i < N; i++) idx.push(i);
    for (var j = N - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = idx[j]; idx[j] = idx[k]; idx[k] = t; }
    S.mines = idx.slice(0, CONFIG.mineCount);
    S.revealed = new Array(N).fill(false);
    S.found = 0; S.over = null; S.lastIdx = -1; S.busy = false;
  }
  function isMine(i) { return S.mines.indexOf(i) !== -1; }
  function reward() {
    var f = Math.min(S.found, CONFIG.maxReward);
    if (S.over === 'mine') return Math.max(f, CONFIG.minReward);
    return f;
  }
  function makeCode() {
    var ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    var buf = new Uint32Array(4);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf); else for (var i = 0; i < 4; i++) buf[i] = Math.random() * 1e9;
    for (var j = 0; j < 4; j++) s += ch[buf[j] % ch.length];
    return 'RHINO-' + s;
  }

  function go(screen, renderer, outSel, delay) {
    var cur = outSel ? $(outSel) : null;
    if (cur) cur.classList.add(outSel === '.intro' ? 'leave' : 'out');
    later(function () {
      clearTimers();
      S.screen = screen;
      renderer();
      window.scrollTo(0, 0);
    }, delay || 420);
  }

  // ---------- INTRO ----------
  function renderIntro() {
    var tiles = '', r, c, i;
    for (r = 0; r < 7; r++) for (c = 0; c < 4; c++) tiles += '<div class="bgtile" style="animation-delay:' + (r * 85 + c * 55) + 'ms">?</div>';
    var rays = '';
    for (i = 0; i < 12; i++) rays += '<div class="burst-arm" style="transform:rotate(' + (i * 30) + 'deg)"><div class="burst-ray"></div></div>';
    for (i = 0; i < 18; i++) rays += '<div class="burst-arm" style="transform:rotate(' + (i * 20 + 7) + 'deg)"><div class="' + (i % 2 ? 'spark b' : 'spark') + '" style="background:' + (i % 3 === 0 ? '#fff4d2' : '#ffc531') + ';animation-delay:' + (1.25 + (i % 3) * 0.05) + 's"></div></div>';

    app.innerHTML =
      '<section class="intro" aria-label="The Blind Rhino — Let\'s play">' +
        '<div class="bgtiles" aria-hidden="true">' + tiles + '</div>' +
        '<div class="beam l" aria-hidden="true"></div><div class="beam r" aria-hidden="true"></div>' +
        '<div class="vignette" aria-hidden="true"></div><div class="spin-rays" aria-hidden="true"></div><div class="flash" aria-hidden="true"></div>' +
        '<div class="stage">' +
          '<div class="logo">' +
            '<div class="burst" aria-hidden="true">' + rays + '</div>' +
            '<div class="rhino-wrap">' +
              '<span class="tick l1" aria-hidden="true"></span><span class="tick l2" aria-hidden="true"></span><span class="tick l3" aria-hidden="true"></span>' +
              '<span class="tick r1" aria-hidden="true"></span><span class="tick r2" aria-hidden="true"></span><span class="tick r3" aria-hidden="true"></span>' +
              '<img class="rhino-svg" src="' + RH + '" alt="" width="1028" height="563">' +
            '</div>' + PLAQUE +
          '</div>' +
          '<button class="play-btn" type="button" id="playBtn"><span class="btn-shine" aria-hidden="true"></span><span>LET’S PLAY</span>' + ARROW('#141c33') + '</button>' +
          '<p class="tap">Win up to $' + CONFIG.maxReward + ' off your next meal</p>' +
        '</div>' +
      '</section>';

    $('#playBtn').addEventListener('click', function () {
      if (S.leaving) return;
      S.leaving = true; vibrate(15);
      go('game', function () { S.leaving = false; freshBoard(); renderGame(); }, '.intro', 520);
    });
  }

  // ---------- GAME ----------
  function hiddenTile(i) {
    var row = Math.floor(i / 5), col = i % 5;
    return '<button type="button" class="tile hidden deal" data-i="' + i + '" style="animation-delay:' + ((row + col) * 55 + 120) + 'ms" aria-label="Reveal tile ' + (i + 1) + '">?</button>';
  }
  function rhinoTile(i, hot) {
    var extra = hot
      ? '<span class="ring" aria-hidden="true"></span>' +
        '<svg class="hi-ticks" viewBox="0 0 30 24" aria-hidden="true"><rect x="2" y="12" width="9" height="4" rx="2" fill="#ffc531" transform="rotate(30 6 14)"/><rect x="10" y="3" width="9" height="4" rx="2" fill="#ffc531" transform="rotate(65 14 5)"/><rect x="19" y="2" width="9" height="4" rx="2" fill="#ffc531" transform="rotate(100 23 4)"/></svg>' +
        '<span class="plus">+$1 · ×' + Math.min(S.found, CONFIG.maxReward) + '</span>'
      : '';
    return '<div class="tile rhino' + (hot ? ' hot' : '') + '" data-i="' + i + '" role="img" aria-label="Rhino found">' + extra + '<img class="rsvg" src="' + RH + '" alt="" width="1028" height="563"></div>';
  }
  function mineTile(i) {
    return '<div class="tile mine" data-i="' + i + '" role="img" aria-label="X — mine"><span class="ring" aria-hidden="true"></span>' + X_SVG('#ffc531', 'xsvg') + '</div>';
  }
  function softMineTile(i, delay) {
    return '<div class="tile mine-soft" data-i="' + i + '" style="animation-delay:' + delay + 'ms" role="img" aria-label="X — mine">' + X_SVG('#d9a63c', 'xsvg', 'filter:none;opacity:.75') + '</div>';
  }

  function renderGame() {
    var tiles = '', pips = '', i;
    for (i = 0; i < N; i++) tiles += hiddenTile(i);
    for (i = 1; i <= CONFIG.maxReward; i++) pips += '<div class="pip" data-p="' + i + '">$' + i + '</div>';

    app.innerHTML =
      '<section class="screen" id="gameScreen" aria-label="Rhino Mines game">' +
        '<img class="deco" src="' + DECO + '" alt="" style="left:-40px;top:18px;width:190px;opacity:.55">' +
        X_SVG('#4a5f9a', 'deco', 'right:10px;top:36px;width:90px') +
        '<img class="deco" src="' + DECO + '" alt="" style="right:-50px;bottom:30px;width:170px;opacity:.5;transform:scaleX(-1)">' +
        X_SVG('#4a5f9a', 'deco', 'left:20px;bottom:60px;width:70px') +
        '<div class="col">' + MINI_WM +
          '<h1 class="title">RHINO MINES</h1>' +
          '<p class="ital tagline">Find the rhinos. Dodge the Xs.</p>' +
          '<div class="pill" id="pill" role="status" aria-live="polite">' +
            '<img src="' + RH + '" alt="" width="50" height="27" style="display:block">' +
            '<span class="div" aria-hidden="true"></span>' +
            '<span class="count" id="count">0 RHINOS FOUND</span>' +
            '<span class="chip" id="chip">$0 OFF</span>' +
          '</div>' +
          '<div class="board" id="board"><div class="grid" id="grid">' + tiles + '</div></div>' +
          '<div class="ladder" aria-label="Reward ladder">' +
            '<div class="ladder-label"><span id="mult">MULTIPLIER ×0</span><span>MAX $' + CONFIG.maxReward + ' OFF</span></div>' +
            '<div class="pips" id="pips">' + pips + '</div>' +
          '</div>' +
          '<div class="legend">' +
            '<span class="it"><img src="' + RH + '" alt="" width="48" height="26" style="display:block">FIND</span>' +
            '<span style="width:2px;height:28px;background:#c99a3c;border-radius:2px" aria-hidden="true"></span>' +
            '<span class="it">' + X_SVG('#d9a63c', '', 'width:26px;height:26px') + 'AVOID</span>' +
          '</div>' +
          '<button type="button" class="claim idle" id="claim" aria-disabled="true"><span id="claimLabel">PICK A TILE TO START</span><span id="claimArrow" hidden>' + ARROW('#141c33') + '</span></button>' +
          '<p class="ital caption" id="caption">Every rhino adds $1 off. Up to $' + CONFIG.maxReward + '.</p>' +
          FOOTER +
        '</div>' +
      '</section>';

    $('#grid').addEventListener('click', function (e) {
      var btn = e.target.closest('button.tile.hidden');
      if (btn) pick(parseInt(btn.getAttribute('data-i'), 10));
    });
    $('#claim').addEventListener('click', claim);
  }

  function replaceTile(i, html) {
    var el = $('#grid [data-i="' + i + '"]');
    if (!el) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    el.replaceWith(tmp.firstChild);
  }

  function updateHud() {
    var f = Math.min(S.found, CONFIG.maxReward), r = reward();
    $('#count').textContent = f + (f === 1 ? ' RHINO FOUND' : ' RHINOS FOUND');
    $('#chip').textContent = '$' + r + ' OFF';
    $('#mult').textContent = 'MULTIPLIER ×' + f;
    $$('#pips .pip').forEach(function (p) { p.classList.toggle('on', parseInt(p.getAttribute('data-p'), 10) <= f); });
    var pill = $('#pill');
    pill.classList.remove('bumpA'); void pill.offsetWidth; pill.classList.add('bumpA');

    var can = S.found > 0 || !!S.over;
    var claimBtn = $('#claim');
    claimBtn.className = !can ? 'claim idle' : (S.over ? 'claim hotbtn' : 'claim');
    claimBtn.setAttribute('aria-disabled', can ? 'false' : 'true');
    $('#claimLabel').textContent = can ? 'CLAIM REWARD' : 'PICK A TILE TO START';
    $('#claimArrow').hidden = !can;

    var cap = 'Every rhino adds $1 off. Up to $' + CONFIG.maxReward + '.';
    if (S.over === 'mine') cap = 'Everyone wins. Your reward is locked in.';
    else if (S.over === 'max') cap = 'Jackpot! You maxed it out.';
    else if (S.found > 0) cap = 'Keep going or claim your reward.';
    $('#caption').textContent = cap;
  }

  function lockBoard() {
    $$('#grid button.tile.hidden').forEach(function (b) { b.classList.add('off'); b.disabled = true; });
  }
  function revealRest(startDelay) {
    var k = 0;
    S.mines.forEach(function (m) { if (!S.revealed[m]) replaceTile(m, softMineTile(m, (k++) * 110)); });
  }
  function showBanner(title, text) {
    var b = document.createElement('div');
    b.className = 'banner'; b.setAttribute('role', 'alert');
    b.innerHTML = '<h2>' + esc(title) + '</h2><p>' + esc(text) + '</p>';
    $('#board').appendChild(b);
  }

  function pick(i) {
    if (S.over || S.revealed[i]) return;
    S.revealed[i] = true;
    if (isMine(i)) {
      S.over = 'mine';
      replaceTile(i, mineTile(i));
      clearHot();
      lockBoard();
      var board = $('#board');
      board.classList.remove('quake'); void board.offsetWidth; board.classList.add('quake');
      vibrate([40, 30, 80]);
      updateHud();
      later(function () { revealRest(); }, 550);
      later(function () { showBanner('BOOM! YOU HIT AN X', 'No worries, everyone wins. You keep $' + reward() + ' off your next meal.'); }, 1250);
      return;
    }
    S.found += 1;
    clearHot();
    S.lastIdx = i;
    replaceTile(i, rhinoTile(i, true));
    vibrate(12);
    if (S.found >= CONFIG.maxReward) {
      S.over = 'max';
      lockBoard();
      updateHud();
      later(function () { revealRest(); }, 600);
      later(function () { showBanner('JACKPOT!', '$' + CONFIG.maxReward + ' off your next meal. That’s the max reward.'); vibrate([30, 40, 30, 40, 60]); }, 1200);
      return;
    }
    updateHud();
  }
  function clearHot() {
    if (S.lastIdx < 0) return;
    var prev = $('#grid [data-i="' + S.lastIdx + '"]');
    if (prev) { prev.classList.remove('hot'); $$('.ring,.plus,.hi-ticks', prev).forEach(function (n) { n.remove(); }); prev.style.animation = 'none'; }
    S.lastIdx = -1;
  }

  function claim() {
    if (S.leaving || !(S.found > 0 || S.over)) return;
    S.leaving = true; vibrate(15);
    S.won = reward();
    go('form', function () { S.leaving = false; renderForm(); }, '#gameScreen', 420);
  }

  // ---------- FORM ----------
  var IPAS = ['Two Roads Road 2 Ruin', 'Stony Creek Cranky', 'Lagunitas IPA', 'Sierra Nevada Torpedo', 'Dogfish Head 60 Minute', 'Lord Hobo Boom Sauce', 'Founders All Day IPA', 'Voodoo Ranger Juicy Haze'];

  function field(id, label, control) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' + control + '<span class="err" id="' + id + '-err" hidden></span></div>';
  }
  function renderForm() {
    var opts = '<option value="">Pick an IPA…</option>' + IPAS.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('') + '<option value="Surprise me">Surprise me — something new</option>';
    app.innerHTML =
      '<section class="screen" id="formScreen" aria-label="Unlock your coupon">' +
        '<div class="col">' + MINI_WM +
          '<h1 class="slab won">YOU WON $' + S.won + ' OFF!</h1>' +
          '<p class="sub">One last step. Tell us a little about you and your coupon unlocks instantly.</p>' +
          '<form class="card" id="leadForm" novalidate>' +
            field('br-name', 'Your name', '<input id="br-name" name="name" class="inp" type="text" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" placeholder="First name" maxlength="60">') +
            field('br-ipa', 'What would you like to see on draft?', '<select id="br-ipa" name="ipa" class="inp">' + opts + '</select>') +
            field('br-sports', 'What sports would you like to see more of here?', '<input id="br-sports" name="sports" class="inp" type="text" enterkeyhint="next" placeholder="e.g. Premier League, UFC, college hockey" maxlength="140">') +
            field('br-phone', 'Phone number', '<input id="br-phone" name="phone" class="inp" type="tel" inputmode="tel" autocomplete="tel-national" enterkeyhint="done" placeholder="(203) 555-0123" maxlength="14">') +
            '<label class="consent" for="br-consent"><input id="br-consent" name="consent" type="checkbox"><span>Text me my coupon and occasional Blind Rhino deals. Msg &amp; data rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help.</span></label>' +
            '<span class="err" id="br-consent-err" hidden></span>' +
            '<p class="err" id="summary" role="alert" style="margin:0;text-align:center" hidden></p>' +
            '<button type="submit" class="unlock" id="unlockBtn">UNLOCK MY COUPON ' + ARROW('#ffc531').replace('width="28" height="28"', 'width="24" height="24"') + '</button>' +
          '</form>' + FOOTER +
        '</div>' +
      '</section>';

    var phone = $('#br-phone');
    phone.addEventListener('input', function () {
      var d = phone.value.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
      var out = d.length < 4 ? d : d.length < 7 ? '(' + d.slice(0, 3) + ') ' + d.slice(3) : '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
      phone.value = out;
    });
    $$('#leadForm input, #leadForm select').forEach(function (el) {
      el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', function () { setErr(el.id, ''); });
    });
    $('#leadForm').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
  }

  function setErr(id, msg) {
    var el = $('#' + id), er = $('#' + id + '-err');
    if (er) { er.textContent = msg; er.hidden = !msg; }
    if (el && el.classList.contains('inp')) el.classList.toggle('bad', !!msg);
    var any = $$('#leadForm .err[id$="-err"]').filter(function (n) { return !n.hidden; }).length;
    var sum = $('#summary');
    if (sum) { sum.hidden = !any; sum.textContent = any === 1 ? 'Almost there. Fix the highlighted field above.' : 'Almost there. Fix the ' + any + ' highlighted fields above.'; }
  }

  function submit() {
    if (S.leaving) return;
    var data = {
      name: $('#br-name').value.trim(),
      ipa: $('#br-ipa').value,
      sports: $('#br-sports').value.trim(),
      phone: $('#br-phone').value,
      consent: $('#br-consent').checked
    };
    var errs = {};
    if (!data.name) errs['br-name'] = 'Tell us your name.';
    if (!data.ipa) errs['br-ipa'] = 'Pick an IPA (or “Surprise me”).';
    if (!data.sports) errs['br-sports'] = 'Tell us at least one sport.';
    if (data.phone.replace(/\D/g, '').length !== 10) errs['br-phone'] = 'Enter a 10-digit phone number.';
    if (!data.consent) errs['br-consent'] = 'Check the box so we can text you your coupon.';
    ['br-name', 'br-ipa', 'br-sports', 'br-phone', 'br-consent'].forEach(function (id) { setErr(id, errs[id] || ''); });
    var first = Object.keys(errs)[0];
    if (first) {
      var el = $('#' + first);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus({ preventScroll: true }); }
      vibrate([20, 40, 20]);
      return;
    }
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    S.name = data.name;
    S.code = makeCode();
    var d = new Date(); d.setDate(d.getDate() + CONFIG.couponDays);
    S.expires = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    sendLead(data);
    S.leaving = true; vibrate([20, 30, 40]);
    go('coupon', function () { S.leaving = false; renderCoupon(); }, '#formScreen', 420);
  }

  function sendLead(data) {
    var payload = {
      name: data.name, phone: data.phone.replace(/\D/g, ''), favorite_ipa: data.ipa, sports_request: data.sports,
      sms_consent: data.consent, reward_dollars: S.won, coupon_code: S.code, coupon_expires: S.expires,
      source: 'Rhino Mines microsite', submitted_at: new Date().toISOString()
    };
    try { localStorage.setItem('rhinoMinesCoupon', JSON.stringify({ code: S.code, won: S.won, name: S.name, expires: S.expires })); } catch (e) {}
    if (!CONFIG.webhookUrl) return;
    try {
      fetch(CONFIG.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(function () {});
    } catch (e) {}
  }

  // ---------- COUPON ----------
  function renderCoupon() {
    var colors = ['#ffc531', '#f5ead3', '#e9a91f', '#ffffff', '#ffd76b'], conf = '';
    for (var i = 0; i < 26; i++) conf += '<span class="' + (i % 3 === 0 ? 'cf c2' : 'cf') + '" style="left:' + ((i * 37 + 11) % 100) + '%;background:' + colors[i % colors.length] + ';animation-delay:' + ((i * 0.31) % 3.2).toFixed(2) + 's;animation-duration:' + (3.2 + (i % 4) * 0.7).toFixed(1) + 's"></span>';
    app.innerHTML =
      '<section class="screen" aria-label="Your Blind Rhino coupon">' +
        '<div class="spin-rays" style="top:22%;animation-delay:0s,0s" aria-hidden="true"></div>' +
        '<div class="confetti" aria-hidden="true">' + conf + '</div>' +
        '<div class="col">' +
          '<div class="c-logo"><div class="rhino-wrap"><img class="rhino-svg" src="' + RH + '" alt="" width="1028" height="563"></div>' + PLAQUE + '</div>' +
          '<div class="ticket">' +
            '<div class="t-top">YOUR REWARD</div>' +
            '<div class="stamp" aria-hidden="true">WINNER</div>' +
            '<div class="t-amt"><span class="big" id="amt">$0</span><span class="off">OFF</span></div>' +
            '<div class="ital t-meal">your next meal</div>' +
            '<div class="t-cut"><span class="notch l" aria-hidden="true"></span><span class="notch r" aria-hidden="true"></span></div>' +
            '<div class="t-rows">' +
              '<div class="t-row"><span class="k">GUEST</span><span class="v">' + esc(S.name || 'Rhino Fan') + '</span></div>' +
              '<div class="t-row"><span class="k">CODE</span><span class="code">' + esc(S.code) + '</span></div>' +
              '<div class="t-row"><span class="k">EXPIRES</span><span class="v">' + esc(S.expires) + '</span></div>' +
            '</div>' +
            '<div class="fine">Valid at South Norwalk, Black Rock &amp; Milford. One per guest, dine-in only. Can’t be combined with other offers. No cash value.</div>' +
          '</div>' +
          '<div class="server">SHOW THIS TO YOUR SERVER</div>' +
          '<p class="sub" style="margin-top:12px">Screenshot this screen to save your coupon.</p>' +
          FOOTER +
        '</div>' +
      '</section>';

    var target = S.won, n = 0, amt = $('#amt');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { amt.textContent = '$' + target; return; }
    later(function () {
      S.iv = setInterval(function () {
        n += 1; amt.textContent = '$' + Math.min(n, target);
        if (n >= target) clearInterval(S.iv);
      }, Math.max(60, Math.round(700 / Math.max(target, 1))));
    }, 900);
  }

  // ---------- BOOT ----------
  // ?screen=game|form|coupon jumps straight to a step (handy for testing).
  var start = qs.get('screen');
  S.won = 4; S.name = 'Rhino Fan'; S.code = makeCode();
  var d0 = new Date(); d0.setDate(d0.getDate() + CONFIG.couponDays);
  S.expires = d0.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (start === 'game') { freshBoard(); renderGame(); }
  else if (start === 'form') renderForm();
  else if (start === 'coupon') renderCoupon();
  else renderIntro();
})();
