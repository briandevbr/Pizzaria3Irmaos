/*
 * Desenhos das pizzas, bordas e bebidas (SVG gerado no navegador).
 * Estilo adesivo: contorno preto grosso, borda branca e brilho.
 * Não precisa mexer aqui para mudar preço — isso fica em cardapio.js.
 */
(function () {
  'use strict';

  var TINTA = '#111';
  var contador = 0;

  // ---------- utilidades ----------
  function semente(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function sorteio(seed) { // gerador fixo: o mesmo sabor sai sempre igual
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function n(v) { return Math.round(v * 10) / 10; }

  // contorno irregular e suave (massa, queijo, pedaços)
  function bolha(cx, cy, r, amp, pontos, rnd) {
    var pts = [];
    for (var i = 0; i < pontos; i++) {
      var ang = (i / pontos) * Math.PI * 2;
      var rr = r + (rnd() * 2 - 1) * amp;
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    var ult = pts[pts.length - 1];
    var d = 'M' + n((ult[0] + pts[0][0]) / 2) + ' ' + n((ult[1] + pts[0][1]) / 2);
    for (var j = 0; j < pts.length; j++) {
      var p = pts[j], q = pts[(j + 1) % pts.length];
      d += 'Q' + n(p[0]) + ' ' + n(p[1]) + ' ' + n((p[0] + q[0]) / 2) + ' ' + n((p[1] + q[1]) / 2);
    }
    return d + 'Z';
  }

  // espalha pedaços dentro do círculo do recheio, sem amontoar
  function espalhar(rnd, qtd, raio, dist) {
    var pts = [], tent = 0;
    while (pts.length < qtd && tent < qtd * 80) {
      tent++;
      var a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * raio;
      var x = 100 + Math.cos(a) * d, y = 100 + Math.sin(a) * d, ok = true;
      for (var i = 0; i < pts.length; i++) {
        var dx = pts[i].x - x, dy = pts[i].y - y;
        if (dx * dx + dy * dy < dist * dist) { ok = false; break; }
      }
      if (ok) pts.push({ x: x, y: y, a: Math.round(rnd() * 360), s: Math.round((0.85 + rnd() * 0.3) * 100) / 100 });
    }
    return pts;
  }
  function em(p, corpo, fixo) { // posiciona: corpo gira, brilho fica sempre em cima-esquerda
    return '<g transform="translate(' + n(p.x) + ' ' + n(p.y) + ') scale(' + p.s + ')">' +
      '<g transform="rotate(' + p.a + ')">' + corpo + '</g>' + (fixo || '') + '</g>';
  }
  function poeira(rnd, qtd, raio, cor, largura, comprimento, opac) { // orégano, granulado, canela...
    var d = '';
    for (var i = 0; i < qtd; i++) {
      var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * raio;
      var x = 100 + Math.cos(a) * r, y = 100 + Math.sin(a) * r;
      var b = rnd() * Math.PI * 2;
      d += 'M' + n(x) + ' ' + n(y) + 'l' + n(Math.cos(b) * comprimento) + ' ' + n(Math.sin(b) * comprimento);
    }
    return '<path d="' + d + '" stroke="' + cor + '" stroke-width="' + largura + '" stroke-linecap="round" fill="none"' + (opac ? ' opacity="' + opac + '"' : '') + '/>';
  }

  var BRILHO = '<path d="M-7 -4.5A8 8 0 0 1 -1.5 -8.2" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round"/>';

  // ---------- pedaços ----------
  var PECAS = {
    calabresa: function (p) {
      return em(p, '<circle r="11" fill="#B32C22" stroke="' + TINTA + '" stroke-width="2"/><circle r="8" fill="#CC4234"/>' +
        '<g fill="#F4B7AC"><circle cx="-3" cy="-2" r="1.6"/><circle cx="3.2" cy="1" r="1.3"/><circle cx="-.8" cy="4.2" r="1.2"/><circle cx="3.6" cy="-4" r="1"/></g>', BRILHO);
    },
    cebola: function (p) {
      return em(p, '<ellipse rx="9.5" ry="7.5" fill="none" stroke="' + TINTA + '" stroke-width="4.4"/><ellipse rx="9.5" ry="7.5" fill="none" stroke="#FFF7E6" stroke-width="2.2"/>');
    },
    azeitona: function (p) {
      return em(p, '<ellipse rx="5" ry="4" fill="#7E9A2E" stroke="' + TINTA + '" stroke-width="1.5"/><ellipse rx="1.7" ry="1.3" fill="#3E4B14"/>',
        '<circle cx="-2.2" cy="-1.6" r=".9" fill="#fff" opacity=".7"/>');
    },
    tomate: function (p) {
      var gomos = '';
      for (var i = 0; i < 5; i++) gomos += '<ellipse cx="5" rx="2.6" ry="1.5" transform="rotate(' + i * 72 + ')" fill="#FFD9A6"/>';
      return em(p, '<circle r="12.5" fill="#E23B28" stroke="' + TINTA + '" stroke-width="2"/><circle r="9" fill="#F0654B"/>' + gomos + '<circle r="2" fill="#E23B28"/>',
        '<path d="M-8.5 -5A10 10 0 0 1 -2 -9.7" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.8" stroke-linecap="round"/>');
    },
    manjericao: function (p) {
      return em(p, '<path d="M0 -10C7 -6 7 5 0 10C-7 5 -7 -6 0 -10Z" fill="#2E9E44" stroke="' + TINTA + '" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M0 -7V8" stroke="#1B6B2C" stroke-width="1.2" stroke-linecap="round"/><path d="M-3.2 -4.5Q-4.6 0 -3 4" stroke="#8FD99D" stroke-width="1" fill="none" stroke-linecap="round"/>');
    },
    frango: function (p, rnd) {
      return em(p, '<path d="' + bolha(0, 0, 4.4, 1.4, 6, rnd) + '" fill="#E8B477" stroke="' + TINTA + '" stroke-width="1.1"/>');
    },
    galinha: function (p, rnd) {
      return em(p, '<path d="' + bolha(0, 0, 4.4, 1.4, 6, rnd) + '" fill="#C98746" stroke="' + TINTA + '" stroke-width="1.1"/>');
    },
    atum: function (p, rnd) {
      return em(p, '<path d="' + bolha(0, 0, 3.8, 1.3, 6, rnd) + '" fill="#C9A087" stroke="' + TINTA + '" stroke-width="1"/>');
    },
    presunto: function (p) {
      return em(p, '<rect x="-3" y="-2.6" width="6" height="5.2" rx="1.1" fill="#F09AA5" stroke="' + TINTA + '" stroke-width="1"/>');
    },
    ovo: function (p) {
      return em(p, '<ellipse rx="10" ry="6" fill="#FFFDF4" stroke="' + TINTA + '" stroke-width="1.6"/><ellipse cx="2.2" rx="4.6" ry="3.4" fill="#FFC61A" stroke="#D99A00" stroke-width=".8"/>');
    },
    pimentao: function (p) {
      return em(p, '<rect x="-3.3" y="-2.4" width="6.6" height="4.8" rx="1.4" fill="#39A34B" stroke="' + TINTA + '" stroke-width="1.1"/>');
    },
    bacon: function (p) {
      return em(p, '<path d="M-11 -2.5q2.75 -2.5 5.5 0t5.5 0 5.5 0 5.5 0v5q-2.75 -2.5 -5.5 0t-5.5 0 -5.5 0 -5.5 0z" fill="#B9463B" stroke="' + TINTA + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M-10 0q2.75 -2.5 5.5 0t5.5 0 5.5 0 4.5 0" fill="none" stroke="#F7CDAE" stroke-width="1.3"/>');
    },
    bolhaQueijo: function (p, rnd) {
      var r = 3 + rnd() * 3.5;
      return '<circle cx="' + n(p.x) + '" cy="' + n(p.y) + '" r="' + n(r) + '" fill="#FFE9A8"/>' +
        (rnd() < 0.6 ? '<circle cx="' + n(p.x + r * 0.4) + '" cy="' + n(p.y + r * 0.3) + '" r="' + n(r * 0.35) + '" fill="#E3A03C" opacity=".75"/>' : '');
    },
    bolaBrigadeiro: function (p) {
      return em(p, '<circle r="7" fill="#4A2412" stroke="' + TINTA + '" stroke-width="1.5"/>' +
        '<path d="M-3 -2l1.6 .8M1.5 -3.5l.4 1.7M2.8 1l1.6 .6M-2.4 2.6l1.3 1M0 0l.3 1.6" stroke="#1E0C04" stroke-width="1.3" stroke-linecap="round"/>',
        '<path d="M-4.6 -2.2A5.5 5.5 0 0 1 -1 -5.2" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/>');
    },
    banana: function (p) {
      return em(p, '<circle r="8.5" fill="#FFE68A" stroke="' + TINTA + '" stroke-width="1.4"/><circle r="5.4" fill="none" stroke="#E2B94A" stroke-width="1.2"/>' +
        '<g fill="#8B5A2B"><circle cy="-1.8" r=".9"/><circle cx="1.6" cy="1" r=".9"/><circle cx="-1.6" cy="1" r=".9"/></g>');
    },
    bombom: function (p) {
      return em(p, '<circle r="8" fill="#5B2A15" stroke="' + TINTA + '" stroke-width="1.5"/><circle r="4.4" fill="#E7C08A"/><path d="M-2.4 -.6h4.8M-2 1.4h4" stroke="#C99A5E" stroke-width="1" stroke-linecap="round"/>',
        '<path d="M-5.4 -2.8A6.5 6.5 0 0 1 -1.2 -6.2" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/>');
    },
    pacoca: function (p) {
      return em(p, '<rect x="-5.5" y="-5.5" width="11" height="11" rx="2.4" fill="#D9AD6C" stroke="' + TINTA + '" stroke-width="1.3"/><circle cx="-1.5" cy="-1" r="1" fill="#B98445"/><circle cx="2" cy="1.6" r=".9" fill="#B98445"/>');
    },
    confeito: function (p, rnd, i) {
      var cores = ['#E30613', '#FFC61A', '#2F6FDE', '#2E9E44', '#F7941D', '#7A3B1C'];
      return em(p, '<circle r="4.6" fill="' + cores[i % cores.length] + '" stroke="' + TINTA + '" stroke-width="1.3"/>', '<circle cx="-1.6" cy="-1.7" r="1.2" fill="#fff" opacity=".65"/>');
    }
  };

  // ---------- bases ----------
  function base(tipo, rnd) {
    var fundo, cobertura, extra = '';
    switch (tipo) {
      case 'chocolate': fundo = '#3B1A0C'; cobertura = '#6A3118';
        extra = '<g fill="none" stroke="#9A5634" stroke-width="3" stroke-linecap="round" opacity=".75"><path d="M52 78Q80 58 112 66"/><path d="M96 142Q126 138 146 112"/><path d="M60 118Q66 132 80 138"/></g>'; break;
      case 'caramelo': fundo = '#8E4A1C'; cobertura = '#C9772D'; break;
      case 'leite': fundo = '#E0C38C'; cobertura = '#FFF1CF'; break;
      case 'queijo-claro': fundo = '#E9B45A'; cobertura = '#FFEDB5'; break;
      default: fundo = '#D23A22'; cobertura = '#FFD466';
        var manchas = espalhar(rnd, 5, 44, 26), i;
        for (i = 0; i < manchas.length; i++) extra += '<path d="' + bolha(manchas[i].x, manchas[i].y, 11 + rnd() * 5, 3, 9, rnd) + '" fill="#FFE08A" opacity=".75"/>';
    }
    return '<rect width="200" height="200" fill="' + fundo + '"/><path d="' + bolha(100, 100, 70, 2.6, 22, rnd) + '" fill="' + cobertura + '"/>' + extra;
  }

  function trelica(cor, brilho) { // fios de catupiry / cheddar
    var linhas = [], i, y, x;
    [64, 100, 136].forEach(function (x0, k) {
      var d = 'M' + x0 + ' 20';
      for (y = 20, i = 0; y < 180; y += 20, i++) d += 'Q' + (x0 + ((i + k) % 2 ? 4 : -4)) + ' ' + (y + 10) + ' ' + x0 + ' ' + (y + 20);
      linhas.push(d);
    });
    [52, 84, 116, 148].forEach(function (y0, k) {
      var d = 'M20 ' + y0;
      for (x = 20, i = 0; x < 180; x += 20, i++) d += 'Q' + (x + 10) + ' ' + (y0 + ((i + k) % 2 ? 3.5 : -3.5)) + ' ' + (x + 20) + ' ' + y0;
      linhas.push(d);
    });
    var todos = linhas.join('');
    return '<path d="' + todos + '" fill="none" stroke="' + TINTA + '" stroke-width="8.5" stroke-linecap="round"/>' +
      '<path d="' + todos + '" fill="none" stroke="' + cor + '" stroke-width="5.2" stroke-linecap="round"/>' +
      '<path d="' + todos + '" fill="none" stroke="' + brilho + '" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>';
  }

  function espiral(corA, corB) {
    var d = '', i, t, r, x, y;
    for (i = 0; i <= 90; i++) {
      t = (i / 90) * Math.PI * 6; r = 6 + (i / 90) * 56;
      x = 100 + Math.cos(t) * r; y = 100 + Math.sin(t) * r;
      d += (i ? 'L' : 'M') + n(x) + ' ' + n(y);
    }
    return '<path d="' + d + '" fill="none" stroke="' + corA + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + corB + '" stroke-width="1.6" stroke-linecap="round" opacity=".8" transform="translate(-1.2 -1.2)"/>';
  }

  function camada(nome, qtd, dist, rnd, escala) {
    var pts = espalhar(rnd, qtd, 66, dist), s = '';
    for (var i = 0; i < pts.length; i++) {
      if (escala) pts[i].s = Math.round(pts[i].s * escala * 100) / 100;
      s += PECAS[nome](pts[i], rnd, i);
    }
    return s;
  }
  function oregano(rnd, qtd) { return poeira(rnd, qtd || 55, 68, '#44561F', 1.5, 1.6, '.85'); }

  // ---------- receitas (o que vai em cima de cada sabor) ----------
  var RECEITAS = {
    'mussarela': function (r) { return base('queijo', r) + camada('bolhaQueijo', 30, 10, r) + camada('azeitona', 5, 30, r, 1.2) + oregano(r); },
    'calabresa': function (r) { return base('queijo', r) + camada('calabresa', 13, 19, r) + camada('cebola', 9, 16, r) + camada('azeitona', 4, 30, r, 1.2) + oregano(r); },
    'marguerita': function (r) { return base('queijo', r) + camada('tomate', 9, 26, r) + camada('manjericao', 10, 18, r) + oregano(r, 40); },
    'frango': function (r) { return base('queijo', r) + camada('frango', 32, 11, r, 1.35) + camada('azeitona', 4, 30, r, 1.2) + oregano(r); },
    'portuguesa': function (r) { return base('queijo', r) + camada('presunto', 34, 10, r, 1.35) + camada('pimentao', 14, 13, r, 1.2) + camada('ovo', 7, 24, r) + camada('azeitona', 5, 26, r, 1.2) + oregano(r); },
    'galinha-caipira': function (r) { return base('queijo', r) + camada('galinha', 32, 11, r, 1.35) + poeira(r, 45, 66, '#36A249', 2.4, 2.4) + camada('azeitona', 4, 30, r, 1.2); },
    'frango-catupiry': function (r) { return base('queijo', r) + camada('frango', 32, 11, r, 1.35) + trelica('#FFF7E6', '#FFFFFF') + camada('azeitona', 5, 30, r, 1.2) + oregano(r, 35); },
    'frango-cheddar': function (r) { return base('queijo', r) + camada('frango', 32, 11, r, 1.35) + trelica('#F7A21B', '#FFD37A') + oregano(r, 35); },
    'calabresa-catupiry': function (r) { return base('queijo', r) + camada('calabresa', 13, 19, r) + trelica('#FFF7E6', '#FFFFFF') + oregano(r, 35); },
    'bacon': function (r) { return base('queijo', r) + camada('bacon', 12, 22, r, 1.4) + camada('bolhaQueijo', 10, 14, r) + oregano(r); },
    'atum': function (r) { return base('queijo', r) + camada('atum', 28, 11, r, 1.35) + camada('cebola', 9, 18, r) + camada('azeitona', 4, 30, r, 1.2) + oregano(r, 40); },
    'quatro-queijos': function (r) {
      var s = base('queijo', r), cores = ['#FFF6DC', '#F7A21B', '#FFFFFF'], i;
      for (i = 0; i < 3; i++) {
        var ang = (i * 90 + 45) * Math.PI / 180;
        s += '<path d="' + bolha(100 + Math.cos(ang) * 36, 100 + Math.sin(ang) * 36, 25, 5, 12, r) + '" fill="' + cores[i] + '" stroke="' + TINTA + '" stroke-width="1.2" stroke-opacity=".35"/>';
      }
      var gx = 100 + Math.cos(225 * Math.PI / 180) * 36, gy = 100 + Math.sin(225 * Math.PI / 180) * 36, d = '';
      for (i = 0; i < 14; i++) d += 'M' + n(gx + (r() - 0.5) * 34) + ' ' + n(gy + (r() - 0.5) * 34) + 'l.8 .5';
      return s + '<path d="' + d + '" stroke="#5D7FA8" stroke-width="2.2" stroke-linecap="round"/>' + camada('bolhaQueijo', 8, 14, r) + oregano(r, 30);
    },
    'frango-bacon': function (r) { return base('queijo', r) + camada('frango', 24, 11, r, 1.35) + camada('bacon', 9, 22, r, 1.4) + oregano(r, 35); },

    'cartola': function (r) { return base('queijo-claro', r) + camada('banana', 12, 21, r, 1.15) + poeira(r, 110, 68, '#8B4A1E', 2.4, 0.4, '.8') + poeira(r, 40, 66, '#FFFFFF', 1.6, 0.3); },
    'brigadeiro': function (r) { return base('chocolate', r) + poeira(r, 120, 68, '#1E0C04', 1.8, 2.2) + camada('bolaBrigadeiro', 7, 24, r); },
    'sonho-de-valsa': function (r) { return base('chocolate', r) + camada('bombom', 9, 23, r, 1.1) + trelica('#F7E7CE', '#FFFFFF').replace(/stroke-width="8.5"/, 'stroke-width="5"').replace(/stroke-width="5.2"/, 'stroke-width="2.6"'); },
    'doce-de-leite': function (r) { return base('caramelo', r) + espiral('#E6A254', '#FFD9A0') + poeira(r, 30, 64, '#FFE7C2', 1.6, 0.3); },
    'pacoca': function (r) { return base('leite', r) + camada('pacoca', 13, 19, r, 1.2) + poeira(r, 110, 68, '#B98445', 2.4, 0.6); },
    'mms': function (r) { return base('chocolate', r) + camada('confeito', 24, 13, r, 1.15); }
  };

  function recheio(id) {
    var receita = RECEITAS[id] || RECEITAS.mussarela;
    return receita(sorteio(semente(id)));
  }

  // ---------- montagem ----------
  function massa(rnd) {
    var s = '<path d="' + bolha(100, 100, 90, 1.8, 40, rnd) + '" fill="url(#pz-massa)" stroke="' + TINTA + '" stroke-width="4.5" stroke-linejoin="round"/>';
    for (var i = 0; i < 9; i++) {
      var a = rnd() * 360, r = 83.5 + rnd() * 3;
      s += '<ellipse cx="' + n(100 + Math.cos(a * Math.PI / 180) * r) + '" cy="' + n(100 + Math.sin(a * Math.PI / 180) * r) + '" rx="3.2" ry="1.7" transform="rotate(' + n(a + 90) + ' ' + n(100 + Math.cos(a * Math.PI / 180) * r) + ' ' + n(100 + Math.sin(a * Math.PI / 180) * r) + ')" fill="#B8702A" opacity=".45"/>';
    }
    return s;
  }

  /**
   * pizza('calabresa')                    → inteira
   * pizza('calabresa', 'frango-catupiry') → meio a meio
   * pizza('calabresa', '?')               → meio a meio com a outra metade em aberto
   */
  function pizza(a, b, op) {
    op = op || {};
    var id = 'pz' + (++contador);
    var rnd = sorteio(semente('massa' + a));
    var meio = !!b && b !== a;
    var s = '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="pizza-svg" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="' + id + 'q"><circle cx="100" cy="100" r="76"/></clipPath>' +
      (meio ? '<clipPath id="' + id + 'e"><rect width="100" height="200"/></clipPath><clipPath id="' + id + 'd"><rect x="100" width="100" height="200"/></clipPath>' : '') +
      '</defs>';
    if (op.adesivo !== false) s += '<circle cx="100" cy="100" r="98.5" fill="#fff"/>';
    s += massa(rnd);
    s += '<circle cx="100" cy="100" r="79" fill="none" stroke="#C98136" stroke-width="3.5" opacity=".6"/>';
    s += '<g clip-path="url(#' + id + 'q)">';
    if (meio) {
      s += '<g clip-path="url(#' + id + 'e)">' + recheio(a) + '</g>';
      if (b === '?') {
        s += '<g clip-path="url(#' + id + 'd)"><rect width="200" height="200" fill="#F3DDAE"/>' +
          '<text x="138" y="116" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="46" fill="#D9B26F">?</text></g>';
      } else {
        s += '<g clip-path="url(#' + id + 'd)">' + recheio(b) + '</g>';
      }
    } else {
      s += recheio(a);
    }
    s += '</g><circle cx="100" cy="100" r="76" fill="none" stroke="' + TINTA + '" stroke-width="2.4"/>';
    if (meio) s += '<path d="M100 22V178" stroke="' + TINTA + '" stroke-width="3.2" stroke-linecap="round"' + (b === '?' ? ' stroke-dasharray="7 6"' : '') + '/>';
    if (op.fatias) {
      s += '<g stroke="' + TINTA + '" stroke-width="2.6" stroke-linecap="round" opacity=".8">';
      for (var i = 0; i < 4; i++) {
        var ang = (i * 45 + 22.5) * Math.PI / 180, c = Math.cos(ang) * 88, sn = Math.sin(ang) * 88;
        s += '<path d="M' + n(100 - c) + ' ' + n(100 - sn) + 'L' + n(100 + c) + ' ' + n(100 + sn) + '"/>';
      }
      s += '</g>';
    }
    s += '<path d="M21.1 71.3A84 84 0 0 1 71.3 21.1" fill="none" stroke="#FFF3D6" stroke-width="4.5" stroke-linecap="round" opacity=".9"/>' +
      '<circle cx="84" cy="17.2" r="2.3" fill="#FFF3D6" opacity=".9"/></svg>';
    return s;
  }

  // ---------- bordas ----------
  var CORES_BORDA = { 'catupiry': '#FFF7E3', 'cheddar': '#F7A21B', 'mussarela': '#FFD466', 'cream-cheese': '#FFFFFF' };
  function borda(id) {
    var cor = CORES_BORDA[id] || '#FFF7E3', rnd = sorteio(semente('borda' + id)), s = '';
    s += '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="borda-svg" aria-hidden="true" focusable="false">' +
      '<circle cx="100" cy="100" r="98" fill="#fff"/><circle cx="100" cy="100" r="62" fill="#1b1b1b" stroke="#fff" stroke-width="6"/>' +
      '<path d="' + bolha(100, 100, 90, 1.8, 40, rnd) + '" fill="url(#pz-massa)" stroke="' + TINTA + '" stroke-width="4.5"/>' +
      '<circle cx="100" cy="100" r="64" fill="#1b1b1b" stroke="' + TINTA + '" stroke-width="4"/>';
    for (var i = 0; i < 7; i++) {
      var a = (i / 7) * 360 + rnd() * 20, rad = a * Math.PI / 180, x = 100 + Math.cos(rad) * 77, y = 100 + Math.sin(rad) * 77;
      s += '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + n(10 + rnd() * 4) + '" ry="7" transform="rotate(' + n(a + 90) + ' ' + n(x) + ' ' + n(y) + ')" fill="' + cor + '" stroke="' + TINTA + '" stroke-width="2"/>';
    }
    s += '<path d="M21.1 71.3A84 84 0 0 1 71.3 21.1" fill="none" stroke="#FFF3D6" stroke-width="4.5" stroke-linecap="round" opacity=".9"/>' +
      '<text x="100" y="114" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="38" fill="#FFC61A" stroke="#000" stroke-width="1.5">+8</text></svg>';
    return s;
  }

  // ---------- bebidas ----------
  var GARRAFAS = {
    'antarctica': { liquido: '#1E7B34', tampa: '#1E7B34', rotulo: '#FFFFFF', texto: '#E30613', faixa: '#E30613' },
    'coca-cola': { liquido: '#2B130B', tampa: '#E30613', rotulo: '#E30613', texto: '#FFFFFF', faixa: '#FFFFFF' }
  };
  function garrafa(g, tamanho) {
    return '<path d="M25 14H35V22Q35 28 43 36Q52 45 52 56V130Q52 140 42 140H18Q8 140 8 130V56Q8 45 17 36Q25 28 25 22Z" fill="' + g.liquido + '" stroke="' + TINTA + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="8" y="72" width="44" height="36" fill="' + g.rotulo + '" stroke="' + TINTA + '" stroke-width="2.5"/>' +
      '<path d="M8 100Q20 92 30 99T52 97" fill="none" stroke="' + g.faixa + '" stroke-width="2.5"/>' +
      '<text x="30" y="95" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="17" fill="' + g.texto + '">' + tamanho + '</text>' +
      '<rect x="21.5" y="4" width="17" height="11" rx="2.5" fill="' + g.tampa + '" stroke="' + TINTA + '" stroke-width="2.5"/>' +
      '<path d="M14 58V66M14 114V126" stroke="#fff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>';
  }
  function bebida(id, tamanho) {
    var g = GARRAFAS[id] || GARRAFAS['coca-cola'];
    if (tamanho) { // uma garrafa só (itens do pedido)
      return '<svg viewBox="-12 0 84 146" xmlns="http://www.w3.org/2000/svg" class="bebida-svg" aria-hidden="true" focusable="false">' +
        garrafa(g, tamanho) + '</svg>';
    }
    return '<svg viewBox="0 0 124 150" xmlns="http://www.w3.org/2000/svg" class="bebida-svg" aria-hidden="true" focusable="false">' +
      '<g transform="translate(8 38) scale(.78)">' + garrafa(g, '1L') + '</g>' +
      '<g transform="translate(62 4)">' + garrafa(g, '2L') + '</g></svg>';
  }

  // gradiente da massa, compartilhado por todos os desenhos
  function prepararDefs() {
    if (document.getElementById('pz-defs')) return;
    document.body.insertAdjacentHTML('afterbegin',
      '<svg id="pz-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
      '<radialGradient id="pz-massa" gradientUnits="userSpaceOnUse" cx="100" cy="96" r="93">' +
      '<stop offset=".8" stop-color="#F9D18A"/><stop offset=".92" stop-color="#EFAE57"/><stop offset="1" stop-color="#D88A35"/>' +
      '</radialGradient></defs></svg>');
  }
  prepararDefs();

  // um ingrediente sozinho (enfeites do topo)
  function peca(nome) {
    return '<svg viewBox="-15 -15 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      PECAS[nome]({ x: 0, y: 0, a: 0, s: 1 }, sorteio(1), 0) + '</svg>';
  }

  window.Desenhos = { pizza: pizza, borda: borda, bebida: bebida, peca: peca };
})();
