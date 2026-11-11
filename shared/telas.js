/* Nice AI — modelos das telas do app (prévia). Dados são FICTÍCIOS de exemplo. */
(function () {
  "use strict";
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onda(n, cls) {
    var h = [.35, .6, .9, .5, .75, 1, .55, .85, .4, .7, .95, .5, .8, .45, .9, .6, .35, .75, .55, .85, .4, .65];
    var s = '<div class="onda ' + (cls || "") + '" aria-hidden="true">';
    for (var i = 0; i < (n || 22); i++) s += '<i style="--k:' + i + ';--h:' + h[i % h.length] + '"></i>';
    return s + "</div>";
  }
  function sb() { return '<div class="sb"><span>9:41</span><i></i></div>'; }
  function tabs(on) {
    var t = ["Início", "Praticar", "Trilha", "Progresso", "Perfil"];
    return '<div class="tabbar">' + t.map(function (x, i) { return '<span' + (i === on ? ' class="on"' : "") + ">" + x + "</span>"; }).join("") + "</div>";
  }
  function colunas(vals) {
    return '<div class="colunas">' + vals.map(function (v, i) { return '<i style="--v:' + v + ';--k:' + i + '"></i>'; }).join("") + "</div>";
  }
  function skill(nome, v, cls, i) {
    return '<div class="rev" style="--i:' + i + '"><div class="mt"><span>' + nome + '</span><b>' + Math.round(v * 100) + '</b></div><div class="barra ' + (cls || "") + '"><i style="--v:' + v + '"></i></div></div>';
  }
  function nav(on) {
    var n = on.items.map(function (x) { return '<a' + (x === on.at ? ' class="on"' : "") + ">" + x + "</a>"; }).join("");
    return '<nav class="jnav"><div class="logo">NICE<em> AI</em></div>' + n + "</nav>";
  }

  var T = {};

  T.login = function () {
    return sb() +
      '<div class="rev" style="--i:0"><div class="logo-app">NICE<em> AI</em></div></div>' +
      '<div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:.7em">' +
      '<h4 class="rev" style="--i:1">Fale inglês de verdade. 15 minutos por dia.</h4>' +
      '<p class="rev" style="--i:2;color:var(--soft);font-size:.9em">Um tutor de IA que se adapta ao seu nível. Sem prova escrita.</p></div>' +
      '<div class="btn rev" style="--i:3;background:#fff;color:#0d0d0e;font-family:inherit">Continuar com Google</div>' +
      '<div class="btn ghost rev" style="--i:4">Continuar com Apple</div>' +
      '<div class="btn ghost rev" style="--i:5">Entrar com e-mail</div>' +
      '<small class="rev" style="--i:6;text-align:center">Idade mínima: 16 anos.</small>';
  };

  T.quiz = function () {
    var grp = function (t, ch, i) {
      return '<div class="rev" style="--i:' + i + '"><div class="rot" style="margin-bottom:.4em">' + t + '</div><div class="chips">' + ch + "</div></div>";
    };
    return sb() +
      '<div class="rev" style="--i:0"><div class="barra y" style="margin-bottom:.5em"><i style="--v:.66"></i></div><small>Pergunta 2 de 3 · menos de 30 segundos</small></div>' +
      '<h4 class="rev" style="--i:1">Vamos montar seu plano.</h4>' +
      grp("Seu objetivo", '<span class="chip">Viagem</span><span class="chip on">Trabalho</span><span class="chip">Imigração</span><span class="chip">Conversação</span>', 2) +
      grp("Seu nível", '<span class="chip">Iniciante</span><span class="chip on">Intermediário</span><span class="chip">Avançado</span>', 3) +
      grp("Tempo por dia", '<span class="chip">5 min</span><span class="chip">10 min</span><span class="chip on">15 min</span>', 4) +
      '<div class="btn rev fim" style="--i:5">Falar com a IA</div>';
  };

  T.diagnostico = function () {
    return sb() +
      '<div class="rev" style="--i:0;display:flex;justify-content:space-between;align-items:center"><div><div class="rot">Teste de nível</div><b>Alex · AI tutor</b></div><span class="tag alerta">0:42</span></div>' +
      '<div class="conv grow">' +
      '<div class="bol ia rev" style="--i:1">Hi! I\'m Alex, your AI tutor. Why do you want to learn English?</div>' +
      '<div class="bol eu rev" style="--i:3">I need English for my work. I have meetings with clients.</div>' +
      '<div class="bol ia rev" style="--i:5">Great! Tell me about your last meeting.</div></div>' +
      '<div class="card rev" style="--i:6;gap:.5em"><div class="mt"><span>Pronúncia</span><small>analisando</small></div><div class="barra y"><i style="--v:.64"></i></div>' +
      '<div class="mt"><span>Vocabulário</span></div><div class="barra"><i style="--v:.5"></i></div>' +
      '<div class="mt"><span>Fluência</span></div><div class="barra g"><i style="--v:.72"></i></div></div>' +
      '<div class="rev" style="--i:7">' + onda(22) + "</div>" +
      '<div class="mic rev" style="--i:7"></div>';
  };

  T.resultado = function () {
    return sb() +
      '<div class="rev" style="--i:0"><div class="rot">Seu nível diagnosticado</div></div>' +
      '<div class="rev" style="--i:1;display:flex;align-items:baseline;gap:.5em"><b style="font-size:4em;line-height:1;color:var(--hi)">B1</b><span>Intermediate</span></div>' +
      '<div class="card" style="gap:.55em">' + skill("Ouvir", .72, "g", 2) + skill("Falar", .58, "y", 3) + skill("Ler", .8, "g", 4) + skill("Escrever", .61, "y", 5) + skill("Traduzir", .55, "", 6) + "</div>" +
      '<div class="rev" style="--i:7"><div class="rot" style="margin-bottom:.4em">Trilha gerada para você</div><div class="chips"><span class="chip red">Trabalho</span><span class="chip">Reuniões</span><span class="chip">E-mails</span></div></div>' +
      '<div class="btn rev fim" style="--i:8">Ver minha trilha</div><small class="rev" style="--i:8;text-align:center">Exemplo ilustrativo.</small>';
  };

  T.paywall = function () {
    var b = function (t, i) { return '<div class="rev" style="--i:' + i + ';display:flex;gap:.6em;align-items:center"><span class="certo">✓</span><span style="font-size:.92em">' + t + "</span></div>"; };
    return sb() +
      '<div class="rev" style="--i:0"><span class="tag alerta">7 dias grátis</span></div>' +
      '<h4 class="rev" style="--i:1">Tudo liberado. Sem compromisso.</h4>' +
      '<div class="conv" style="gap:.55em">' + b("Tutor de IA ilimitado", 2) + b("Correção avançada de sotaque", 3) + b("Cenários sob medida para você", 4) + b("Trilhas, vídeos e revisões", 5) + "</div>" +
      '<div class="rev" style="--i:6;display:grid;grid-template-columns:1fr 1fr;gap:.5em"><div class="card" style="border:1px solid var(--line)"><b>Mensal</b><small>valor a definir</small></div><div class="card" style="border:2px solid var(--hi)"><b>Anual</b><small>valor a definir</small></div></div>' +
      '<div class="btn rev fim" style="--i:7">Começar 7 dias grátis</div>' +
      '<small class="rev" style="--i:8;text-align:center">Ou continue com lições limitadas.</small>';
  };

  T.dashboard = function () {
    return sb() +
      '<div class="rev" style="--i:0;display:flex;justify-content:space-between;align-items:center"><div><small>Bom dia, Ana</small><div><b style="font-size:1.15em">Meta de hoje</b></div></div><span class="tag alerta">5 dias seguidos</span></div>' +
      '<div class="card rev" style="--i:1;align-items:center;padding:1.1em"><div class="anel" style="--off:251"><svg viewBox="0 0 100 100"><circle class="tr" cx="50" cy="50" r="40"/><circle class="pg" cx="50" cy="50" r="40"/></svg><div class="c"><b>0/15</b><small>minutos</small></div></div></div>' +
      '<div class="card rev" style="--i:2;background:var(--acc);gap:.5em"><div class="rot" style="color:#fff;opacity:.85">Missão do dia</div><b style="font-size:1.1em;line-height:1.2">Praticar pedido de café em Nova York</b><div class="btn" style="margin-top:.2em">Começar agora</div></div>' +
      '<div class="card rev" style="--i:3"><div class="mt"><span>Revisar vocabulário de ontem</span><small>5 min</small></div></div>' +
      tabs(0);
  };

  T.pratica = function () {
    return sb() +
      '<div class="rev" style="--i:0;display:flex;justify-content:space-between;align-items:center"><b>Café · Nova York</b><span class="tag">Cenário</span></div>' +
      '<div class="cena-img rev" style="--i:1"><em>Balcão</em><div class="sol"></div><div class="bal"></div><div class="xic"></div><div class="pes"></div></div>' +
      '<div class="conv grow">' +
      '<div class="bol ia rev" style="--i:2">Hi there! What can I get for you?</div>' +
      '<div class="bol eu rev" style="--i:3">I want a coffee with milk.</div>' +
      '<div class="bol dica rev" style="--i:4"><b>Dica gentil</b>Soa mais natural: "I\'d like a latte, please."</div>' +
      '<div class="bol dica rev" style="--i:5;border-style:solid;border-color:var(--line)"><b style="color:var(--soft)">Travou? Em português</b>Eu gostaria de um café com leite, por favor.</div></div>' +
      '<div class="rev" style="--i:6">' + onda(22) + "</div>" +
      '<div class="mic rev" style="--i:6"></div>';
  };

  T.trilhas = function () {
    var c = function (t, d, i, sel) {
      return '<div class="card rev" style="--i:' + i + ';gap:.35em;border:' + (sel ? "2px solid var(--hi)" : "1px solid var(--line)") + '"><div class="mt"><b>' + t + "</b>" + (sel ? '<span class="tag alerta">Recomendada</span>' : "") + "</div><small>" + d + "</small></div>";
    };
    return sb() +
      '<div class="rev" style="--i:0"><div class="rot">Depois do diagnóstico</div></div>' +
      '<h4 class="rev" style="--i:1">Escolha seu caminho.</h4>' +
      c("NICE Method Full", "Os 6 books, com atividades guiadas por agentes de IA.", 2) +
      c("Conversation", "Os books viram a base de conversas reais.", 3) +
      c("Personalizada", "Mistura dos materiais pelo seu objetivo e sua nota.", 4, true) +
      '<div class="card rev" style="--i:5;flex-direction:row;align-items:center;gap:.7em"><div class="video-p" style="width:5.5em;height:3.6em;border-radius:.7em;font-size:.55em"></div><small>Videoaulas curtas explicam cada atividade.</small></div>' +
      tabs(2);
  };

  T.ouvir = function () {
    return sb() +
      '<div class="rev" style="--i:0;display:flex;justify-content:space-between"><b>Ouvir</b><span class="tag">Nível B1</span></div>' +
      '<div class="card rev" style="--i:1;gap:.6em"><div class="mt"><span>Reunião · áudio 0:28</span><span class="tag">1x</span></div>' + onda(26, "red") + "</div>" +
      '<p class="rev" style="--i:2"><b>What time is the meeting?</b></p>' +
      '<div class="opc rev" style="--i:3"><i>A</i>At nine</div>' +
      '<div class="opc certa rev" style="--i:4"><i>B</i>At ten thirty</div>' +
      '<div class="opc rev" style="--i:5"><i>C</i>At noon</div>' +
      '<div class="chips rev fim" style="--i:6"><span class="chip on">Escolher</span><span class="chip">Escrever</span><span class="chip">Traduzir</span><span class="chip">Falar</span><span class="chip">Resumir</span></div>';
  };

  T.falar = function () {
    return sb() +
      '<div class="rev" style="--i:0;display:flex;justify-content:space-between"><b>Falar</b><span class="tag">Descreva a cena</span></div>' +
      '<div class="cena-img rev" style="--i:1"><em>Cena</em><div class="sol"></div><div class="bal"></div><div class="xic"></div><div class="pes"></div></div>' +
      '<div class="card rev" style="--i:2"><small>O que você disse</small><p style="font-size:.92em">A woman is <span class="hl">ordering</span> a coffee at the <span class="err">conter</span>.</p></div>' +
      '<div class="rev" style="--i:3;display:flex;gap:.4em;flex-wrap:wrap"><span class="tag ok">woman ✓</span><span class="tag ok">coffee ✓</span><span class="tag alerta">counter ~</span></div>' +
      '<div class="rev" style="--i:4">' + onda(22) + '</div><div class="mic rev" style="--i:4"></div>' +
      '<div class="chips rev" style="--i:5"><span class="chip on">Descrever</span><span class="chip">Frases novas</span><span class="chip">Conversar</span><span class="chip">Ler em voz alta</span></div>';
  };

  T.ler = function () {
    return sb() +
      '<div class="rev" style="--i:0;display:flex;justify-content:space-between"><b>Ler</b><span class="tag">Texto · 2 min</span></div>' +
      '<p class="rev" style="--i:1;font-size:.95em;line-height:1.55">Every morning my <span class="hl">commute</span> takes forty minutes, so I read on the train.</p>' +
      '<div class="card rev" style="--i:2;border:1px solid var(--hi)"><b>commute</b><small>sinônimo: travel to work</small><p style="font-size:.88em">"My commute is short today."</p></div>' +
      '<div class="card rev" style="--i:3"><small>Pergunta de compreensão</small><p style="font-size:.9em"><b>Why does the writer read on the train?</b></p><div style="height:3em;border:1px dashed var(--line);border-radius:.6em;padding:.4em .6em;font-size:.85em;color:var(--soft)">Escreva sua resposta…</div></div>' +
      '<div class="btn rev fim" style="--i:4">Enviar resposta</div>';
  };

  T.escrever = function () {
    return sb() +
      '<div class="rev" style="--i:0;display:flex;justify-content:space-between"><b>Escrever</b><span class="tag">E-mail</span></div>' +
      '<div class="card rev" style="--i:1;gap:.5em"><small>Para: client@empresa.com</small><small>Assunto: Remarcar reunião</small><p style="font-size:.9em;line-height:1.5">Hello, I <span class="err">am wanting</span> to <span class="err">reschedule</span> our meeting to friday.</p></div>' +
      '<div class="bol dica rev" style="--i:2"><b>Correção</b>"I would like to reschedule our meeting to Friday."</div>' +
      '<div class="card rev" style="--i:3"><small>Lacunas</small><p style="font-size:.9em">She <span class="lac">goes</span> to work every day.</p></div>' +
      '<div class="chips rev fim" style="--i:4"><span class="chip on">E-mail</span><span class="chip">Formulário</span><span class="chip">Feedback</span><span class="chip">Notícia difícil</span></div>';
  };

  T.traduzir = function () {
    return sb() +
      '<div class="rev" style="--i:0;display:flex;justify-content:space-between"><b>Traduzir</b><span class="tag">PT → EN</span></div>' +
      '<div class="card rev" style="--i:1"><small>Traduza</small><p><b>Eu preciso remarcar a reunião.</b></p></div>' +
      '<div class="card rev" style="--i:2;border:1px solid var(--ok)"><small>Sua tradução</small><p style="font-size:.95em">I need to <span class="certo">reschedule</span> the meeting.</p></div>' +
      '<div class="rev" style="--i:3">' + onda(22) + '</div><div class="mic rev" style="--i:3"></div>' +
      '<div class="card rev" style="--i:4"><small>Agora crie sua frase com</small><div class="chips"><span class="chip on">reschedule</span><span class="chip">deadline</span></div></div>' +
      '<div class="btn rev fim" style="--i:5">Falar a tradução</div>';
  };

  T.video = function () {
    return sb() +
      '<div class="rev" style="--i:0"><b>Videoaula</b></div>' +
      '<div class="video-p rev" style="--i:1;height:9em"><div class="barra y"><i style="--v:.4"></i></div></div>' +
      '<h4 class="rev" style="--i:2;font-size:1.2em">Como usar o tutor de voz</h4>' +
      '<div class="card rev" style="--i:3"><div class="mt"><span>1 · Falar sem medo</span><small>1:20</small></div></div>' +
      '<div class="card rev" style="--i:4"><div class="mt"><span>2 · Pedindo ajuda em português</span><small>0:58</small></div></div>' +
      tabs(2);
  };

  T.aluno = function () {
    return '<div class="jlay">' + nav({ items: ["Início", "Praticar", "Trilha", "Progresso", "Planos"], at: "Progresso" }) +
      '<div class="jmain"><header><h4>Meu progresso</h4><span class="aviso-ex">dados fictícios de exemplo</span></header>' +
      '<div class="kpis"><div class="kpi rev" style="--i:0"><small>Sequência</small><b>5 dias</b></div><div class="kpi rev" style="--i:1"><small>Hoje</small><b>0/15 min</b></div><div class="kpi rev" style="--i:2"><small>Nível</small><b>B1</b></div><div class="kpi rev" style="--i:3"><small>Trilha</small><b>Pessoal</b></div></div>' +
      '<div class="dois"><div class="painel"><b>As 5 habilidades</b>' + skill("Ouvir", .72, "g", 4) + skill("Falar", .58, "y", 5) + skill("Ler", .8, "g", 6) + skill("Escrever", .61, "y", 7) + skill("Traduzir", .55, "", 8) + '</div>' +
      '<div class="painel rev" style="--i:9"><b>Minutos por dia</b>' + colunas([.3, .5, .7, .4, .8, .6, .9]) + '</div></div></div></div>';
  };

  T.gestao = function () {
    return '<div class="jlay">' + nav({ items: ["Painel", "Alunos", "Financeiro", "Agenda", "Acessos do app"], at: "Painel" }) +
      '<div class="jmain"><header><h4>Painel da escola</h4><span class="aviso-ex">dados fictícios de exemplo</span></header>' +
      '<div class="kpis"><div class="kpi rev" style="--i:0"><small>Alunos ativos</small><b>128</b></div><div class="kpi rev" style="--i:1"><small>Minutos praticados / semana</small><b>9.4k</b></div><div class="kpi rev" style="--i:2"><small>Retenção 30 dias</small><b>82%</b></div><div class="kpi rev" style="--i:3"><small>Receita do mês</small><b>R$ —</b></div></div>' +
      '<div class="dois"><div class="painel rev" style="--i:4"><div class="mt"><b>Uso por dia</b><small>últimos 14 dias</small></div>' + colunas([.4, .55, .5, .7, .62, .8, .45, .5, .66, .74, .6, .9, .78, .95]) + "</div>" +
      '<div class="painel rev" style="--i:5"><b>Alunos em risco</b><div class="linha"><span>Carlos M.</span><span class="tag ruim">7 dias parado</span></div><div class="linha"><span>Julia R.</span><span class="tag alerta">meta baixa</span></div><div class="linha"><span>Pedro S.</span><span class="tag ok">no ritmo</span></div></div></div></div></div>';
  };

  T.professor = function () {
    return '<div class="jlay">' + nav({ items: ["Minha turma", "Dúvidas", "Aulas", "Desempenho"], at: "Minha turma" }) +
      '<div class="jmain"><header><h4>Minha turma</h4><span class="aviso-ex">dados fictícios de exemplo</span></header>' +
      '<div class="dois"><div class="painel rev" style="--i:0"><b>Progresso dos alunos</b>' +
      '<div class="linha"><span>Ana L. · B1</span><div class="barra g"><i style="--v:.8"></i></div></div>' +
      '<div class="linha"><span>Bruno T. · A2</span><div class="barra y"><i style="--v:.55"></i></div></div>' +
      '<div class="linha"><span>Carla V. · B2</span><div class="barra g"><i style="--v:.9"></i></div></div>' +
      '<div class="linha"><span>Diego F. · A2</span><div class="barra"><i style="--v:.35"></i></div></div></div>' +
      '<div class="painel rev" style="--i:1"><b>Dúvidas dos alunos</b><div class="card" style="background:var(--bg)"><small>Ana L. · há 12 min</small><p>"Quando uso <i>reschedule</i> ou <i>postpone</i>?"</p><div class="btn" style="font-size:.85em;padding:.5em">Responder</div></div><span class="tag alerta">2 aguardando</span></div></div></div></div>';
  };

  T.sustentacao = function () {
    return '<div class="jlay">' + nav({ items: ["Saúde do app", "Custo de IA", "Erros", "Versões"], at: "Saúde do app" }) +
      '<div class="jmain"><header><h4>Saúde do app</h4><span class="aviso-ex">dados fictícios de exemplo</span></header>' +
      '<div class="kpis"><div class="kpi rev" style="--i:0"><small>Disponibilidade</small><b>99,9%</b></div><div class="kpi rev" style="--i:1"><small>Resposta da IA</small><b>1,2 s</b></div><div class="kpi rev" style="--i:2"><small>Custo de IA / dia</small><b>R$ —</b></div><div class="kpi rev" style="--i:3"><small>Erros hoje</small><b>3</b></div></div>' +
      '<div class="dois"><div class="painel rev" style="--i:4"><div class="mt"><b>Tempo de resposta</b><small>24 h</small></div>' + colunas([.5, .45, .6, .5, .42, .7, .55, .48, .52, .4, .46, .5]) + "</div>" +
      '<div class="painel rev" style="--i:5"><b>Últimos eventos</b><div class="linha"><span>Versão 0.4 publicada</span><span class="tag ok">ok</span></div><div class="linha"><span>Reconhecimento de voz lento</span><span class="tag alerta">atenção</span></div><div class="linha"><span>Backup diário</span><span class="tag ok">ok</span></div></div></div></div></div>';
  };

  /* ---------- montagem ---------- */
  function montar() {
    document.querySelectorAll("[data-tela]").forEach(function (el) {
      var nome = el.getAttribute("data-tela");
      if (!T[nome]) return;
      el.classList.add("tela");
      if (el.hasAttribute("data-claro")) el.classList.add("claro");
      el.innerHTML = T[nome]();
      if (el.closest(".janela") && !el.closest(".pilha")) el.style.flexDirection = "row";
    });

    var avulsas = [].slice.call(document.querySelectorAll(".tela")).filter(function (t) { return !t.closest(".pilha"); });
    if (reduzido || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".tela").forEach(function (t) { t.classList.add("ativa"); });
    } else {
      var obs = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.target.classList.toggle("ativa", e.isIntersecting); });
      }, { threshold: 0.35 });
      avulsas.forEach(function (t) { obs.observe(t); });
    }
    pilhas();
  }

  /* pilha: seção com data-fx-fixa data-fx-etapas="N" data-pilha. Ativa a N-ésima tela / legenda. */
  function pilhas() {
    var secoes = [].slice.call(document.querySelectorAll("[data-pilha]"));
    if (!secoes.length || reduzido) return;
    secoes.forEach(function (s) {
      var n = parseInt(s.getAttribute("data-fx-etapas"), 10) || 1;
      var telas = [].slice.call(s.querySelectorAll(".pilha > .tela"));
      var grupos = [].slice.call(s.querySelectorAll("[data-legenda]")).map(function (g) { return [].slice.call(g.children); });
      var atual = -1;
      function ir() {
        var ret = s.getBoundingClientRect();
        var perc = s.offsetHeight - window.innerHeight;
        if (perc <= 0) return;
        var p = Math.min(1, Math.max(0, -ret.top / perc));
        var i = Math.min(n - 1, Math.floor(p * n));
        s.style.setProperty("--etapa-p", ((p * n) - i).toFixed(3));
        s.style.setProperty("--etapa-i", i);
        if (i === atual) return;
        atual = i;
        telas.forEach(function (t, k) { t.classList.toggle("ativa", k === i); });
        grupos.forEach(function (g) { g.forEach(function (t, k) { t.classList.toggle("ativa", k === i); }); });
        s.setAttribute("data-passo", i + 1);
      }
      window.addEventListener("scroll", function () { requestAnimationFrame(ir); }, { passive: true });
      window.addEventListener("resize", ir);
      ir();
      setTimeout(ir, 200);
    });
  }

  window.NiceTelas = { T: T, onda: onda };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();
