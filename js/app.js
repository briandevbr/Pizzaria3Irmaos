/*
 * Pizzaria Três Irmãos — funcionamento do site
 * Cardápio, montagem da pizza, carrinho e envio do pedido pelo WhatsApp.
 * Preços e taxas ficam em cardapio.js.
 */
(function () {
  'use strict';

  var C = window.CARDAPIO;
  var D = window.Desenhos;

  // ---------- utilidades ----------
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function centavos(v) { return Math.round(Number(v) * 100); }
  var formato = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function brl(c) { return formato.format(c / 100).replace(/\s/g, ' '); }
  function brlTexto(c) { return formato.format(c / 100).replace(/\s/g, ' '); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function limpar(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function lerDinheiro(t) { // "150", "150,00", "R$ 1.000,50"
    var s = String(t || '').replace(/[^\d,.]/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var v = parseFloat(s);
    return isFinite(v) ? Math.round(v * 100) : NaN;
  }
  var reduzMovimento = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- dados do cardápio ----------
  var PIZZAS = {}, BORDAS = {}, BEBIDAS = {};
  C.pizzas.forEach(function (p) { p.centavos = centavos(p.preco); PIZZAS[p.id] = p; });
  C.bordas.forEach(function (b) { BORDAS[b.id] = b; });
  C.bebidas.forEach(function (b) {
    BEBIDAS[b.id] = b;
    b.tamanhos.forEach(function (t) { t.centavos = centavos(t.preco); });
  });
  var PRECO_BORDA = centavos(C.precoBorda);
  var BAIRROS = C.bairros.map(function (b) { return { nome: b.nome, centavos: centavos(b.taxa) }; });

  function tipoSabor(p) { return p.categoria === 'doces' ? 'doce' : 'salgada'; }
  function tamanhoDe(bebida, id) {
    for (var i = 0; i < bebida.tamanhos.length; i++) if (bebida.tamanhos[i].id === id) return bebida.tamanhos[i];
    return null;
  }
  function bairroDe(nome) {
    for (var i = 0; i < BAIRROS.length; i++) if (BAIRROS[i].nome === nome) return BAIRROS[i];
    return null;
  }
  function visualPizza(a, b) {
    var p = PIZZAS[a];
    if (!b && p.foto) return '<img src="' + esc(p.foto) + '" alt="Foto da pizza ' + esc(p.nome) + '" loading="lazy" width="320" height="320">';
    return D.pizza(a, b);
  }

  // ---------- estado do pedido (fica salvo no aparelho) ----------
  var CHAVE = 'tresirmaos:pedido:v1';
  function estadoVazio() {
    return { itens: [], nome: '', modo: 'entrega', bairro: '', endereco: '', complemento: '', pagamento: '', troco: 'nao', trocoPara: '' };
  }
  function chaveItem(it) {
    return it.tipo === 'pizza'
      ? 'p:' + it.sabores.slice().sort().join('+') + ':' + (it.borda || '')
      : 'b:' + it.bebida + ':' + it.tamanho;
  }
  function itemValido(it) {
    if (!it || typeof it !== 'object' || !(it.qtd >= 1 && it.qtd <= 99)) return false;
    it.qtd = Math.floor(it.qtd);
    if (it.tipo === 'pizza') {
      if (!Array.isArray(it.sabores) || it.sabores.length < 1 || it.sabores.length > 2) return false;
      if (!it.sabores.every(function (id) { return PIZZAS[id]; })) return false;
      if (it.sabores.length === 2 && it.sabores[0] === it.sabores[1]) return false;
      if (it.borda && !BORDAS[it.borda]) return false;
      it.borda = it.borda || '';
    } else if (it.tipo === 'bebida') {
      if (!BEBIDAS[it.bebida] || !tamanhoDe(BEBIDAS[it.bebida], it.tamanho)) return false;
    } else return false;
    it.chave = chaveItem(it);
    return true;
  }
  function carregar() {
    var e = estadoVazio(), salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (err) { salvo = null; }
    if (salvo && typeof salvo === 'object') {
      Object.keys(e).forEach(function (k) { if (typeof salvo[k] === typeof e[k] && Array.isArray(salvo[k]) === Array.isArray(e[k])) e[k] = salvo[k]; });
    }
    e.itens = e.itens.filter(itemValido);
    if (e.modo !== 'entrega' && e.modo !== 'retirada') e.modo = 'entrega';
    if (e.bairro && !bairroDe(e.bairro)) e.bairro = '';
    if (C.pagamentos.indexOf(e.pagamento) < 0) e.pagamento = '';
    if (e.troco !== 'sim') e.troco = 'nao';
    return e;
  }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (err) { /* sem armazenamento: segue normal */ } }
  var estado = carregar();

  function precoUnitario(it) {
    if (it.tipo === 'pizza') {
      var maior = 0;
      it.sabores.forEach(function (id) { maior = Math.max(maior, PIZZAS[id].centavos); });
      return maior + (it.borda ? PRECO_BORDA : 0);
    }
    return tamanhoDe(BEBIDAS[it.bebida], it.tamanho).centavos;
  }
  function nomeItem(it) {
    if (it.tipo === 'pizza') {
      return it.sabores.length === 2
        ? '½ ' + PIZZAS[it.sabores[0]].nome + ' + ½ ' + PIZZAS[it.sabores[1]].nome
        : PIZZAS[it.sabores[0]].nome;
    }
    return BEBIDAS[it.bebida].nome + ' ' + tamanhoDe(BEBIDAS[it.bebida], it.tamanho).nome;
  }
  function detalheItem(it) {
    if (it.tipo === 'pizza') {
      return (it.sabores.length === 2 ? 'Meio a meio' : 'Pizza inteira') + ' · ' +
        (it.borda ? 'borda de ' + BORDAS[it.borda].nome : 'sem borda recheada');
    }
    return 'Bebida';
  }
  function subtotal() { return estado.itens.reduce(function (s, it) { return s + precoUnitario(it) * it.qtd; }, 0); }
  function taxaEntrega() {
    if (estado.modo !== 'entrega') return 0;
    var b = bairroDe(estado.bairro);
    return b ? b.centavos : 0;
  }
  function total() { return subtotal() + taxaEntrega(); }
  function totalItens() { return estado.itens.reduce(function (s, it) { return s + it.qtd; }, 0); }

  function adicionarItem(novo) {
    novo.chave = chaveItem(novo);
    var existente = null;
    estado.itens.forEach(function (it) { if (it.chave === novo.chave) existente = it; });
    if (existente) existente.qtd = Math.min(99, existente.qtd + novo.qtd);
    else estado.itens.push(novo);
    salvar();
    atualizarTudo();
  }

  // ---------- aberto / fechado (horário de Olinda) ----------
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function agora() {
    try {
      var partes = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Recife', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      var m = {};
      partes.forEach(function (p) { m[p.type] = p.value; });
      var dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(m.weekday);
      if (dia < 0) throw new Error('dia');
      return { dia: dia, min: (parseInt(m.hour, 10) % 24) * 60 + parseInt(m.minute, 10) };
    } catch (err) {
      var d = new Date();
      return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function situacao() {
    var h = C.horario, a = agora();
    var abreHoje = h.dias.indexOf(a.dia) >= 0;
    if (abreHoje && a.min >= h.abre * 60 && a.min < h.fecha * 60) return { aberto: true, texto: 'Aberto agora · até ' + h.fecha + 'h', hoje: a.dia };
    if (abreHoje && a.min < h.abre * 60) return { aberto: false, texto: 'Fechado agora · abre hoje às ' + h.abre + 'h', hoje: a.dia };
    for (var i = 1; i <= 7; i++) {
      var d = (a.dia + i) % 7;
      if (h.dias.indexOf(d) >= 0) return { aberto: false, texto: 'Fechado agora · abre ' + (i === 1 ? 'amanhã' : DIAS[d]) + ' às ' + h.abre + 'h', hoje: a.dia };
    }
    return { aberto: false, texto: 'Fechado agora', hoje: a.dia };
  }
  function atualizarStatus() {
    var s = situacao();
    $$('[data-status]').forEach(function (el) {
      el.hidden = false;
      el.textContent = s.texto;
      el.classList.toggle('fechado', !s.aberto);
    });
    var lista = $('#dias');
    if (lista) {
      var h = C.horario, html = '';
      [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
        var abre = h.dias.indexOf(d) >= 0;
        html += '<li class="' + (d === s.hoje ? 'hoje ' : '') + (abre ? '' : 'folga') + '"><span>' +
          DIAS[d].charAt(0).toUpperCase() + DIAS[d].slice(1) + '</span><span>' + (abre ? h.abre + 'h – ' + h.fecha + 'h' : 'Fechado') + '</span></li>';
      });
      lista.innerHTML = html;
    }
  }

  // ---------- desenho do cardápio ----------
  function nomeCurto(nome) { return nome.replace(/^Pizzas\s+/i, ''); }

  function cardPizza(p, i) {
    return '<button type="button" class="card" data-pizza="' + p.id + '" style="--i:' + (i % 4) + '" aria-label="' +
      esc(p.nome + ', ' + brlTexto(p.centavos) + '. Toque para montar') + '">' +
      '<span class="card-qtd" data-qtd-pizza="' + p.id + '" aria-hidden="true"></span>' +
      '<span class="card-img">' + visualPizza(p.id) + '</span>' +
      '<span class="card-nome">' + esc(p.nome) + '</span>' +
      '<span class="card-rodape"><span class="card-preco">' + brl(p.centavos) + '</span><span class="card-mais" aria-hidden="true">+</span></span>' +
      '</button>';
  }

  function renderizarCardapio() {
    var abas = '', html = '';
    C.categorias.forEach(function (cat) {
      var pizzas = C.pizzas.filter(function (p) { return p.categoria === cat.id; });
      if (!pizzas.length) return;
      abas += '<a class="aba" href="#cat-' + cat.id + '" data-aba="' + cat.id + '">' + esc(nomeCurto(cat.nome)) + '</a>';
      html += '<section class="categoria" id="cat-' + cat.id + '" aria-labelledby="t-' + cat.id + '">' +
        '<div class="categoria-cabeca"><div><h3 id="t-' + cat.id + '">' + esc(cat.nome) + '</h3><p>' + esc(cat.resumo || '') + '</p></div></div>';
      var grupos = [];
      pizzas.forEach(function (p) {
        var g = null;
        grupos.forEach(function (x) { if (x.c === p.centavos) g = x; });
        if (!g) { g = { c: p.centavos, itens: [] }; grupos.push(g); }
        g.itens.push(p);
      });
      grupos.forEach(function (g, i) {
        html += '<div class="grupo"><div class="grupo-preco">' + brl(g.c) + ' <small>cada</small></div>' +
          '<div class="grade revelar">' + g.itens.map(cardPizza).join('') + '</div></div>';
        if (cat.id === 'salgadas' && i === 0) {
          html += '<div class="banner-meio revelar"><div class="banner-img">' + D.pizza('calabresa', 'frango-catupiry') + '</div>' +
            '<div><h4>Não sabe qual escolher? Peça meio a meio!</h4><p>Dois sabores na mesma pizza. O valor é o do sabor mais caro.</p></div></div>';
        }
      });
      html += '</section>';
    });

    abas += '<a class="aba" href="#cat-bordas" data-aba="bordas">Bordas</a>';
    html += '<section class="categoria" id="cat-bordas" aria-labelledby="t-bordas">' +
      '<div class="categoria-cabeca"><div><h3 id="t-bordas">Bordas Recheadas</h3><p>Pra deixar a pizza ainda mais caprichada</p></div></div>' +
      '<div class="grupo"><div class="grupo-preco">+ ' + brl(PRECO_BORDA) + ' <small>na pizza</small></div><div class="grade revelar">' +
      C.bordas.map(function (b, i) {
        return '<div class="card card-estatico" style="--i:' + (i % 4) + '"><span class="card-img">' + D.borda(b.id) + '</span>' +
          '<span class="card-nome">' + esc(b.nome) + '</span></div>';
      }).join('') +
      '</div></div><p class="nota-categoria">Escolha a borda na hora de montar a sua pizza.</p></section>';

    abas += '<a class="aba" href="#cat-bebidas" data-aba="bebidas">Bebidas</a>';
    html += '<section class="categoria" id="cat-bebidas" aria-labelledby="t-bebidas">' +
      '<div class="categoria-cabeca"><div><h3 id="t-bebidas">Bebidas</h3><p>Pra acompanhar a pizza</p></div></div>' +
      '<div class="grupo"><div class="grade grade-bebidas revelar">' +
      C.bebidas.map(function (b, i) {
        return '<div class="card card-bebida card-estatico" style="--i:' + i + '"><span class="card-img">' + D.bebida(b.id) + '</span>' +
          '<div class="card-bebida-info"><h4 class="card-nome">' + esc(b.nome) + '</h4><div class="tamanhos">' +
          b.tamanhos.map(function (t) {
            return '<button type="button" class="tamanho" data-bebida="' + b.id + '" data-tamanho="' + t.id + '" aria-label="' +
              esc('Adicionar ' + b.nome + ' ' + t.nome + ', ' + brlTexto(t.centavos)) + '">' +
              '<span>' + esc(t.nome) + '</span><em data-qtd-bebida="' + b.id + ':' + t.id + '" aria-hidden="true" hidden></em>' +
              '<b>' + brl(t.centavos) + '</b><span class="card-mais" aria-hidden="true">+</span></button>';
          }).join('') +
          '</div></div></div>';
      }).join('') +
      '</div></div></section>';

    $('#abas').innerHTML = abas;
    $('#cardapio-conteudo').insertAdjacentHTML('beforeend', html);
  }

  function renderizarBairros() {
    var ul = $('#bairros');
    if (!ul) return;
    ul.innerHTML = BAIRROS.map(function (b) {
      return '<li><span>' + esc(b.nome) + '</span><span>' + brl(b.centavos) + '</span></li>';
    }).join('');
  }

  function enfeitarHeroi() {
    var pontos = [], n = 14;
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 ? 46 : 57, a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      pontos.push((60 + Math.cos(a) * r).toFixed(1) + ',' + (60 + Math.sin(a) * r).toFixed(1));
    }
    var estrela = $('[data-estrela]');
    if (estrela) estrela.setAttribute('points', pontos.join(' '));
    $$('[data-enfeite]').forEach(function (el) { el.innerHTML = D.peca(el.getAttribute('data-enfeite')); });
  }

  // ---------- contadores, barra e avisos ----------
  function atualizarContadores() {
    var porSabor = {}, porBebida = {};
    estado.itens.forEach(function (it) {
      if (it.tipo === 'pizza') it.sabores.forEach(function (id) { porSabor[id] = (porSabor[id] || 0) + it.qtd; });
      else porBebida[it.bebida + ':' + it.tamanho] = (porBebida[it.bebida + ':' + it.tamanho] || 0) + it.qtd;
    });
    $$('[data-qtd-pizza]').forEach(function (el) {
      var q = porSabor[el.getAttribute('data-qtd-pizza')] || 0;
      var tinha = el.classList.contains('tem');
      el.textContent = q;
      if (q && !tinha) el.classList.add('tem');
      if (!q) el.classList.remove('tem');
    });
    $$('[data-qtd-bebida]').forEach(function (el) {
      var q = porBebida[el.getAttribute('data-qtd-bebida')] || 0;
      el.hidden = !q;
      el.textContent = q;
    });
  }

  function atualizarBarra() {
    var q = totalItens(), barra = $('#barra-pedido'), visivel = q > 0;
    $('#barra-qtd').textContent = q;
    $('#barra-total').textContent = brl(subtotal());
    barra.classList.toggle('visivel', visivel);
    barra.setAttribute('aria-hidden', visivel ? 'false' : 'true');
    barra.tabIndex = visivel ? 0 : -1;
    barra.setAttribute('aria-label', 'Ver meu pedido: ' + q + (q === 1 ? ' item' : ' itens') + ', ' + brlTexto(subtotal()));
    document.body.classList.toggle('tem-itens', visivel);
  }
  function pularBarra() {
    var barra = $('#barra-pedido');
    barra.classList.remove('pula');
    void barra.offsetWidth;
    barra.classList.add('pula');
  }

  var avisoTimer = null;
  function aviso(texto) {
    var el = $('#aviso');
    el.textContent = texto;
    el.classList.add('visivel');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.classList.remove('visivel'); }, 2300);
  }

  // pizza voando até a sacolinha
  function voar(origem, html) {
    var barra = $('#barra-pedido');
    if (reduzMovimento || !origem || !origem.width || !Element.prototype.animate) { pularBarra(); return; }
    var br = barra.getBoundingClientRect(), sacola = $('.barra-sacola', barra).getBoundingClientRect();
    var fundoFinal = window.innerHeight - parseFloat(getComputedStyle(barra).bottom);
    var alvoX = sacola.left + sacola.width / 2;
    var alvoY = fundoFinal - br.height + (sacola.top - br.top) + sacola.height / 2;
    var tam = 70, el = document.createElement('div');
    el.className = 'voador';
    el.innerHTML = html;
    var x0 = origem.left + origem.width / 2 - tam / 2, y0 = origem.top + origem.height / 2 - tam / 2;
    el.style.left = x0 + 'px';
    el.style.top = y0 + 'px';
    document.body.appendChild(el);
    var dx = alvoX - (x0 + tam / 2), dy = alvoY - (y0 + tam / 2), escala = Math.min(2.6, Math.max(1, origem.width / tam));
    var anim = el.animate([
      { transform: 'translate(0,0) scale(' + escala + ') rotate(0deg)' },
      { transform: 'translate(' + dx * 0.45 + 'px,' + (dy * 0.45 - 110) + 'px) scale(1) rotate(200deg)', offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.28) rotate(400deg)', opacity: 0.6 }
    ], { duration: 760, easing: 'cubic-bezier(.45,0,.55,1)' });
    anim.onfinish = function () { el.remove(); pularBarra(); };
  }

  // ---------- painéis (montar pizza / pedido) ----------
  var painelAberto = null, focoAntes = null, aoFechar = null;

  function abrirPainel(painel, origem) {
    if (painelAberto === painel) return;
    if (painelAberto) fecharDireto();
    focoAntes = origem || document.activeElement;
    painel.classList.add('aberto');
    painel.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('travado');
    painelAberto = painel;
    $('.folha-corpo', painel).scrollTop = 0;
    try { history.pushState({ painel: painel.id }, ''); } catch (err) { /* ok */ }
    setTimeout(function () {
      var alvo = $('.btn-fechar', painel);
      if (alvo) try { alvo.focus({ preventScroll: true }); } catch (err) { alvo.focus(); }
    }, 80);
  }
  function fecharPainel(depois) {
    if (!painelAberto) { if (depois) depois(); return; }
    aoFechar = depois || null;
    var st = null;
    try { st = history.state; } catch (err) { st = null; }
    if (st && st.painel === painelAberto.id) history.back(); // o popstate fecha
    else fecharDireto();
  }
  function fecharDireto() {
    var painel = painelAberto;
    if (!painel) return;
    painel.classList.remove('aberto');
    painel.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('travado');
    painelAberto = null;
    if (painel.id === 'painel-pedido') enviado = false;
    if (focoAntes && document.body.contains(focoAntes) && focoAntes.focus) {
      try { focoAntes.focus({ preventScroll: true }); } catch (err) { /* ok */ }
    }
    var fn = aoFechar;
    aoFechar = null;
    if (fn) setTimeout(fn, 30);
  }
  window.addEventListener('popstate', function () { if (painelAberto) fecharDireto(); });

  document.addEventListener('keydown', function (e) {
    if (!painelAberto) return;
    if (e.key === 'Escape') { e.preventDefault(); fecharPainel(); return; }
    if (e.key === 'Tab') { // mantém o foco dentro do painel
      var focaveis = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', painelAberto)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focaveis.length) return;
      var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
  });
  $$('.painel').forEach(function (p) {
    p.addEventListener('click', function (e) { if (e.target.closest('[data-fechar]')) fecharPainel(); });
  });

  // ---------- montar pizza ----------
  var monta = null;
  var ICONE_INTEIRA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#FFD466" stroke="#111" stroke-width="2"/><circle cx="9" cy="9.5" r="2" fill="#CC4234" stroke="#111" stroke-width="1.2"/><circle cx="15" cy="13.5" r="2" fill="#CC4234" stroke="#111" stroke-width="1.2"/><circle cx="10" cy="15.5" r="1.6" fill="#CC4234" stroke="#111" stroke-width="1.2"/></svg>';
  var ICONE_MEIO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a9.5 9.5 0 0 0 0 19Z" fill="#FFD466" stroke="#111" stroke-width="2" stroke-linejoin="round"/><path d="M12 2.5a9.5 9.5 0 0 1 0 19Z" fill="#FFF3D6" stroke="#111" stroke-width="2" stroke-linejoin="round"/><circle cx="8" cy="10" r="1.8" fill="#CC4234" stroke="#111" stroke-width="1.1"/><circle cx="8.5" cy="15" r="1.6" fill="#CC4234" stroke="#111" stroke-width="1.1"/><path d="M14.5 8.5l3 2M14.5 13l3 2" stroke="#E8B477" stroke-width="2" stroke-linecap="round"/></svg>';

  function opcao(nome, valor, rotulo, marcado, extra) {
    return '<label class="opcao"><input type="radio" name="' + nome + '" value="' + esc(valor) + '"' + (marcado ? ' checked' : '') + '>' +
      '<span>' + (extra || '') + esc(rotulo) + '</span></label>';
  }
  function precoMontagem() {
    var c = PIZZAS[monta.a].centavos;
    if (monta.meio && monta.b) c = Math.max(c, PIZZAS[monta.b].centavos);
    return c + (monta.borda ? PRECO_BORDA : 0);
  }
  function tituloMontagem() {
    var a = PIZZAS[monta.a].nome;
    if (!monta.meio) return a;
    return monta.b ? '½ ' + a + ' + ½ ' + PIZZAS[monta.b].nome : '½ ' + a + ' + ½ ?';
  }
  function visualMontagem() {
    if (monta.meio) return D.pizza(monta.a, monta.b || '?');
    return visualPizza(monta.a);
  }

  function abrirMontagem(id, origem) {
    if (!PIZZAS[id]) return;
    monta = { a: id, b: '', meio: false, borda: '', qtd: 1 };
    var pa = PIZZAS[id];
    var outras = C.pizzas.filter(function (p) {
      return p.id !== pa.id && (C.meioAMeioSalgadaComDoce || tipoSabor(p) === tipoSabor(pa));
    });
    var lista = '';
    C.categorias.forEach(function (cat) {
      var doGrupo = outras.filter(function (p) { return p.categoria === cat.id; });
      if (!doGrupo.length) return;
      lista += '<h5>' + esc(cat.nome) + '</h5>';
      doGrupo.forEach(function (p) {
        lista += '<label class="opcao"><input type="radio" name="metade" value="' + p.id + '">' +
          '<span><span class="mini">' + visualPizza(p.id) + '</span>' + esc(p.nome) +
          '<b class="preco-op">' + brl(p.centavos) + '</b></span></label>';
      });
    });

    var html = '<div class="monta-visual" id="monta-visual">' + visualMontagem() + '</div>' +
      '<h3 class="monta-titulo" id="pizza-titulo">' + esc(tituloMontagem()) + '</h3>' +
      '<p class="monta-preco"><span id="monta-preco">' + brl(precoMontagem()) + '</span> <small>· ' + C.fatias + ' fatias</small></p>' +
      '<div class="bloco"><div class="bloco-titulo">Como vai ser?</div><div class="segmentos">' +
      opcao('forma', 'inteira', 'Inteira', true, ICONE_INTEIRA) + opcao('forma', 'meio', 'Meio a meio', false, ICONE_MEIO) +
      '</div></div>' +
      '<div class="bloco grupo-erro" id="bloco-metade" hidden><div class="bloco-titulo">Escolha a outra metade <small>obrigatório</small></div>' +
      '<div class="lista-sabores">' + lista + '</div>' +
      '<span class="msg-erro">Escolha o sabor da outra metade.</span>' +
      '<p class="dica">No meio a meio, vale o preço do sabor mais caro.</p></div>' +
      '<div class="bloco"><div class="bloco-titulo">Borda recheada <span class="extra">+ ' + brl(PRECO_BORDA) + '</span></div>' +
      '<div class="opcoes-bordas">' + opcao('borda', '', 'Sem borda', true) +
      C.bordas.map(function (b) { return opcao('borda', b.id, b.nome, false); }).join('') + '</div></div>';

    $('#pizza-corpo').innerHTML = html;
    atualizarMontagem(false);
    abrirPainel($('#painel-pizza'), origem);
  }

  function atualizarMontagem(redesenhar) {
    if (redesenhar) $('#monta-visual').innerHTML = visualMontagem();
    $('#pizza-titulo').textContent = tituloMontagem();
    $('#monta-preco').textContent = brl(precoMontagem());
    $('#pizza-qtd').textContent = monta.qtd;
    $('#pizza-adicionar').textContent = (monta.meio && !monta.b ? 'Escolha a outra metade' : 'Adicionar · ' + brl(precoMontagem() * monta.qtd));
  }

  $('#pizza-corpo').addEventListener('change', function (e) {
    var t = e.target;
    if (!monta || t.type !== 'radio') return;
    if (t.name === 'forma') {
      monta.meio = t.value === 'meio';
      var bloco = $('#bloco-metade');
      bloco.hidden = !monta.meio;
      bloco.classList.remove('erro');
      if (!monta.meio) {
        monta.b = '';
        $$('input[name="metade"]', bloco).forEach(function (r) { r.checked = false; });
      } else if (!reduzMovimento) {
        setTimeout(function () { bloco.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
      }
      atualizarMontagem(true);
    } else if (t.name === 'metade') {
      monta.b = t.value;
      $('#bloco-metade').classList.remove('erro');
      atualizarMontagem(true);
    } else if (t.name === 'borda') {
      monta.borda = t.value;
      atualizarMontagem(false);
    }
  });
  $$('#painel-pizza [data-qtd]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!monta) return;
      monta.qtd = Math.max(1, Math.min(20, monta.qtd + parseInt(b.getAttribute('data-qtd'), 10)));
      atualizarMontagem(false);
    });
  });
  $('#pizza-adicionar').addEventListener('click', function () {
    if (!monta) return;
    if (monta.meio && !monta.b) {
      var bloco = $('#bloco-metade');
      bloco.classList.add('erro');
      bloco.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
      aviso('Escolha o sabor da outra metade');
      return;
    }
    var visual = $('#monta-visual'), rect = visual.getBoundingClientRect();
    var desenho = monta.meio ? D.pizza(monta.a, monta.b) : visualPizza(monta.a);
    var item = { tipo: 'pizza', sabores: monta.meio ? [monta.a, monta.b] : [monta.a], borda: monta.borda || '', qtd: monta.qtd };
    var texto = (item.qtd > 1 ? item.qtd + 'x ' : '') + (monta.meio ? 'Meio a meio' : PIZZAS[monta.a].nome) + ' no pedido!';
    adicionarItem(item);
    fecharPainel();
    voar(rect, desenho);
    aviso(texto);
  });

  // ---------- pedido ----------
  var enviado = false, formPronto = false;

  var ICONES = {
    entrega: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="17" r="3" fill="#fff" stroke="#111" stroke-width="1.8"/><circle cx="18" cy="17" r="3" fill="#fff" stroke="#111" stroke-width="1.8"/><path d="M6 17h7l3-6h-5l-1.5-3H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="13" y="4" width="7" height="6" rx="1" fill="#E30613" stroke="#111" stroke-width="1.6"/></svg>',
    retirada: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5 5 4h14l1.5 5.5Z" fill="#E30613" stroke="#111" stroke-width="1.8" stroke-linejoin="round"/><path d="M4.5 9.5V20h15V9.5" fill="#fff" stroke="#111" stroke-width="1.8"/><rect x="10" y="13.5" width="4" height="6.5" fill="#FFC61A" stroke="#111" stroke-width="1.6"/></svg>',
    'Pix': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.6" y="5.6" width="12.8" height="12.8" rx="3" transform="rotate(45 12 12)" fill="#32BCAD" stroke="#111" stroke-width="1.8"/><path d="M8.5 12h7" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    'Cartão de débito': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" fill="#2F6FDE" stroke="#111" stroke-width="1.8"/><path d="M2.5 9.5h19" stroke="#111" stroke-width="1.8"/><rect x="5" y="13" width="5" height="2.4" rx="1" fill="#fff"/></svg>',
    'Cartão de crédito': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" fill="#E30613" stroke="#111" stroke-width="1.8"/><path d="M2.5 9.5h19" stroke="#111" stroke-width="1.8"/><rect x="5" y="13" width="5" height="2.4" rx="1" fill="#FFC61A"/></svg>',
    'Dinheiro': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2" fill="#2E9E44" stroke="#111" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="#BFF0C8" stroke="#111" stroke-width="1.5"/></svg>'
  };
  var ROTULO_PAGAMENTO = { 'Cartão de débito': 'Débito', 'Cartão de crédito': 'Crédito' };

  function htmlItens() {
    return '<ul class="itens">' + estado.itens.map(function (it) {
      var visual = it.tipo === 'pizza' ? (it.sabores.length === 2 ? D.pizza(it.sabores[0], it.sabores[1]) : visualPizza(it.sabores[0]))
        : D.bebida(it.bebida, tamanhoDe(BEBIDAS[it.bebida], it.tamanho).nome);
      return '<li class="item" data-chave="' + esc(it.chave) + '">' +
        '<span class="item-img">' + visual + '</span>' +
        '<span class="item-nome">' + esc(nomeItem(it)) + '<span class="item-detalhe">' + esc(detalheItem(it)) +
        (it.qtd > 1 ? ' · ' + brl(precoUnitario(it)) + ' cada' : '') + '</span></span>' +
        '<span class="item-baixo">' +
        '<span class="qtd qtd-mini" role="group" aria-label="Quantidade de ' + esc(nomeItem(it)) + '">' +
        '<button type="button" class="qtd-btn" data-acao="menos" aria-label="' + (it.qtd === 1 ? 'Remover' : 'Diminuir') + '">−</button>' +
        '<output>' + it.qtd + '</output>' +
        '<button type="button" class="qtd-btn" data-acao="mais" aria-label="Aumentar">+</button></span>' +
        '<button type="button" class="btn-remover" data-acao="remover" aria-label="Remover ' + esc(nomeItem(it)) + '">' +
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<span class="item-preco">' + brl(precoUnitario(it) * it.qtd) + '</span>' +
        '</span></li>';
    }).join('') + '</ul>';
  }

  function htmlSugestao() {
    var temBebida = estado.itens.some(function (it) { return it.tipo === 'bebida'; });
    if (temBebida) return '';
    var botoes = '';
    C.bebidas.forEach(function (b) {
      b.tamanhos.forEach(function (t) {
        botoes += '<button type="button" data-sugestao="' + b.id + ':' + t.id + '">+ ' + esc(b.nome + ' ' + t.nome) + ' <b>' + brl(t.centavos) + '</b></button>';
      });
    });
    return '<div class="sugestao"><p>Vai uma bebida pra acompanhar?</p><div class="sugestao-lista">' + botoes + '</div></div>';
  }

  function htmlResumo() {
    var linhaTaxa;
    if (estado.modo === 'retirada') linhaTaxa = '<span>Retirada no local</span><span>Grátis</span>';
    else if (bairroDe(estado.bairro)) linhaTaxa = '<span>Entrega · ' + esc(estado.bairro) + '</span><span>' + brl(taxaEntrega()) + '</span>';
    else linhaTaxa = '<span>Taxa de entrega</span><span>escolha o bairro</span>';
    return '<div><span>Subtotal</span><span>' + brl(subtotal()) + '</span></div><div>' + linhaTaxa + '</div>' +
      '<div class="total"><span>Total</span><span>' + brl(total()) + '</span></div>';
  }

  function htmlFormulario() {
    var bairros = '<option value="">Escolha o bairro</option>' + BAIRROS.map(function (b) {
      return '<option value="' + esc(b.nome) + '"' + (estado.bairro === b.nome ? ' selected' : '') + '>' + esc(b.nome) + ' — taxa ' + brl(b.centavos) + '</option>';
    }).join('');
    var pagamentos = C.pagamentos.map(function (p) {
      return opcao('pagamento', p, ROTULO_PAGAMENTO[p] || p, estado.pagamento === p, ICONES[p] || '');
    }).join('');
    var entrega = estado.modo === 'entrega', dinheiro = estado.pagamento === 'Dinheiro';
    return '<form class="form" id="form-pedido" novalidate autocomplete="on">' +
      '<div class="bloco"><div class="bloco-titulo">Seus dados</div>' +
      '<label class="campo" id="c-nome"><span>Seu nome</span>' +
      '<input class="entrada" name="nome" autocomplete="name" maxlength="60" placeholder="Como podemos te chamar?" value="' + esc(estado.nome) + '">' +
      '<span class="msg-erro">Diga seu nome pra gente.</span></label></div>' +

      '<div class="bloco"><div class="bloco-titulo">Entrega ou retirada?</div><div class="segmentos">' +
      opcao('modo', 'entrega', 'Entrega', entrega, ICONES.entrega) + opcao('modo', 'retirada', 'Retirar no local', !entrega, ICONES.retirada) +
      '</div>' +
      '<div id="bloco-entrega"' + (entrega ? '' : ' hidden') + '>' +
      '<label class="campo" id="c-bairro"><span>Bairro</span><select name="bairro" autocomplete="off">' + bairros + '</select>' +
      '<span class="msg-erro">Escolha o bairro da entrega.</span></label>' +
      '<label class="campo" id="c-endereco"><span>Rua e número</span>' +
      '<input class="entrada" name="endereco" autocomplete="street-address" maxlength="120" placeholder="Ex.: Rua das Flores, 123" value="' + esc(estado.endereco) + '">' +
      '<span class="msg-erro">Informe a rua e o número.</span></label>' +
      '<label class="campo"><span>Complemento ou ponto de referência <small>(opcional)</small></span>' +
      '<input class="entrada" name="complemento" maxlength="120" placeholder="Ex.: Apto 201, perto da padaria" value="' + esc(estado.complemento) + '"></label>' +
      '</div>' +
      '<p class="retirada-info" id="bloco-retirada"' + (entrega ? ' hidden' : '') + '>Retire na <strong>Av. Argentina Castelo Branco, 234</strong> — Olinda. Sem taxa de entrega.</p>' +
      '</div>' +

      '<div class="bloco grupo-erro" id="c-pagamento"><div class="bloco-titulo">Forma de pagamento</div>' +
      '<div class="segmentos pagamentos">' + pagamentos + '</div><span class="msg-erro">Escolha como vai pagar.</span>' +
      '<div id="bloco-troco"' + (dinheiro ? '' : ' hidden') + '>' +
      '<div class="bloco-titulo" style="margin-top:16px">Precisa de troco?</div><div class="segmentos">' +
      opcao('troco', 'nao', 'Não preciso', estado.troco !== 'sim') + opcao('troco', 'sim', 'Sim, preciso', estado.troco === 'sim') + '</div>' +
      '<label class="campo" id="c-troco"' + (estado.troco === 'sim' ? '' : ' hidden') + '><span>Troco para quanto?</span>' +
      '<span class="campo-dinheiro" style="display:block"><input class="entrada" name="trocoPara" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="Ex.: 100,00" value="' + esc(estado.trocoPara) + '"></span>' +
      '<span class="msg-erro" id="msg-troco">Informe para quanto precisa de troco.</span></label>' +
      '</div></div>' +
      '</form>';
  }

  function linkWhatsApp() { return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(montarMensagem()); }

  function renderizarPedido(completo) {
    var corpo = $('#pedido-corpo'), rodape = $('#pedido-rodape');
    if (enviado) {
      corpo.innerHTML = '<div class="enviado">' +
        '<svg class="enviado-check" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#25D366" stroke-width="8"/><path d="M30 52l13 13 27-29" fill="none" stroke="#25D366" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<h3>Pedido pronto!</h3><p>Abrimos o WhatsApp com o seu pedido. Agora é só tocar em <strong>enviar</strong> por lá.</p>' +
        '<a class="btn btn-zap" href="' + esc(linkWhatsApp()) + '" target="_blank" rel="noopener">Abrir o WhatsApp de novo</a>' +
        '<button type="button" class="btn btn-escuro" data-novo-pedido>Começar um novo pedido</button>' +
        '<button type="button" class="btn-remover" data-editar>Voltar e editar o pedido</button></div>';
      rodape.hidden = true;
      formPronto = false;
      return;
    }
    rodape.hidden = false;
    if (!estado.itens.length) {
      corpo.innerHTML = '<div class="vazio"><div class="vazio-img">' + D.pizza('mussarela') + '</div>' +
        '<h3>Seu pedido está vazio</h3><p>Escolha uma pizza no cardápio pra começar.</p></div>';
      rodape.innerHTML = '<button type="button" class="btn btn-amarelo btn-grande" data-ir-cardapio>Ver o cardápio</button>';
      formPronto = false;
      return;
    }
    if (completo || !formPronto) {
      corpo.innerHTML = '<div id="pedido-itens">' + htmlItens() + '</div><div id="pedido-sugestao">' + htmlSugestao() + '</div>' +
        htmlFormulario() + '<div class="resumo" id="pedido-resumo">' + htmlResumo() + '</div>' +
        (situacao().aberto ? '' : '<p class="alerta-fechado">Estamos fechados agora. Atendemos de terça a domingo, das 17h às 23h.</p>');
      rodape.innerHTML = '<a class="btn btn-zap btn-grande" id="enviar" href="' + esc(linkWhatsApp()) + '" target="_blank" rel="noopener">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>' +
        '<span>Enviar pedido · <span id="rodape-total">' + brl(total()) + '</span></span></a>' +
        '<p class="nota-envio">Você confere a mensagem no WhatsApp antes de enviar.</p>';
      formPronto = true;
      return;
    }
    $('#pedido-itens').innerHTML = htmlItens();
    $('#pedido-sugestao').innerHTML = htmlSugestao();
    atualizarResumo();
  }

  function atualizarResumo() {
    var r = $('#pedido-resumo');
    if (r) r.innerHTML = htmlResumo();
    var t = $('#rodape-total');
    if (t) t.textContent = brl(total());
    var link = $('#enviar');
    if (link) link.href = linkWhatsApp();
  }

  function abrirPedido(origem) {
    enviado = false;
    renderizarPedido(true);
    abrirPainel($('#painel-pedido'), origem);
  }

  // mudanças nos itens do pedido
  $('#pedido-corpo').addEventListener('click', function (e) {
    var botao = e.target.closest('button');
    if (!botao) return;
    var li = botao.closest('.item');
    if (li) {
      var chave = li.getAttribute('data-chave'), acao = botao.getAttribute('data-acao');
      var idx = -1;
      estado.itens.forEach(function (it, i) { if (it.chave === chave) idx = i; });
      if (idx < 0 || !acao) return;
      var it = estado.itens[idx];
      if (acao === 'mais') it.qtd = Math.min(99, it.qtd + 1);
      else if (acao === 'menos') it.qtd -= 1;
      if (acao === 'remover' || it.qtd < 1) {
        estado.itens.splice(idx, 1);
        aviso(nomeItem(it) + ' saiu do pedido');
      }
      salvar();
      atualizarTudo();
      if (!estado.itens.length) renderizarPedido(true);
      return;
    }
    var sug = botao.getAttribute('data-sugestao');
    if (sug) {
      var partes = sug.split(':');
      adicionarItem({ tipo: 'bebida', bebida: partes[0], tamanho: partes[1], qtd: 1 });
      aviso(BEBIDAS[partes[0]].nome + ' ' + tamanhoDe(BEBIDAS[partes[0]], partes[1]).nome + ' no pedido!');
      return;
    }
    if (botao.hasAttribute('data-novo-pedido')) {
      estado.itens = [];
      estado.troco = 'nao';
      estado.trocoPara = '';
      salvar();
      enviado = false;
      atualizarTudo();
      fecharPainel(function () { var c = $('#cardapio'); if (c) c.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth' }); });
      aviso('Pronto! Pode montar um novo pedido.');
      return;
    }
    if (botao.hasAttribute('data-editar')) {
      enviado = false;
      renderizarPedido(true);
    }
  });

  // campos do formulário
  function limparErro(id) { var el = document.getElementById(id); if (el) el.classList.remove('erro'); }
  $('#pedido-corpo').addEventListener('input', function (e) {
    var t = e.target, nome = t.name;
    if (['nome', 'endereco', 'complemento', 'trocoPara'].indexOf(nome) >= 0) {
      estado[nome] = t.value;
      salvar();
      limparErro({ nome: 'c-nome', endereco: 'c-endereco', trocoPara: 'c-troco' }[nome]);
      var link = $('#enviar');
      if (link) link.href = linkWhatsApp();
    }
  });
  $('#pedido-corpo').addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'bairro') {
      estado.bairro = t.value;
      limparErro('c-bairro');
    } else if (t.name === 'modo') {
      estado.modo = t.value;
      $('#bloco-entrega').hidden = estado.modo !== 'entrega';
      $('#bloco-retirada').hidden = estado.modo === 'entrega';
    } else if (t.name === 'pagamento') {
      estado.pagamento = t.value;
      $('#bloco-troco').hidden = estado.pagamento !== 'Dinheiro';
      limparErro('c-pagamento');
    } else if (t.name === 'troco') {
      estado.troco = t.value;
      $('#c-troco').hidden = estado.troco !== 'sim';
      limparErro('c-troco');
      if (estado.troco === 'sim') setTimeout(function () { var i = $('#c-troco input'); if (i) i.focus(); }, 50);
    } else return;
    salvar();
    atualizarResumo();
  });

  function validar() {
    var erros = [];
    function marcar(id, temErro) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('erro', !!temErro);
      if (temErro) erros.push(el);
    }
    marcar('c-nome', limpar(estado.nome).length < 2);
    if (estado.modo === 'entrega') {
      marcar('c-bairro', !bairroDe(estado.bairro));
      marcar('c-endereco', limpar(estado.endereco).length < 4);
    }
    marcar('c-pagamento', C.pagamentos.indexOf(estado.pagamento) < 0);
    if (estado.pagamento === 'Dinheiro' && estado.troco === 'sim') {
      var v = lerDinheiro(estado.trocoPara), msg = $('#msg-troco');
      var ruim = !(v > total());
      if (msg) msg.textContent = isNaN(v) ? 'Informe para quanto precisa de troco.' : 'O valor precisa ser maior que o total (' + brl(total()) + ').';
      marcar('c-troco', ruim);
    }
    return erros;
  }

  function montarMensagem() {
    var L = [], entrega = estado.modo === 'entrega';
    L.push('*NOVO PEDIDO — Pizzaria Três Irmãos*');
    L.push('');
    L.push('*Cliente:* ' + limpar(estado.nome));
    L.push('');
    L.push('*Itens:*');
    estado.itens.forEach(function (it, i) {
      var un = precoUnitario(it), linhaPreco = (it.qtd > 1 ? it.qtd + ' x ' + brlTexto(un) + ' = ' : '') + brlTexto(un * it.qtd);
      if (it.tipo === 'pizza') {
        if (it.sabores.length === 2) {
          L.push((i + 1) + ') *' + it.qtd + 'x Pizza meio a meio*');
          L.push('   ½ ' + PIZZAS[it.sabores[0]].nome + ' + ½ ' + PIZZAS[it.sabores[1]].nome);
        } else {
          L.push((i + 1) + ') *' + it.qtd + 'x Pizza ' + PIZZAS[it.sabores[0]].nome + '*');
        }
        L.push('   ' + (it.borda ? 'Borda recheada de ' + BORDAS[it.borda].nome : 'Sem borda recheada'));
      } else {
        L.push((i + 1) + ') *' + it.qtd + 'x ' + nomeItem(it) + '*');
      }
      L.push('   ' + linhaPreco);
    });
    L.push('');
    L.push('*Subtotal:* ' + brlTexto(subtotal()));
    if (entrega) {
      var b = bairroDe(estado.bairro);
      L.push('*Entrega:* ' + (b ? b.nome + ' (taxa ' + brlTexto(b.centavos) + ')' : 'bairro não informado'));
      L.push('*Endereço:* ' + limpar(estado.endereco));
      if (limpar(estado.complemento)) L.push('*Complemento/referência:* ' + limpar(estado.complemento));
    } else {
      L.push('*Retirada no local* (sem taxa)');
    }
    var pag = estado.pagamento || 'não informado';
    if (estado.pagamento === 'Dinheiro') {
      var v = lerDinheiro(estado.trocoPara);
      pag += estado.troco === 'sim' && v > 0 ? ' — troco para ' + brlTexto(v) : ' — não precisa de troco';
    }
    L.push('*Pagamento:* ' + pag);
    L.push('');
    L.push('*TOTAL: ' + brlTexto(total()) + '*');
    return L.join('\n');
  }

  // botão de enviar: só abre o WhatsApp se estiver tudo preenchido
  $('#pedido-rodape').addEventListener('click', function (e) {
    if (e.target.closest('[data-ir-cardapio]')) {
      fecharPainel(function () { var c = $('#cardapio'); if (c) c.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth' }); });
      return;
    }
    var link = e.target.closest('#enviar');
    if (!link) return;
    var erros = validar();
    if (erros.length) {
      e.preventDefault();
      erros[0].scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'center' });
      var campo = $('input, select', erros[0]);
      if (campo && campo.type !== 'radio') setTimeout(function () { try { campo.focus({ preventScroll: true }); } catch (err) { campo.focus(); } }, 350);
      aviso(erros.length === 1 ? 'Falta só um detalhe no pedido' : 'Faltam ' + erros.length + ' detalhes no pedido');
      return;
    }
    link.href = linkWhatsApp(); // o navegador abre este link logo após o clique
    $('#aviso').classList.remove('visivel');
    setTimeout(function () { enviado = true; renderizarPedido(); }, 400);
  });

  // ---------- abas do cardápio ----------
  function ativarAba(id) {
    $$('.aba').forEach(function (a) {
      var on = a.getAttribute('data-aba') === id;
      a.classList.toggle('ativa', on);
      if (on) {
        a.setAttribute('aria-current', 'true');
        var trilho = $('#abas');
        var alvo = a.offsetLeft - 16;
        if (trilho.scrollTo) trilho.scrollTo({ left: alvo, behavior: reduzMovimento ? 'auto' : 'smooth' });
        else trilho.scrollLeft = alvo;
      } else a.removeAttribute('aria-current');
    });
  }
  function espiarAbas() {
    ativarAba('salgadas');
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) ativarAba(en.target.id.replace('cat-', '')); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('.categoria').forEach(function (s) { obs.observe(s); });
  }
  $('#abas').addEventListener('click', function (e) {
    var a = e.target.closest('.aba');
    if (!a) return;
    var alvo = document.getElementById('cat-' + a.getAttribute('data-aba'));
    if (!alvo) return;
    e.preventDefault();
    alvo.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
  });

  // ---------- revelar ao rolar ----------
  function revelar() {
    var els = $$('.revelar:not(.visivel)');
    if (!('IntersectionObserver' in window) || reduzMovimento) {
      els.forEach(function (el) { el.classList.add('visivel'); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visivel'); obs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach(function (el) { obs.observe(el); });
  }

  // ---------- tudo junto ----------
  function atualizarTudo() {
    atualizarBarra();
    atualizarContadores();
    if (painelAberto && painelAberto.id === 'painel-pedido' && !enviado) renderizarPedido();
  }

  // cliques no cardápio
  $('#cardapio-conteudo').addEventListener('click', function (e) {
    var card = e.target.closest('[data-pizza]');
    if (card) { abrirMontagem(card.getAttribute('data-pizza'), card); return; }
    var tam = e.target.closest('[data-bebida]');
    if (tam) {
      var b = BEBIDAS[tam.getAttribute('data-bebida')], t = tamanhoDe(b, tam.getAttribute('data-tamanho'));
      if (!b || !t) return;
      var cardB = tam.closest('.card-bebida'), img = cardB ? $('.card-img', cardB) : null;
      adicionarItem({ tipo: 'bebida', bebida: b.id, tamanho: t.id, qtd: 1 });
      voar(img ? img.getBoundingClientRect() : null, D.bebida(b.id, t.nome));
      aviso(b.nome + ' ' + t.nome + ' no pedido!');
    }
  });
  $('#barra-pedido').addEventListener('click', function () { abrirPedido($('#barra-pedido')); });

  renderizarCardapio();
  renderizarBairros();
  enfeitarHeroi();
  atualizarStatus();
  setInterval(atualizarStatus, 60 * 1000);
  atualizarTudo();
  espiarAbas();
  revelar();
})();
