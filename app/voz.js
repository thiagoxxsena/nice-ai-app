/* Nice AI — voz natural no navegador.
   - Saida: toca o áudio PCM 16 bits que o Gemini devolve (TTS e conversa ao vivo).
   - Live: conversa em tempo real por WebSocket com token temporário (a chave fica no Apps Script).
   - Gravador: grava um trecho curto para transcrição no servidor quando o navegador não reconhece voz. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;

  function b64ParaBytes(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function bytesParaB64(u8) { var s = "", t = 0x8000; for (var i = 0; i < u8.length; i += t) s += String.fromCharCode.apply(null, u8.subarray(i, i + t)); return btoa(s); }
  function pcm16ParaFloat(u8) {
    var n = Math.floor(u8.length / 2), f = new Float32Array(n), dv = new DataView(u8.buffer, u8.byteOffset, n * 2);
    for (var i = 0; i < n; i++) f[i] = dv.getInt16(i * 2, true) / 32768;
    return f;
  }

  /* Tira o silêncio e o ruído baixo do começo e do fim da fala (limite de -42 dB) e deixa 15 ms antes e 90 ms depois. */
  function aparar(f, rate) {
    var lim = 0.008, n = f.length, a = 0, b = n, i;
    for (i = 0; i < n; i++) if (Math.abs(f[i]) > lim) { a = i; break; }
    for (i = n - 1; i >= a; i--) if (Math.abs(f[i]) > lim) { b = i + 1; break; }
    if (b <= a) return f;
    a = Math.max(0, a - Math.round(rate * 0.015)); b = Math.min(n, b + Math.round(rate * 0.09));
    return f.subarray(a, b);
  }

  /* ---------- Saída de áudio (fila sem buracos) ----------
     - O contexto de áudio roda em 24 kHz, a mesma taxa do Gemini. Assim o navegador não reamostra cada pedaço
       (isso criava um chiado agudo acima de 12 kHz, audível em alto-falantes e fones de desktop).
     - Entrada e saída de cada fala têm uma rampa curta (6 ms) para não estalar.
     - Um pequeno colchão (60 ms) no início de cada fala evita picotes quando a rede oscila. */
  function Saida() {
    this.ctx = null; this.ganho = null; this.fim = 0; this.fontes = []; this.aoParar = null;
    this.ultimoGanho = null; this.ultimoIni = 0; this.silencioAte = 0; this.pararT = 0;
  }
  Saida.prototype.abrir = function () {
    if (!AC) return null;
    if (!this.ctx || this.ctx.state === "closed") {
      try { this.ctx = new AC({ sampleRate: 24000, latencyHint: "interactive" }); } catch (e) { try { this.ctx = new AC(); } catch (e2) { return null; } }
      this.ganho = this.ctx.createGain();
      this.ganho.connect(this.ctx.destination);
      this.fim = 0; this.fontes = [];
    }
    if (this.ctx.state === "suspended") { try { this.ctx.resume(); } catch (e) {} }
    return this.ctx;
  };
  /* Núcleo: agenda um pedaço de áudio (números de -1 a 1). Toda reprodução passa por aqui. */
  Saida.prototype.tocarFloat = function (f, rate, colchao) {
    var ctx = this.abrir();
    if (!ctx || !f || !f.length) return 0;
    var buf = ctx.createBuffer(1, f.length, rate || 24000);
    buf.getChannelData(0).set(f);
    var src = ctx.createBufferSource(), g = ctx.createGain(), self = this, agora = ctx.currentTime;
    var novo = this.fim <= agora + 0.005;          /* fila vazia: começo de fala (ou a rede atrasou) */
    var ini = novo ? agora + (colchao === undefined ? 0.06 : colchao) : this.fim;
    src.buffer = buf; src.connect(g); g.connect(this.ganho);
    if (novo) { g.gain.setValueAtTime(0, ini); g.gain.linearRampToValueAtTime(1, ini + 0.006); }
    src.start(ini);
    this.fim = ini + buf.duration;
    this.ultimoGanho = g; this.ultimoIni = ini;
    this.fontes.push(src);
    src.onended = function () {
      self.fontes = self.fontes.filter(function (x) { return x !== src; });
      if (!self.fontes.length) { self.silencioAte = Date.now() + 350; if (self.aoParar) self.aoParar(); }
    };
    return buf.duration;
  };
  /* Pedaço de uma fala em andamento (conversa ao vivo). Quem usa isto DEVE chamar fecharFala() no fim do turno. */
  Saida.prototype.tocarPcm = function (b64, rate) { return this.tocarFloat(pcm16ParaFloat(b64ParaBytes(b64)), rate); };
  /* Fala inteira de uma vez (voz lida, atividades de ouvir, testes). Apara silêncio, entra e sai com rampa. NUNCA use tocarPcm para isto. */
  Saida.prototype.tocarFala = function (b64, rate) {
    var f = aparar(pcm16ParaFloat(b64ParaBytes(b64)), rate || 24000), d = this.tocarFloat(f, rate, 0.02);
    this.fecharFala();
    return d;
  };
  /* Fim de uma fala: rampa de saída no último pedaço (evita o estalo no corte). */
  Saida.prototype.fecharFala = function () {
    var ctx = this.ctx, g = this.ultimoGanho;
    this.ultimoGanho = null;
    if (!ctx || !g || this.fim <= ctx.currentTime + 0.012) return;
    var a = Math.max(this.ultimoIni, this.fim - 0.008);
    try { g.gain.setValueAtTime(1, a); g.gain.linearRampToValueAtTime(0, this.fim); } catch (e) {}
  };
  Saida.prototype.tocando = function () { return this.fontes.length > 0; };
  /* Tocando ou acabou de tocar: o eco da sala ainda pode entrar no microfone. */
  Saida.prototype.ocupada = function () { return this.fontes.length > 0 || Date.now() < this.silencioAte; };
  /* Para com uma descida rápida de volume (30 ms), sem corte seco. */
  Saida.prototype.parar = function () {
    var ctx = this.ctx, fontes = this.fontes;
    this.fontes = []; this.fim = 0; this.ultimoGanho = null; this.silencioAte = Date.now() + 250;
    if (ctx && fontes.length && this.ganho) {
      var gn = this.ganho.gain, t = ctx.currentTime, self = this;
      try { gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t); gn.linearRampToValueAtTime(0, t + 0.03); } catch (e) {}
      clearTimeout(this.pararT);
      this.pararT = setTimeout(function () {
        fontes.forEach(function (x) { try { x.onended = null; x.stop(); } catch (e) {} });
        try { var t2 = ctx.currentTime; gn.cancelScheduledValues(t2); gn.setValueAtTime(1, t2); } catch (e) {}
      }, 45);
    }
    if (this.aoParar) this.aoParar();
  };
  Saida.prototype.restante = function () { return this.ctx ? Math.max(0, this.fim - this.ctx.currentTime) : 0; };

  var saidaTts = new Saida();

  /* ---------- Microfone em PCM 16 kHz ---------- */
  var WORKLET = "class P extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0}process(i){var c=i[0]&&i[0][0];if(!c)return true;for(var k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===2048){this.port.postMessage(this.b.slice(0));this.n=0}}return true}}registerProcessor('nice-mic',P);";

  function Microfone(aoBloco) { this.aoBloco = aoBloco; this.ctx = null; this.stream = null; this.no = null; this.acum = []; this.tam = 0; this.nivel = 0; }
  Microfone.prototype.abrirContexto = function () { if (!this.ctx && AC) { try { this.ctx = new AC(); } catch (e) {} } if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); };
  Microfone.prototype.iniciar = function () {
    var self = this;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("Este navegador não libera o microfone."));
    this.abrirContexto();
    if (!this.ctx) return Promise.reject(new Error("Este navegador não toca áudio em tempo real."));
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }).then(function (st) {
      self.stream = st;
      var fonte = self.ctx.createMediaStreamSource(st);
      function receber(f) { self.receber(f); }
      if (self.ctx.audioWorklet && window.AudioWorkletNode) {
        var url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
        return self.ctx.audioWorklet.addModule(url).then(function () {
          var n = new AudioWorkletNode(self.ctx, "nice-mic");
          n.port.onmessage = function (e) { receber(e.data); };
          fonte.connect(n); self.no = n;
        });
      }
      var sp = self.ctx.createScriptProcessor(4096, 1, 1);
      sp.onaudioprocess = function (e) { receber(new Float32Array(e.inputBuffer.getChannelData(0))); };
      fonte.connect(sp); sp.connect(self.ctx.destination); self.no = sp;
    });
  };
  Microfone.prototype.receber = function (f) {
    var r = this.ctx.sampleRate / 16000, n = Math.floor(f.length / r), out = new Int16Array(n), soma = 0;
    for (var i = 0; i < n; i++) {
      var a = Math.floor(i * r), b = Math.min(f.length, Math.floor((i + 1) * r)), s = 0, k = 0;
      for (var j = a; j < b; j++) { s += f[j]; k++; }
      var v = k ? s / k : 0; soma += v * v;
      out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
    }
    this.nivel = n ? Math.sqrt(soma / n) : 0;
    this.acum.push(out); this.tam += n;
    if (this.tam >= 640) {
      var junto = new Int16Array(this.tam), p = 0;
      this.acum.forEach(function (x) { junto.set(x, p); p += x.length; });
      this.acum = []; this.tam = 0;
      this.aoBloco(bytesParaB64(new Uint8Array(junto.buffer)), this.nivel);
    }
  };
  Microfone.prototype.parar = function () {
    try { if (this.no) { this.no.disconnect(); if (this.no.port) this.no.port.onmessage = null; } } catch (e) {}
    try { if (this.stream) this.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { if (this.ctx) this.ctx.close(); } catch (e) {}
    this.no = null; this.stream = null; this.ctx = null;
  };

  /* ---------- Conversa ao vivo (Gemini Live) ---------- */
  function Live(o) {
    this.o = o; this.ws = null; this.pronto = false; this.fechado = false; this.mudo = false;
    this.saida = new Saida(); this.mic = null; this.turnos = []; this.atual = { aluno: "", agente: "" }; this.falasAluno = 0;
    this.inicio = 0; this.ultimoPapel = ""; this.micPronto = null; this.micErro = null;
    this.m = { t0: performance.now() };
  }
  /* Marca o tempo (ms desde o toque) de cada etapa. Ajuda a achar onde está a demora. */
  Live.prototype.marcar = function (k) { if (this.m[k] === undefined) this.m[k] = Math.round(performance.now() - this.m.t0); };
  Live.prototype.estado = function (e) { if (this.o.onEstado) this.o.onEstado(e); };
  /* Precisa ser chamado dentro do clique (iPhone só libera áudio num gesto). */
  Live.prototype.prepararAudio = function () {
    var self = this;
    this.m.t0 = performance.now();
    this.saida.abrir();
    this.mic = new Microfone(this.enviarAudio.bind(this));
    this.mic.abrirContexto();
    /* O microfone abre JUNTO com o pedido ao servidor, não depois (antes somava 1 a 2 s de espera). */
    this.micPronto = this.mic.iniciar().then(function () { self.marcar("mic"); return true; }, function (e) { self.micErro = e; return false; });
  };
  Live.prototype.conectar = function (cred) {
    var self = this;
    this.estado("conectando");
    return new Promise(function (ok, falha) {
      var ws;
      try { ws = new WebSocket(cred.wsUrl + "?access_token=" + encodeURIComponent(cred.token)); } catch (e) { falha(e); return; }
      ws.binaryType = "arraybuffer";
      self.ws = ws;
      var t = setTimeout(function () { if (!self.pronto) { falha(new Error("A conversa ao vivo não respondeu.")); self.fechar(); } }, 12000);
      /* Microfone negado ou ausente: avisa logo, sem esperar a conexão. */
      self.micPronto.then(function (okMic) { if (!okMic && !self.pronto) { clearTimeout(t); falha(self.micErro || new Error("Microfone indisponível.")); self.fechar(); } });
      ws.onopen = function () { self.marcar("ws"); ws.send(JSON.stringify({ setup: cred.setup })); };
      ws.onmessage = function (ev) {
        var txt = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data), m;
        try { m = JSON.parse(txt); } catch (e) { return; }
        if (m.setupComplete && !self.pronto) {
          self.pronto = true; clearTimeout(t); self.inicio = Date.now(); self.marcar("setup");
          /* A saudação sai na hora; o tutor já começa a responder enquanto o microfone termina de abrir. */
          if (cred.abrir !== false) self.enviarTexto(cred.textoInicial || "Hi!", true);
          self.micPronto.then(function (okMic) {
            if (!okMic) { falha(self.micErro || new Error("Microfone indisponível.")); self.fechar(); return; }
            if (!self.saida.tocando()) self.estado("ouvindo");
            ok();
          });
          return;
        }
        self.tratar(m);
      };
      ws.onerror = function () { if (!self.pronto) { clearTimeout(t); falha(new Error("Não foi possível abrir a conversa ao vivo.")); } };
      ws.onclose = function (ev) {
        clearTimeout(t);
        if (!self.pronto) { falha(new Error("Conversa ao vivo recusada" + (ev.reason ? ": " + ev.reason : "."))); return; }
        if (!self.fechado) { self.fechado = true; self.fecharTurnos(); if (self.o.onFechar) self.o.onFechar(ev.reason || ""); }
      };
    });
  };
  Live.prototype.tratar = function (m) {
    var sc = m.serverContent, self = this;
    if (m.goAway && this.o.onAviso) this.o.onAviso("A conversa vai terminar em instantes.");
    if (!sc) return;
    if (sc.interrupted) { this.saida.parar(); this.fecharAgente(); }
    if (sc.inputTranscription && sc.inputTranscription.text) {
      if (this.atual.agente) this.fecharAgente();
      this.atual.aluno += sc.inputTranscription.text;
      this.ultimoPapel = "aluno";
      if (this.o.onTexto) this.o.onTexto("aluno", this.atual.aluno, false);
    }
    var temSaida = false;
    if (sc.modelTurn && sc.modelTurn.parts) sc.modelTurn.parts.forEach(function (p) {
      if (p.inlineData && p.inlineData.data && /audio/.test(p.inlineData.mimeType || "audio")) {
        var mr = /rate=(\d+)/.exec(p.inlineData.mimeType || ""); self.saida.tocarPcm(p.inlineData.data, mr ? +mr[1] : 24000); temSaida = true;
        if (self.m.audio === undefined) { self.marcar("audio"); try { console.info("[Nice] ao vivo (ms desde o toque):", JSON.stringify(self.m)); } catch (e) {} window.NiceVoz.ultimaMedicao = self.m; }
      }
    });
    if (sc.outputTranscription && sc.outputTranscription.text) { this.atual.agente += sc.outputTranscription.text; temSaida = true; }
    if (temSaida) {
      if (this.atual.aluno) this.fecharAluno();
      this.ultimoPapel = "agente";
      this.estado("falando");
      if (this.atual.agente && this.o.onTexto) this.o.onTexto("agente", this.atual.agente, false);
    }
    if (sc.turnComplete) {
      this.saida.fecharFala();
      this.fecharAgente();
      var esperar = this.saida.restante();
      setTimeout(function () { if (!self.fechado) self.estado("ouvindo"); if (self.o.onTurno) self.o.onTurno(self.falasAluno); }, esperar * 1000 + 150);
    }
  };
  Live.prototype.fecharAluno = function () {
    var t = this.atual.aluno.replace(/\s+/g, " ").trim();
    this.atual.aluno = "";
    if (!t) return;
    this.turnos.push({ papel: "aluno", texto: t }); this.falasAluno++;
    if (this.o.onTexto) this.o.onTexto("aluno", t, true);
  };
  Live.prototype.fecharAgente = function () {
    var t = this.atual.agente.replace(/\s+/g, " ").trim();
    this.atual.agente = "";
    if (!t) return;
    this.turnos.push({ papel: "agente", texto: t });
    if (this.o.onTexto) this.o.onTexto("agente", t, true);
  };
  Live.prototype.fecharTurnos = function () { this.fecharAluno(); this.fecharAgente(); };
  Live.prototype.enviarAudio = function (b64, nivel) {
    if (!this.pronto || this.fechado || this.mudo || !this.ws || this.ws.readyState !== 1) return;
    /* Enquanto o tutor fala, só passa voz alta (o aluno interrompendo). Evita eco no alto-falante do celular. */
    if (this.saida.ocupada() && nivel < 0.06) return;
    this.ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64, mimeType: "audio/pcm;rate=16000" } } }));
  };
  Live.prototype.enviarTexto = function (texto, oculto) {
    if (!this.ws || this.ws.readyState !== 1) return;
    if (!oculto) { this.fecharTurnos(); this.turnos.push({ papel: "aluno", texto: texto }); this.falasAluno++; if (this.o.onTexto) this.o.onTexto("aluno", texto, true); }
    this.saida.parar();
    /* Modelos Live 3.x só aceitam texto em tempo real por realtimeInput (clientContent fica para o histórico inicial). */
    this.ws.send(JSON.stringify({ realtimeInput: { text: texto } }));
  };
  Live.prototype.alternarMudo = function () {
    this.mudo = !this.mudo;
    if (this.mudo && this.ws && this.ws.readyState === 1) { try { this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })); } catch (e) {} }
    return this.mudo;
  };
  Live.prototype.segundos = function () { return this.inicio ? Math.round((Date.now() - this.inicio) / 1000) : 0; };
  Live.prototype.fechar = function () {
    this.fecharTurnos();
    this.fechado = true;
    try { if (this.mic) this.mic.parar(); } catch (e) {}
    try { this.saida.parar(); } catch (e) {}
    try { if (this.ws && this.ws.readyState <= 1) this.ws.close(1000, "fim"); } catch (e) {}
    try { if (this.saida.ctx) this.saida.ctx.close(); } catch (e) {}
  };

  /* ---------- Gravador curto (para transcrição no servidor) ---------- */
  function Gravador() { this.rec = null; this.partes = []; this.t0 = 0; }
  Gravador.disponivel = function () { return !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); };
  Gravador.prototype.iniciar = function () {
    var self = this;
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (st) {
      var tipos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"], mime = "";
      for (var i = 0; i < tipos.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(tipos[i])) { mime = tipos[i]; break; }
      self.rec = mime ? new MediaRecorder(st, { mimeType: mime }) : new MediaRecorder(st);
      self.partes = []; self.t0 = Date.now();
      self.rec.ondataavailable = function (e) { if (e.data && e.data.size) self.partes.push(e.data); };
      self.rec.start();
      self.limite = setTimeout(function () { self.parar(); }, 45000);
    });
  };
  Gravador.prototype.parar = function () {
    var self = this;
    clearTimeout(this.limite);
    return new Promise(function (ok) {
      if (!self.rec || self.rec.state === "inactive") { ok(null); return; }
      self.rec.onstop = function () {
        try { self.rec.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        var blob = new Blob(self.partes, { type: self.rec.mimeType || "audio/webm" }), fr = new FileReader();
        fr.onload = function () { ok({ audio: String(fr.result).split(",")[1] || "", mime: blob.type, segundos: Math.round((Date.now() - self.t0) / 1000) }); };
        fr.readAsDataURL(blob);
      };
      self.rec.stop();
    });
  };

  /* Teste da conversa ao vivo (Sustentação): abre a conexão com o token, pede um "Hi!" e toca o que o tutor responde. */
  function testarLive(r) {
    return new Promise(function (ok, falha) {
      if (!(AC && window.WebSocket)) { falha(new Error("Este navegador não suporta conversa ao vivo.")); return; }
      var saida = new Saida(), ws, fim = false, falou = "", audio = 0, t0 = performance.now(), tp = {};
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
        if (sc.turnComplete) { saida.fecharFala(); fechar(); setTimeout(function () { ok({ audio: audio, texto: falou.trim(), tempos: tp }); }, 50); }
      };
      ws.onclose = function (ev) { if (!fim) { clearTimeout(t); falha(new Error("Conexão recusada" + (ev.reason ? ": " + ev.reason : " (código " + ev.code + ")."))); } };
    });
  }

  /* Voz lida (uma fala inteira): para o que estiver tocando e toca esta, com as rampas certas. Devolve a duração em segundos. */
  function falarPcm(b64, rate) { saidaTts.parar(); return saidaTts.tocarFala(b64, rate); }

  window.NiceVoz = { falarPcm: falarPcm, testarLive: testarLive, aparar: aparar, Saida: Saida, saidaTts: saidaTts, Live: Live, Gravador: Gravador, suportaLive: function () { return !!(AC && window.WebSocket && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); } };
})();
