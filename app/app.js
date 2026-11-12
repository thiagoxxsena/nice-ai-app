/* Nice AI — app (V3): aluno, professor, gestão e sustentação. Front estático; a IA e os dados ficam no Apps Script (rotas api). */
(function () {
  "use strict";
  var CFG = window.NICE_CFG || {};
  var tela = document.getElementById("tela"), tabsEl = document.getElementById("tabs"), badge = document.getElementById("badge");
  var S = { token: "", user: null, painel: null, demo: false, demoPerfil: "ALUNO", area: "aluno", sessao: null, voz: true, vozNatural: true, ativo: false, rec: null, live: null, q: { i: 0 } };
  var VZ = window.NiceVoz || null;
  try { S.token = sessionStorage.getItem("nice_tk") || ""; } catch (e) {}

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function hojeStr() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function email() { return (S.user && S.user.email) || "anon"; }
  function perfil() { return lsGet("nice_p_" + email(), {}); }
  function salvaPerfil(o) { var p = perfil(); for (var k in o) p[k] = o[k]; lsSet("nice_p_" + email(), p); }
  function seg() { return lsGet("nice_s_" + email() + "_" + hojeStr(), 0); }
  function meta() { return Number(perfil().tempo) || 15; }
  var toastT;
  function toast(m) { var t = document.getElementById("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 3200); }
  function $(s, r) { return (r || document).querySelector(s); }

  var NIVEIS = { A1: "Iniciante", A2: "Básico", B1: "Intermediário", B2: "Intermediário superior", C1: "Avançado" };
  var TRILHAS = {
    Trabalho: ["Reuniões", "E-mails", "Apresentações"], Viagem: ["Aeroporto", "Hotel", "Restaurante"],
    Imigração: ["Documentos", "Moradia", "Trabalho"], Conversação: ["Rotina", "Opinião", "Cultura"]
  };
  var CENAS = [
    { id: "cafe", titulo: "Café em Nova York", papel: "um barista", desc: "pedir um café em Nova York", bolha: "Hi there! What can I get for you?" },
    { id: "entrevista", titulo: "Entrevista de emprego", papel: "um recrutador", desc: "uma entrevista de emprego em inglês", bolha: "Welcome! Please, tell me about yourself." },
    { id: "hotel", titulo: "Check-in no hotel", papel: "a recepcionista de um hotel", desc: "fazer check-in em um hotel", bolha: "Good evening! Do you have a reservation?" },
    { id: "reuniao", titulo: "Reunião com cliente", papel: "um cliente", desc: "uma reunião de negócios", bolha: "Thanks for joining. Shall we start with the schedule?" }
  ];

  /* ---------- API ---------- */
  function configurado() { return CFG.API_URL && !/COLE_AQUI/.test(CFG.API_URL); }
  function api(rota, args) {
    if (S.demo) return Demo.api(rota, args || {});
    if (!configurado()) return Promise.reject(new Error("O servidor ainda não está configurado."));
    return fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ rota: rota, args: args || {}, reqId: Date.now() + "-" + Math.random().toString(36).slice(2), token: S.token }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j.erro) { var e = new Error(j.erro); e.auth = !!j.auth; throw e; } return j.dados; });
  }
  function falhou(err) {
    if (err && err.auth) { sair(true); toast(err.message || "Entre novamente."); return; }
    toast((err && err.message) || "Algo deu errado. Tente de novo.");
  }

  /* ---------- voz ---------- */
  var cacheVoz = {}, ordemVoz = [];
  function falarNavegador(texto, idioma) {
    if (!window.speechSynthesis) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(texto); u.lang = idioma === "pt" ? "pt-BR" : "en-US"; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {}
  }
  /* Busca o áudio no servidor. Guarda em memória e junta pedidos iguais (pré-carga e clique no mesmo texto esperam a mesma resposta). */
  var vozPend = {};
  function buscarVoz(texto, idioma) {
    var k = (idioma === "pt" ? "pt" : "en") + "|" + texto;
    if (cacheVoz[k]) return Promise.resolve(cacheVoz[k]);
    if (vozPend[k]) return vozPend[k];
    if (VZ) VZ.saidaTts.abrir();
    vozPend[k] = api("voz.falar", { texto: texto, idioma: idioma === "pt" ? "pt" : "en" }).then(function (r) {
      delete vozPend[k];
      if (String(r.audio).length < 3000000) { cacheVoz[k] = r; ordemVoz.push(k); if (ordemVoz.length > 16) delete cacheVoz[ordemVoz.shift()]; }
      return r;
    }, function (e) { delete vozPend[k]; throw e; });
    return vozPend[k];
  }
  /* Pré-carga: pede o áudio antes de o aluno clicar em Ouvir. Não toca nada e ignora falhas. */
  function prefetchVoz(texto, idioma) {
    if (S.demo || !S.vozNatural || !VZ || !texto) return;
    buscarVoz(texto, idioma).catch(function () {});
  }
  /* Voz natural do Gemini (via servidor). Sem chave, sem rede ou na demonstração: voz do navegador.
     Devolve uma promessa que termina quando a fala COMEÇA (true) ou quando foi cancelada ou caiu para a voz do navegador (false).
     opc.timeout: quanto esperar o servidor antes de usar a voz do navegador (padrão 9 s no chat; as atividades esperam mais). */
  function falar(texto, idioma, opc) {
    if (!S.voz || !texto) return Promise.resolve(false);
    pararFala();
    if (S.demo || !S.vozNatural || !VZ) { falarNavegador(texto, idioma); return Promise.resolve(false); }
    var meu = Date.now() + Math.random(), limite = (opc && opc.timeout) || 9000;
    S.falaId = meu;
    return new Promise(function (ok) {
      var desistiu = false, t = setTimeout(function () { desistiu = true; if (S.falaId === meu) falarNavegador(texto, idioma); ok(false); }, limite);
      buscarVoz(texto, idioma).then(function (r) {
        clearTimeout(t);
        if (desistiu) return;
        if (S.falaId !== meu || !S.voz) { ok(false); return; }
        VZ.falarPcm(r.audio, r.rate); ok(true);
      }).catch(function (err) {
        clearTimeout(t);
        if (/chave do Gemini|indisponível/.test(err.message)) S.vozNatural = false;
        if (!desistiu && S.falaId === meu) falarNavegador(texto, idioma);
        ok(false);
      });
    });
  }
  function pararFala() {
    S.falaId = 0;
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    try { if (VZ) VZ.saidaTts.parar(); } catch (e) {}
  }
  function parar() {
    pararFala();
    try { if (S.rec) S.rec.stop(); } catch (e) {}
    try { if (S.grav) S.grav.parar(); } catch (e) {}
    try { if (S.live) S.live.fechar(); } catch (e) {}
    S.rec = null; S.grav = null; S.live = null; S.ativo = false;
  }
  /* Destrava o áudio no primeiro toque (exigência do iPhone). */
  document.addEventListener("click", function () { if (VZ && !S.demo && S.user) VZ.saidaTts.abrir(); }, { passive: true });

  /* ---------- tempo de prática ---------- */
  var acum = 0;
  setInterval(function () {
    if (!S.ativo || document.visibilityState !== "visible" || !S.user) return;
    var k = "nice_s_" + email() + "_" + hojeStr();
    acum++;
    if (acum % 5 === 0) lsSet(k, lsGet(k, 0) + 5);
  }, 1000);

  /* ---------- roteador ---------- */
  var V = {};
  var AREAS = {
    aluno: { nome: "Aluno", abas: [["painel", "Início"], ["praticar", "Praticar"], ["progresso", "Progresso"], ["perfil", "Perfil"]] },
    professor: { nome: "Professor", abas: [["profInicio", "Início"], ["profAlunos", "Alunos"], ["profDuvidas", "Dúvidas"], ["profAgenda", "Agenda"]] },
    gestao: { nome: "Gestão", abas: [["gesInicio", "Indicadores"], ["gesUsuarios", "Acessos"], ["gesAgenda", "Agenda"], ["gesPlanos", "Planos"], ["gesMateriais", "Materiais"]] },
    suporte: { nome: "Sustentação", abas: [["supInicio", "Saúde"], ["supIA", "Chave e voz"], ["supCusto", "Custos"], ["supEquipe", "Equipe"]] }
  };
  var appEl = document.querySelector(".app"), areaSel = document.getElementById("area"), sairTop = document.getElementById("sair-top");
  sairTop.addEventListener("click", function () { sair(); });
  function areas() { return (S.user && S.user.areas && S.user.areas.length) ? S.user.areas : ["aluno"]; }
  function montarArea(a) {
    S.area = a;
    var ar = AREAS[a] || AREAS.aluno, l = areas();
    tabsEl.innerHTML = ar.abas.map(function (x) { return '<button data-t="' + x[0] + '">' + esc(x[1]) + "</button>"; }).join("");
    appEl.classList.toggle("equipe", a !== "aluno");
    areaSel.hidden = !S.user || l.length < 2;
    areaSel.innerHTML = l.map(function (x) { return '<option value="' + x + '"' + (x === a ? " selected" : "") + ">" + esc((AREAS[x] || {}).nome || x) + "</option>"; }).join("");
  }
  areaSel.addEventListener("change", function () { abrirArea(areaSel.value); });
  function abrirArea(a) {
    if (S.user) lsSet("nice_area_" + email(), a);
    montarArea(a);
    if (a === "aluno") { go("carregando"); carregarPainel().then(proximo, function (e) { falhou(e); go("perfil"); }); }
    else go(AREAS[a].abas[0][0]);
  }
  function go(nome, p) {
    parar();
    S.tela = nome;
    var v = V[nome](p || {});
    tela.className = v.classe || "";
    tela.innerHTML = v.html;
    tela.scrollTop = 0;
    var abas = (AREAS[S.area] || AREAS.aluno).abas.map(function (x) { return x[0]; });
    var atual = v.aba || nome, comAbas = abas.indexOf(atual) >= 0;
    tabsEl.hidden = !comAbas;
    if (comAbas) [].forEach.call(tabsEl.querySelectorAll("button"), function (b) { b.classList.toggle("on", b.getAttribute("data-t") === atual); });
    badge.textContent = S.demo ? "Demonstração" : (S.user ? String(S.user.nome || "").split(" ")[0] : "");
    badge.className = "badge" + (S.demo ? " demo" : "");
    badge.hidden = !badge.textContent;
    sairTop.hidden = !S.user;
    if (v.bind) v.bind(tela);
  }
  tabsEl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(b.getAttribute("data-t")); });

  function proximo() {
    var p = S.painel || {}, pf = perfil();
    if (p.precisaNivelamento) go(pf.objetivo ? "teste" : "quiz");
    else if (!pf.plano) go("plano");
    else go("painel");
  }
  function carregarPainel() { return api("aluno.painel").then(function (p) { S.painel = p; return p; }); }

  /* ---------- login / sessão ---------- */
  function entrar() {
    go("carregando");
    return api("bootstrap").then(function (b) {
      S.user = b.usuario;
      var l = areas(), salva = lsGet("nice_area_" + email(), "");
      abrirArea(!S.demo && l.indexOf(salva) >= 0 ? salva : l[0]);
    }).catch(function (err) { S.user = null; montarArea("aluno"); go("login", { erro: err.message }); if (err.auth) { S.token = ""; try { sessionStorage.removeItem("nice_tk"); } catch (e) {} } });
  }
  function sair(silencioso) {
    parar(); S.token = ""; S.user = null; S.painel = null; S.demo = false; montarArea("aluno");
    try { sessionStorage.removeItem("nice_tk"); } catch (e) {}
    try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
    go("login");
  }
  function iniciarGSI(n) {
    var alvo = $("#gsi");
    if (!alvo) return;
    if (!window.google || !google.accounts) { if ((n || 0) < 25) setTimeout(function () { iniciarGSI((n || 0) + 1); }, 300); return; }
    google.accounts.id.initialize({ client_id: CFG.CLIENT_ID, auto_select: false, callback: function (r) {
      S.token = r.credential; try { sessionStorage.setItem("nice_tk", S.token); } catch (e) {} entrar(); } });
    google.accounts.id.renderButton(alvo, { theme: "filled_black", size: "large", text: "continue_with", locale: "pt-BR", width: Math.min(300, tela.clientWidth - 40) });
  }

  /* ---------- telas ---------- */
  V.carregando = function () { return { html: '<div class="grow" style="display:grid;place-items:center"><span class="rot">Carregando…</span></div>' }; };

  V.login = function (p) {
    return { classe: "login", html:
      '<div class="hero"><span class="rot">Nice English School</span>' +
      '<h1>Fale inglês <span>de verdade.</span></h1>' +
      '<p>15 minutos por dia com um tutor de IA que se adapta ao seu nível. Sem prova escrita.</p></div>' +
      (p.erro ? '<div class="erro" role="alert">' + esc(p.erro) + "</div>" : "") +
      (configurado() ? '<div id="gsi" aria-label="Entrar com Google"></div>' : '<div class="info">O login Google ainda não está configurado neste endereço. Use a demonstração.</div>') +
      '<div class="demo-l"><span class="rot">Ver demonstração como</span><div class="demo-b">' +
      [["ALUNO", "Aluno"], ["PROFESSOR", "Professor"], ["ADMIN", "Gestão"], ["SUPORTE", "Sustentação"]].map(function (x) { return '<button class="pill" data-demo="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div></div>" +
      '<p class="nota-legal">Seu e-mail precisa estar cadastrado pela escola. Idade mínima: 16 anos. Usamos IA para conversar e corrigir; o áudio não é guardado.</p>',
      bind: function (el) {
        [].forEach.call(el.querySelectorAll("[data-demo]"), function (b) { b.onclick = function () { S.demo = true; S.demoPerfil = b.getAttribute("data-demo"); Demo.reset(); entrar(); }; });
        if (configurado()) iniciarGSI(0);
      } };
  };

  var QUIZ = [
    { k: "objetivo", t: "Qual é o seu objetivo principal?", o: [["Trabalho", "Reuniões, e-mails, carreira"], ["Viagem", "Aeroporto, hotel, restaurante"], ["Imigração", "Documentos, moradia, rotina"], ["Conversação", "Falar sobre qualquer assunto"]] },
    { k: "nivel", t: "Como você vê o seu nível hoje?", o: [["Iniciante", "Entendo pouco"], ["Intermediário", "Me viro, mas travo"], ["Avançado", "Falo bem, quero fluência"]] },
    { k: "tempo", t: "Quanto tempo você tem por dia?", o: [["5", "Rápido, mas todo dia"], ["10", "Um bom ritmo"], ["15", "O ideal para evoluir"]] }
  ];
  V.quiz = function () {
    var q = QUIZ[S.q.i];
    var ops = q.o.map(function (o, i) { return '<button class="op" data-i="' + i + '"><span>' + esc(q.k === "tempo" ? o[0] + " min" : o[0]) + "<small>" + esc(o[1]) + "</small></span><span>→</span></button>"; }).join("");
    return { classe: "", html:
      '<div class="prog" aria-hidden="true"><i style="width:' + Math.round((S.q.i + 1) / QUIZ.length * 100) + '%"></i></div>' +
      '<span class="rot">Pergunta ' + (S.q.i + 1) + " de " + QUIZ.length + "</span><h2>" + esc(q.t) + '</h2><div class="opcoes">' + ops + "</div>",
      bind: function (el) {
        [].forEach.call(el.querySelectorAll(".op"), function (b) { b.onclick = function () {
          var val = q.o[+b.getAttribute("data-i")][0]; S.q[q.k] = val;
          if (S.q.i < QUIZ.length - 1) { S.q.i++; go("quiz"); return; }
          salvaPerfil({ objetivo: S.q.objetivo, nivelDeclarado: S.q.nivel, tempo: Number(S.q.tempo) });
          api("aluno.perfilSalvar", { objetivo: S.q.objetivo, idioma: "pt" }).catch(function () {});
          go("teste");
        }; });
      } };
  };

  /* ----- conversa (teste de nível e prática) ----- */
  function chat(cfg) {
    var sess = { id: "", n: 0, busy: false };
    return { classe: "chat", html:
      '<div class="chat-cab"><div><span class="rot">' + esc(cfg.rot) + "</span><h2>" + esc(cfg.titulo) + '</h2></div><button class="pill" id="voz" aria-pressed="true">Voz da IA: ligada</button></div>' +
      (cfg.meter ? '<div class="meter"><div class="linha2"><span class="rot" id="pg-t">Pergunta 1 de ' + cfg.total + '</span><span class="rot" id="nt"></span></div><div class="prog"><i id="pg" style="width:0"></i></div></div>' : "") +
      '<div class="msgs" id="msgs" aria-live="polite"></div>' +
      '<div class="comp"><div class="comp-l"><input id="txt" placeholder="Escreva ou use o microfone" autocomplete="off" maxlength="500" aria-label="Sua resposta"><button class="ic mic" id="mic" aria-label="Falar">●</button><button class="ic" id="env" aria-label="Enviar">→</button></div>' +
      '<div class="comp-a"><button class="pill" id="trav">Não sei o que dizer</button>' + (cfg.encerrar ? '<button class="pill" id="fim">Encerrar</button>' : "") + "</div></div>",
      bind: function (el) {
        var msgs = $("#msgs", el), txt = $("#txt", el), env = $("#env", el), mic = $("#mic", el), trav = $("#trav", el), dig = null;
        S.ativo = true;
        function add(tipo, html) { var d = document.createElement("div"); d.className = "bol " + tipo; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
        function digitando(on) { if (on && !dig) { dig = document.createElement("div"); dig.className = "digita"; dig.innerHTML = "<i></i><i></i><i></i>"; msgs.appendChild(dig); msgs.scrollTop = msgs.scrollHeight; } else if (!on && dig) { dig.remove(); dig = null; } }
        function trava(b) { sess.busy = b; env.disabled = b; trav.disabled = b; txt.disabled = b; }
        function dica(cs) {
          if (!cs || !cs.length) return;
          add("dica", "<b>Dica gentil</b>" + cs.slice(0, 2).map(function (c) { return "<s>" + esc(c.original) + "</s> → <em>" + esc(c.corrigido) + "</em><br>" + esc(c.explicacao) + "<br>"; }).join(""));
        }
        function enviar(texto, o) {
          o = o || {};
          if (sess.busy || !sess.id) return;
          if (!o.oculto) { if (o.travou) add("sis", "Você pediu ajuda"); else add("eu", esc(texto)); }
          txt.value = ""; trava(true); digitando(true);
          api("sessao.enviar", { sessaoId: sess.id, texto: texto, travou: !!o.travou }).then(function (r) {
            digitando(false);
            if (!o.oculto && !o.travou) sess.n++;
            if (!o.travou) dica(r.correcoes);
            add(o.travou ? "ajuda" : "ia", esc(r.resposta)); falar(r.resposta, r.idioma);
            if (cfg.meter) {
              var n = Math.min(sess.n + 1, cfg.total);
              $("#pg-t", el).textContent = "Pergunta " + n + " de " + cfg.total;
              $("#pg", el).style.width = Math.round(sess.n / cfg.total * 100) + "%";
              if (r.nota) $("#nt", el).textContent = "Nota da última: " + r.nota;
            }
            trava(false);
            if (r.fim && cfg.aoFim) { trava(true); add("sis", "Analisando seu nível…"); setTimeout(function () { cfg.aoFim(r); }, 1200); }
          }).catch(function (err) { digitando(false); trava(false); txt.value = o.travou ? "" : texto; falhou(err); });
        }
        $("#voz", el).onclick = function () { S.voz = !S.voz; this.textContent = "Voz da IA: " + (S.voz ? "ligada" : "desligada"); this.setAttribute("aria-pressed", S.voz); if (!S.voz) pararFala(); };
        env.onclick = function () { var t = txt.value.trim(); if (t) enviar(t); };
        txt.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); env.onclick(); } };
        trav.onclick = function () { enviar("", { travou: true }); };
        if ($("#fim", el)) $("#fim", el).onclick = function () { api("sessao.encerrar", { sessaoId: sess.id }).catch(function () {}); carregarPainel().then(function () { go("painel"); }, function () { go("painel"); }); };
        mic.onclick = function () {
          if (S.rec) { try { S.rec.stop(); } catch (e) {} return; }
          if (S.grav) {
            var g = S.grav; S.grav = null; mic.classList.remove("on"); txt.placeholder = "Transcrevendo…";
            g.parar().then(function (a) {
              txt.placeholder = "Escreva ou use o microfone";
              if (!a || !a.audio) return;
              return api("voz.transcrever", { audio: a.audio, mime: a.mime, segundos: a.segundos, idioma: "en" }).then(function (r) { if (r.texto) enviar(r.texto); else toast("Não ouvi nada. Tente de novo."); });
            }).catch(function (err) { txt.placeholder = "Escreva ou use o microfone"; falhou(err); });
            return;
          }
          var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
          pararFala();
          /* Sem reconhecimento no navegador (ou iPhone, onde ele falha muito): grava e transcreve no servidor com o Gemini. */
          if (!SR || (/iPhone|iPad|iPod/.test(navigator.userAgent) && !S.demo)) {
            if (S.demo || !S.vozNatural || !VZ || !VZ.Gravador.disponivel()) { toast("Seu navegador não reconhece voz. Digite a resposta."); return; }
            var gr = new VZ.Gravador();
            gr.iniciar().then(function () { S.grav = gr; mic.classList.add("on"); txt.placeholder = "Gravando… toque de novo para enviar"; }, function () { toast("Permita o microfone no navegador."); });
            return;
          }
          var r = new SR(), final = "";
          r.lang = "en-US"; r.interimResults = true; r.continuous = false;
          r.onresult = function (e) { var t = ""; for (var i = 0; i < e.results.length; i++) { t += e.results[i][0].transcript; if (e.results[i].isFinal) final = t; } txt.value = t; };
          r.onend = function () { S.rec = null; mic.classList.remove("on"); if (final) enviar(final.trim()); };
          r.onerror = function (e) { S.rec = null; mic.classList.remove("on"); toast(e.error === "not-allowed" ? "Permita o microfone no navegador." : "Não consegui ouvir. Tente de novo."); };
          try { r.start(); S.rec = r; mic.classList.add("on"); } catch (e) {}
        };
        trava(true);
        api("sessao.iniciar", { modulo: cfg.modulo }).then(function (s) {
          sess.id = s.sessaoId; trava(false);
          if (cfg.cenario) { enviar(cfg.cenario, { oculto: true }); } else { add("ia", esc(s.abertura)); falar(s.abertura, "en"); }
        }).catch(function (err) { trava(false); falhou(err); add("sis", "Não foi possível iniciar a conversa."); });
      } };
  }

  function podeLive() { return !S.demo && S.vozNatural && VZ && VZ.suportaLive() && !(S.painel && S.painel.iaAtiva === false) && !S.semLive; }
  V.teste = function (p) {
    if (!p.texto && podeLive()) return V.live({ modulo: "nivelamento", titulo: "Converse com o Alex", rot: "Teste de nível por voz" });
    return chat({ modulo: "nivelamento", rot: "Teste de nível", titulo: "Converse com o Alex", meter: true, total: 7,
      aoFim: function () { carregarPainel().then(function () { go("resultado"); }, function () { go("resultado"); }); } });
  };

  V.pratica = function (p) {
    var c = CENAS.filter(function (x) { return x.id === p.cena; })[0] || CENAS[0];
    if (!p.texto && podeLive()) return V.live({ modulo: "fala", cena: c.desc + ". You play " + c.papel + ". Open the scene with this line or similar: " + c.bolha, titulo: c.titulo, rot: "Prática por voz", cenaId: c.id });
    var cenario = "Let's role-play. Scenario: " + c.desc + ". You play " + c.papel + ". Keep every reply under 30 words, stay in character and wait for my answer. Start the scene with one short line.";
    return chat({ modulo: "fala", rot: "Prática por voz", titulo: c.titulo, cenario: cenario, encerrar: true, aba: "praticar" });
  };

  /* ----- conversa ao vivo (Gemini Live): voz natural nos dois sentidos ----- */
  V.live = function (cfg) {
    var nivel = cfg.modulo === "nivelamento";
    return { classe: "chat live", html:
      '<div class="chat-cab"><div><span class="rot">' + esc(cfg.rot) + "</span><h2>" + esc(cfg.titulo) + '</h2></div><span class="tag" id="lv-s">ao vivo</span></div>' +
      (nivel ? '<div class="meter"><div class="linha2"><span class="rot" id="pg-t">Pergunta 1 de 7</span></div><div class="prog"><i id="pg" style="width:0"></i></div></div>' : "") +
      '<div class="orbe-w"><button class="orbe" id="orbe" data-e="parado" aria-label="Começar conversa"><i></i><span id="orbe-l">Toque para começar</span></button>' +
      '<p class="orbe-d" id="orbe-d">' + (nivel ? "Uma conversa de uns 3 minutos com o Alex. Fale do seu jeito: ele adapta as perguntas ao seu nível." : "O tutor faz o papel do outro lado e corrige sem parar a conversa.") + " Use fone, se puder.</p></div>" +
      '<div class="msgs" id="msgs" aria-live="polite"></div>' +
      '<div class="comp"><div class="comp-l"><input id="txt" placeholder="Prefere digitar? Escreva aqui" autocomplete="off" maxlength="500" aria-label="Sua resposta" disabled><button class="ic" id="env" aria-label="Enviar" disabled>→</button></div>' +
      '<div class="comp-a"><button class="pill" id="mudo" disabled aria-pressed="false">Microfone: ligado</button><button class="pill" id="trav" disabled>Não sei o que dizer</button><button class="pill" id="fim" disabled>Encerrar</button></div>' +
      '<button class="link" id="txtmode">Usar o chat escrito</button></div>',
      bind: function (el) {
        var msgs = $("#msgs", el), orbe = $("#orbe", el), orbeL = $("#orbe-l", el), txt = $("#txt", el), env = $("#env", el);
        var bolhas = { aluno: null, agente: null }, sess = null, encerrando = false, timer = null, maxSeg = 600;
        var ROT = { parado: "Toque para começar", conectando: "Conectando…", ouvindo: "Pode falar", falando: "Alex falando", fim: "Avaliando…" };
        function estado(e) { orbe.setAttribute("data-e", e); orbeL.textContent = ROT[e] || e; }
        function bolha(papel, t, final) {
          if (!bolhas[papel]) { bolhas[papel] = document.createElement("div"); bolhas[papel].className = "bol " + (papel === "aluno" ? "eu" : "ia"); msgs.appendChild(bolhas[papel]); }
          bolhas[papel].textContent = t;
          if (final) bolhas[papel] = null;
          msgs.scrollTop = msgs.scrollHeight;
        }
        function sis(t) { var d = document.createElement("div"); d.className = "bol sis"; d.textContent = t; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; }
        function libera(on) { ["#txt", "#env", "#mudo", "#trav", "#fim"].forEach(function (s) { $(s, el).disabled = !on; }); }
        function paraTexto(motivo) {
          S.semLive = true;
          if (motivo) toast(motivo);
          setTimeout(function () { if (nivel) go("teste", { texto: 1 }); else go("pratica", { cena: cfg.cenaId, texto: 1 }); }, motivo ? 900 : 0);
        }
        function encerrar() {
          if (encerrando || !S.live) return;
          encerrando = true; clearInterval(timer); libera(false); estado("fim");
          var lv = S.live;
          lv.fecharTurnos();
          var turnos = lv.turnos.slice(), seg = lv.segundos();
          lv.fechar(); S.live = null; S.ativo = false;
          sis("Conversa encerrada. Avaliando sua fala…");
          api("voz.liveEncerrar", { sessaoId: sess.sessaoId, turnos: turnos, segundos: seg }).then(function (r) {
            if (!nivel) { go("liveResumo", r); return; }
            if (!r.nivelFinal) toast("Precisamos de mais respostas. Continue pelo chat.");
            carregarPainel().then(function () { go(r.nivelFinal ? "resultado" : "teste", r.nivelFinal ? {} : { texto: 1 }); }, function () { go("resultado"); });
          }).catch(function (err) { falhou(err); go(nivel ? "resultado" : "praticar"); });
        }
        orbe.onclick = function () {
          if (S.live || encerrando) { if (S.live && S.live.saida.tocando()) S.live.saida.parar(); return; }
          var lv = new VZ.Live({
            onEstado: estado,
            onTexto: function (papel, t, final) { bolha(papel, t, final); },
            onTurno: function (n) {
              if (!nivel || !sess) return;
              var k = Math.min(n + 1, sess.turnos);
              $("#pg-t", el).textContent = "Pergunta " + k + " de " + sess.turnos;
              $("#pg", el).style.width = Math.round(Math.min(n, sess.turnos) / sess.turnos * 100) + "%";
              if (n >= sess.turnos) setTimeout(encerrar, 600);
            },
            onAviso: toast,
            onFechar: function () { if (!encerrando) { sis("A conexão caiu."); encerrar(); } }
          });
          lv.prepararAudio();
          S.live = lv; S.ativo = true; estado("conectando");
          api("voz.liveIniciar", { modulo: cfg.modulo, cena: cfg.cena || "" }).then(function (r) {
            sess = r; maxSeg = r.maxSeg || 600; lv.marcar("token");
            return lv.conectar({ wsUrl: r.wsUrl, token: r.token, setup: r.setup, textoInicial: "Hi! I am ready." });
          }).then(function () {
            libera(true); $("#orbe-d", el).hidden = true;
            timer = setInterval(function () {
              var s = lv.segundos(), rest = maxSeg - s;
              $("#lv-s", el).textContent = Math.floor(s / 60) + ":" + pad(s % 60);
              if (rest === 60) toast("Falta 1 minuto para encerrar.");
              if (rest <= 0) encerrar();
            }, 1000);
          }).catch(function (err) {
            try { lv.fechar(); } catch (e) {}
            S.live = null;
            if (sess) api("voz.liveEncerrar", { sessaoId: sess.sessaoId, turnos: [], segundos: 0 }).catch(function () {});
            sess = null;
            if (/microfone|Permission|NotAllowed|denied/i.test((err && (err.message + " " + err.name)) || "")) { estado("parado"); toast("Permita o microfone no navegador ou use o chat escrito."); return; }
            paraTexto((err && /limite|desligada/.test(err.message)) ? err.message : "A conversa ao vivo não abriu. Vamos pelo chat com voz.");
          });
        };
        env.onclick = function () { var t = txt.value.trim(); if (t && S.live) { S.live.enviarTexto(t); txt.value = ""; } };
        txt.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); env.onclick(); } };
        $("#trav", el).onclick = function () { if (S.live) { S.live.enviarTexto("(I am stuck. Please help me in Portuguese with one short sentence and give me an easy English sentence to repeat.)", true); sis("Você pediu ajuda"); } };
        $("#mudo", el).onclick = function () { if (!S.live) return; var m = S.live.alternarMudo(); this.textContent = "Microfone: " + (m ? "desligado" : "ligado"); this.setAttribute("aria-pressed", m); };
        $("#fim", el).onclick = encerrar;
        $("#txtmode", el).onclick = function () {
          if (S.live) {
            encerrando = true; clearInterval(timer);
            var lv = S.live; lv.fechar(); S.live = null;
            if (sess) api("voz.liveEncerrar", { sessaoId: sess.sessaoId, turnos: lv.turnos, segundos: lv.segundos() }).catch(function () {});
          }
          paraTexto("");
        };
      } };
  };

  V.liveResumo = function (r) {
    var cs = (r.correcoes || []).map(function (c) { return '<div class="bol dica"><s>' + esc(c.original) + "</s> → <em>" + esc(c.corrigido) + "</em><br>" + esc(c.explicacao) + "</div>"; }).join("");
    return { aba: "praticar", html: '<span class="rot">Conversa encerrada</span><h2>' + (r.falas ? "Boa conversa!" : "Sem falas desta vez.") + "</h2>" +
      (r.falas ? '<div class="cartao"><div class="linha2"><span class="rot">Nota de fala</span><b style="font-size:32px">' + (r.nota || "—") + "</b></div>" + (r.resumo ? "<p>" + esc(r.resumo) + "</p>" : "") + "</div>" : "<p>Não captei sua voz. Confira o microfone e tente de novo.</p>") +
      (cs ? '<div class="sec"><span class="rot">Para lembrar</span>' + cs + "</div>" : "") +
      '<div class="grow"></div><button class="btn" id="mais">Praticar outra cena</button><button class="btn fantasma" id="ini">Voltar ao início</button>',
      bind: function (el) {
        $("#mais", el).onclick = function () { go("cenas"); };
        $("#ini", el).onclick = function () { carregarPainel().then(function () { go("painel"); }, function () { go("painel"); }); };
      } };
  };

  V.resultado = function () {
    var p = S.painel || {}, a = p.aluno || {}, pr = p.progresso || {}, nv = a.Nivel || "";
    var obj = (perfil().objetivo) || "";
    var linhas = [["Falar", pr.fala], ["Ouvir", pr.escuta], ["Ler", pr.leitura], ["Escrever", pr.escrita], ["Traduzir", pr.traducao]].map(function (h) {
      var v = Number(h[1]) || 0;
      return '<div><div class="l"><span>' + h[0] + "</span><span>" + (v ? v : "ainda sem medição") + '</span></div><div class="prog ' + (v < 60 ? "am" : "") + '"><i style="width:' + v + '%"></i></div></div>';
    }).join("") + "";
    var chips = (TRILHAS[obj] || ["Rotina", "Vocabulário", "Conversação"]).map(function (c) { return '<span class="chip">' + esc(c) + "</span>"; }).join("");
    return { html:
      '<span class="rot">Seu nível diagnosticado</span>' +
      '<div><div class="nivel">' + esc(nv || "—") + '</div><div class="nivel-n">' + esc(NIVEIS[nv] || "Em análise") + "</div></div>" +
      '<div class="hab">' + linhas + "</div>" +
      '<p style="font-size:13px">O professor pode confirmar ou ajustar o nível. Só a fala foi medida no teste; as outras habilidades entram conforme você treina.</p>' +
      '<div><span class="rot">Trilha sugerida' + (obj ? " · " + esc(obj) : "") + '</span><div class="chips" style="margin-top:8px">' + chips + "</div></div>" +
      '<button class="btn" id="seg">Continuar</button>',
      bind: function (el) { $("#seg", el).onclick = function () { proximo(); }; } };
  };

  V.plano = function () {
    return { html:
      '<span class="tag" style="align-self:flex-start">7 dias grátis</span><h2>Tudo liberado. Sem compromisso.</h2>' +
      '<ul class="vant"><li>Tutor de IA para conversar todo dia</li><li>Correção gentil de gramática e vocabulário</li><li>Cenários sob medida para o seu objetivo</li><li>Acompanhamento do professor</li></ul>' +
      '<div class="planos"><div class="plano"><b>Mensal</b><small>valor definido pela escola</small></div><div class="plano dest"><b>Anual</b><small>valor definido pela escola</small></div></div>' +
      '<p style="font-size:13px">Nenhum pagamento é pedido agora.</p><div class="grow"></div>' +
      '<button class="btn" id="trial">Começar 7 dias grátis</button><button class="btn fantasma" id="lim">Continuar com lições limitadas</button>',
      bind: function (el) {
        $("#trial", el).onclick = function () { salvaPerfil({ plano: "trial", trialInicio: new Date().toISOString() }); go("painel"); };
        $("#lim", el).onclick = function () { salvaPerfil({ plano: "limitado" }); go("painel"); };
      } };
  };

  V.painel = function () {
    var p = S.painel || {}, a = p.aluno || {}, pf = perfil(), m = meta(), min = Math.floor(seg() / 60), pct = Math.min(1, seg() / 60 / m);
    var trial = "";
    if (pf.plano === "trial" && pf.trialInicio) { var d = 7 - Math.floor((Date.now() - new Date(pf.trialInicio).getTime()) / 86400000); trial = '<span class="tag">Teste grátis: ' + Math.max(0, d) + " dia(s)</span>"; }
    var vocab = (p.amostra || []).map(function (w) { return '<button class="chip" data-w="' + esc(w) + '">' + esc(w) + "</button>"; }).join("");
    var nome = String((S.user && S.user.nome) || a.Nome || "").split(" ")[0];
    return { html:
      '<div class="linha2"><div><span class="rot">Olá' + (nome ? ", " + esc(nome) : "") + '</span><h2 style="font-size:32px">Meta de hoje</h2></div><span class="tag">' + (p.streak ? p.streak + (p.streak === 1 ? " dia seguido" : " dias seguidos") : "Comece hoje") + "</span></div>" +
      '<div class="cartao"><div class="anel" role="img" aria-label="' + min + " de " + m + ' minutos"><svg viewBox="0 0 100 100"><circle class="tr" cx="50" cy="50" r="44"/><circle class="pg" id="pg" cx="50" cy="50" r="44" style="stroke-dashoffset:278"/></svg><div class="c"><div><b>' + min + "/" + m + "</b><br><span>minutos</span></div></div></div>" + (trial ? '<div style="text-align:center">' + trial + "</div>" : "") + "</div>" +
      '<div class="cartao missao"><span class="rot">Missão do dia</span><h3>Praticar pedido de café em Nova York</h3><button class="btn" id="miss" style="background:#fff;color:#0d0d0e">Começar agora</button></div>' +
      '<div class="cartao"><div class="linha2"><span class="rot">Tema do dia</span><b>' + esc(p.temaDia || "Viagens") + "</b></div>" + (vocab ? '<div class="chips">' + vocab + '</div><small class="rot" style="text-transform:none;letter-spacing:0">Toque numa palavra para ouvir</small>' : "") + "</div>" +
      (p.iaAtiva === false ? '<div class="info">A IA ainda não está ligada. As respostas serão simples até a escola cadastrar a chave.</div>' : ""),
      bind: function (el) {
        setTimeout(function () { var c = $("#pg", el); if (c) c.style.strokeDashoffset = String(277 * (1 - pct) + (pct ? 0 : 1)); }, 150);
        $("#miss", el).onclick = function () { go("pratica", { cena: "cafe" }); };
        [].forEach.call(el.querySelectorAll("[data-w]"), function (b) { b.onclick = function () { S.voz = true; falar(b.getAttribute("data-w"), "en"); }; });
      } };
  };

  V.cenas = function () {
    var l = CENAS.map(function (c) { return '<button class="op" data-c="' + c.id + '"><span>' + esc(c.titulo) + "<small>Você fala com " + esc(c.papel) + "</small></span><span>→</span></button>"; }).join("");
    return { aba: "praticar", html: '<button class="link voltar" id="vv">← Falar</button><span class="rot">Prática por voz</span><h2>Escolha uma cena.</h2><p>A IA faz o papel do outro lado. Falou errado? Ela corrige sem parar a conversa.</p><div class="opcoes">' + l + "</div>",
      bind: function (el) { $("#vv", el).onclick = function () { go("habilidade", { h: "fala" }); }; [].forEach.call(el.querySelectorAll("[data-c]"), function (b) { b.onclick = function () { go("pratica", { cena: b.getAttribute("data-c") }); }; }); } };
  };

  V.progresso = function () {
    var p = S.painel || {}, pr = p.progresso || {};
    var linhas = [["Falar", pr.fala], ["Ouvir", pr.escuta], ["Ler", pr.leitura], ["Escrever", pr.escrita], ["Traduzir", pr.traducao]].map(function (h) {
      var v = Number(h[1]) || 0;
      return '<div><div class="l"><span>' + h[0] + "</span><span>" + (v ? v : "sem medição") + '</span></div><div class="prog ' + (v < 60 ? "am" : "") + '"><i style="width:' + v + '%"></i></div></div>';
    }).join("") + "";
    var s = p.sessoes || [];
    return { html: '<span class="rot">Sua evolução</span><h2>Progresso.</h2><div class="hab">' + linhas + "</div>" +
      '<div class="cartao"><div class="linha2"><span class="rot">Fluência média</span><b style="font-size:24px">' + (p.fluencia || "—") + "</b></div><div class=\"linha2\"><span class=\"rot\">Sequência</span><b>" + (p.streak || 0) + ((p.streak || 0) === 1 ? " dia" : " dias") + "</b></div></div>" +
      (s.length ? '<div class="sec"><span class="rot">Últimas sessões</span>' + s.map(function (x) { return '<div class="kv"><b>' + esc(x.Modulo) + "</b><span>" + esc(String(x.Inicio).slice(0, 10)) + "</span></div>"; }).join("") + "</div>" : "") };
  };

  V.perfil = function () {
    var pf = perfil(), p = S.painel || {}, a = p.aluno || {};
    return { html: '<span class="rot">Sua conta</span><h2>Perfil.</h2>' +
      '<div class="sec"><div class="kv"><span>Nome</span><b>' + esc((S.user && S.user.nome) || a.Nome || "") + '</b></div><div class="kv"><span>E-mail</span><b style="font-size:15px">' + esc(S.user && S.user.email) + '</b></div>' +
      '<div class="kv"><span>Nível</span><b>' + esc(a.Nivel ? a.Nivel + " · " + NIVEIS[a.Nivel] : "A definir") + '</b></div><div class="kv"><span>Objetivo</span><b>' + esc(pf.objetivo || a.Objetivo || "—") + '</b></div>' +
      '<div class="kv"><span>Meta diária</span><b>' + meta() + ' min</b></div><div class="kv"><span>Plano</span><b>' + (pf.plano === "trial" ? "Teste grátis de 7 dias" : pf.plano === "limitado" ? "Lições limitadas" : "—") + "</b></div></div>" +
      '<button class="op" id="duv"><span>Dúvidas ao professor<small>Pergunte e receba a resposta aqui</small></span><span>→</span></button>' +
      '<div class="grow"></div><button class="btn fantasma" id="sair">Sair</button>',
      bind: function (el) { $("#sair", el).onclick = function () { sair(); }; $("#duv", el).onclick = function () { go("duvidas"); }; } };
  };

  V.duvidas = function () {
    return { aba: "perfil", html: '<span class="rot">Fale com o professor</span><h2>Dúvidas.</h2>' +
      '<div class="cartao"><label class="rot" for="dv">Sua pergunta</label><textarea id="dv" class="campo" rows="3" maxlength="1000" placeholder="Ex.: quando uso make e quando uso do?"></textarea><button class="btn" id="dv-e">Enviar ao professor</button></div>' +
      '<div class="sec" id="dv-l"><span class="rot">Carregando…</span></div>',
      bind: function (el) {
        function carregar() {
          api("aluno.duvidas").then(function (l) {
            $("#dv-l", el).innerHTML = l.length ? l.map(function (d) {
              return '<div class="cartao"><div class="linha2"><span class="rot">' + esc(String(d.Quando).slice(0, 10).split("-").reverse().join("/")) + '</span><span class="tag' + (d.Status === "ABERTA" ? " cinza" : "") + '">' + (d.Status === "ABERTA" ? "Aguardando" : "Respondida") + "</span></div><b>" + esc(d.Texto) + "</b>" +
                (d.Resposta ? '<p class="resp">' + esc(d.Resposta) + "<small> — " + esc(d.RespondidaPor || "Professor") + "</small></p>" : "") + "</div>";
            }).join("") : "<p>Nenhuma dúvida enviada ainda.</p>";
          }).catch(function (err) { $("#dv-l", el).innerHTML = ""; falhou(err); });
        }
        $("#dv-e", el).onclick = function () {
          var t = $("#dv", el).value.trim(), b = this;
          if (t.length < 3) { toast("Escreva sua dúvida."); return; }
          b.disabled = true;
          api("aluno.duvidaEnviar", { texto: t }).then(function () { $("#dv", el).value = ""; b.disabled = false; toast("Dúvida enviada ao professor."); carregar(); }).catch(function (err) { b.disabled = false; falhou(err); });
        };
        carregar();
      } };
  };

  /* ---------- demonstração (respostas simuladas, sem servidor) ---------- */
  var Demo = {
    st: null,
    reset: function () { Demo.st = { nivel: "", turn: 0, fala: 0, cafe: 0, sess: 0, obj: "", sessoes: [] }; },
    api: function (rota, a) { return new Promise(function (ok, no) { setTimeout(function () { try { ok(Demo.run(rota, a)); } catch (e) { no(e); } }, 400); }); },
    corrige: function (t) {
      var c = [];
      if (/\bi\b/.test(t)) c.push({ original: "i", corrigido: "I", explicacao: 'O pronome "I" sempre é maiúsculo.' });
      else if (/\bI have experience lead\b/i.test(t)) c.push({ original: "experience lead", corrigido: "experience leading", explicacao: 'Depois de "experience", use o verbo com -ing.' });
      else if (/\bwant coffee\b|\bI want a coffee\b/i.test(t)) c.push({ original: "I want a coffee", corrigido: "I'd like a coffee, please", explicacao: "Soa mais natural e educado ao pedir." });
      return c;
    },
    run: function (rota, a) {
      var st = Demo.st;
      if (rota === "bootstrap") {
        var pf = S.demoPerfil, ar = { ALUNO: ["aluno"], PROFESSOR: ["professor", "aluno"], ADMIN: ["gestao", "professor", "aluno"], SUPORTE: ["suporte"] }[pf] || ["aluno"];
        return { usuario: { email: "demo-" + pf.toLowerCase() + "@nice.ai", nome: { ALUNO: "Ana", PROFESSOR: "Paulo", ADMIN: "Gil", SUPORTE: "Sara" }[pf], perfil: pf, areas: ar, nivel: st.nivel } };
      }
      if (window.Nice && Nice.demoRotas[rota]) return Nice.demoRotas[rota](a, st);
      if (rota === "aluno.perfilSalvar") { st.obj = a.objetivo; return { ok: true }; }
      if (rota === "aluno.painel") return { aluno: { Nome: "Ana", Nivel: st.nivel, Objetivo: st.obj, Idioma: "pt" }, progresso: Object.assign({ leitura: 0, escrita: 0, escuta: 0, fala: st.fala, traducao: 0 }, st.prog || {}), fluencia: st.fala, streak: st.sessoes.length ? 1 : 0, temaDia: "Viagens", amostra: ["boarding pass", "layover", "luggage", "delay"], sessoes: st.sessoes.slice(0, 5), iaAtiva: false, precisaNivelamento: !st.nivel };
      if (rota === "sessao.iniciar") { st.sess++; st.turn = 0; st.cafe = 0; st.sessoes.unshift({ Modulo: a.modulo, Inicio: new Date().toISOString() }); return { sessaoId: "demo" + st.sess, abertura: a.modulo === "nivelamento" ? "Hi! I'm Alex, your AI tutor. Why do you want to learn English?" : "", nivel: st.nivel }; }
      if (rota === "sessao.encerrar") return { ok: true };
      if (rota === "sessao.enviar") {
        var perguntas = ["Great! Tell me about your last meeting.", "Nice. What do you do on a normal day?", "Interesting! What did you do last weekend?", "And where would you like to travel?", "Why is English important for you?", "Last one: describe your ideal job."];
        var barista = ["Sure! What size would you like?", "Anything to eat with that?", "That will be five dollars. Cash or card?", "Here you go. Have a nice day!"];
        var cena = /^Let's role-play/.test(a.texto || "");
        if (a.travou) return { resposta: 'Tudo bem! Tente dizer: "I\'d like a latte, please." Depois repita comigo.', idioma: "pt", correcoes: [], nota: 0, fim: false };
        if (cena) return { resposta: "Hi there! What can I get for you?", idioma: "en", correcoes: [], nota: 0, fim: false };
        var palavras = String(a.texto).trim().split(/\s+/).length, nota = Math.min(88, 40 + palavras * 4), cor = Demo.corrige(a.texto);
        var s = st.sessoes[0] || {}, nive = s.Modulo === "nivelamento";
        if (nive) {
          st.turn++;
          if (st.turn >= 7) { st.nivel = "B1"; st.fala = Math.max(st.fala, 64); return { resposta: "Thank you! Your level is B1. Nice work.", idioma: "en", correcoes: cor, nota: nota, fim: true, nivelFinal: "B1" }; }
          return { resposta: perguntas[(st.turn - 1) % perguntas.length], idioma: "en", correcoes: cor, nota: nota, fim: false };
        }
        var r = barista[Math.min(st.cafe, barista.length - 1)]; st.cafe++;
        return { resposta: r, idioma: "en", correcoes: cor, nota: nota, fim: false };
      }
      throw new Error("Rota não disponível na demonstração: " + rota);
    }
  };
  Demo.reset();

  /* ---------- API para as telas da equipe (equipe.js) e início ---------- */
  window.Nice = {
    S: S, V: V, api: api, go: go, esc: esc, toast: toast, falhou: falhou, $: $, pad: pad, falar: falar, pararFala: pararFala, NIVEIS: NIVEIS,
    demoRotas: {}, prefetchVoz: prefetchVoz, recarregarPainel: carregarPainel, rolarTopo: function () { tela.scrollTop = 0; },
    iniciar: function () {
      montarArea("aluno");
      var m = /[?&]demo(?:=(\w+))?/.exec(location.search);
      if (m) { S.demo = true; S.demoPerfil = ({ professor: "PROFESSOR", gestao: "ADMIN", suporte: "SUPORTE" })[String(m[1] || "").toLowerCase()] || "ALUNO"; Demo.reset(); entrar(); }
      else if (S.token && configurado()) entrar();
      else go("login");
    }
  };
})();
