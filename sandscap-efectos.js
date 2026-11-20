/* Efectos Sandscap (los de Sandscap Dev) — JS sin librerías. Cargar una vez:
   <script src="/sandscap-efectos.js" defer></script>   → queda window.sd
   - Sonidos: data-sd-sonido="nav|tab|card|tema|listo" en botones y enlaces, o sd.sonar('tab').
   - Píldora líquida: data-sd-liquido en el contenedor; la opción activa lleva aria-current="page",
     aria-pressed="true", aria-selected="true" o la clase .activo. Cambia sola al hacer clic.
   - Aparecer al hacer scroll: data-sd-revelar (con style="--i:n" para cascada).
   - Cambiar de pantalla sin ghosting: await sd.cambiar(viejo, nuevo). */
(function () {
  'use strict';
  var menosMov = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  /* ---------- Sonidos (Web Audio, sin archivos): cada clic es un doble «tic» ---------- */
  var ctx = null, ruido = null, salida = null;
  var prendido = (function () { try { return localStorage.getItem('sd:sonido') !== 'no'; } catch (e) { return true; } })();
  function audio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      var n = Math.floor(ctx.sampleRate * 0.03);
      ruido = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = ruido.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      salida = ctx.createGain(); salida.gain.value = 0.7; salida.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tic(ac, t, f, g) {
    var s = ac.createBufferSource(); s.buffer = ruido;
    var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 2.5;
    var gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.0008); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.009);
    s.connect(bp).connect(gn).connect(salida); s.start(t); s.stop(t + 0.02);
    var o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.82, t + 0.012);
    var og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(g * 0.28, t + 0.001); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.016);
    o.connect(og).connect(salida); o.start(t); o.stop(t + 0.03);
  }
  function tono(ac, t, f, g, dur) {
    var o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    var og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(g, t + 0.012); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(og).connect(salida); o.start(t); o.stop(t + dur + 0.02);
  }
  function sonar(tipo) {
    if (!prendido) return;
    var ac = audio(); if (!ac) return;
    var t = ac.currentTime + 0.004;
    switch (tipo) {
      case 'nav': tic(ac, t, 650, 0.55); tic(ac, t + 0.028, 1900, 0.4); break;         /* menú: más grave */
      case 'card': tic(ac, t, 820, 0.42); tic(ac, t + 0.03, 2100, 0.3); break;         /* tarjetas, abrir algo */
      case 'tema': tic(ac, t, 700, 0.5); tic(ac, t + 0.03, 1800, 0.35);
        if (!menosMov()) { tono(ac, t + 0.03, 300, 0.16, 0.3); tono(ac, t + 0.03, 600, 0.06, 0.22); tono(ac, t + 0.035, 900, 0.03, 0.16); } break;
      case 'listo': tic(ac, t, 700, 0.5); tic(ac, t + 0.03, 1800, 0.35); tono(ac, t + 0.07, 660, 0.09, 0.22); tono(ac, t + 0.17, 990, 0.08, 0.34); break; /* pago hecho, publicado */
      default: tic(ac, t, 1100, 0.32); tic(ac, t + 0.026, 2600, 0.24);                 /* 'tab': pestañas, más agudo y suave */
    }
  }
  function sonidos(on) { prendido = !!on; try { localStorage.setItem('sd:sonido', on ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ } }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-sd-sonido]');
    if (el && !el.disabled) sonar(el.getAttribute('data-sd-sonido'));
  }, true);

  /* ---------- Píldora líquida: se estira de la vieja a la nueva (190 ms) y se encoge sobre la nueva (240 ms) ---------- */
  var ACTIVA = '[aria-current="page"],[aria-current="true"],[aria-pressed="true"],[aria-selected="true"],.activo';
  function liquido(cont) {
    if (cont.__sd) return cont.__sd;
    var pil = document.createElement('span'); pil.className = 'sd-liquido'; pil.setAttribute('aria-hidden', 'true');
    cont.insertBefore(pil, cont.firstChild);
    var vertical = cont.getAttribute('data-sd-liquido') === 'y';
    var previa = null, t = 0;
    function caja(el) { return vertical ? { p: el.offsetTop, s: el.offsetHeight, o: el.offsetLeft, w: el.offsetWidth } : { p: el.offsetLeft, s: el.offsetWidth, o: el.offsetTop, w: el.offsetHeight }; }
    function poner(b, ms) {
      pil.style.setProperty('--sd-d', ms + 'ms');
      if (vertical) { pil.style.top = b.p + 'px'; pil.style.height = b.s + 'px'; pil.style.left = b.o + 'px'; pil.style.width = b.w + 'px'; }
      else { pil.style.left = b.p + 'px'; pil.style.width = b.s + 'px'; pil.style.top = b.o + 'px'; pil.style.height = b.w + 'px'; }
    }
    function mover() {
      var act = cont.querySelector(ACTIVA);
      if (!act) { pil.style.display = 'none'; previa = null; return; }
      pil.style.display = '';
      var nueva = caja(act);
      clearTimeout(t);
      if (!previa || previa.el === act || menosMov()) { poner(nueva, 0); previa = { el: act }; return; }
      var vieja = caja(previa.el);
      var ini = Math.min(vieja.p, nueva.p), fin = Math.max(vieja.p + vieja.s, nueva.p + nueva.s);
      poner({ p: ini, s: fin - ini, o: nueva.o, w: nueva.w }, 190);
      t = setTimeout(function () { poner(nueva, 240); }, 185);
      previa = { el: act };
    }
    new MutationObserver(mover).observe(cont, { subtree: true, attributes: true, attributeFilter: ['aria-current', 'aria-pressed', 'aria-selected', 'class'] });
    window.addEventListener('resize', function () { var a = cont.querySelector(ACTIVA); if (a) poner(caja(a), 0); });
    mover();
    cont.__sd = { mover: mover };
    return cont.__sd;
  }

  /* ---------- Aparecer al llegar con el scroll ---------- */
  var vista = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('sd-visible'); vista.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function revelar(el) { if (vista && !menosMov()) vista.observe(el); else el.classList.add('sd-visible'); }

  /* ---------- Cambiar de pantalla sin ghosting: la vieja sale COMPLETA, después entra la nueva ---------- */
  function cambiar(vieja, nueva) {
    return new Promise(function (listo) {
      function entra() {
        if (vieja) { vieja.hidden = true; vieja.classList.remove('sd-saliendo'); }
        if (nueva) { nueva.hidden = false; nueva.classList.remove('sd-entrar'); void nueva.offsetWidth; nueva.classList.add('sd-entrar'); }
        listo();
      }
      if (!vieja || menosMov()) return entra();
      vieja.classList.add('sd-saliendo');
      setTimeout(entra, 230);
    });
  }

  /* ---------- Arranque y lo que aparezca después (apps que cambian la página sin recargar) ---------- */
  function montar(raiz) {
    (raiz.matches && raiz.matches('[data-sd-liquido]') ? [raiz] : []).concat([].slice.call(raiz.querySelectorAll ? raiz.querySelectorAll('[data-sd-liquido]') : [])).forEach(liquido);
    (raiz.matches && raiz.matches('[data-sd-revelar]') ? [raiz] : []).concat([].slice.call(raiz.querySelectorAll ? raiz.querySelectorAll('[data-sd-revelar]') : [])).forEach(function (el) { if (!el.__sdR) { el.__sdR = 1; revelar(el); } });
  }
  function iniciar() {
    montar(document);
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) montar(n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  window.sd = { sonar: sonar, sonidos: sonidos, sonidosPrendidos: function () { return prendido; }, liquido: liquido, revelar: revelar, cambiar: cambiar };
})();
