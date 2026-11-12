# Nice AI — app (piloto)

Landing (visual V3) na raiz e app do aluno em `app/`. Site estático, pronto para o GitHub Pages.

## Estrutura

- `index.html`: página de entrada (rolagem animada). O botão "Testar de graça" abre `app/`.
- `app/`: o app (`index.html`, `app.css`).
  - `app.js`: login, roteamento por perfil e telas do aluno.
  - `voz.js`: voz natural (toca o áudio do Gemini, conversa ao vivo por WebSocket, gravador para transcrição).
  - `atividades.js`: menu das 5 habilidades, as 14 atividades e a demonstração delas.
  - `equipe.js`: telas de Professor, Gestão e Sustentação.
- `shared/`: motor de animação e estilos das telas da landing.
- `config.js`: endereço do Apps Script (`API_URL`) e ID do cliente Google (`CLIENT_ID`).

## Como funciona

O app chama o Apps Script do projeto por `POST` (rotas `bootstrap`, `aluno.painel`, `aluno.perfilSalvar`, `sessao.iniciar`, `sessao.enviar`, `sessao.encerrar`). A chave da IA fica só no servidor. O login usa Google Identity Services.

Demonstração sem servidor: `app/?demo` (aluno), `app/?demo=professor`, `app/?demo=gestao` ou `app/?demo=suporte`. Os dados são de exemplo. Na demonstração a voz é a do navegador.

## Perfis e telas

| Perfil | Abre em | Abas |
|---|---|---|
| Aluno | Início | Início, Praticar, Progresso, Perfil (com Dúvidas ao professor) |
| Professor | Professor | Início (notas a validar, aulas), Alunos (ficha, nível, recado, conversas), Dúvidas, Agenda |
| Gestão (ADMIN) | Gestão | Indicadores, Acessos (liberar e bloquear), Agenda da escola, Planos, Materiais (importar, revisar e publicar). Também abre Professor e Aluno |
| Sustentação (SUPORTE) | Sustentação | Saúde (testes e erros), Chave e voz, Custos, Equipe |

O dono do script entra como Gestão e também vê a Sustentação.

## As 5 habilidades (Praticar)

| Habilidade | Atividades |
|---|---|
| Ouvir | Ouvir e selecionar, ouvir e responder por escrito, ouvir e traduzir, ouvir e responder falando, ouvir e resumir em inglês |
| Falar | Conversar com o tutor (ao vivo), descrever uma cena, frases com palavras novas, ler em voz alta (compara o que o app ouviu com o texto) |
| Ler | Compreensão de texto, vocabulário novo (definição, sinônimo e exemplo) |
| Escrever | Situações reais (e-mail, formulário, feedback, prestação de contas, notícia difícil), texto com lacunas |
| Traduzir | Traduzir frases (português para inglês ou inglês para português), traduzir um texto e criar frases com as palavras novas |

Como testar uma por uma: entre com a conta dona, troque a área para Aluno, abra **Praticar**, escolha a habilidade e a atividade. A nota entra em **Progresso**. Para testar sem servidor: `app/?demo`.

## Materiais da escola (Gestão > Materiais)

1. **Enviar:** escolha o livro e o nível (ou deixe a IA descobrir) e selecione os arquivos. PDF, PDF escaneado, imagens, Word, PowerPoint, texto, áudio e vídeo. PDFs são separados de 5 em 5 páginas no navegador. Várias imagens juntas viram um só material.
2. **Processar:** a IA lê cada parte e extrai lições, vocabulário e trechos. Dá para fechar a página: uma rotina do servidor continua a cada 10 minutos (ative em Nice AI > Ativar backup semanal, na planilha).
3. **Revisar:** abra o material, edite ou remova lições, palavras e trechos. Nada aparece para alunos antes de publicar.
4. **Publicar:** libera tudo de uma vez. Os trechos entram na base de conhecimento e a IA passa a consultá-los no chat, na conversa ao vivo, nas atividades e no material de escuta. É possível despublicar.

Requer a chave do Gemini cadastrada (Sustentação). Áudio e vídeo: até 14 MB por arquivo.

## Voz

- Conversa ao vivo (teste de nível e prática): Gemini Live. O Apps Script cria um token temporário de uso único, já travado com modelo, voz e instruções. O navegador conecta direto no Gemini com esse token. A chave nunca sai do servidor.
- Voz lida (palavras e respostas do chat): Gemini TTS, com cache no servidor e no navegador.
- Transcrição: na conversa ao vivo, vem do próprio Gemini. No chat, usa o reconhecimento do navegador; sem ele (ou no iPhone), grava e transcreve no servidor.
- Se algo falhar (sem chave, Live desligado, limite do dia, rede), o app volta para o chat com voz do navegador.

## Jornada do aluno implementada

Login → quiz de 3 perguntas → teste de nível por conversa (7 perguntas, voz ou texto) → resultado → plano (7 dias grátis) → painel com meta diária e missão → prática por voz em 4 cenários → progresso e perfil.

## Limites conhecidos do piloto

- O e-mail do aluno precisa estar cadastrado pela escola (regra atual do servidor).
- Meta diária, objetivo, tempo e plano ficam no navegador do aluno (o servidor ainda não tem esses campos).
- O plano "7 dias grátis" não cobra nada; os valores ainda não foram definidos.
- Só 4 habilidades são medidas no servidor (fala, escuta, leitura, escrita). Traduzir aparece como "em breve".
- O reconhecimento de voz depende do navegador (melhor no Chrome); sem ele, o aluno digita.

## Publicar no GitHub Pages

1. Crie o repositório e envie estes arquivos na raiz.
2. Em Settings > Pages, escolha a branch `main` e a pasta `/ (root)`.
3. O login Google já autoriza a origem `https://thiagoxxsena.github.io`. Não precisa mudar nada no Google Cloud.
