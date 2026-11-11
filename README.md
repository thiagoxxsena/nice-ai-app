# Nice AI — app (piloto)

Landing (visual V3) na raiz e app do aluno em `app/`. Site estático, pronto para o GitHub Pages.

## Estrutura

- `index.html`: página de entrada (rolagem animada). O botão "Testar de graça" abre `app/`.
- `app/`: app do aluno (`index.html`, `app.css`, `app.js`).
- `shared/`: motor de animação e estilos das telas da landing.
- `config.js`: endereço do Apps Script (`API_URL`) e ID do cliente Google (`CLIENT_ID`).

## Como funciona

O app chama o Apps Script do projeto por `POST` (rotas `bootstrap`, `aluno.painel`, `aluno.perfilSalvar`, `sessao.iniciar`, `sessao.enviar`, `sessao.encerrar`). A chave da IA fica só no servidor. O login usa Google Identity Services.

Demonstração sem servidor: abra `app/?demo` ou use o botão "Ver demonstração". As respostas são simuladas.

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
