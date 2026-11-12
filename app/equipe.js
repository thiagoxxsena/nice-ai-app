/* Nice AI — telas da equipe: Professor, Gestão e Sustentação. Usa a API exposta por app.js (window.Nice). */
(function () {
  "use strict";
  var N = window.Nice, V = N.V, api = N.api, go = N.go, esc = N.esc, toast = N.toast, falhou = N.falhou, $ = N.$, S = N.S;
  var VZ = window.NiceVoz;
  var HAB = [["fala", "Falar"], ["escuta", "Ouvir"], ["leitura", "Ler"], ["escrita", "Escrever"], ["traducao", "Traduzir"]];
  var MOD = { nivelamento: "Teste de nível", fala: "Fala", escuta: "Escuta", leitura: "Leitura", escrita: "Escrita", traducao: "Tradução" };
  var PERFIL_NOME = { ALUNO: "Aluno", PROFESSOR: "Professor", ADMIN: "Gestão", EDITOR: "Editor", SUPORTE: "Sustentação" };

  /* ---------- utilidades de tela ---------- */
  function dataBR(iso) { var s = String(iso || ""); return s.length >= 10 ? s.slice(8, 10) + "/" + s.slice(5, 7) + (s.length >= 16 && s.charAt(10) === "T" ? " " + s.slice(11, 16) : "") : "—"; }
  function dataBRLocal(iso) { if (!iso) return "—"; var d = new Date(iso); return isNaN(d) ? dataBR(iso) : N.pad(d.getDate()) + "/" + N.pad(d.getMonth() + 1) + " " + N.pad(d.getHours()) + ":" + N.pad(d.getMinutes()); }
  function kpi(rot, valor, sub, cls) { return '<div class="kpi' + (cls ? " " + cls : "") + '"><span class="rot">' + esc(rot) + "</span><b>" + esc(valor) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>"; }
  function brl(v) { return "R$ " + (Number(v) || 0).toFixed(2).replace(".", ","); }
  function usd(v) { return "US$ " + (Number(v) || 0).toFixed(Number(v) < 1 ? 4 : 2); }
  function barrasHab(p) {
    return '<div class="hab mini">' + HAB.map(function (h) {
      var v = Number((p || {})[h[0]]) || 0;
      return '<div><div class="l"><span>' + h[1] + "</span><span>" + (v || "—") + '</span></div><div class="prog ' + (v && v < 60 ? "am" : "") + '"><i style="width:' + v + '%"></i></div></div>';
    }).join("") + "</div>";
  }
  function carregando(t) { return '<span class="rot">' + esc(t || "Carregando…") + "</span>"; }
  function exemplo() { return S.demo ? '<div class="info">Dados de exemplo da demonstração.</div>' : ""; }
  function opcoes(lista, atual) { return lista.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(atual) ? " selected" : "") + ">" + esc(t) + "</option>"; }).join(""); }
  function ocupado(b, on, texto) { if (!b) return; if (on) { b.dataset.t = b.textContent; b.textContent = texto || "Aguarde…"; } else if (b.dataset.t) b.textContent = b.dataset.t; b.disabled = on; }
  function tela(rot, titulo, corpo, aba) { return '<span class="rot">' + esc(rot) + "</span><h2>" + esc(titulo) + "</h2>" + exemplo() + '<div class="corpo" id="corpo">' + (corpo || carregando()) + "</div>"; }
  function carregarEm(el, rota, args, render) {
    return api(rota, args || {}).then(function (d) { $("#corpo", el).innerHTML = render(d); return d; }).catch(function (err) { $("#corpo", el).innerHTML = '<div class="erro">' + esc(err.message) + "</div>"; falhou(err); throw err; });
  }
  function tocarAudio(r) { if (!r || !r.audio) return; if (VZ) { VZ.saidaTts.parar(); VZ.saidaTts.tocarPcm(r.audio, r.rate || 24000); } }

  /* =================== PROFESSOR =================== */
  function itemPendente(x) {
    var hab = MOD[x.Habilidade] || x.Habilidade || "", titulo = x.AlunoNome || x.AlunoEmail || hab;
    var sub = [titulo === hab ? "" : hab, x.Origem === "IA" ? "nota da IA" : "nota automática", dataBRLocal(x.Quando)].filter(Boolean).join(" · ");
    return '<div class="linha-it"><div><b>' + esc(titulo) + "</b><small>" + esc(sub) + '</small></div>' +
      '<div class="acoes"><input class="campo n" type="number" min="0" max="100" value="' + esc(x.Nota) + '" aria-label="Nota" data-nota="' + esc(x.ID) + '"><button class="pill" data-validar="' + esc(x.ID) + '">Validar</button></div></div>';
  }
  function ligarValidar(el, depois) {
    [].forEach.call(el.querySelectorAll("[data-validar]"), function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-validar"), nota = Number(el.querySelector('[data-nota="' + id + '"]').value);
        ocupado(b, true);
        api("prof.validar", { avaliacaoId: id, nota: nota }).then(function () { toast("Nota validada."); if (depois) depois(); else b.closest(".linha-it").remove(); }).catch(function (e) { ocupado(b, false); falhou(e); });
      };
    });
  }

  V.profInicio = function () {
    return { classe: "eq", html: tela("Professor", "Sua turma hoje."), bind: function (el) {
      carregarEm(el, "prof.painel", {}, function (d) {
        return '<div class="kpis">' + kpi("Alunos", d.alunos) + kpi("Com alerta", d.alertas, "parados ou nota baixa", d.alertas ? "alerta" : "") + kpi("Dúvidas abertas", d.duvidasAbertas, "", d.duvidasAbertas ? "destaque" : "") + kpi("Notas a validar", d.pendentes.length) + "</div>" +
          '<div class="grade2"><div class="cartao"><div class="linha2"><span class="rot">Notas para validar</span><button class="link" data-ir="profAlunos">Ver alunos</button></div>' + (d.pendentes.length ? d.pendentes.map(itemPendente).join("") : "<p>Nada pendente. Tudo validado.</p>") + "</div>" +
          '<div class="cartao"><div class="linha2"><span class="rot">Próximas aulas</span><button class="link" data-ir="profAgenda">Agenda</button></div>' + (d.proximasAulas.length ? d.proximasAulas.map(function (a) { return '<div class="linha-it"><div><b>' + esc(a.AlunoNome || "Aluno") + "</b><small>" + dataBR(a.Inicio) + " · " + esc(a.Tipo === "duvidas" ? "plantão de dúvidas" : "conversação") + "</small></div></div>"; }).join("") : "<p>Nenhuma aula reservada.</p>") + "</div></div>";
      }).then(function () {
        ligarValidar(el, function () { go("profInicio"); });
        [].forEach.call(el.querySelectorAll("[data-ir]"), function (b) { b.onclick = function () { go(b.getAttribute("data-ir")); }; });
      }).catch(function () {});
    } };
  };

  V.profAlunos = function () {
    return { classe: "eq", html: tela("Professor", "Alunos.", '<input class="campo" id="busca" placeholder="Buscar por nome ou e-mail" aria-label="Buscar aluno"><div id="lista">' + carregando() + "</div>"), bind: function (el) {
      var todos = [];
      function render() {
        var q = $("#busca", el).value.toLowerCase().trim();
        var l = todos.filter(function (a) { return !q || String(a.Nome + " " + a.Email).toLowerCase().indexOf(q) >= 0; });
        $("#lista", el).innerHTML = l.length ? '<div class="cards">' + l.map(function (a) {
          return '<button class="card-al" data-email="' + esc(a.Email) + '"><div class="linha2"><b>' + esc(a.Nome || a.Email) + '</b><span class="tag">' + esc(a.Nivel || "sem nível") + "</span></div><small>" + esc(a.Objetivo || "Objetivo não informado") + "</small>" + barrasHab(a.progresso) +
            (a.alertas && a.alertas.length ? '<div class="chips">' + a.alertas.map(function (x) { return '<span class="chip alerta">' + esc(x) + "</span>"; }).join("") + "</div>" : "") + "</button>";
        }).join("") + "</div>" : "<p>Nenhum aluno encontrado.</p>";
        [].forEach.call(el.querySelectorAll("[data-email]"), function (b) { b.onclick = function () { go("profAluno", { email: b.getAttribute("data-email") }); }; });
      }
      api("prof.alunos").then(function (l) { todos = l; render(); }).catch(function (e) { $("#lista", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
      $("#busca", el).oninput = render;
    } };
  };

  V.profAluno = function (p) {
    return { classe: "eq", aba: "profAlunos", html: '<button class="link voltar" id="volta">← Alunos</button>' + tela("Aluno", "Carregando…"), bind: function (el) {
      $("#volta", el).onclick = function () { go("profAlunos"); };
      api("prof.aluno", { email: p.email }).then(function (d) {
        var a = d.aluno;
        el.querySelector("h2").textContent = a.Nome || a.Email;
        $("#corpo", el).innerHTML =
          '<div class="grade2"><div class="cartao"><span class="rot">' + esc(a.Email) + "</span><p>Objetivo: " + esc(a.Objetivo || "—") + "</p>" + barrasHab(d.progresso) +
          '<div class="linha2"><label class="rot" for="nv">Nível</label><select class="campo" id="nv">' + opcoes([["", "—"]].concat(Object.keys(N.NIVEIS).map(function (k) { return [k, k + " · " + N.NIVEIS[k]]; })), a.Nivel) + '</select><button class="pill" id="nv-s">Salvar nível</button></div></div>' +
          '<div class="cartao"><span class="rot">Recado para o aluno</span><textarea class="campo" id="rc" rows="3" maxlength="600" placeholder="Ex.: Ótima evolução na fala! Esta semana, foque no passado."></textarea><button class="btn" id="rc-e">Enviar recado</button></div></div>' +
          '<div class="cartao"><span class="rot">Avaliações recentes</span>' + (d.avaliacoes.length ? d.avaliacoes.map(function (x) {
            return x.Validada === "1" ? '<div class="linha-it"><div><b>' + esc(MOD[x.Habilidade] || x.Habilidade) + " · " + esc(x.Nota) + "</b><small>validada · " + dataBRLocal(x.Quando) + "</small></div></div>" : itemPendente({ ID: x.ID, AlunoNome: "", Habilidade: x.Habilidade, Origem: x.Origem, Nota: x.Nota, Quando: x.Quando });
          }).join("") : "<p>Sem avaliações ainda.</p>") + "</div>" +
          '<div class="cartao"><span class="rot">Últimas conversas com a IA</span><div class="transcr">' + (d.mensagens.length ? d.mensagens.map(function (m) {
            var al = /^aluno/.test(m.Papel);
            return '<div class="bol ' + (al ? "eu" : "ia") + '">' + (m.Papel === "aluno_voz" ? '<small class="rot">por voz</small> ' : "") + esc(m.Texto) + "</div>";
          }).join("") : "<p>Sem conversas ainda.</p>") + "</div></div>";
        ligarValidar(el);
        $("#nv-s", el).onclick = function () { var b = this, nv = $("#nv", el).value; if (!nv) { toast("Escolha um nível."); return; } ocupado(b, true); api("prof.nivel", { email: a.Email, nivel: nv }).then(function () { ocupado(b, false); toast("Nível atualizado."); }).catch(function (e) { ocupado(b, false); falhou(e); }); };
        $("#rc-e", el).onclick = function () { var b = this, t = $("#rc", el).value.trim(); if (!t) { toast("Escreva o recado."); return; } ocupado(b, true); api("prof.recado", { email: a.Email, texto: t }).then(function () { ocupado(b, false); $("#rc", el).value = ""; toast("Recado enviado."); }).catch(function (e) { ocupado(b, false); falhou(e); }); };
      }).catch(function (e) { $("#corpo", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
    } };
  };

  V.profDuvidas = function () {
    return { classe: "eq", html: tela("Professor", "Dúvidas dos alunos."), bind: function (el) {
      carregarEm(el, "prof.duvidas", {}, function (l) {
        return l.length ? l.map(function (d) {
          var aberta = d.Status === "ABERTA";
          return '<div class="cartao"><div class="linha2"><b>' + esc(d.AlunoNome || d.AlunoEmail) + '</b><span class="tag' + (aberta ? "" : " cinza") + '">' + (aberta ? "Aberta" : "Respondida") + '</span></div><small class="rot">' + dataBRLocal(d.Quando) + "</small><p class=\"pergunta\">" + esc(d.Texto) + "</p>" +
            (aberta ? '<textarea class="campo" rows="3" maxlength="2000" data-r="' + esc(d.ID) + '" placeholder="Sua resposta"></textarea><button class="btn" data-resp="' + esc(d.ID) + '">Responder</button>' : '<p class="resp">' + esc(d.Resposta) + "<small> — " + esc(d.RespondidaPor) + "</small></p>") + "</div>";
        }).join("") : "<p>Nenhuma dúvida por enquanto.</p>";
      }).then(function () {
        [].forEach.call(el.querySelectorAll("[data-resp]"), function (b) {
          b.onclick = function () {
            var id = b.getAttribute("data-resp"), t = el.querySelector('[data-r="' + id + '"]').value.trim();
            if (t.length < 2) { toast("Escreva a resposta."); return; }
            ocupado(b, true);
            api("prof.duvidaResponder", { ID: id, resposta: t }).then(function () { toast("Resposta enviada ao aluno."); go("profDuvidas"); }).catch(function (e) { ocupado(b, false); falhou(e); });
          };
        });
      }).catch(function () {});
    } };
  };

  function listaAgenda(l, podeExcluir) {
    if (!l.length) return "<p>Nenhum horário.</p>";
    var porDia = {};
    l.forEach(function (s) { var d = String(s.Inicio).slice(0, 10); (porDia[d] = porDia[d] || []).push(s); });
    return Object.keys(porDia).map(function (d) {
      return '<div class="dia"><span class="rot">' + d.split("-").reverse().join("/") + "</span>" + porDia[d].map(function (s) {
        var st = { LIVRE: "Livre", RESERVADA: "Reservada" }[s.Status] || s.Status;
        return '<div class="linha-it"><div><b>' + esc(String(s.Inicio).slice(11, 16)) + "–" + esc(String(s.Fim).slice(11, 16)) + " · " + esc(s.Tipo === "duvidas" ? "Plantão de dúvidas" : "Conversação") + "</b><small>" + esc(s.ProfessorNome || s.ProfessorEmail) + (s.AlunoNome ? " · " + esc(s.AlunoNome) : "") + '</small></div><div class="acoes"><span class="tag' + (s.Status === "LIVRE" ? " cinza" : "") + '">' + st + "</span>" +
          (podeExcluir && s.Status === "LIVRE" ? '<button class="pill" data-exc="' + esc(s.ID) + '">Excluir</button>' : "") + "</div></div>";
      }).join("") + "</div>";
    }).join("");
  }

  V.profAgenda = function () {
    var amanha = new Date(Date.now() + 86400000), padrao = amanha.getFullYear() + "-" + N.pad(amanha.getMonth() + 1) + "-" + N.pad(amanha.getDate()) + "T18:00";
    return { classe: "eq", html: tela("Professor", "Agenda.",
      '<div class="cartao"><span class="rot">Abrir horários</span><div class="form-g">' +
      '<label>Início<input class="campo" type="datetime-local" id="ag-i" value="' + padrao + '"></label>' +
      '<label>Duração<select class="campo" id="ag-d">' + opcoes([["30", "30 min"], ["45", "45 min"], ["60", "60 min"], ["15", "15 min"]], "30") + "</select></label>" +
      '<label>Tipo<select class="campo" id="ag-t">' + opcoes([["conversacao", "Conversação"], ["duvidas", "Plantão de dúvidas"]], "conversacao") + "</select></label>" +
      '<label>Repetir<select class="campo" id="ag-s">' + opcoes([["1", "Só esta semana"], ["4", "4 semanas"], ["8", "8 semanas"]], "1") + "</select></label></div>" +
      '<button class="btn" id="ag-c">Criar horário</button></div><div id="ag-l">' + carregando() + "</div>"), bind: function (el) {
      function carregar() { api("agenda.profLista").then(function (l) { $("#ag-l", el).innerHTML = listaAgenda(l, true); ligar(); }).catch(function (e) { $("#ag-l", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; }); }
      function ligar() { [].forEach.call(el.querySelectorAll("[data-exc]"), function (b) { b.onclick = function () { ocupado(b, true); api("agenda.excluir", { ID: b.getAttribute("data-exc") }).then(carregar).catch(function (e) { ocupado(b, false); falhou(e); }); }; }); }
      $("#ag-c", el).onclick = function () {
        var b = this; ocupado(b, true);
        api("agenda.criar", { inicio: $("#ag-i", el).value, duracao: Number($("#ag-d", el).value), tipo: $("#ag-t", el).value, semanas: Number($("#ag-s", el).value) })
          .then(function (r) { ocupado(b, false); toast(r.criados + " horário(s) criado(s)."); carregar(); }).catch(function (e) { ocupado(b, false); falhou(e); });
      };
      carregar();
    } };
  };

  /* =================== GESTÃO =================== */
  V.gesInicio = function () {
    return { classe: "eq", html: tela("Gestão", "Indicadores."), bind: function (el) {
      carregarEm(el, "adm.indicadores", {}, function (d) {
        var max = Math.max.apply(null, d.engajamento.map(function (x) { return x.ativos; }).concat([1]));
        var niveis = Object.keys(d.niveis).sort().map(function (k) { return '<div class="kv2"><span>' + esc(k) + "</span><b>" + d.niveis[k] + "</b></div>"; }).join("");
        var tempo = Object.keys(d.tempoPorModulo).map(function (k) { var t = d.tempoPorModulo[k]; return '<div class="kv2"><span>' + esc(MOD[k] || k) + "</span><b>" + t.minutos + " min</b><small>" + t.sessoes + " sessões</small></div>"; }).join("");
        return '<div class="kpis">' + kpi("Alunos ativos", d.alunosAtivos, "de " + d.alunos + " cadastrados") + kpi("Ativos em 7 dias", d.ativos7) + kpi("Sessões hoje", d.sessoesHoje) +
          kpi("Receita mensal (MRR)", brl(d.mrr), "planos mensais ativos", "destaque") + kpi("Receita única", brl(d.receitaUnica)) + kpi("Churn 30 dias", d.churn.pct + "%", d.churn.perdidos + " de " + d.churn.base, d.churn.pct > 8 ? "alerta" : "") + "</div>" +
          '<div class="cartao"><span class="rot">Alunos ativos por dia (14 dias)</span><div class="barras" role="img" aria-label="Alunos ativos por dia">' + d.engajamento.map(function (x) {
            return '<div class="b" title="' + esc(x.dia) + ": " + x.ativos + '"><i style="height:' + Math.round(x.ativos / max * 100) + '%"></i><small>' + esc(x.dia.slice(0, 2)) + "</small></div>";
          }).join("") + "</div></div>" +
          '<div class="grade3"><div class="cartao"><span class="rot">Média por habilidade</span>' + barrasHab(d.mediaHabilidade) + '</div><div class="cartao"><span class="rot">Alunos por nível</span>' + (niveis || "<p>—</p>") + '</div><div class="cartao"><span class="rot">Tempo médio por módulo</span>' + (tempo || "<p>—</p>") + "</div></div>" +
          '<div class="cartao"><div class="linha2"><span class="rot">IA</span><span class="tag' + (d.iaAtiva ? "" : " alerta") + '">' + (d.iaAtiva ? "ligada" : "sem chave") + "</span></div><p>Chave, voz e custos da IA ficam com a equipe de Sustentação.</p></div>";
      }).catch(function () {});
    } };
  };

  V.gesUsuarios = function () {
    return { classe: "eq", html: tela("Gestão", "Acessos.", '<div class="linha2"><input class="campo" id="busca" placeholder="Buscar nome ou e-mail" aria-label="Buscar usuário"><button class="btn mini" id="novo">Novo acesso</button></div><div id="form"></div><div id="lista">' + carregando() + "</div>"), bind: function (el) {
      var todos = [], planos = [], profs = [];
      function form(u) {
        u = u || { Perfil: "ALUNO", Ativo: "1" };
        $("#form", el).innerHTML = '<div class="cartao"><span class="rot">' + (u.Email ? "Editar acesso" : "Novo acesso") + '</span><div class="form-g">' +
          '<label>E-mail<input class="campo" id="f-e" type="email" value="' + esc(u.Email || "") + '"' + (u.Email ? " readonly" : "") + "></label>" +
          '<label>Nome<input class="campo" id="f-n" value="' + esc(u.Nome || "") + '"></label>' +
          '<label>Perfil<select class="campo" id="f-p">' + opcoes([["ALUNO", "Aluno"], ["PROFESSOR", "Professor"], ["ADMIN", "Gestão"], ["EDITOR", "Editor de conteúdo"]], u.Perfil) + "</select></label>" +
          '<label class="so-aluno">Professor<select class="campo" id="f-pr">' + opcoes([["", "—"]].concat(profs.map(function (p) { return [p.Email, p.Nome || p.Email]; })), u.ProfessorEmail) + "</select></label>" +
          '<label class="so-aluno">Plano<select class="campo" id="f-pl">' + opcoes([["", "—"]].concat(planos.map(function (p) { return [p.Nome, p.Nome]; })), u.Plano) + "</select></label>" +
          '<label class="so-aluno">Nível<select class="campo" id="f-nv">' + opcoes([["", "—"], "A1", "A2", "B1", "B2", "C1"], u.Nivel) + "</select></label>" +
          '<label>Acesso<select class="campo" id="f-a">' + opcoes([["1", "Liberado"], ["0", "Bloqueado"]], String(u.Ativo) === "0" ? "0" : "1") + "</select></label></div>" +
          '<div class="linha2"><button class="btn" id="f-s">Salvar</button><button class="btn fantasma" id="f-x">Cancelar</button></div></div>';
        function vis() { [].forEach.call(el.querySelectorAll(".so-aluno"), function (x) { x.hidden = $("#f-p", el).value !== "ALUNO"; }); }
        $("#f-p", el).onchange = vis; vis();
        $("#f-x", el).onclick = function () { $("#form", el).innerHTML = ""; };
        $("#f-s", el).onclick = function () {
          var b = this; ocupado(b, true);
          api("adm.usuarioSalvar", { Email: $("#f-e", el).value.trim(), Nome: $("#f-n", el).value.trim(), Perfil: $("#f-p", el).value, ProfessorEmail: $("#f-pr", el).value, Plano: $("#f-pl", el).value, Nivel: $("#f-nv", el).value, Ativo: $("#f-a", el).value })
            .then(function () { toast("Acesso salvo."); go("gesUsuarios"); }).catch(function (e) { ocupado(b, false); falhou(e); });
        };
        $("#form", el).scrollIntoView({ behavior: "smooth", block: "start" });
      }
      function render() {
        var q = $("#busca", el).value.toLowerCase().trim();
        var l = todos.filter(function (u) { return !q || String(u.Nome + " " + u.Email).toLowerCase().indexOf(q) >= 0; });
        $("#lista", el).innerHTML = '<div class="tabela" role="table">' + '<div class="tr th" role="row"><span>Nome</span><span>Perfil</span><span>Nível / plano</span><span>Acesso</span><span></span></div>' + l.map(function (u, i) {
          var sup = u.Perfil === "SUPORTE";
          return '<div class="tr" role="row"><span><b>' + esc(u.Nome || "—") + "</b><small>" + esc(u.Email) + "</small></span><span>" + esc(PERFIL_NOME[u.Perfil] || u.Perfil) + "</span><span>" + esc(u.Perfil === "ALUNO" ? (u.Nivel || "—") + " · " + (u.Plano || "sem plano") : "—") + '</span><span><span class="tag' + (String(u.Ativo) === "0" ? " alerta" : " cinza") + '">' + (String(u.Ativo) === "0" ? "Bloqueado" : "Liberado") + "</span></span><span>" + (sup ? '<small>pela Sustentação</small>' : '<button class="pill" data-ed="' + i + '">Editar</button>') + "</span></div>";
        }).join("") + "</div>";
        [].forEach.call(el.querySelectorAll("[data-ed]"), function (b) { b.onclick = function () { form(l[+b.getAttribute("data-ed")]); }; });
      }
      Promise.all([api("adm.usuarios"), api("adm.planos")]).then(function (r) {
        todos = r[0]; planos = r[1].filter(function (p) { return String(p.Ativo) !== "0"; });
        profs = todos.filter(function (u) { return u.Perfil === "PROFESSOR" || u.Perfil === "ADMIN"; });
        render();
      }).catch(function (e) { $("#lista", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
      $("#busca", el).oninput = render;
      $("#novo", el).onclick = function () { form(); };
    } };
  };

  V.gesAgenda = function () {
    return { classe: "eq", html: tela("Gestão", "Agenda da escola."), bind: function (el) {
      carregarEm(el, "adm.agenda", {}, function (l) {
        var res = l.filter(function (s) { return s.Status === "RESERVADA"; }).length;
        return '<div class="kpis">' + kpi("Horários abertos", l.length) + kpi("Reservados", res) + kpi("Ocupação", l.length ? Math.round(res * 100 / l.length) + "%" : "—") + "</div>" + listaAgenda(l, false);
      }).catch(function () {});
    } };
  };

  V.gesPlanos = function () {
    return { classe: "eq", html: tela("Gestão", "Planos.", '<div id="form"></div><button class="btn mini" id="novo">Novo plano</button><div id="lista">' + carregando() + "</div>"), bind: function (el) {
      var l = [];
      function form(p) {
        p = p || { Tipo: "mensal", Ativo: "1" };
        $("#form", el).innerHTML = '<div class="cartao"><div class="form-g"><label>Nome<input class="campo" id="p-n" value="' + esc(p.Nome || "") + '"></label><label>Valor (R$)<input class="campo" id="p-v" inputmode="decimal" value="' + esc(p.Valor || "") + '"></label>' +
          '<label>Cobrança<select class="campo" id="p-t">' + opcoes([["mensal", "Mensal"], ["unico", "Pagamento único"]], p.Tipo) + '</select></label><label>Situação<select class="campo" id="p-a">' + opcoes([["1", "Ativo"], ["0", "Inativo"]], String(p.Ativo) === "0" ? "0" : "1") + "</select></label></div>" +
          '<label class="rot" for="p-d">Descrição</label><textarea class="campo" id="p-d" rows="2" maxlength="300">' + esc(p.Descricao || "") + '</textarea><div class="linha2"><button class="btn" id="p-s">Salvar plano</button><button class="btn fantasma" id="p-x">Cancelar</button></div></div>';
        $("#p-x", el).onclick = function () { $("#form", el).innerHTML = ""; };
        $("#p-s", el).onclick = function () {
          var b = this; ocupado(b, true);
          api("adm.planoSalvar", { ID: p.ID || "", Nome: $("#p-n", el).value, Valor: $("#p-v", el).value, Tipo: $("#p-t", el).value, Ativo: $("#p-a", el).value, Descricao: $("#p-d", el).value }).then(function () { toast("Plano salvo."); go("gesPlanos"); }).catch(function (e) { ocupado(b, false); falhou(e); });
        };
      }
      api("adm.planos").then(function (r) {
        l = r;
        $("#lista", el).innerHTML = '<div class="cards">' + l.map(function (p, i) {
          return '<div class="cartao"><div class="linha2"><b>' + esc(p.Nome) + '</b><span class="tag' + (String(p.Ativo) === "0" ? " cinza" : "") + '">' + (String(p.Ativo) === "0" ? "inativo" : p.Tipo === "unico" ? "único" : "mensal") + '</span></div><b class="preco">' + brl(String(p.Valor).replace(",", ".")) + "</b><p>" + esc(p.Descricao || "") + '</p><button class="pill" data-ed="' + i + '">Editar</button></div>';
        }).join("") + "</div>";
        [].forEach.call(el.querySelectorAll("[data-ed]"), function (b) { b.onclick = function () { form(l[+b.getAttribute("data-ed")]); }; });
      }).catch(function (e) { $("#lista", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
      $("#novo", el).onclick = function () { form(); };
    } };
  };

  /* =================== GESTÃO: MATERIAIS =================== */
  var PDFLIB = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
  var EXT = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", txt: "text/plain", md: "text/markdown", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mpeg: "video/mpeg" };
  var KIND = function (m) { return /^application\/pdf/.test(m) ? "pdf" : /^image\//.test(m) ? "img" : /wordprocessingml/.test(m) ? "docx" : /presentationml/.test(m) ? "pptx" : /^text\//.test(m) ? "txt" : /^audio\//.test(m) ? "audio" : /^video\//.test(m) ? "video" : ""; };
  var MAX_PARTE = 14000000, PEDACO = 1500000, PAGS = 5;
  var STATUS = { ENVIANDO: ["Enviando", "cinza"], NA_FILA: ["Na fila", "cinza"], PROCESSANDO: ["Processando", ""], REVISAO: ["Para revisar", ""], PUBLICADO: ["Publicado", "ok"], ERRO: ["Erro", "alerta"] };
  var KINDNOME = { pdf: "PDF", img: "Imagens", docx: "Word", pptx: "PowerPoint", txt: "Texto", audio: "Áudio", video: "Vídeo" };
  var HABNOME = { escuta: "Ouvir", fala: "Falar", leitura: "Ler", escrita: "Escrever", traducao: "Traduzir" };

  function mimeDe(f) { var e = String(f.name.split(".").pop() || "").toLowerCase(); return EXT[e] || f.type || ""; }
  function bytesB64(u8) { var s = "", t = 0x8000; for (var i = 0; i < u8.length; i += t) s += String.fromCharCode.apply(null, u8.subarray(i, i + t)); return btoa(s); }
  function mb(n) { return (n / 1048576).toFixed(n > 10485760 ? 0 : 1) + " MB"; }
  function lerArquivo(f) { return f.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function carregarPdfLib() {
    return new Promise(function (ok, no) {
      if (window.PDFLib) { ok(window.PDFLib); return; }
      var s = document.createElement("script"); s.src = PDFLIB; s.onload = function () { ok(window.PDFLib); }; s.onerror = function () { no(new Error("Não consegui carregar o leitor de PDF (internet).")); };
      document.head.appendChild(s);
    });
  }

  /* Cada arquivo vira uma lista de partes. PDF é dividido de 5 em 5 páginas (cada parte vai para a IA separadamente). */
  function prepararPartes(arquivos, onStatus) {
    var mime = mimeDe(arquivos[0]), k = KIND(mime);
    if (!k) return Promise.reject(new Error("Tipo de arquivo não aceito: " + arquivos[0].name));
    if (k === "img") {
      var imgs = arquivos.slice().sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
      return imgs.reduce(function (p, f, i) {
        return p.then(function (l) { if (f.size > MAX_PARTE) throw new Error(f.name + " é grande demais (máximo " + mb(MAX_PARTE) + " por imagem)."); onStatus("Lendo imagens " + (i + 1) + "/" + imgs.length); return lerArquivo(f).then(function (u) { l.push({ bytes: u, mime: mimeDe(f), rotulo: "imagem " + (i + 1) }); return l; }); });
      }, Promise.resolve([]));
    }
    var f = arquivos[0];
    if ((k === "audio" || k === "video") && f.size > MAX_PARTE) return Promise.reject(new Error(f.name + ": áudio e vídeo aceitam até " + mb(MAX_PARTE) + " por enquanto. Divida em arquivos menores ou extraia só o áudio."));
    if (k !== "pdf") {
      if (f.size > MAX_PARTE) return Promise.reject(new Error(f.name + " é grande demais (máximo " + mb(MAX_PARTE) + ")."));
      return lerArquivo(f).then(function (u) { return [{ bytes: u, mime: mime, rotulo: "arquivo inteiro" }]; });
    }
    return lerArquivo(f).then(function (u) {
      return carregarPdfLib().then(function (L) {
        return L.PDFDocument.load(u, { ignoreEncryption: true }).then(function (src) {
          var n = src.getPageCount(), grupos = [], i;
          for (i = 0; i < n; i += PAGS) grupos.push([i, Math.min(n, i + PAGS) - 1]);
          return grupos.reduce(function (p, g, gi) {
            return p.then(function (l) {
              onStatus("Separando páginas " + (g[0] + 1) + " a " + (g[1] + 1) + " de " + n);
              return L.PDFDocument.create().then(function (doc) {
                var idx = []; for (var j = g[0]; j <= g[1]; j++) idx.push(j);
                return doc.copyPages(src, idx).then(function (pgs) { pgs.forEach(function (pg) { doc.addPage(pg); }); return doc.save(); });
              }).then(function (bytes) {
                if (bytes.length > MAX_PARTE) throw new Error("As páginas " + (g[0] + 1) + " a " + (g[1] + 1) + " passam de " + mb(MAX_PARTE) + ". Reduza o tamanho das imagens do PDF.");
                l.push({ bytes: bytes, mime: "application/pdf", rotulo: "pág. " + (g[0] + 1) + (g[1] > g[0] ? "-" + (g[1] + 1) : "") }); return l;
              });
            });
          }, Promise.resolve([]));
        });
      }, function (e) {
        if (f.size <= MAX_PARTE) return [{ bytes: u, mime: "application/pdf", rotulo: "arquivo inteiro" }];
        throw e;
      });
    });
  }

  function limitar(itens, n, fn) {
    var i = 0, ativos = 0, falha = null;
    return new Promise(function (ok, no) {
      function passo() {
        if (falha) { if (!ativos) no(falha); return; }
        if (i >= itens.length && !ativos) { ok(); return; }
        while (ativos < n && i < itens.length) {
          (function (k) { ativos++; fn(itens[k], k).then(function () { ativos--; passo(); }, function (e) { falha = falha || e; ativos--; passo(); }); })(i++);
        }
      }
      passo();
    });
  }

  /* Envia uma parte em pedaços de 1,5 MB (múltiplo de 3 bytes: o base64 dos pedaços se junta sem erro). */
  function enviarParte(id, parte, idx) {
    var subs = Math.max(1, Math.ceil(parte.bytes.length / PEDACO)), seq = [], k;
    for (k = 0; k < subs; k++) seq.push(k);
    return seq.reduce(function (p, s) { return p.then(function () { return api("imp.parte", { id: id, parte: idx, sub: s, subTotal: subs, mime: parte.mime, rotulo: parte.rotulo, dados: bytesB64(parte.bytes.subarray(s * PEDACO, (s + 1) * PEDACO)) }); }); }, Promise.resolve());
  }

  function processarLoop(id, onProg, ctl) {
    return new Promise(function (ok) {
      var ativos = 0, fim = false, ultimo = null;
      function passo() {
        if (ctl && ctl.parar) fim = true;
        while (!fim && ativos < 3) {
          ativos++;
          api("imp.processar", { id: id }).then(function (p) { ultimo = p; onProg(p); if (!p.trabalhou || (p.pendentes === 0 && p.andamento === 0)) fim = true; }, function (e) { fim = true; falhou(e); }).then(function () { ativos--; if (fim && !ativos) ok(ultimo); else passo(); });
        }
        if (fim && !ativos) ok(ultimo);
      }
      passo();
    });
  }

  /* envio completo de um material: partes, upload, finalizar e processamento */
  function enviarMaterial(job, onStatus, onProg) {
    return api("imp.iniciar", { nome: job.nome, mime: job.partes[0].mime, partes: job.partes.length, livro: job.livro, nivel: job.nivel, tamanho: job.tamanho }).then(function (r) {
      var feitas = 0;
      return limitar(job.partes, 2, function (p, i) { return enviarParte(r.id, p, i).then(function () { feitas++; onStatus("Enviando " + feitas + "/" + job.partes.length); }); })
        .then(function () { onStatus("Finalizando envio"); return api("imp.finalizar", { id: r.id }); })
        .then(function () { onStatus("Processando com a IA"); return processarLoop(r.id, function (p) { onStatus("Processando " + p.feitas + "/" + p.total); if (onProg) onProg(p); }); })
        .then(function (p) { return { id: r.id, progresso: p }; });
    });
  }
  N.imp = { prepararPartes: prepararPartes, enviarMaterial: enviarMaterial, mimeDe: mimeDe };

  var timerMat = null;
  function statusTag(s) { var x = STATUS[s] || [s, "cinza"]; return '<span class="tag' + (x[1] ? " " + x[1] : "") + '">' + x[0] + "</span>"; }
  function barra(m) { var pct = m.Total ? Math.round(m.Feitas * 100 / m.Total) : 0; return '<div class="prog"><i style="width:' + pct + '%"></i></div>'; }

  V.gesMateriais = function () {
    return { classe: "eq", html: tela("Gestão", "Materiais.",
      '<div class="cartao"><span class="rot">Importar material da escola</span>' +
      '<p>Envie os books e as aulas. A IA lê, separa em lições, vocabulário e trechos, e você revisa antes de publicar. PDF, PDF escaneado, imagens, Word, PowerPoint, texto, áudio e vídeo.</p>' +
      '<div class="form-g"><label>Livro<select class="campo" id="m-livro">' + opcoes([["", "Sem livro"], "Book 1", "Book 2", "Book 3", "Book 4", "Book 5", "Book 6"], "") + "</select></label>" +
      '<label>Nível<select class="campo" id="m-nivel">' + opcoes([["auto", "A IA descobre"], "A1", "A2", "B1", "B2", "C1"], "auto") + "</select></label></div>" +
      '<input class="campo" type="file" id="m-arq" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.pptx,.txt,.md,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.webm,.mov,.mpeg" aria-label="Escolher arquivos">' +
      '<small class="rot">Várias imagens juntas viram um só material (as páginas, em ordem de nome). Áudio e vídeo: até 14 MB por arquivo.</small><div id="m-fila"></div><button class="btn" id="m-env" disabled>Enviar e processar</button></div>' +
      '<div id="m-lista">' + carregando() + "</div>"), bind: function (el) {
      var arqs = [];
      function lista() {
        api("imp.lista").then(function (l) {
          if (S.tela !== "gesMateriais") return;
          $("#m-lista", el).innerHTML = l.length ? '<div class="cards">' + l.map(function (m) {
            return '<button class="card-al" data-m="' + esc(m.ID) + '"><div class="linha2"><b>' + esc(m.Nome) + "</b>" + statusTag(m.Status) + "</div><small>" + esc((m.Livro ? m.Livro + " · " : "") + (KINDNOME[m.Kind] || m.Kind) + (m.Nivel !== "auto" ? " · " + m.Nivel : "")) + "</small>" +
              (m.Total ? barra(m) + '<small class="rot">' + m.Feitas + " de " + m.Total + " partes</small>" : "") + '<small>' + m.Licoes + " lições · " + m.Vocab + " palavras · " + m.Trechos + " trechos</small>" + (m.Erro ? '<small class="err">' + esc(m.Erro) + "</small>" : "") + "</button>";
          }).join("") + "</div>" : "<p>Nenhum material importado ainda.</p>";
          [].forEach.call(el.querySelectorAll("[data-m]"), function (b) { b.onclick = function () { go("gesMaterial", { id: b.getAttribute("data-m") }); }; });
          clearTimeout(timerMat);
          if (l.some(function (m) { return ["ENVIANDO", "NA_FILA", "PROCESSANDO"].indexOf(m.Status) >= 0; })) timerMat = setTimeout(function () { if (S.tela === "gesMateriais") lista(); }, 8000);
        }).catch(function (e) { $("#m-lista", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
      }
      $("#m-arq", el).onchange = function () {
        arqs = [].slice.call(this.files || []);
        var ruins = arqs.filter(function (f) { return !KIND(mimeDe(f)); });
        $("#m-fila", el).innerHTML = arqs.map(function (f) { return '<div class="linha-it"><div><b>' + esc(f.name) + "</b><small>" + mb(f.size) + (KIND(mimeDe(f)) ? "" : " · tipo não aceito") + "</small></div></div>"; }).join("");
        $("#m-env", el).disabled = !arqs.length || ruins.length > 0;
        if (ruins.length) toast("Há arquivos de tipo não aceito. Tire-os da seleção.");
      };
      $("#m-env", el).onclick = function () {
        var b = this, livro = $("#m-livro", el).value, nivel = $("#m-nivel", el).value, todasImg = arqs.every(function (f) { return KIND(mimeDe(f)) === "img"; });
        var jobs = todasImg ? [arqs] : arqs.map(function (f) { return [f]; });
        b.disabled = true; $("#m-arq", el).disabled = true;
        var linhas = jobs.map(function (j) { return j.length > 1 ? j[0].name + " (+" + (j.length - 1) + " imagens)" : j[0].name; });
        $("#m-fila", el).innerHTML = linhas.map(function (n, i) { return '<div class="linha-it"><div><b>' + esc(n) + '</b><small id="m-st' + i + '">Na espera</small></div></div>'; }).join("");
        jobs.reduce(function (p, j, i) {
          var st = function (t) { var e = $("#m-st" + i, el); if (e) e.textContent = t; };
          return p.then(function () {
            return prepararPartes(j, st).then(function (partes) {
              return enviarMaterial({ nome: linhas[i].replace(/\.[A-Za-z0-9]+(?= \(\+|$)/, ""), livro: livro, nivel: nivel, partes: partes, tamanho: j.reduce(function (s, f) { return s + f.size; }, 0) }, st, null);
            }).then(function (r) { var pr = r.progresso || {}; st(pr.status === "REVISAO" ? "Pronto para revisar" : pr.status === "ERRO" ? "Terminou com erro" : "Em processamento (continua sozinho)"); lista(); }, function (e) { st("Falhou: " + e.message); falhou(e); });
          });
        }, Promise.resolve()).then(function () { b.disabled = false; $("#m-arq", el).disabled = false; $("#m-arq", el).value = ""; arqs = []; toast("Envio terminado. Abra o material para revisar."); lista(); });
      };
      lista();
    } };
  };

  function campoMat(rot, id, val, tipo, ops) {
    if (ops) return "<label>" + rot + '<select class="campo" id="' + id + '">' + opcoes(ops, val) + "</select></label>";
    if (tipo === "area") return "<label>" + rot + '<textarea class="campo" id="' + id + '" rows="6">' + esc(val) + "</textarea></label>";
    return "<label>" + rot + '<input class="campo" id="' + id + '" value="' + esc(val) + '"></label>';
  }

  V.gesMaterial = function (p) {
    return { classe: "eq", aba: "gesMateriais", html: '<button class="link voltar" id="volta">← Materiais</button>' + tela("Material", "Revisão."), bind: function (el) {
      var aba = "licoes", mostrar = 40, ctl = { parar: false }, dados = null, editando = "";
      $("#volta", el).onclick = function () { ctl.parar = true; go("gesMateriais"); };
      function carregar() {
        api("imp.detalhe", { id: p.id }).then(function (d) { if (S.tela === "gesMaterial") { dados = d; desenha(); } }).catch(function (e) { if (S.tela === "gesMaterial") $("#corpo", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
      }
      function acao(rota, extra, ok, conf) {
        if (conf && !confirm(conf)) return;
        api(rota, Object.assign({ id: p.id }, extra || {})).then(function (r) { var m = ok ? ok(r) : ""; if (m) toast(m); if (S.tela === "gesMaterial") carregar(); }).catch(falhou);
      }
      function item(tipo, x) {
        var ed = editando === x.ID, topo, corpo;
        if (tipo === "licao") { topo = "<b>" + esc(x.Titulo) + '</b><small>' + (HABNOME[x.Habilidade] || x.Habilidade) + " · " + x.Nivel + (x.Topico ? " · " + esc(x.Topico) : "") + (x.Fonte ? " · " + esc(x.Fonte) : "") + "</small>"; corpo = "<p>" + esc(x.Conteudo.slice(0, 220)) + (x.Conteudo.length > 220 ? "…" : "") + "</p>"; }
        else if (tipo === "vocab") { topo = '<b class="palavra">' + esc(x.Palavra) + "</b><small>" + esc(x.Traducao) + " · " + x.Nivel + "</small>"; corpo = x.Exemplo ? "<p>“" + esc(x.Exemplo) + "”</p>" : ""; }
        else { topo = "<b>" + esc(x.Titulo) + "</b><small>" + (x.Topico ? esc(x.Topico) + " · " : "") + x.Nivel + (x.Fonte ? " · " + esc(x.Fonte) : "") + (x.ComVetor ? "" : " · sem busca por significado") + "</small>"; corpo = "<p>" + esc(x.Texto) + "</p>"; }
        var form = "";
        if (ed) {
          var niv = ["A1", "A2", "B1", "B2", "C1"], hab = Object.keys(HABNOME).map(function (k) { return [k, HABNOME[k]]; });
          form = '<div class="form-g">' + (tipo === "licao" ? campoMat("Título", "e-Titulo", x.Titulo) + campoMat("Habilidade", "e-Habilidade", x.Habilidade, null, hab) + campoMat("Nível", "e-Nivel", x.Nivel, null, niv) + campoMat("Tópico", "e-Topico", x.Topico) + campoMat("Conteúdo", "e-Conteudo", x.Conteudo, "area")
            : tipo === "vocab" ? campoMat("Palavra", "e-Palavra", x.Palavra) + campoMat("Tradução", "e-Traducao", x.Traducao) + campoMat("Exemplo", "e-Exemplo", x.Exemplo) + campoMat("Nível", "e-Nivel", x.Nivel, null, niv) + campoMat("Tópico", "e-Topico", x.Topico)
            : campoMat("Título", "e-Titulo", x.Titulo) + campoMat("Tópico", "e-Topico", x.Topico) + campoMat("Texto", "e-Texto", x.Texto, "area")) + '</div><div class="linha2"><button class="btn mini" data-sv="' + x.ID + '">Salvar</button><button class="btn mini fantasma" data-cx="1">Cancelar</button></div>';
        }
        return '<div class="cartao item" data-i="' + esc(x.ID) + '"><div class="linha2"><div>' + topo + '</div><div class="acoes"><button class="pill" data-ed="' + esc(x.ID) + '">Editar</button><button class="pill" data-rm="' + esc(x.ID) + '">Remover</button></div></div>' + (ed ? form : corpo) + "</div>";
      }
      function desenha() {
        var d = dados, m = d.material, pg = d.progresso, tipo = aba === "licoes" ? "licao" : aba === "vocab" ? "vocab" : "trecho", lista = d[aba === "licoes" ? "licoes" : aba];
        var emAndamento = ["NA_FILA", "PROCESSANDO"].indexOf(m.Status) >= 0 && (pg.pendentes > 0 || pg.andamento > 0 || m.Status === "NA_FILA");
        var botoes = (emAndamento ? '<button class="btn mini" id="b-proc">Continuar processamento</button>' : "") + (pg.erros ? '<button class="btn mini" id="b-rep">Tentar de novo</button>' : "") +
          (m.Status === "REVISAO" || (m.Status === "PUBLICADO" && d.rascunhos) ? '<button class="btn mini" id="b-pub">Publicar tudo (' + d.rascunhos + ")</button>" : "") + (m.Status === "PUBLICADO" ? '<button class="btn mini fantasma" id="b-desp">Despublicar</button>' : '<button class="btn mini fantasma" id="b-desc">Descartar</button>');
        $("#corpo", el).innerHTML =
          '<div class="cartao"><div class="linha2"><b>' + esc(m.Nome) + "</b>" + statusTag(m.Status) + "</div><small>" + esc((m.Livro ? m.Livro + " · " : "") + (KINDNOME[m.Kind] || m.Kind) + (m.Nivel !== "auto" ? " · " + m.Nivel : " · nível pela IA")) + "</small>" +
          (pg.total ? barra({ Total: pg.total, Feitas: pg.feitas }) + '<small class="rot">' + pg.feitas + " de " + pg.total + " partes" + (pg.erros ? " · " + pg.erros + " com erro" : "") + "</small>" : "") + (m.Resumo ? "<p>" + esc(m.Resumo) + "</p>" : "") + (m.Erro ? '<p class="err">' + esc(m.Erro) + "</p>" : "") + '<div class="acoes" style="flex-wrap:wrap">' + botoes + "</div></div>" +
          (d.partes.some(function (x) { return x.Status === "ERRO"; }) ? '<div class="cartao"><span class="rot">Partes com erro</span>' + d.partes.filter(function (x) { return x.Status === "ERRO"; }).map(function (x) { return '<div class="linha-it"><div><b>' + esc(x.Rotulo) + '</b><small class="err">' + esc(x.Erro) + "</small></div></div>"; }).join("") + "</div>" : "") +
          '<div class="acoes" style="flex-wrap:wrap"><button class="pill' + (aba === "licoes" ? " on" : "") + '" data-ab="licoes">Lições (' + d.totais.licoes + ')</button><button class="pill' + (aba === "vocab" ? " on" : "") + '" data-ab="vocab">Vocabulário (' + d.totais.vocab + ')</button><button class="pill' + (aba === "trechos" ? " on" : "") + '" data-ab="trechos">Trechos (' + d.totais.trechos + ")</button></div>" +
          '<p class="rot">' + (aba === "trechos" ? "Os trechos alimentam a IA em todas as telas depois de publicados." : "Revise, edite ou remova. Nada aparece para os alunos antes de publicar.") + "</p>" +
          (lista.length ? lista.slice(0, mostrar).map(function (x) { return item(tipo, x); }).join("") + (lista.length > mostrar ? '<button class="btn fantasma" id="mais">Mostrar mais</button>' : "") : "<p>Nada por aqui.</p>");
        if ($("#b-proc", el)) $("#b-proc", el).onclick = function () { var b = this; b.disabled = true; b.textContent = "Processando…"; ctl.parar = false; processarLoop(p.id, function () {}, ctl).then(carregar); };
        if ($("#b-rep", el)) $("#b-rep", el).onclick = function () { acao("imp.reprocessar", null, function () { return "Partes de volta para a fila."; }); };
        if ($("#b-pub", el)) $("#b-pub", el).onclick = function () { acao("imp.publicar", null, function (r) { return r.itens + " itens publicados."; }, "Publicar para alunos e para a IA? Itens removidos não entram."); };
        if ($("#b-desp", el)) $("#b-desp", el).onclick = function () { acao("imp.despublicar", null, function () { return "Material despublicado."; }, "Tirar este material do ar? Alunos e IA deixam de ver."); };
        if ($("#b-desc", el)) $("#b-desc", el).onclick = function () { acao("imp.descartar", null, function () { go("gesMateriais"); return "Material descartado."; }, "Descartar este material e todos os rascunhos? Não dá para desfazer."); };
        [].forEach.call(el.querySelectorAll("[data-ab]"), function (b) { b.onclick = function () { aba = b.getAttribute("data-ab"); mostrar = 40; editando = ""; desenha(); }; });
        if ($("#mais", el)) $("#mais", el).onclick = function () { mostrar += 40; desenha(); };
        [].forEach.call(el.querySelectorAll("[data-ed]"), function (b) { b.onclick = function () { editando = b.getAttribute("data-ed"); desenha(); }; });
        [].forEach.call(el.querySelectorAll("[data-cx]"), function (b) { b.onclick = function () { editando = ""; desenha(); }; });
        [].forEach.call(el.querySelectorAll("[data-rm]"), function (b) { b.onclick = function () { if (!confirm("Remover este item?")) return; api("imp.itemRemover", { tipo: tipo, ID: b.getAttribute("data-rm") }).then(function () { carregar(); }).catch(falhou); }; });
        [].forEach.call(el.querySelectorAll("[data-sv]"), function (b) {
          b.onclick = function () {
            var campos = {}; [].forEach.call(el.querySelectorAll('[id^="e-"]'), function (x) { campos[x.id.slice(2)] = x.value; });
            b.disabled = true;
            api("imp.itemSalvar", { tipo: tipo, ID: b.getAttribute("data-sv"), campos: campos }).then(function () { editando = ""; toast("Item salvo."); carregar(); }).catch(function (e) { b.disabled = false; falhou(e); });
          };
        });
      }
      carregar();
    } };
  };

  /* =================== SUSTENTAÇÃO =================== */
  var TESTES = [["chave", "Chave e modelos (confere com o Google)"], ["texto", "Texto (conversa escrita)"], ["tts", "Voz natural (leitura)"], ["stt", "Transcrição de voz"], ["emb", "Busca nos materiais (embeddings)"], ["live", "Conversa ao vivo"]];

  /* Abre a conexão ao vivo no navegador com o token do teste e espera o tutor falar. */
  function testeLiveNavegador(r) {
    return new Promise(function (ok, falha) {
      if (!VZ || !VZ.suportaLive()) { falha(new Error("Este navegador não suporta conversa ao vivo.")); return; }
      var saida = new VZ.Saida(), ws, fim = false, falou = "", audio = 0, t0 = performance.now(), tp = {};
      function marca(k) { if (tp[k] === undefined) tp[k] = Math.round(performance.now() - t0); }
      saida.abrir();
      var t = setTimeout(function () { fechar(); falha(new Error("Sem resposta em 15 s. Confira o modelo ao vivo em Modelos e voz.")); }, 15000);
      function fechar() { fim = true; clearTimeout(t); try { ws.close(); } catch (e) {} }
      try { ws = new WebSocket(r.wsUrl + "?access_token=" + encodeURIComponent(r.token)); } catch (e) { falha(e); return; }
      ws.binaryType = "arraybuffer";
      ws.onopen = function () { marca("ws"); ws.send(JSON.stringify({ setup: r.setup })); };
      ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data)); } catch (e) { return; }
        if (m.setupComplete) { marca("setup"); ws.send(JSON.stringify({ realtimeInput: { text: "Hi!" } })); return; }
        var sc = m.serverContent; if (!sc) return;
        if (sc.modelTurn && sc.modelTurn.parts) sc.modelTurn.parts.forEach(function (p) { if (p.inlineData && p.inlineData.data) { marca("audio"); audio += saida.tocarPcm(p.inlineData.data, 24000); } });
        if (sc.outputTranscription && sc.outputTranscription.text) falou += sc.outputTranscription.text;
        if (sc.turnComplete) { fechar(); setTimeout(function () { ok({ audio: audio, texto: falou.trim(), tempos: tp }); }, 50); }
      };
      ws.onclose = function (ev) { if (!fim) { clearTimeout(t); falha(new Error("Conexão recusada" + (ev.reason ? ": " + ev.reason : " (código " + ev.code + ")."))); } };
    });
  }

  function rodarTeste(tipo, linha, extra) {
    linha.className = "teste rodando"; linha.querySelector("small").textContent = "Testando…";
    return api("sup.testar", Object.assign({ tipo: tipo }, extra || {})).then(function (r) {
      if (!r.ok) throw new Error(r.detalhe);
      if (tipo === "tts") tocarAudio(r);
      if (tipo === "live") return testeLiveNavegador(r).then(function (x) { var t = x.tempos || {}; return { ok: true, detalhe: "Tutor respondeu ao vivo com " + x.audio.toFixed(1) + " s de áudio" + (x.texto ? ': "' + x.texto + '"' : "") + ". Tempos neste navegador: conexão " + ((t.ws || 0) / 1000).toFixed(1) + " s, preparo " + (((t.setup || 0) - (t.ws || 0)) / 1000).toFixed(1) + " s, primeira voz " + (((t.audio || 0) - (t.setup || 0)) / 1000).toFixed(1) + " s após o oi.", ms: r.ms }; });
      return r;
    }).then(function (r) {
      linha.className = "teste ok"; linha.querySelector("small").textContent = r.detalhe + (r.ms ? " (" + (r.ms / 1000).toFixed(1) + " s no servidor)" : "");
      return true;
    }).catch(function (e) { linha.className = "teste falha"; linha.querySelector("small").textContent = e.message; return false; });
  }
  function blocoTestes() {
    return '<div class="cartao"><div class="linha2"><span class="rot">Teste de ponta a ponta</span><button class="btn mini" id="t-all">Testar tudo</button></div>' +
      TESTES.map(function (t) { return '<div class="teste" data-teste="' + t[0] + '"><i></i><div><b>' + t[1] + "</b><small>Não testado</small></div><button class=\"pill\" data-um=\"" + t[0] + '">Testar</button></div>'; }).join("") + "</div>";
  }
  function ligarTestes(el) {
    function linha(t) { return el.querySelector('[data-teste="' + t + '"]'); }
    [].forEach.call(el.querySelectorAll("[data-um]"), function (b) { b.onclick = function () { var t = b.getAttribute("data-um"); ocupado(b, true, "…"); rodarTeste(t, linha(t), t === "tts" && $("#c-voz", el) ? { voz: $("#c-voz", el).value } : null).then(function () { ocupado(b, false); }); }; });
    $("#t-all", el).onclick = function () {
      var b = this; ocupado(b, true, "Testando…");
      TESTES.reduce(function (p, t) { return p.then(function () { return rodarTeste(t[0], linha(t[0])); }); }, Promise.resolve()).then(function () { ocupado(b, false); });
    };
  }

  V.supInicio = function () {
    return { classe: "eq", html: tela("Sustentação", "Saúde do app."), bind: function (el) {
      carregarEm(el, "sup.painel", {}, function (d) {
        var c = d.chave;
        return '<div class="kpis">' + kpi("Chave do Gemini", c.ativa ? "Ativa" : "Ausente", c.ativa ? "termina em " + c.fim : "cadastre em Chave e voz", c.ativa ? "" : "alerta") +
          kpi("Conversa ao vivo", d.modelos.liveAtiva ? "Ligada" : "Desligada", d.liveHoje + " hoje") + kpi("Sessões hoje", d.sessoesHoje) + kpi("Base de conhecimento", d.kb.trechos + " trechos", d.kb.publicados + " de " + d.kb.materiais + " materiais publicados") + kpi("Custo hoje", brl(d.custo.hojeBrl), usd(d.custo.hojeUsd)) + kpi("Custo 30 dias", brl(d.custo.mesBrl), usd(d.custo.mesUsd), "destaque") + kpi("Versão do servidor", d.versao) + "</div>" +
          blocoTestes() +
          '<div class="cartao"><span class="rot">Erros recentes</span>' + (d.erros.length ? d.erros.map(function (e) { return '<div class="linha-it"><div><b>' + esc(e.rota) + "</b><small>" + dataBRLocal(e.quando) + (e.quem ? " · " + esc(e.quem) : "") + '</small><p class="err">' + esc(e.msg) + "</p></div></div>"; }).join("") : "<p>Nenhum erro registrado.</p>") + "</div>" +
          '<div class="cartao"><span class="rot">Usuários ativos por perfil</span><div class="kpis mini">' + Object.keys(d.usuarios).map(function (k) { return kpi(PERFIL_NOME[k] || k, d.usuarios[k]); }).join("") + "</div></div>";
      }).then(function () { ligarTestes(el); }).catch(function () {});
    } };
  };

  V.supIA = function (p) {
    return { classe: "eq", html: tela("Sustentação", "Chave e voz."), bind: function (el) {
      var cfg = {};
      if (S.demo) { $("#corpo", el).innerHTML = '<div class="erro" role="alert"><b>Você está na demonstração.</b> Aqui a chave NÃO é enviada ao servidor e os testes são de mentira. Para cadastrar a chave de verdade: toque em Sair (canto superior), depois em Continuar com o Google e entre com a conta dona do portal.</div>'; return; }
      Promise.all([api("sup.painel"), api("sup.config")]).then(function (r) {
        var d = r[0], c = d.chave;
        r[1].forEach(function (x) { cfg[x.Chave] = x.Valor; });
        $("#corpo", el).innerHTML =
          '<div class="cartao"><div class="linha2"><span class="rot">Chave da API do Gemini</span><span class="tag' + (c.ativa ? "" : " alerta") + '">' + (c.ativa ? "ativa ••••" + esc(c.fim) : "não cadastrada") + "</span></div>" +
          (c.ativa ? "<small>Cadastrada em " + dataBRLocal(c.em) + (c.por ? " por " + esc(c.por) : "") + ".</small>" : "") +
          '<p>Crie a chave no Google AI Studio (aistudio.google.com, menu "Get API key"). Ela fica guardada só no servidor; aqui aparecem apenas os 4 últimos caracteres.</p>' +
          '<div class="linha2"><input class="campo" id="k" type="password" autocomplete="off" spellcheck="false" placeholder="' + (c.ativa ? "Cole uma nova chave para trocar" : "Cole a chave aqui (começa com AQ. ou AIza)") + '" aria-label="Chave da API do Gemini"><button class="btn mini" id="k-s">Salvar chave</button></div>' +
          (c.ativa ? '<button class="link" id="k-r">Remover chave</button>' : "") + "</div>" +
          blocoTestes() +
          '<div class="cartao"><div class="linha2"><span class="rot">Modelos e voz</span><button class="pill" id="m-b">Buscar modelos da chave</button></div><div class="form-g">' +
          '<label>Texto (chat e correções)<input class="campo" id="c-IA_MODELO" list="l-texto" value="' + esc(cfg.IA_MODELO) + '"></label>' +
          '<label>Voz lida (TTS)<input class="campo" id="c-TTS_MODELO" list="l-tts" value="' + esc(cfg.TTS_MODELO) + '"></label>' +
          '<label>Conversa ao vivo<input class="campo" id="c-LIVE_MODELO" list="l-live" value="' + esc(cfg.LIVE_MODELO) + '"></label>' +
          '<label>Busca nos materiais (embeddings)<input class="campo" id="c-EMB_MODELO" list="l-emb" value="' + esc(cfg.EMB_MODELO) + '"></label>' +
          '<label>Voz do tutor<span class="linha2"><select class="campo" id="c-voz">' + opcoes(d.vozes, cfg.VOZ_NOME) + '</select><button class="pill" id="v-p">Ouvir</button></span></label>' +
          '<label>Conversa ao vivo<select class="campo" id="c-VOZ_LIVE_ATIVA">' + opcoes([["1", "Ligada"], ["0", "Desligada (usa chat com voz)"]], cfg.VOZ_LIVE_ATIVA) + "</select></label>" +
          '<label>Conversas ao vivo por aluno/dia<input class="campo" id="c-VOZ_SESSOES_DIA" inputmode="numeric" value="' + esc(cfg.VOZ_SESSOES_DIA) + '"></label>' +
          '<label>Minutos máximos por conversa<input class="campo" id="c-VOZ_MIN_SESSAO" inputmode="numeric" value="' + esc(cfg.VOZ_MIN_SESSAO) + '"></label></div>' +
          '<datalist id="l-texto"></datalist><datalist id="l-tts"></datalist><datalist id="l-live"></datalist><datalist id="l-emb"></datalist><small id="m-info"></small>' +
          '<button class="btn" id="c-s">Salvar modelos e voz</button></div>';
        ligarTestes(el);
        if (p.testar) $("#t-all", el).click();
        $("#k-s", el).onclick = function () {
          var b = this, k = $("#k", el).value.replace(/[\s"']/g, "");
          if (!/^[A-Za-z0-9_.\-]{30,200}$/.test(k)) { toast("A chave parece incompleta. No AI Studio, use o ícone de copiar da chave."); return; }
          ocupado(b, true);
          api("sup.chave", { chave: k }).then(function () { $("#k", el).value = ""; toast("Chave salva. Rodando os testes…"); go("supIA", { testar: true }); }).catch(function (e) { ocupado(b, false); falhou(e); });
        };
        if ($("#k-r", el)) $("#k-r", el).onclick = function () {
          if (!confirm("Remover a chave do Gemini? A voz natural e a conversa ao vivo param até cadastrar outra.")) return;
          api("sup.chave", { chave: "" }).then(function () { toast("Chave removida."); go("supIA"); }).catch(falhou);
        };
        $("#v-p", el).onclick = function () { var b = this; ocupado(b, true, "…"); api("sup.testar", { tipo: "tts", voz: $("#c-voz", el).value, texto: "Hi! I'm Alex. Let's practice your English together today." }).then(function (r) { ocupado(b, false); if (!r.ok) throw new Error(r.detalhe); tocarAudio(r); }).catch(function (e) { ocupado(b, false); falhou(e); }); };
        $("#m-b", el).onclick = function () {
          var b = this; ocupado(b, true, "Buscando…");
          api("sup.modelos").then(function (m) {
            ocupado(b, false);
            ["texto", "tts", "live", "emb"].forEach(function (k) { $("#l-" + k, el).innerHTML = (m[k] || []).map(function (x) { return '<option value="' + esc(x) + '">'; }).join(""); });
            $("#m-info", el).textContent = "Disponíveis para esta chave: " + m.texto.length + " de texto, " + m.tts.length + " de voz lida e " + m.live.length + " ao vivo e " + (m.emb || []).length + " de busca" + (m.live.length ? " (ex.: " + m.live.slice(-2).join(", ") + ")" : "") + ". Clique num campo para escolher.";
            var avisos = [];
            if (m.tts.length && m.tts.indexOf($("#c-TTS_MODELO", el).value) < 0) avisos.push("o modelo de voz lida atual não está na lista");
            if (m.live.length && m.live.indexOf($("#c-LIVE_MODELO", el).value) < 0) avisos.push("o modelo ao vivo atual não está na lista");
            if ((m.emb || []).length && m.emb.indexOf($("#c-EMB_MODELO", el).value) < 0) avisos.push("o modelo de busca atual não está na lista");
            if (avisos.length) toast("Atenção: " + avisos.join(" e ") + ".");
          }).catch(function (e) { ocupado(b, false); falhou(e); });
        };
        $("#c-s", el).onclick = function () {
          var b = this, v = { VOZ_NOME: $("#c-voz", el).value };
          ["IA_MODELO", "TTS_MODELO", "LIVE_MODELO", "EMB_MODELO", "VOZ_LIVE_ATIVA", "VOZ_SESSOES_DIA", "VOZ_MIN_SESSAO"].forEach(function (k) { v[k] = $("#c-" + k, el).value.trim(); });
          ocupado(b, true);
          api("sup.configSalvar", { valores: v }).then(function () { ocupado(b, false); toast("Configuração salva. Rode os testes para conferir."); }).catch(function (e) { ocupado(b, false); falhou(e); });
        };
      }).catch(function (e) { $("#corpo", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
    } };
  };

  V.supCusto = function () {
    return { classe: "eq", html: tela("Sustentação", "Custos da IA."), bind: function (el) {
      Promise.all([api("sup.painel"), api("sup.config")]).then(function (r) {
        var d = r[0], cfg = {}, max = Math.max.apply(null, d.uso.map(function (x) { return x.custo; }).concat([0.0001]));
        r[1].forEach(function (x) { cfg[x.Chave] = x; });
        var t = d.total;
        $("#corpo", el).innerHTML = '<div class="kpis">' + kpi("Hoje", brl(d.custo.hojeBrl), usd(d.custo.hojeUsd)) + kpi("Últimos 30 dias", brl(d.custo.mesBrl), usd(d.custo.mesUsd), "destaque") +
          kpi("Conversa ao vivo", Math.round(t.live_seg / 60) + " min", "30 dias") + kpi("Voz lida", Math.round(t.tts_seg / 60) + " min", "30 dias") + kpi("Texto", Math.round(t.texto_tokens / 1000) + " mil tokens", t.chamadas + " chamadas") + kpi("Transcrição", Math.round(t.stt_seg / 60) + " min") + kpi("Busca nos materiais", Math.round((t.emb_tokens || 0) / 1000) + " mil tokens", "30 dias") + kpi("Importação", (t.imp_partes || 0) + " partes", "lidas pela IA") + "</div>" +
          '<div class="cartao"><span class="rot">Custo por dia (US$, 30 dias)</span><div class="barras" role="img" aria-label="Custo por dia">' + d.uso.map(function (x) { return '<div class="b" title="' + esc(x.dia.split("-").reverse().join("/")) + ": " + usd(x.custo) + '"><i style="height:' + Math.round(x.custo / max * 100) + '%"></i><small>' + esc(x.dia.slice(8, 10)) + "</small></div>"; }).join("") + "</div></div>" +
          '<div class="cartao"><span class="rot">Preços usados na estimativa</span><p>Confira a tabela de preços do Gemini e ajuste. O custo real fica no Google AI Studio (Billing).</p><div class="form-g">' +
          ["CUSTO_LIVE_MIN", "CUSTO_TTS_MIN", "CUSTO_STT_MIN", "CUSTO_TEXTO_1M", "CAMBIO_USD"].map(function (k) { var x = cfg[k] || {}; return "<label>" + esc(x.Rotulo || k) + '<input class="campo" id="c-' + k + '" inputmode="decimal" value="' + esc(x.Valor) + '"></label>'; }).join("") +
          '</div><button class="btn" id="c-s">Salvar preços</button></div>';
        $("#c-s", el).onclick = function () {
          var b = this, v = {};
          ["CUSTO_LIVE_MIN", "CUSTO_TTS_MIN", "CUSTO_STT_MIN", "CUSTO_TEXTO_1M", "CAMBIO_USD"].forEach(function (k) { v[k] = $("#c-" + k, el).value.trim(); });
          ocupado(b, true);
          api("sup.configSalvar", { valores: v }).then(function () { toast("Preços salvos."); go("supCusto"); }).catch(function (e) { ocupado(b, false); falhou(e); });
        };
      }).catch(function (e) { $("#corpo", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
    } };
  };

  V.supEquipe = function () {
    return { classe: "eq", html: tela("Sustentação", "Equipe.", '<div class="cartao"><span class="rot">Dar acesso à Sustentação</span><p>Só esta equipe vê a chave e os custos da IA. A Gestão não consegue criar este perfil.</p><div class="form-g"><label>E-mail Google<input class="campo" id="s-e" type="email"></label><label>Nome<input class="campo" id="s-n"></label></div><button class="btn" id="s-s">Adicionar</button></div><div id="lista">' + carregando() + "</div>"), bind: function (el) {
      function carregar() {
        api("sup.equipe").then(function (l) {
          $("#lista", el).innerHTML = l.length ? l.map(function (u) { var on = String(u.Ativo) !== "0"; return '<div class="linha-it"><div><b>' + esc(u.Nome) + "</b><small>" + esc(u.Email) + '</small></div><div class="acoes"><span class="tag' + (on ? " cinza" : " alerta") + '">' + (on ? "Liberado" : "Bloqueado") + '</span><button class="pill" data-tg="' + esc(u.Email) + '" data-on="' + (on ? 1 : 0) + '" data-n="' + esc(u.Nome) + '">' + (on ? "Bloquear" : "Liberar") + "</button></div></div>"; }).join("") : "<p>Só o dono do servidor tem acesso por enquanto.</p>";
          [].forEach.call(el.querySelectorAll("[data-tg]"), function (b) { b.onclick = function () { ocupado(b, true); api("sup.equipeSalvar", { Email: b.getAttribute("data-tg"), Nome: b.getAttribute("data-n"), Ativo: b.getAttribute("data-on") === "1" ? "0" : "1" }).then(carregar).catch(function (e) { ocupado(b, false); falhou(e); }); }; });
        }).catch(function (e) { $("#lista", el).innerHTML = '<div class="erro">' + esc(e.message) + "</div>"; });
      }
      $("#s-s", el).onclick = function () { var b = this; ocupado(b, true); api("sup.equipeSalvar", { Email: $("#s-e", el).value.trim(), Nome: $("#s-n", el).value.trim(), Ativo: "1" }).then(function () { ocupado(b, false); $("#s-e", el).value = ""; $("#s-n", el).value = ""; toast("Acesso liberado."); carregar(); }).catch(function (e) { ocupado(b, false); falhou(e); }); };
      carregar();
    } };
  };

  /* =================== DEMONSTRAÇÃO (dados de exemplo) =================== */
  var D = {
    alunos: [
      { Email: "ana@exemplo.com", Nome: "Ana Souza", Nivel: "B1", Objetivo: "Trabalho", progresso: { fala: 64, escuta: 58, leitura: 71, escrita: 49 }, alertas: ["Nota baixa em escrita"] },
      { Email: "bruno@exemplo.com", Nome: "Bruno Lima", Nivel: "A2", Objetivo: "Viagem", progresso: { fala: 52, escuta: 61, leitura: 0, escrita: 0 }, alertas: ["Parado há mais de 7 dias"] },
      { Email: "carla@exemplo.com", Nome: "Carla Mendes", Nivel: "B2", Objetivo: "Imigração", progresso: { fala: 78, escuta: 74, leitura: 80, escrita: 69 }, alertas: [] },
      { Email: "diego@exemplo.com", Nome: "Diego Rocha", Nivel: "", Objetivo: "Conversação", progresso: {}, alertas: ["Sem sessões"] }
    ],
    duvidas: [
      { ID: "d1", AlunoEmail: "ana@exemplo.com", AlunoNome: "Ana Souza", Texto: "Quando uso 'make' e quando uso 'do'?", Status: "ABERTA", Quando: new Date(Date.now() - 3600000).toISOString() },
      { ID: "d2", AlunoEmail: "bruno@exemplo.com", AlunoNome: "Bruno Lima", Texto: "Como pergunto o portão de embarque no aeroporto?", Status: "RESPONDIDA", Resposta: "Diga: 'Excuse me, which gate is my flight?'", RespondidaPor: "Paulo", Quando: new Date(Date.now() - 86400000).toISOString() }
    ],
    agenda: function () {
      var out = [], i, d;
      for (i = 1; i <= 4; i++) { d = new Date(Date.now() + i * 86400000); var dia = d.getFullYear() + "-" + N.pad(d.getMonth() + 1) + "-" + N.pad(d.getDate()); out.push({ ID: "a" + i, ProfessorNome: "Paulo", Inicio: dia + "T18:00", Fim: dia + "T18:30", Tipo: i % 2 ? "conversacao" : "duvidas", Status: i % 2 ? "RESERVADA" : "LIVRE", AlunoNome: i % 2 ? D.alunos[i % 3].Nome : "" }); }
      return out;
    },
    usuarios: [
      { Email: "ana@exemplo.com", Nome: "Ana Souza", Perfil: "ALUNO", Ativo: "1", Nivel: "B1", Plano: "Mensal", ProfessorEmail: "paulo@exemplo.com" },
      { Email: "bruno@exemplo.com", Nome: "Bruno Lima", Perfil: "ALUNO", Ativo: "1", Nivel: "A2", Plano: "Power Basics", ProfessorEmail: "paulo@exemplo.com" },
      { Email: "eva@exemplo.com", Nome: "Eva Prado", Perfil: "ALUNO", Ativo: "0", Nivel: "A1", Plano: "Mensal", ProfessorEmail: "" },
      { Email: "paulo@exemplo.com", Nome: "Paulo Reis", Perfil: "PROFESSOR", Ativo: "1" },
      { Email: "gil@exemplo.com", Nome: "Gil Martins", Perfil: "ADMIN", Ativo: "1" },
      { Email: "sara@exemplo.com", Nome: "Sara Nunes", Perfil: "SUPORTE", Ativo: "1" }
    ],
    planos: [{ ID: "p1", Nome: "Mensal", Valor: "149", Tipo: "mensal", Ativo: "1", Descricao: "Tutor de IA ilimitado e acompanhamento do professor." }, { ID: "p2", Nome: "Power Basics", Valor: "97", Tipo: "unico", Ativo: "1", Descricao: "Curso básico de 24 lições." }],
    chave: { ativa: false, fim: "", em: "", por: "" },
    cfg: { IA_MODELO: "gemini-flash-latest", TTS_MODELO: "gemini-3.8-flash-tts", LIVE_MODELO: "gemini-3.8-live", EMB_MODELO: "gemini-embedding-001", VOZ_NOME: "Kore", VOZ_LIVE_ATIVA: "1", VOZ_SESSOES_DIA: "12", VOZ_MIN_SESSAO: "10", CUSTO_TEXTO_1M: "1.00", CUSTO_TTS_MIN: "0.015", CUSTO_LIVE_MIN: "0.025", CUSTO_STT_MIN: "0.002", CAMBIO_USD: "5.50" }
  };
  function uso() {
    var out = [], i;
    for (i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 86400000), s = Math.sin(i) * 0.5 + 1; out.push({ dia: d.getFullYear() + "-" + N.pad(d.getMonth() + 1) + "-" + N.pad(d.getDate()), live_seg: Math.round(1800 * s), tts_seg: Math.round(240 * s), stt_seg: Math.round(60 * s), texto_tokens: Math.round(90000 * s), chamadas: Math.round(140 * s), emb_tokens: Math.round(12000 * s), imp_partes: Math.round(6 * s) }); }
    out.forEach(function (x) { x.custo = Math.round((x.live_seg / 60 * 0.025 + x.tts_seg / 60 * 0.015 + x.stt_seg / 60 * 0.002 + x.texto_tokens / 1e6) * 10000) / 10000; });
    return out;
  }
  var R = N.demoRotas;
  R["prof.painel"] = function () { return { alunos: 4, alertas: 3, duvidasAbertas: D.duvidas.filter(function (d) { return d.Status === "ABERTA"; }).length, pendentes: [{ ID: "v1", AlunoNome: "Ana Souza", Habilidade: "fala", Nota: 68, Origem: "IA", Quando: new Date().toISOString() }, { ID: "v2", AlunoNome: "Bruno Lima", Habilidade: "escrita", Nota: 55, Origem: "IA", Quando: new Date(Date.now() - 86400000).toISOString() }], proximasAulas: D.agenda().filter(function (a) { return a.Status === "RESERVADA"; }) }; };
  R["prof.alunos"] = function () { return D.alunos; };
  R["prof.aluno"] = function (a) { var x = D.alunos.filter(function (y) { return y.Email === a.email; })[0] || D.alunos[0]; return { aluno: x, progresso: x.progresso, avaliacoes: [{ ID: "v1", Habilidade: "fala", Nota: 68, Origem: "IA", Validada: "", Quando: new Date().toISOString() }, { ID: "v0", Habilidade: "nivelamento", Nota: 64, Origem: "PROFESSOR", Validada: "1", Quando: new Date(Date.now() - 5 * 86400000).toISOString() }], mensagens: [{ Papel: "agente", Texto: "Hi! What can I get for you?" }, { Papel: "aluno_voz", Texto: "I want a coffee please" }, { Papel: "agente", Texto: "Sure! You'd like a coffee. What size would you like?" }, { Papel: "aluno_voz", Texto: "Medium, with milk" }] }; };
  R["prof.validar"] = R["prof.nivel"] = R["prof.recado"] = R["agenda.excluir"] = function () { return { ok: true }; };
  R["prof.duvidas"] = function () { return D.duvidas; };
  R["prof.duvidaResponder"] = function (a) { D.duvidas.forEach(function (d) { if (d.ID === a.ID) { d.Status = "RESPONDIDA"; d.Resposta = a.resposta; d.RespondidaPor = "Paulo"; } }); return { ok: true }; };
  R["aluno.duvidas"] = function () { return D.duvidas.filter(function (d) { return d.AlunoNome === "Ana Souza"; }); };
  R["aluno.duvidaEnviar"] = function (a) { if (String(a.texto || "").length < 3) throw new Error("Escreva sua dúvida."); D.duvidas.unshift({ ID: "d" + Date.now(), AlunoNome: "Ana Souza", AlunoEmail: "ana@exemplo.com", Texto: a.texto, Status: "ABERTA", Quando: new Date().toISOString() }); return { ok: true }; };
  R["agenda.profLista"] = R["adm.agenda"] = function () { return D.agenda(); };
  R["agenda.criar"] = function () { return { ok: true, criados: 1 }; };
  R["adm.indicadores"] = function () {
    var eng = [], i;
    for (i = 13; i >= 0; i--) { var d = new Date(Date.now() - i * 86400000); eng.push({ dia: N.pad(d.getDate()) + "/" + N.pad(d.getMonth() + 1), ativos: Math.round(18 + 8 * Math.sin(i / 2) + (13 - i) * 0.6) }); }
    return { alunos: 42, alunosAtivos: 37, ativos7: 29, sessoes: 812, sessoesHoje: 23, niveis: { A1: 9, A2: 12, B1: 13, B2: 6, C1: 2 }, mediaHabilidade: { fala: 63, escuta: 59, leitura: 68, escrita: 52 }, iaAtiva: true, versao: "3.0.0", engajamento: eng, tempoPorModulo: { fala: { minutos: 11.4, sessoes: 402 }, nivelamento: { minutos: 4.2, sessoes: 41 }, escrita: { minutos: 8.1, sessoes: 120 } }, mrr: 4917, receitaUnica: 1164, churn: { pct: 5.1, perdidos: 2, base: 39 } };
  };
  R["adm.usuarios"] = function () { return D.usuarios; };
  R["adm.usuarioSalvar"] = function (a) { if (a.Perfil === "SUPORTE") throw new Error("O perfil Sustentação é cadastrado pela própria equipe de Sustentação."); return { ok: true }; };
  R["adm.planos"] = function () { return D.planos; };
  R["adm.planoSalvar"] = function () { return { ok: true }; };
  R["sup.painel"] = function () { var u = uso(), h = u[u.length - 1], tot = { texto_tokens: 0, tts_seg: 0, live_seg: 0, stt_seg: 0, chamadas: 0, emb_tokens: 0, imp_partes: 0 }, m = 0; u.forEach(function (x) { for (var k in tot) tot[k] += x[k]; m += x.custo; }); return { versao: "3.0.0", chave: D.chave, modelos: { texto: D.cfg.IA_MODELO, tts: D.cfg.TTS_MODELO, live: D.cfg.LIVE_MODELO, voz: D.cfg.VOZ_NOME, liveAtiva: D.cfg.VOZ_LIVE_ATIVA === "1" }, vozes: ["Kore", "Puck", "Charon", "Aoede", "Leda", "Orus", "Zephyr", "Fenrir"], uso: u, total: tot, custo: { hojeUsd: h.custo, mesUsd: Math.round(m * 10000) / 10000, hojeBrl: Math.round(h.custo * 550) / 100, mesBrl: Math.round(m * 550) / 100, cambio: 5.5 }, erros: [{ quando: new Date(Date.now() - 7200000).toISOString(), rota: "voz.liveIniciar", quem: "bruno@exemplo.com", msg: "Limite de uso da IA atingido: Resource has been exhausted (exemplo)" }], usuarios: { ADMIN: 1, EDITOR: 0, PROFESSOR: 2, ALUNO: 37, SUPORTE: 1 }, sessoesHoje: 23, liveHoje: 14, kb: { materiais: 6, publicados: 4, trechos: 212 } }; };
  R["sup.config"] = function () { return Object.keys(D.cfg).map(function (k) { return { Chave: k, Valor: D.cfg[k], Rotulo: { CUSTO_LIVE_MIN: "US$ por minuto de conversa ao vivo", CUSTO_TTS_MIN: "US$ por minuto de voz lida", CUSTO_STT_MIN: "US$ por minuto de transcrição", CUSTO_TEXTO_1M: "US$ por 1 milhão de tokens de texto", CAMBIO_USD: "Câmbio R$ por US$" }[k] || k }; }); };
  R["sup.configSalvar"] = function (a) { for (var k in a.valores) D.cfg[k] = a.valores[k]; return { ok: true }; };
  R["sup.chave"] = function (a) { var k = String(a.chave || ""); D.chave = k ? { ativa: true, fim: k.slice(-4), em: new Date().toISOString(), por: "demo-suporte@nice.ai" } : { ativa: false, fim: "" }; return { ok: true, chave: D.chave }; };
  R["sup.testar"] = function (a) { return { tipo: a.tipo, ok: false, detalhe: "Na demonstração não há servidor. Com a chave cadastrada, este teste chama o Gemini de verdade.", ms: 0 }; };
  R["sup.modelos"] = function () { return { texto: ["gemini-2.5-flash", "gemini-flash-latest"], tts: ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"], live: ["gemini-3.8-live"], emb: ["gemini-embedding-001"] }; };
  /* ---- demonstração: materiais ---- */
  var DM = { mats: [
    { ID: "MAT-D1", Nome: "Book 1 - Unit 1", Kind: "pdf", Livro: "Book 1", Nivel: "A2", Status: "PUBLICADO", Total: 12, Feitas: 12, Erro: "", Resumo: "Cumprimentos, apresentações e rotina diária.", Trechos: 34, Licoes: 11, Vocab: 52, Tamanho: 3400000, Quando: new Date(Date.now() - 5 * 86400000).toISOString() },
    { ID: "MAT-D2", Nome: "Book 1 - Unit 2", Kind: "pdf", Livro: "Book 1", Nivel: "A2", Status: "REVISAO", Total: 10, Feitas: 10, Erro: "", Resumo: "Viagens, aeroporto e restaurante.", Trechos: 28, Licoes: 9, Vocab: 44, Tamanho: 2800000, Quando: new Date(Date.now() - 86400000).toISOString() }
  ] };
  N.dm = DM;
  function dmAchar(id) { return DM.mats.filter(function (m) { return m.ID === id; })[0]; }
  function dmProg(m) { return { id: m.ID, status: m.Status, total: m.Total, feitas: m.Feitas, pendentes: Math.max(0, m.Total - m.Feitas), andamento: 0, erros: 0, trechos: m.Trechos, licoes: m.Licoes, vocab: m.Vocab, erro: "" }; }
  var R2 = N.demoRotas;
  R2["imp.lista"] = function () { return DM.mats.slice().reverse(); };
  R2["imp.iniciar"] = function (a) { var m = { ID: "MAT-D" + (DM.mats.length + 1), Nome: a.nome, Kind: a.mime === "application/pdf" ? "pdf" : "img", Livro: a.livro || "", Nivel: a.nivel, Status: "ENVIANDO", Total: a.partes, Feitas: 0, Erro: "", Resumo: "", Trechos: 0, Licoes: 0, Vocab: 0, Tamanho: a.tamanho || 0, Quando: new Date().toISOString() }; DM.mats.push(m); DM.envio = (DM.envio || []); return { id: m.ID }; };
  R2["imp.parte"] = function (a) { DM.envio = DM.envio || []; DM.envio.push([a.id, a.parte, a.sub, a.subTotal, String(a.dados).length]); return { ok: true, completa: a.sub === a.subTotal - 1 }; };
  R2["imp.finalizar"] = function (a) { var m = dmAchar(a.id); m.Status = "NA_FILA"; return dmProg(m); };
  R2["imp.processar"] = function (a) { var m = dmAchar(a.id); if (["NA_FILA", "PROCESSANDO"].indexOf(m.Status) < 0) { var p0 = dmProg(m); p0.trabalhou = false; return p0; } m.Feitas++; m.Trechos += 3; m.Licoes += 1; m.Vocab += 4; m.Status = m.Feitas >= m.Total ? "REVISAO" : "PROCESSANDO"; var p = dmProg(m); p.trabalhou = true; return p; };
  R2["imp.reprocessar"] = function (a) { return dmProg(dmAchar(a.id)); };
  R2["imp.detalhe"] = function (a) {
    var m = dmAchar(a.id); if (!m) throw new Error("Material não encontrado.");
    var licoes = [{ ID: "l1", Titulo: "Check-in no aeroporto", Habilidade: "escuta", Nivel: "A2", Topico: "Viagens", Conteudo: "Agent: Passport, please. Passenger: Here you are. Agent: Window or aisle? Passenger: Window, please.", Ativo: m.Status === "PUBLICADO", Fonte: "pág. 6-10" }, { ID: "l2", Titulo: "Pedindo a conta", Habilidade: "fala", Nivel: "A2", Topico: "Restaurante", Conteudo: "Practice asking for the bill: Could we have the bill, please?", Ativo: m.Status === "PUBLICADO", Fonte: "pág. 11-15" }];
    var vocab = [{ ID: "v1", Palavra: "boarding pass", Traducao: "cartão de embarque", Exemplo: "Show your boarding pass.", Nivel: "A2", Topico: "Viagens", Ativo: false }, { ID: "v2", Palavra: "gate", Traducao: "portão", Exemplo: "Go to gate twelve.", Nivel: "A2", Topico: "Viagens", Ativo: false }, { ID: "v3", Palavra: "bill", Traducao: "conta", Exemplo: "Can I have the bill?", Nivel: "A2", Topico: "Restaurante", Ativo: false }];
    var trechos = [{ ID: "t1", Titulo: "At the airport", Texto: "At the airport you show your passport and boarding pass at the check-in desk, then you walk to the gate and wait for the boarding call.", Topico: "Viagens", Nivel: "A2", Status: "RASCUNHO", Fonte: "pág. 6-10", ComVetor: true }, { ID: "t2", Titulo: "Ordering food", Texto: "In a restaurant the waiter brings the menu, you order a starter and a main dish, and at the end you ask for the bill.", Topico: "Restaurante", Nivel: "A2", Status: "RASCUNHO", Fonte: "pág. 11-15", ComVetor: false }];
    return { material: m, progresso: dmProg(m), rascunhos: m.Status === "REVISAO" ? 8 : 0, partes: [], licoes: licoes, vocab: vocab, trechos: trechos, totais: { licoes: licoes.length, vocab: vocab.length, trechos: trechos.length } };
  };
  R2["imp.itemSalvar"] = R2["imp.itemRemover"] = function () { return { ok: true }; };
  R2["imp.publicar"] = function (a) { dmAchar(a.id).Status = "PUBLICADO"; return { ok: true, itens: 20 }; };
  R2["imp.despublicar"] = function (a) { dmAchar(a.id).Status = "REVISAO"; return { ok: true, itens: 20 }; };
  R2["imp.descartar"] = function (a) { DM.mats = DM.mats.filter(function (m) { return m.ID !== a.id; }); return { ok: true }; };
  R["sup.equipe"] = function () { return D.usuarios.filter(function (u) { return u.Perfil === "SUPORTE"; }); };
  R["sup.equipeSalvar"] = function (a) { if (!/@/.test(a.Email || "")) throw new Error("E-mail inválido."); var ex = D.usuarios.filter(function (u) { return u.Email === a.Email; })[0]; if (ex) ex.Ativo = a.Ativo; else D.usuarios.push({ Email: a.Email, Nome: a.Nome || a.Email, Perfil: "SUPORTE", Ativo: "1" }); return { ok: true }; };
})();
