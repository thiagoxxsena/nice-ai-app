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

  /* ---------- Saída de áudio (fila sem buracos) ---------- */
  function Saida() {
    this.ctx = null; this.fim = 0; this.fontes = []; this.aoParar = null;
  }
  Saida.prototype.abrir = function () {
    if (!AC) return null;
    if (!this.ctx || this.ctx.state === "closed") { try { this.ctx = new AC(); } catch (e) { return null; } }
    if (this.ctx.state === "suspended") { try { this.ctx.resume(); } catch (e) {} }
    return this.ctx;
  };
  Saida.prototype.tocarPcm = function (b64, rate) {
    var ctx = this.abrir();
    if (!ctx) return 0;
    var f = pcm16ParaFloat(b64ParaBytes(b64));
    if (!f.length) return 0;
    var buf = ctx.createBuffer(1, f.length, rate || 24000);
    buf.getChannelData(0).set(f);
    var src = ctx.createBufferSource(), self = this;
    src.buffer = buf; src.connect(ctx.destination);
    var ini = Math.max(ctx.currentTime + 0.03, this.fim);
    src.start(ini);
    this.fim = ini + buf.duration;
    this.fontes.push(src);
    src.onended = function () {
      self.fontes = self.fontes.filter(function (x) { return x !== src; });
      if (!self.fontes.length && self.aoParar) self.aoParar();
    };
    return buf.duration;
  };
  Saida.prototype.tocando = function () { return this.fontes.length > 0; };
  Saida.prototype.parar = function () {
    this.fontes.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) {} });
    this.fontes = []; this.fim = 0;
    if (this.aoParar) this.aoParar();
  };
  Saida.prototype.restante = function () { return this.ctx ? Math.max(0, this.fim - this.ctx.currentTime) : 0; };

  var saidaTts = new Saida();

  /* ---------- Microfone em PCM 16 kHz ---------- */
  var WORKLET = "class P extends AudioWorkletProcessor{process(i){var c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('nice-mic',P);";

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
    if (this.tam >= 1600) {
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
    this.inicio = 0; this.ultimoPapel = "";
  }
  Live.prototype.estado = function (e) { if (this.o.onEstado) this.o.onEstado(e); };
  /* Precisa ser chamado dentro do clique (iPhone só libera áudio num gesto). */
  Live.prototype.prepararAudio = function () {
    this.saida.abrir();
    this.mic = new Microfone(this.enviarAudio.bind(this));
    this.mic.abrirContexto();
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
      ws.onopen = function () { ws.send(JSON.stringify({ setup: cred.setup })); };
      ws.onmessage = function (ev) {
        var txt = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data), m;
        try { m = JSON.parse(txt); } catch (e) { return; }
        if (m.setupComplete && !self.pronto) {
          self.pronto = true; clearTimeout(t); self.inicio = Date.now();
          self.mic.iniciar().then(function () {
            self.estado("ouvindo");
            if (cred.abrir !== false) self.enviarTexto(cred.textoInicial || "Hi!", true);
            ok();
          }, function (e) { falha(e); self.fechar(); });
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
    if (this.saida.tocando() && nivel < 0.06) return;
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

  window.NiceVoz = { Saida: Saida, saidaTts: saidaTts, Live: Live, Gravador: Gravador, suportaLive: function () { return !!(AC && window.WebSocket && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); } };
})();
