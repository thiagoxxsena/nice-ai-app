/* Nice AI — telas da equipe: Professor, Gestão e Sustentação. Usa a API exposta por app.js (window.Nice). */
(function () {
  "use strict";
  var N = window.Nice, V = N.V, api = N.api, go = N.go, esc = N.esc, toast = N.toast, falhou = N.falhou, $ = N.$, S = N.S;
  var VZ = window.NiceVoz;
  var HAB = [["fala", "Falar"], ["escuta", "Ouvir"], ["leitura", "Ler"], ["escrita", "Escrever"]];
  var MOD = { nivelamento: "Teste de nível", fala: "Fala", escuta: "Escuta", leitura: "Leitura", escrita: "Escrita" };
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

  /* =================== SUSTENTAÇÃO =================== */
  var TESTES = [["chave", "Chave e modelos (confere com o Google)"], ["texto", "Texto (conversa escrita)"], ["tts", "Voz natural (leitura)"], ["stt", "Transcrição de voz"], ["live", "Conversa ao vivo"]];

  /* Abre a conexão ao vivo no navegador com o token do teste e espera o tutor falar. */
  function testeLiveNavegador(r) {
    return new Promise(function (ok, falha) {
      if (!VZ || !VZ.suportaLive()) { falha(new Error("Este navegador não suporta conversa ao vivo.")); return; }
      var saida = new VZ.Saida(), ws, fim = false, falou = "", audio = 0;
      saida.abrir();
      var t = setTimeout(function () { fechar(); falha(new Error("Sem resposta em 15 s. Confira o modelo ao vivo em Modelos e voz.")); }, 15000);
      function fechar() { fim = true; clearTimeout(t); try { ws.close(); } catch (e) {} }
      try { ws = new WebSocket(r.wsUrl + "?access_token=" + encodeURIComponent(r.token)); } catch (e) { falha(e); return; }
      ws.binaryType = "arraybuffer";
      ws.onopen = function () { ws.send(JSON.stringify({ setup: r.setup })); };
      ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data)); } catch (e) { return; }
        if (m.setupComplete) { ws.send(JSON.stringify({ realtimeInput: { text: "Hi!" } })); return; }
        var sc = m.serverContent; if (!sc) return;
        if (sc.modelTurn && sc.modelTurn.parts) sc.modelTurn.parts.forEach(function (p) { if (p.inlineData && p.inlineData.data) { audio += saida.tocarPcm(p.inlineData.data, 24000); } });
        if (sc.outputTranscription && sc.outputTranscription.text) falou += sc.outputTranscription.text;
        if (sc.turnComplete) { fechar(); setTimeout(function () { ok({ audio: audio, texto: falou.trim() }); }, 50); }
      };
      ws.onclose = function (ev) { if (!fim) { clearTimeout(t); falha(new Error("Conexão recusada" + (ev.reason ? ": " + ev.reason : " (código " + ev.code + ")."))); } };
    });
  }

  function rodarTeste(tipo, linha, extra) {
    linha.className = "teste rodando"; linha.querySelector("small").textContent = "Testando…";
    return api("sup.testar", Object.assign({ tipo: tipo }, extra || {})).then(function (r) {
      if (!r.ok) throw new Error(r.detalhe);
      if (tipo === "tts") tocarAudio(r);
      if (tipo === "live") return testeLiveNavegador(r).then(function (x) { return { ok: true, detalhe: "Tutor respondeu ao vivo com " + x.audio.toFixed(1) + " s de áudio" + (x.texto ? ': "' + x.texto + '"' : "") + ".", ms: r.ms }; });
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
          kpi("Conversa ao vivo", d.modelos.liveAtiva ? "Ligada" : "Desligada", d.liveHoje + " hoje") + kpi("Sessões hoje", d.sessoesHoje) + kpi("Custo hoje", brl(d.custo.hojeBrl), usd(d.custo.hojeUsd)) + kpi("Custo 30 dias", brl(d.custo.mesBrl), usd(d.custo.mesUsd), "destaque") + kpi("Versão do servidor", d.versao) + "</div>" +
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
          '<label>Voz do tutor<span class="linha2"><select class="campo" id="c-voz">' + opcoes(d.vozes, cfg.VOZ_NOME) + '</select><button class="pill" id="v-p">Ouvir</button></span></label>' +
          '<label>Conversa ao vivo<select class="campo" id="c-VOZ_LIVE_ATIVA">' + opcoes([["1", "Ligada"], ["0", "Desligada (usa chat com voz)"]], cfg.VOZ_LIVE_ATIVA) + "</select></label>" +
          '<label>Conversas ao vivo por aluno/dia<input class="campo" id="c-VOZ_SESSOES_DIA" inputmode="numeric" value="' + esc(cfg.VOZ_SESSOES_DIA) + '"></label>' +
          '<label>Minutos máximos por conversa<input class="campo" id="c-VOZ_MIN_SESSAO" inputmode="numeric" value="' + esc(cfg.VOZ_MIN_SESSAO) + '"></label></div>' +
          '<datalist id="l-texto"></datalist><datalist id="l-tts"></datalist><datalist id="l-live"></datalist><small id="m-info"></small>' +
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
            ["texto", "tts", "live"].forEach(function (k) { $("#l-" + k, el).innerHTML = m[k].map(function (x) { return '<option value="' + esc(x) + '">'; }).join(""); });
            $("#m-info", el).textContent = "Disponíveis para esta chave: " + m.texto.length + " de texto, " + m.tts.length + " de voz lida e " + m.live.length + " ao vivo" + (m.live.length ? " (ex.: " + m.live.slice(-2).join(", ") + ")" : "") + ". Clique num campo para escolher.";
            var avisos = [];
            if (m.tts.length && m.tts.indexOf($("#c-TTS_MODELO", el).value) < 0) avisos.push("o modelo de voz lida atual não está na lista");
            if (m.live.length && m.live.indexOf($("#c-LIVE_MODELO", el).value) < 0) avisos.push("o modelo ao vivo atual não está na lista");
            if (avisos.length) toast("Atenção: " + avisos.join(" e ") + ".");
          }).catch(function (e) { ocupado(b, false); falhou(e); });
        };
        $("#c-s", el).onclick = function () {
          var b = this, v = { VOZ_NOME: $("#c-voz", el).value };
          ["IA_MODELO", "TTS_MODELO", "LIVE_MODELO", "VOZ_LIVE_ATIVA", "VOZ_SESSOES_DIA", "VOZ_MIN_SESSAO"].forEach(function (k) { v[k] = $("#c-" + k, el).value.trim(); });
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
          kpi("Conversa ao vivo", Math.round(t.live_seg / 60) + " min", "30 dias") + kpi("Voz lida", Math.round(t.tts_seg / 60) + " min", "30 dias") + kpi("Texto", Math.round(t.texto_tokens / 1000) + " mil tokens", t.chamadas + " chamadas") + kpi("Transcrição", Math.round(t.stt_seg / 60) + " min") + "</div>" +
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
    cfg: { IA_MODELO: "gemini-flash-latest", TTS_MODELO: "gemini-2.5-flash-preview-tts", LIVE_MODELO: "gemini-2.5-flash-native-audio-preview-09-2025", VOZ_NOME: "Kore", VOZ_LIVE_ATIVA: "1", VOZ_SESSOES_DIA: "12", VOZ_MIN_SESSAO: "10", CUSTO_TEXTO_1M: "1.00", CUSTO_TTS_MIN: "0.015", CUSTO_LIVE_MIN: "0.025", CUSTO_STT_MIN: "0.002", CAMBIO_USD: "5.50" }
  };
  function uso() {
    var out = [], i;
    for (i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 86400000), s = Math.sin(i) * 0.5 + 1; out.push({ dia: d.getFullYear() + "-" + N.pad(d.getMonth() + 1) + "-" + N.pad(d.getDate()), live_seg: Math.round(1800 * s), tts_seg: Math.round(240 * s), stt_seg: Math.round(60 * s), texto_tokens: Math.round(90000 * s), chamadas: Math.round(140 * s) }); }
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
  R["sup.painel"] = function () { var u = uso(), h = u[u.length - 1], tot = { texto_tokens: 0, tts_seg: 0, live_seg: 0, stt_seg: 0, chamadas: 0 }, m = 0; u.forEach(function (x) { for (var k in tot) tot[k] += x[k]; m += x.custo; }); return { versao: "3.0.0", chave: D.chave, modelos: { texto: D.cfg.IA_MODELO, tts: D.cfg.TTS_MODELO, live: D.cfg.LIVE_MODELO, voz: D.cfg.VOZ_NOME, liveAtiva: D.cfg.VOZ_LIVE_ATIVA === "1" }, vozes: ["Kore", "Puck", "Charon", "Aoede", "Leda", "Orus", "Zephyr", "Fenrir"], uso: u, total: tot, custo: { hojeUsd: h.custo, mesUsd: Math.round(m * 10000) / 10000, hojeBrl: Math.round(h.custo * 550) / 100, mesBrl: Math.round(m * 550) / 100, cambio: 5.5 }, erros: [{ quando: new Date(Date.now() - 7200000).toISOString(), rota: "voz.liveIniciar", quem: "bruno@exemplo.com", msg: "Limite de uso da IA atingido: Resource has been exhausted (exemplo)" }], usuarios: { ADMIN: 1, EDITOR: 0, PROFESSOR: 2, ALUNO: 37, SUPORTE: 1 }, sessoesHoje: 23, liveHoje: 14 }; };
  R["sup.config"] = function () { return Object.keys(D.cfg).map(function (k) { return { Chave: k, Valor: D.cfg[k], Rotulo: { CUSTO_LIVE_MIN: "US$ por minuto de conversa ao vivo", CUSTO_TTS_MIN: "US$ por minuto de voz lida", CUSTO_STT_MIN: "US$ por minuto de transcrição", CUSTO_TEXTO_1M: "US$ por 1 milhão de tokens de texto", CAMBIO_USD: "Câmbio R$ por US$" }[k] || k }; }); };
  R["sup.configSalvar"] = function (a) { for (var k in a.valores) D.cfg[k] = a.valores[k]; return { ok: true }; };
  R["sup.chave"] = function (a) { var k = String(a.chave || ""); D.chave = k ? { ativa: true, fim: k.slice(-4), em: new Date().toISOString(), por: "demo-suporte@nice.ai" } : { ativa: false, fim: "" }; return { ok: true, chave: D.chave }; };
  R["sup.testar"] = function (a) { return { tipo: a.tipo, ok: false, detalhe: "Na demonstração não há servidor. Com a chave cadastrada, este teste chama o Gemini de verdade.", ms: 0 }; };
  R["sup.modelos"] = function () { return { texto: ["gemini-2.5-flash", "gemini-flash-latest"], tts: ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"], live: ["gemini-2.5-flash-native-audio-preview-09-2025", "gemini-live-2.5-flash-preview"] }; };
  R["sup.equipe"] = function () { return D.usuarios.filter(function (u) { return u.Perfil === "SUPORTE"; }); };
  R["sup.equipeSalvar"] = function (a) { if (!/@/.test(a.Email || "")) throw new Error("E-mail inválido."); var ex = D.usuarios.filter(function (u) { return u.Email === a.Email; })[0]; if (ex) ex.Ativo = a.Ativo; else D.usuarios.push({ Email: a.Email, Nome: a.Nome || a.Email, Perfil: "SUPORTE", Ativo: "1" }); return { ok: true }; };
})();
