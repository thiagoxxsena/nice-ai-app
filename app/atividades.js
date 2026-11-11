/* Nice AI — atividades das 5 habilidades (Ouvir, Falar, Ler, Escrever, Traduzir).
   O servidor gera cada atividade e guarda o gabarito. Aqui ficam o menu, as telas, a captura de voz e a demonstração. */
(function () {
  "use strict";
  var N = window.Nice, V = N.V, api = N.api, go = N.go, esc = N.esc, toast = N.toast, falhou = N.falhou, $ = N.$, S = N.S, VZ = window.NiceVoz;

  var HABS = [
    { id: "escuta", nome: "Ouvir", desc: "Escute e responda", tipos: ["ouvir_selecionar", "ouvir_escrever", "ouvir_traduzir", "ouvir_falar", "ouvir_resumir"] },
    { id: "fala", nome: "Falar", desc: "Fale com confiança", tipos: ["falar_cena", "falar_frases", "falar_ler_alto"], conversa: true },
    { id: "leitura", nome: "Ler", desc: "Textos e palavras novas", tipos: ["ler_compreensao", "ler_vocabulario"] },
    { id: "escrita", nome: "Escrever", desc: "Do e-mail ao formulário", tipos: ["escrever_cenario", "escrever_lacunas"] },
    { id: "traducao", nome: "Traduzir", desc: "Do português ao inglês e de volta", tipos: ["traduzir_frases", "traduzir_criar"] }
  ];
  var TIPOS = {
    ouvir_selecionar: ["Ouvir e selecionar", "Ouça e escolha a resposta certa.", "Múltipla escolha"],
    ouvir_escrever: ["Ouvir e responder por escrito", "Ouça e responda escrevendo, em inglês.", "Escrita"],
    ouvir_traduzir: ["Ouvir e traduzir", "Ouça e escreva o que entendeu em português.", "Tradução"],
    ouvir_falar: ["Ouvir e responder falando", "Ouça e responda em voz alta.", "Voz"],
    ouvir_resumir: ["Ouvir e resumir em inglês", "Ouça e conte com suas palavras, em inglês.", "Resumo"],
    falar_cena: ["Descrever uma cena", "Veja a cena e descreva falando.", "Voz"],
    falar_frases: ["Frases com palavras novas", "Crie frases faladas com vocabulário novo.", "Voz"],
    falar_ler_alto: ["Ler em voz alta", "Leia e veja o que o app entendeu.", "Voz"],
    ler_compreensao: ["Compreensão de texto", "Leia e responda com suas palavras.", "Escrita"],
    ler_vocabulario: ["Vocabulário novo", "Aprenda palavras e use em frases.", "Escrita"],
    escrever_cenario: ["Escrever em situações reais", "E-mails, feedbacks, notícias difíceis e mais.", "Escrita"],
    escrever_lacunas: ["Completar o texto", "Escolha a palavra que falta em cada lacuna.", "Automática"],
    traduzir_frases: ["Traduzir frases", "Traduza escrevendo ou falando.", "Tradução"],
    traduzir_criar: ["Traduzir e criar frases", "Traduza um texto e use as palavras novas.", "Tradução"]
  };
  function habDe(id) { return HABS.filter(function (h) { return h.id === id; })[0] || HABS[0]; }
  function habDoTipo(t) { return HABS.filter(function (h) { return h.tipos.indexOf(t) >= 0; })[0] || HABS[0]; }

  /* ---------- captura de voz: reconhecimento do navegador ou gravação + transcrição no servidor ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  function podeVoz() { return (!!SR && !IOS) || (!S.demo && !!VZ && VZ.Gravador.disponivel()); }
  function Captura(idioma, aoTexto, aoFim) {
    var c = { ativo: false }, r, g;
    if (SR && !IOS) {
      r = new SR(); r.lang = idioma === "pt" ? "pt-BR" : "en-US"; r.interimResults = true; r.continuous = true;
      r.onresult = function (e) { var t = ""; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + " "; aoTexto(t.replace(/\s+/g, " ").trim()); };
      r.onend = function () { c.ativo = false; aoFim(); };
      r.onerror = function (e) { c.ativo = false; if (e.error === "not-allowed") toast("Permita o microfone no navegador."); else if (e.error !== "aborted" && e.error !== "no-speech") toast("Não consegui ouvir. Tente de novo."); aoFim(); };
      c.start = function () { try { r.start(); c.ativo = true; return Promise.resolve(); } catch (e) { return Promise.reject(e); } };
      c.stop = function () { try { r.stop(); } catch (e) {} };
    } else if (!S.demo && VZ && VZ.Gravador.disponivel()) {
      g = new VZ.Gravador();
      c.start = function () { return g.iniciar().then(function () { c.ativo = true; }); };
      c.stop = function () {
        c.ativo = false;
        g.parar().then(function (a) {
          if (!a || !a.audio) { aoFim(); return; }
          return api("voz.transcrever", { audio: a.audio, mime: a.mime, segundos: a.segundos, idioma: idioma }).then(function (x) { aoTexto(x.texto || ""); aoFim(); });
        }).catch(function (e) { falhou(e); aoFim(); });
      };
    } else c.indisponivel = true;
    return c;
  }

  /* ---------- menu: as 5 habilidades ---------- */
  V.praticar = function () {
    var pr = (S.painel && S.painel.progresso) || {};
    var cards = HABS.map(function (h) {
      var v = Number(pr[h.id]) || 0;
      return '<button class="hab-card" data-h="' + h.id + '"><b>' + h.nome + "</b><small>" + h.desc + '</small><span class="rot ' + (v ? "pts" : "") + '">' + (v ? v + " pontos" : "ainda sem nota") + '</span><div class="prog' + (v && v < 60 ? " am" : "") + '"><i style="width:' + v + '%"></i></div></button>';
    }).join("");
    return { html: '<span class="rot">Praticar</span><h2>Escolha uma habilidade.</h2><p>Cada habilidade tem atividades próprias. A IA corrige e sua nota entra no progresso.</p><div class="hab-grid">' + cards + "</div>",
      bind: function (el) { [].forEach.call(el.querySelectorAll("[data-h]"), function (b) { b.onclick = function () { go("habilidade", { h: b.getAttribute("data-h") }); }; }); } };
  };

  V.habilidade = function (p) {
    var h = habDe(p.h), pt = (S.painel && S.painel.progresso && S.painel.progresso[h.id]) || 0;
    var lista = h.tipos.map(function (t) {
      return '<div class="ativ-it"><button class="op" data-t="' + t + '"><span>' + esc(TIPOS[t][0]) + "<small>" + esc(TIPOS[t][1]) + '</small></span><span class="tag cinza">' + esc(TIPOS[t][2]) + "</span></button>" +
        (t === "traduzir_frases" ? '<div class="dir"><span class="rot">Direção</span><button class="pill on" data-d="pt-en">Português → Inglês</button><button class="pill" data-d="en-pt">Inglês → Português</button></div>' : "") + "</div>";
    }).join("");
    var conversa = h.conversa ? '<div class="ativ-it"><button class="op" id="conv"><span>Conversar com o tutor<small>Cenas ao vivo: café, entrevista, hotel e reunião.</small></span><span class="tag">Ao vivo</span></button></div>' : "";
    return { aba: "praticar", html: '<button class="link voltar" id="volta">← Habilidades</button><span class="rot">' + h.nome + (pt ? " · " + pt + " pts" : "") + "</span><h2>" + h.nome + ".</h2><div class=\"opcoes\">" + conversa + lista + "</div>",
      bind: function (el) {
        var dir = "pt-en";
        $("#volta", el).onclick = function () { go("praticar"); };
        if ($("#conv", el)) $("#conv", el).onclick = function () { go("cenas"); };
        [].forEach.call(el.querySelectorAll("[data-d]"), function (b) { b.onclick = function () { dir = b.getAttribute("data-d"); [].forEach.call(el.querySelectorAll("[data-d]"), function (x) { x.classList.toggle("on", x === b); }); }; });
        [].forEach.call(el.querySelectorAll("[data-t]"), function (b) { b.onclick = function () { go("atividade", { tipo: b.getAttribute("data-t"), direcao: dir }); }; });
      } };
  };

  /* ---------- tela de uma atividade ---------- */
  function lingua(it, i) {
    if (it.tipo === "ouvir_traduzir") return "pt";
    if (it.tipo === "traduzir_frases") return it.direcao === "en-pt" ? "pt" : "en";
    if (it.tipo === "traduzir_criar") return i === 0 ? "pt" : "en";
    return "en";
  }
  function oQueOuvir(it, i) { return it.tipo === "traduzir_frases" && it.direcao === "en-pt" ? (it.itens[i] || {}).q : ""; }
  function tocar(texto, idioma, btn) {
    S.voz = true; N.falar(texto, idioma || "en");
    if (btn) { btn.textContent = "▶ Ouvir de novo"; }
  }

  function blocoApoio(it) {
    var h = "";
    if (it.audio) h += '<div class="cartao audio"><button class="btn" id="play">▶ Ouvir</button><small class="rot">O texto aparece depois da sua resposta. Ouça quantas vezes precisar.</small></div>';
    if (it.cena) h += '<div class="cartao cena"><div class="emo" aria-hidden="true">' + it.emojis.map(esc).join(" ") + "</div><p>" + esc(it.cena) + "</p></div>";
    if (it.situacao) h += '<div class="cartao"><span class="rot">Situação</span><p style="color:var(--tinta)">' + esc(it.situacao) + "</p>" + (it.dicas.length ? '<ul class="vant dicas">' + it.dicas.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>" : "") + "</div>";
    if (it.texto && it.kind !== "lacunas" && it.kind !== "ler_alto") h += '<div class="cartao texto"><p style="color:var(--tinta)">' + esc(it.texto) + "</p></div>";
    if (it.tipo === "ler_vocabulario") h += it.palavras.map(function (w, i) {
      return '<div class="cartao vocab"><div class="linha2"><b class="palavra">' + esc(w.w) + '</b><button class="pill" data-w="' + i + '">▶ Ouvir</button></div>' + (w.pt ? "<small>" + esc(w.pt) + "</small>" : "") +
        (w.definicao ? "<p>" + esc(w.definicao) + "</p>" : "") + (w.sinonimo ? '<small class="rot">Sinônimo: ' + esc(w.sinonimo) + "</small>" : "") + (w.exemplo ? '<p class="ex">“' + esc(w.exemplo) + "”</p>" : "") + "</div>";
    }).join("");
    else if (it.palavras.length) h += '<div class="chips">' + it.palavras.map(function (w) { return '<span class="chip">' + esc(typeof w === "string" ? w : w.w + (w.pt ? " · " + w.pt : "")) + "</span>"; }).join("") + "</div>";
    return h;
  }

  function campoResposta(it, i, voz) {
    var q = it.itens[i], mic = voz ? '<button class="ic mic" data-mic="' + i + '" aria-label="Falar a resposta">●</button>' : "";
    var ouvir = oQueOuvir(it, i) ? '<button class="pill" data-q="' + i + '">▶ Ouvir frase</button>' : "";
    return '<div class="cartao resp-c"><div class="linha2"><b class="pergunta">' + (it.tipo === "traduzir_frases" ? (i + 1) + ". " : "") + esc(q.q) + "</b>" + ouvir + '</div><div class="campo-w"><textarea class="campo" rows="' + (it.tipo === "escrever_cenario" ? 7 : 3) + '" data-r="' + i + '" placeholder="' + (voz ? "Fale no microfone ou escreva aqui" : "Escreva aqui") + '" maxlength="1500"></textarea>' + mic + "</div>" +
      (it.tipo === "escrever_cenario" && it.min ? '<small class="rot" id="cont">0 de ' + it.min + " palavras sugeridas</small>" : "") + "</div>";
  }

  V.atividade = function (p) {
    return { aba: "praticar", html: '<button class="link voltar" id="volta">← ' + esc(habDoTipo(p.tipo).nome) + '</button><div id="ativ"><span class="rot">Preparando sua atividade…</span><div class="digita" style="margin-top:12px"><i></i><i></i><i></i></div></div>',
      bind: function (el) {
        var h = habDoTipo(p.tipo);
        $("#volta", el).onclick = function () { go("habilidade", { h: h.id }); };
        api("ativ.gerar", { tipo: p.tipo, direcao: p.direcao }).then(function (it) { if (S.tela === "atividade") montar(el, it, p); }).catch(function (e) {
          $("#ativ", el).innerHTML = '<div class="erro">' + esc(e.message) + '</div><button class="btn" id="tenta">Tentar de novo</button>';
          $("#tenta", el).onclick = function () { go("atividade", p); }; falhou(e);
        });
      } };
  };

  function montar(el, it, p) {
    var st = { t0: Date.now(), deVoz: false, caps: {}, enviando: false };
    var box = $("#ativ", el), voz = it.entrada === "voz" || it.entrada === "ambos", cab = '<span class="rot">' + esc(it.rotulo) + '</span><h2 style="font-size:clamp(28px,8vw,38px)">' + esc(it.titulo) + "</h2><p>" + esc(it.instrucao) + "</p>";
    var corpo = blocoApoio(it);
    if (it.kind === "escolha") {
      corpo += '<div class="cartao"><b class="pergunta">' + esc(it.itens[0].q) + '</b><div class="opcoes" id="ops">' + it.itens[0].opcoes.map(function (o, i) { return '<button class="op esc" data-o="' + i + '"><span>' + esc(o) + "</span></button>"; }).join("") + "</div></div>";
    } else if (it.kind === "lacunas") {
      var partes = it.texto.split("___"), t = "";
      partes.forEach(function (x, i) { t += esc(x); if (i < partes.length - 1) t += '<input class="lac" data-l="' + i + '" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Lacuna ' + (i + 1) + '">'; });
      corpo += '<div class="cartao texto lacunas">' + t + '</div><div class="chips" id="banco">' + it.banco.map(function (b) { return '<button class="chip" data-b="' + esc(b) + '">' + esc(b) + "</button>"; }).join("") + "</div>";
    } else if (it.kind === "ler_alto") {
      corpo += '<div class="cartao texto grande"><p style="color:var(--tinta)">' + esc(it.texto) + '</p></div><div class="cartao"><button class="btn" id="grav">● Gravar leitura</button><textarea class="campo" id="ouvido" rows="3" readonly placeholder="O que o app ouviu aparece aqui"></textarea></div>';
    } else {
      corpo += it.itens.map(function (x, i) { return campoResposta(it, i, voz); }).join("");
    }
    var rodape = it.kind === "ler_alto" ? '<button class="btn" id="env" disabled>Enviar leitura</button>' : '<button class="btn" id="env"' + (it.kind === "escolha" ? " disabled" : "") + ">" + (it.kind === "lacunas" ? "Conferir" : it.kind === "escolha" ? "Responder" : "Enviar para correção") + "</button>";
    box.innerHTML = cab + corpo + rodape + (it.origem === "BANCO" ? '<small class="rot" style="text-align:center">Atividade de exemplo da escola</small>' : "");
    var env = $("#env", box);

    /* áudio */
    if ($("#play", box)) $("#play", box).onclick = function () { tocar(it.audio, "en", this); };
    [].forEach.call(box.querySelectorAll("[data-w]"), function (b) { b.onclick = function () { tocar(it.palavras[+b.getAttribute("data-w")].w, "en"); }; });
    [].forEach.call(box.querySelectorAll("[data-q]"), function (b) { b.onclick = function () { tocar(oQueOuvir(it, +b.getAttribute("data-q")), "en"); }; });

    /* escolha */
    var escolhida = -1;
    [].forEach.call(box.querySelectorAll("[data-o]"), function (b) { b.onclick = function () { escolhida = +b.getAttribute("data-o"); [].forEach.call(box.querySelectorAll("[data-o]"), function (x) { x.classList.toggle("on", x === b); }); env.disabled = false; }; });

    /* lacunas */
    var lacs = [].slice.call(box.querySelectorAll("[data-l]"));
    lacs.forEach(function (inp, i) { inp.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); (lacs[i + 1] || env).focus(); } }; });
    [].forEach.call(box.querySelectorAll("[data-b]"), function (b) { b.onclick = function () { var vazio = lacs.filter(function (x) { return !x.value.trim(); })[0]; if (vazio) { vazio.value = b.getAttribute("data-b"); b.classList.add("usada"); } }; });

    /* contador de palavras */
    var tas = [].slice.call(box.querySelectorAll("[data-r]"));
    if ($("#cont", box) && tas[0]) tas[0].oninput = function () { var n = this.value.trim() ? this.value.trim().split(/\s+/).length : 0; $("#cont", box).textContent = n + " de " + it.min + " palavras sugeridas"; };

    /* voz nas respostas */
    function ligaMic(btn, alvo, idioma, aoMudar) {
      btn.onclick = function () {
        var c = st.caps[btn.id || btn.getAttribute("data-mic") || "ler"];
        if (c && c.ativo) { c.stop(); return; }
        N.pararFala();
        c = Captura(idioma, function (t) { alvo.value = t; if (aoMudar) aoMudar(t); }, function () { btn.classList.remove("on"); if (btn.id === "grav") btn.textContent = "● Gravar de novo"; });
        if (c.indisponivel) { toast(S.demo ? "Na demonstração, o microfone só funciona em navegador com reconhecimento de voz (Chrome). Digite a resposta." : "Seu navegador não reconhece voz. Escreva a resposta."); return; }
        st.caps[btn.id || btn.getAttribute("data-mic") || "ler"] = c; st.deVoz = true;
        c.start().then(function () { btn.classList.add("on"); if (btn.id === "grav") btn.textContent = "■ Parar"; }, function () { toast("Permita o microfone no navegador."); });
      };
    }
    [].forEach.call(box.querySelectorAll("[data-mic]"), function (b) { var i = +b.getAttribute("data-mic"); ligaMic(b, tas[i], lingua(it, i)); });
    if ($("#grav", box)) ligaMic($("#grav", box), $("#ouvido", box), "en", function (t) { env.disabled = !t.trim(); });

    /* enviar */
    env.onclick = function () {
      if (st.enviando) return;
      var resp;
      if (it.kind === "escolha") resp = [String(escolhida)];
      else if (it.kind === "lacunas") resp = lacs.map(function (x) { return x.value.trim(); });
      else if (it.kind === "ler_alto") resp = [$("#ouvido", box).value.trim()];
      else resp = tas.map(function (x) { return x.value.trim(); });
      if (it.kind === "aberta" && !resp.some(Boolean)) { toast("Escreva ou fale sua resposta primeiro."); return; }
      Object.keys(st.caps).forEach(function (k) { try { if (st.caps[k].ativo) st.caps[k].stop(); } catch (e) {} });
      st.enviando = true; env.disabled = true; env.textContent = "Corrigindo…"; N.pararFala();
      api("ativ.responder", { id: it.id, respostas: resp, segundos: Math.round((Date.now() - st.t0) / 1000), deVoz: st.deVoz }).then(function (r) {
        N.recarregarPainel().catch(function () {});
        resultado(box, it, r, resp, p);
      }).catch(function (e) { st.enviando = false; env.disabled = false; env.textContent = "Enviar para correção"; falhou(e); });
    };
  }

  /* ---------- resultado ---------- */
  function corNota(n) { return n >= 80 ? "ok" : n >= 60 ? "med" : "baixa"; }
  function resultado(box, it, r, resp, p) {
    var h = "", n = Number(r.nota) || 0;
    var origem = { IA: "Correção por IA", AUTO: "Correção automática", REGRAS: "Correção simples (IA desligada)" }[r.origem] || "";
    h += '<span class="rot">' + esc(it.rotulo) + '</span><div class="nota-g ' + corNota(n) + '"><b>' + n + '</b><span>de 100</span></div>' + (r.resumo ? "<p class=\"resumo\">" + esc(r.resumo) + "</p>" : "");
    if (it.kind === "ler_alto") {
      h += '<div class="cartao texto grande leitura">' + (r.palavras || []).map(function (w) { return '<span class="' + (w.ok ? "pal-ok" : "pal-x") + '">' + esc(w.w) + "</span>"; }).join(" ") + "</div>" + (r.ouvido ? '<p class="ouvido">O app ouviu: “' + esc(r.ouvido) + "”</p>" : "") +
        ((r.faltou || []).length ? '<div class="chips">' + r.faltou.map(function (w) { return '<button class="chip" data-w="' + esc(w) + '">▶ ' + esc(w) + "</button>"; }).join("") + "</div><small class=\"rot\">Toque numa palavra vermelha para ouvir como se fala.</small>" : "");
    } else if (it.kind === "lacunas") {
      h += '<div class="cartao">' + r.itens.map(function (x, i) { return '<div class="linha-it"><div><b>' + (i + 1) + ". " + esc(x.resposta || "(vazio)") + "</b>" + (x.ok ? "" : "<small>Certo: " + esc(x.esperado) + "</small>") + '</div><span class="tag' + (x.ok ? "" : " alerta") + '">' + (x.ok ? "certo" : "errado") + "</span></div>"; }).join("") + "</div>";
    } else if (it.kind === "escolha") {
      var x = r.itens[0];
      h += '<div class="cartao"><span class="tag' + (x.ok ? "" : " alerta") + '" style="align-self:flex-start">' + (x.ok ? "Certo" : "Errado") + "</span>" + (x.ok ? "" : "<p style=\"color:var(--tinta)\">Resposta certa: <b>" + esc(x.esperado) + "</b></p>") + (x.feedback ? "<p>" + esc(x.feedback) + "</p>" : "") + "</div>";
    } else {
      h += r.itens.map(function (x, i) {
        var q = it.itens[i] || {};
        return '<div class="cartao"><b class="pergunta">' + esc(q.q) + '</b><p class="sua">Você: ' + esc(resp[i] || "(sem resposta)") + "</p>" + (x.nota !== undefined ? '<span class="tag ' + (x.nota >= 70 ? "" : "cinza") + '" style="align-self:flex-start">' + x.nota + " pts</span>" : "") + (x.feedback ? "<p>" + esc(x.feedback) + "</p>" : "") + (x.melhor ? '<p class="resp"><small class="rot">Melhor versão</small><br>' + esc(x.melhor) + "</p>" : "") + "</div>";
      }).join("");
    }
    if ((r.correcoes || []).length) h += '<div class="sec"><span class="rot">Para lembrar</span>' + r.correcoes.map(function (c) { return '<div class="bol dica"><s>' + esc(c.original) + "</s> → <em>" + esc(c.corrigido) + "</em><br>" + esc(c.explicacao) + "</div>"; }).join("") + "</div>";
    if (r.transcricao) h += '<div class="cartao"><div class="linha2"><span class="rot">O que foi dito</span><button class="pill" id="re">▶ Ouvir</button></div><p style="color:var(--tinta)">' + esc(r.transcricao) + "</p></div>";
    h += '<small class="rot" style="text-align:center">' + origem + "</small>";
    h += '<button class="btn" id="outra">Outra atividade igual</button><button class="btn fantasma" id="lista">Voltar às atividades</button>';
    box.innerHTML = h; N.rolarTopo();
    if ($("#re", box)) $("#re", box).onclick = function () { tocar(r.transcricao, "en"); };
    [].forEach.call(box.querySelectorAll("[data-w]"), function (b) { b.onclick = function () { tocar(b.getAttribute("data-w"), "en"); }; });
    $("#outra", box).onclick = function () { go("atividade", p); };
    $("#lista", box).onclick = function () { go("habilidade", { h: habDoTipo(it.tipo).id }); };
  }

  /* ---------- demonstração (sem servidor) ---------- */
  var DEMO = {
    ouvir_selecionar: { audio: "Hi! Can I have a coffee with milk, please? Sure. That will be three dollars.", itens: [{ q: "What does the customer order?", opcoes: ["A tea with sugar", "A coffee with milk", "A juice"], correta: 1, explicacao: "O cliente pede \"a coffee with milk\"." }] },
    ouvir_escrever: { audio: "On Saturday I went to the market with my sister. We bought fruit and bread, and then we had lunch in the park.", itens: [{ q: "Where did they have lunch?", modelo: "They had lunch in the park." }] },
    ouvir_traduzir: { audio: "My name is Carla and I work in a small bank.", itens: [{ q: "Escreva em português o que você ouviu.", modelo: "Meu nome é Carla e eu trabalho em um banco pequeno." }] },
    ouvir_falar: { audio: "I usually wake up at six, drink coffee, and take the bus to work. I start at eight.", itens: [{ q: "What time does the speaker start work? Answer out loud.", modelo: "The speaker starts work at eight." }] },
    ouvir_resumir: { audio: "I live in a small town near the sea. In summer many tourists come here. I like the winter more, because it is quiet and I can walk on the beach alone.", itens: [{ q: "Resuma em inglês o que você ouviu.", modelo: "The speaker lives near the sea and prefers winter because it is quiet." }] },
    falar_cena: { cena: "É um dia de sol. Uma família está na praia: as crianças constroem um castelo de areia e os pais estão sentados sob um guarda-sol.", emojis: ["🏖️", "☀️", "👨‍👩‍👧", "🏰"], palavras: ["beach", "sand", "umbrella", "sunny"], itens: [{ q: "Descreva a cena falando em inglês.", modelo: "It is a sunny day at the beach. The children are building a sand castle." }] },
    falar_frases: { palavras: [{ w: "deadline", pt: "prazo" }, { w: "gift", pt: "presente" }, { w: "crowded", pt: "lotado" }], itens: [{ q: "Fale uma frase com \"deadline\" (prazo).", modelo: "" }, { q: "Fale uma frase com \"gift\" (presente).", modelo: "" }, { q: "Fale uma frase com \"crowded\" (lotado).", modelo: "" }] },
    falar_ler_alto: { texto: "Every morning I wake up at seven. I have breakfast with my family and then I go to work by bus. In the evening I like to cook dinner and watch a movie.", itens: [] },
    ler_compreensao: { texto: "Every Saturday, Marta goes to the street market near her house. She buys fresh vegetables from Mr. Silva, who has the best tomatoes in the neighborhood. Then she has a coffee and talks with her friends before going home.", itens: [{ q: "Who sells the vegetables to Marta?", modelo: "Mr. Silva sells the vegetables." }, { q: "What does Marta do after shopping?", modelo: "She has a coffee and talks with her friends." }] },
    ler_vocabulario: { palavras: [{ w: "reliable", definicao: "Someone or something you can trust.", sinonimo: "dependable", exemplo: "He is a reliable colleague.", pt: "confiável" }, { w: "improve", definicao: "To make something better.", sinonimo: "get better", exemplo: "I want to improve my English.", pt: "melhorar" }], itens: [{ q: "Escreva uma frase com \"reliable\".", modelo: "He is a reliable colleague." }, { q: "Escreva uma frase com \"improve\".", modelo: "I want to improve my English." }] },
    escrever_cenario: { situacao: "Seu projeto vai atrasar duas semanas por um problema com um fornecedor. Você precisa avisar seu chefe por e-mail.", instrucao: "Escreva um e-mail profissional em inglês.", dicas: ["Seja direto e honesto", "Explique a causa e o novo prazo", "Proponha uma solução"], min: 50, itens: [{ q: "Escreva seu e-mail em inglês.", modelo: "Dear Mr. Lopes, I am writing to let you know that the project will be delayed by two weeks because of a problem with our supplier." }] },
    escrever_lacunas: { texto: "Every day I ___ up at seven. I ___ breakfast and then I go ___ work. In the evening I ___ TV with my family.", respostas: ["wake", "have", "to", "watch"], itens: [] },
    traduzir_frases: { direcao: "pt-en", itens: [{ orig: "Eu moro perto do trabalho.", modelo: "I live near work." }, { orig: "Você pode me ajudar, por favor?", modelo: "Can you help me, please?" }, { orig: "Preciso entregar o relatório amanhã.", modelo: "I need to deliver the report tomorrow." }] },
    traduzir_criar: { texto: "Yesterday I went to the mall to buy a gift. I compared prices in three stores and finally chose a wallet, because it was cheap and useful.", palavras: [{ w: "gift", pt: "presente" }, { w: "wallet", pt: "carteira" }, { w: "cheap", pt: "barato" }], itens: [{ q: "Traduza o texto para o português.", modelo: "Ontem fui ao shopping comprar um presente. Comparei preços em três lojas e escolhi uma carteira, porque era barata e útil." }, { q: "Crie uma frase em inglês com \"gift\".", modelo: "" }, { q: "Crie uma frase em inglês com \"wallet\".", modelo: "" }] }
  };
  var DEF = { ouvir_selecionar: ["escuta", "escolha", ""], ouvir_escrever: ["escuta", "aberta", "texto"], ouvir_traduzir: ["escuta", "aberta", "ambos"], ouvir_falar: ["escuta", "aberta", "voz"], ouvir_resumir: ["escuta", "aberta", "ambos"], falar_cena: ["fala", "aberta", "voz"], falar_frases: ["fala", "aberta", "voz"], falar_ler_alto: ["fala", "ler_alto", "voz"], ler_compreensao: ["leitura", "aberta", "texto"], ler_vocabulario: ["leitura", "aberta", "texto"], escrever_cenario: ["escrita", "aberta", "texto"], escrever_lacunas: ["escrita", "lacunas", ""], traduzir_frases: ["traducao", "aberta", "ambos"], traduzir_criar: ["traducao", "aberta", "ambos"] };
  var gab = {};
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim(); }
  var R = N.demoRotas;
  R["ativ.gerar"] = function (a) {
    var d = DEMO[a.tipo]; if (!d) throw new Error("Atividade desconhecida.");
    var it = JSON.parse(JSON.stringify(d)), def = DEF[a.tipo], id = "DEMO" + Date.now() + Math.floor(Math.random() * 1000);
    if (a.tipo === "traduzir_frases" && a.direcao === "en-pt") { it.direcao = "en-pt"; it.itens = it.itens.map(function (x) { return { orig: x.modelo, modelo: x.orig }; }); }
    gab[id] = { tipo: a.tipo, it: it };
    var banco = it.respostas ? it.respostas.slice().reverse() : [];
    return { id: id, tipo: a.tipo, hab: def[0], kind: def[1], entrada: def[2], rotulo: TIPOS[a.tipo][0], titulo: TIPOS[a.tipo][0], instrucao: TIPOS[a.tipo][1], audio: it.audio || "", texto: it.texto || "", cena: it.cena || "", situacao: it.situacao || "", emojis: it.emojis || [], palavras: it.palavras || [], dicas: it.dicas || [], min: it.min || 0, direcao: it.direcao || "", origem: "BANCO",
      itens: it.itens.map(function (x) { return { q: x.q || x.orig || "", opcoes: x.opcoes || null }; }), lacunas: it.respostas ? it.respostas.length : 0, banco: banco };
  };
  R["ativ.responder"] = function (a, st) {
    var g = gab[a.id]; if (!g) throw new Error("Esta atividade expirou ou já foi respondida. Gere outra.");
    delete gab[a.id];
    var it = g.it, def = DEF[g.tipo], resp = a.respostas || [], r;
    if (def[1] === "escolha") { var q = it.itens[0], ok = Number(resp[0]) === q.correta; r = { nota: ok ? 100 : 0, itens: [{ ok: ok, esperado: q.opcoes[q.correta], feedback: q.explicacao }], origem: "AUTO", resumo: ok ? "Muito bem! Você entendeu o áudio." : "Quase! Ouça de novo e leia a transcrição abaixo." }; }
    else if (def[1] === "lacunas") { var itens = it.respostas.map(function (x, i) { return { ok: norm(resp[i]) === norm(x), esperado: x, resposta: resp[i] || "" }; }), n = itens.filter(function (x) { return x.ok; }).length; r = { nota: Math.round(n * 100 / itens.length), itens: itens, origem: "AUTO", resumo: n === itens.length ? "Perfeito! Todas as lacunas certas." : n + " de " + itens.length + " lacunas certas." }; }
    else if (def[1] === "ler_alto") {
      var orig = it.texto.split(/\s+/), o = orig.map(norm), d = norm(resp[0]).split(" ").filter(Boolean), T = [], i, j;
      for (i = 0; i <= o.length; i++) T.push(new Array(d.length + 1).fill(0));
      for (i = 1; i <= o.length; i++) for (j = 1; j <= d.length; j++) T[i][j] = o[i - 1] === d[j - 1] ? T[i - 1][j - 1] + 1 : Math.max(T[i - 1][j], T[i][j - 1]);
      var okk = new Array(o.length).fill(false); i = o.length; j = d.length;
      while (i > 0 && j > 0) { if (o[i - 1] === d[j - 1]) { okk[i - 1] = true; i--; j--; } else if (T[i - 1][j] >= T[i][j - 1]) i--; else j--; }
      var ac = okk.filter(Boolean).length, nota = Math.round(ac * 100 / o.length);
      r = { nota: nota, palavras: orig.map(function (w, k) { return { w: w, ok: okk[k] }; }), ouvido: resp[0] || "", faltou: orig.filter(function (w, k) { return !okk[k]; }).map(function (w) { return w.replace(/[^A-Za-z']/g, ""); }).filter(Boolean).slice(0, 8), origem: "AUTO", resumo: nota >= 90 ? "Ótima leitura! O app entendeu quase tudo." : "O app entendeu " + ac + " de " + o.length + " palavras. Isto aponta palavras difíceis; não mede a pronúncia fina." };
    } else {
      if (!resp.some(function (x) { return String(x).trim(); })) throw new Error("Escreva ou fale sua resposta primeiro.");
      var its = it.itens.map(function (x, k) { var t = String(resp[k] || "").trim(), nn = !t ? 0 : Math.min(88, 45 + t.split(/\s+/).length * 4); return { nota: nn, feedback: t ? "Boa tentativa! (correção de exemplo da demonstração)" : "Sem resposta.", melhor: x.modelo || "" }; });
      r = { nota: Math.round(its.reduce(function (s, x) { return s + x.nota; }, 0) / its.length), notas: {}, itens: its, correcoes: [], origem: "REGRAS", resumo: "Demonstração: a correção real é feita pela IA do Gemini." };
    }
    st.prog = st.prog || {}; st.prog[def[0]] = Math.round(st.prog[def[0]] ? st.prog[def[0]] * 0.7 + r.nota * 0.3 : r.nota);
    r.tipo = g.tipo; r.hab = def[0]; r.rotulo = TIPOS[g.tipo][0]; r.transcricao = it.audio || "";
    return r;
  };
})();
