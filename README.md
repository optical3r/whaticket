# Cerqueira Labs | Atendimento via WhatsApp

Central de atendimento via WhatsApp da Cerqueira Labs. Vários atendentes respondem pelo mesmo número, e cada conversa vira um ticket com fila, responsável e histórico.

> O nome do produto ainda não foi decidido. Ele é configurado em um único lugar (`BRAND_NAME`) e pode ser trocado sem mexer no código.

## O que o sistema faz hoje

- **Caixa de entrada compartilhada**: vários atendentes no mesmo número de WhatsApp.
- **Várias conexões**: mais de um número conectado, tudo na mesma tela.
- **Tickets**: pendente → aberto → resolvido, com atendente responsável e transferência entre atendentes e filas.
- **Filas (departamentos)**: menu automático de opções e mensagem de saudação por fila.
- **Respostas rápidas**: atalhos com `/` para as perguntas mais comuns.
- **Mídia**: imagem, áudio (com gravação no navegador), vídeo, documentos, localização e contatos.
- **Contatos**: cadastro, campos personalizados e importação dos contatos do celular.
- **Multiempresa**: cada cliente é uma empresa com usuários, conexões, filas, contatos, tickets e token de API próprios. Uma empresa nunca vê os dados de outra.
- **Planos e limites**: cada empresa tem um plano com limite de usuários, conexões e filas. O plano também define se o módulo de IA está liberado e quantas solicitações de IA cada empresa pode fazer por mês.
- **Painel da plataforma** (superadmin da Cerqueira Labs): criar empresas e o primeiro administrador, trocar o plano, suspender e reativar.
- **Termos de uso**: o administrador da empresa aceita os riscos da conexão por QR Code antes de criar a primeira conexão.
- **Alerta de conexão caída**: banner e aviso no navegador quando uma conexão do WhatsApp para de funcionar.
- **Perfis**: administrador, supervisor (vê todos os tickets, relatórios, etiquetas e motivos) e atendente.
- **Etiquetas** em tickets e contatos, com filtro na lista de tickets e de contatos.
- **Notas internas** no ticket, visíveis só para a equipe.
- **Horário de atendimento por fila**, no fuso horário da empresa, com mensagem automática fora do horário.
- **Motivo de encerramento**, opcional ou obrigatório.
- **Pesquisa de satisfação** (nota de 1 a 5) enviada ao encerrar o ticket. A resposta fica registrada no ticket encerrado, sem reabri-lo.
- **Relatórios**: tempo de primeira resposta, tempo de resolução, volume por dia, fila, atendente e motivo, satisfação média e exportação em CSV.
- **Webhooks** para enviar eventos (ticket criado, encerrado, avaliado, mensagem recebida e enviada) para outros sistemas.
- **IA no atendimento** (Claude, da Anthropic): sugestão de resposta, resumo da conversa e revisão do texto do atendente.
- **Assistente virtual**: responde os clientes que aguardam na fila usando a base de conhecimento da empresa e transfere para a equipe quando necessário.
- **Transcrição de áudio**: os áudios que o cliente envia viram texto na conversa, para o atendente e para a IA. É um módulo liberado por plano, com custo da Cerqueira Labs.
- **Kanban**: os tickets abertos e aguardando em colunas de etapas definidas pela empresa, movidos arrastando.
- **Campanhas**: envio em massa para contatos filtrados por etiqueta, com intervalo aleatório, janela de horário, pausa e relatório, por QR Code ou pela API oficial (com modelos aprovados). O contato que responde SAIR deixa de receber.
- **API oficial do WhatsApp** (Cloud API da Meta) como alternativa ao QR Code, com templates e a janela de 24 horas. A empresa conecta o número por um link (conexão guiada, via Coexy) ou com um app próprio na Meta.
- **Fluxos de atendimento**: menus, perguntas e transferência para a fila certa, montados num quadro visual (ou em lista) com simulador e escolhidos por conexão.
- **Aplicativo instalável** (PWA) no celular e no computador, com aviso de nova mensagem.
- **Dashboard**: volume de tickets do dia.
- **API**: envio de mensagens por `POST /api/messages/send`, autenticado pelo token da empresa (em **Configurações**).
- **Idiomas**: português (Brasil), o padrão, e inglês. A troca fica no ícone de idioma da barra superior e da tela de login.
- **Temas**: claro (padrão) e escuro, seguindo o design system Cerqueira Labs.

As cinco fases do plano de implementação aprovado estão entregues.

## Empresas, planos e superadmin

- O administrador criado pelo seed é o **superadmin**. Ele vê o menu **Plataforma**, com as telas **Empresas** e **Planos**.
- Não existe cadastro público: cada empresa é criada pelo superadmin, junto com o seu primeiro administrador.
- Ao suspender uma empresa, os usuários dela perdem o acesso e as conexões do WhatsApp são desligadas. Os dados e o login do WhatsApp ficam guardados, e reativar a empresa religa as conexões.
- Ao atualizar uma instalação anterior, todos os dados existentes vão para a empresa 1 ("Cerqueira Labs", plano "Interno"), e o administrador mais antigo vira superadmin.
- Cada conexão tem um canal: `qrcode` (WhatsApp no celular) ou `cloudapi` (API oficial da Meta). Veja [API oficial do WhatsApp](#api-oficial-do-whatsapp).
- O plano define também se a empresa pode usar **campanhas** (**Campanhas liberadas**). Na atualização, só o plano 1 ("Interno") vem liberado.
- **Conexão guiada da API oficial liberada** (Coexy) e **Conexões guiadas por empresa** (0 = sem limite): cada conexão guiada tem custo mensal para a Cerqueira Labs. Veja [docs/coexy.md](docs/coexy.md).
- **Conexão por QR Code liberada** (ligada por padrão): desligada, o plano fica só com a API oficial da Meta. As empresas do plano não criam conexões por QR Code, as que existem são desligadas (o login fica guardado e volta se a opção for religada) e o aviso de termos do QR Code não aparece. Sem QR Code, o servidor não abre nenhum navegador, e uma VPS pequena dá conta.

## Arquitetura

| Parte | Tecnologia |
|---|---|
| Backend | Node.js 22, TypeScript, Express, Sequelize, Socket.IO |
| Banco | MariaDB 10.6 (ou MySQL 5.7+) |
| Fila | Redis 7 com BullMQ (webhooks e mensagens automáticas) |
| Mídias | Disco local ou bucket compatível com S3 (AWS S3, Cloudflare R2, MinIO) |
| WhatsApp | Camada de provedores trocável em `backend/src/providers/WhatsApp`: `wwebjs` (padrão) e `zapo` |
| Frontend | React 18, MUI 7 e Vite |

> **Importante:** a conexão por QR Code usa clientes não oficiais do WhatsApp. O número pode ser bloqueado pelo WhatsApp. Informe isso aos clientes. A estrutura de provedores já está preparada para receber a API oficial (WhatsApp Cloud API).

## Testar no seu computador

Com o Docker instalado, um comando sobe tudo para testes em `http://localhost:3000`, sem domínio e sem HTTPS:

```bash
git clone https://github.com/optical3r/whaticket.git
cd whaticket
./scripts/dev-local.sh                                           # Mac ou Linux
powershell -ExecutionPolicy Bypass -File scripts\dev-local.ps1   # Windows
```

Na primeira vez, o script:
- cria o `.env` com senhas aleatórias;
- monta os containers (de 10 a 20 minutos);
- cria o administrador;
- grava o login em `.credenciais-local.txt`, fora do git.

O Docker Desktop precisa estar aberto. Se a porta 3000 ou a 8080 já estiver em uso por outro programa, o script escolhe outra e mostra o endereço no final. Rodar de novo só atualiza e sobe os containers. Para parar: `docker compose down`. O recebimento de mensagens da API oficial (Meta ou Coexy) precisa de HTTPS público e não funciona assim.

## Subir com Docker (recomendado)

```bash
git clone https://github.com/optical3r/whaticket.git
cd whaticket
cp .env.example .env
```

Preencha o `.env`. Estes campos são obrigatórios e o sistema não sobe sem eles:

| Variável | Como gerar |
|---|---|
| `MYSQL_ROOT_PASSWORD` | uma senha forte |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` (diferente do anterior) |

Opcionais: `ADMIN_EMAIL` e `ADMIN_PASSWORD` (primeiro administrador) e `BRAND_NAME` (nome exibido na interface).

```bash
docker compose up -d --build

# Somente na primeira vez: cria o administrador e as configurações padrão
docker compose exec backend npx sequelize db:seed:all
```

Se `ADMIN_PASSWORD` estiver vazio, o seed gera uma senha aleatória e mostra no terminal **uma única vez**. Anote a senha e troque depois do primeiro login.

Depois, entre no sistema, abra **Conexões**, crie a primeira conexão e leia o QR Code com o celular.

### Fila de processamento (Redis)

O `docker compose` já sobe um Redis e configura `REDIS_URL`. Com ele, webhooks e mensagens automáticas (fora do horário e pesquisa de satisfação) vão para uma fila e são reenviados em caso de falha: até 5 tentativas para webhooks e 3 para mensagens, com espera crescente entre elas. Um reinício do backend não perde o que estava na fila.

Sem `REDIS_URL`, o envio acontece na hora, sem novas tentativas. Serve para desenvolvimento, mas não é indicado em produção.

O processamento roda no próprio backend, porque as sessões do WhatsApp ficam nele. `QUEUE_CONCURRENCY` (padrão 5) define quantos envios rodam ao mesmo tempo.

### Saúde do sistema

`GET /health` responde `{"status":"ok","database":"ok","queue":"ok"}`. Se o banco ou o Redis estiverem fora, responde com código 503 e indica qual parte falhou. Use essa rota no monitoramento.

### Mídias em S3 ou R2

Por padrão, as mídias ficam em `backend/public`. Para guardar em um bucket, preencha no `.env`:

| Variável | Exemplo |
|---|---|
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET` | `atendimento-midias` |
| `S3_REGION` | `auto` (R2) ou `us-east-1` |
| `S3_ENDPOINT` | `https://<conta>.r2.cloudflarestorage.com` (vazio para AWS) |
| `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` | chaves com leitura e escrita no bucket |
| `S3_FORCE_PATH_STYLE` | `true` para MinIO |

O bucket deve ser privado. As mídias continuam abrindo só por links assinados, e o backend busca o arquivo no bucket.

Para levar as mídias que já estão no disco para o bucket:

```bash
docker compose exec backend npm run storage:migrate
```

Os arquivos que ainda não estiverem no bucket continuam sendo lidos do disco, então a troca pode ser feita sem parar o sistema.

### HTTPS

Coloque os certificados em `ssl/certs`, uma pasta por serviço:

```
ssl/
├── certs/
│   ├── backend/   (fullchain.pem, privkey.pem)
│   └── frontend/  (fullchain.pem, privkey.pem)
└── www/
```

O nginx do frontend já responde ao desafio do certbot:

```bash
certbot certonly --cert-name backend  --webroot --webroot-path ./ssl/www/ -d api.seudominio.com
certbot certonly --cert-name frontend --webroot --webroot-path ./ssl/www/ -d app.seudominio.com
docker compose restart frontend
```

O backend (porta 8080) e o banco (porta 3306) só ficam acessíveis pelo próprio servidor. O acesso externo passa pelo nginx do frontend.

### Backup

`scripts/backup.sh` salva o banco, as sessões do WhatsApp (para não precisar ler o QR Code de novo) e as mídias em `backups/<data>`. Com `STORAGE_DRIVER=s3`, as mídias ficam de fora: use o versionamento ou a replicação do próprio bucket. Backups com mais de `BACKUP_RETENTION_DAYS` dias (padrão 14) são apagados.

```bash
./scripts/backup.sh

# Agendamento diário às 3h15 (crontab -e)
15 3 * * * cd /caminho/do/projeto && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Guarde uma cópia fora do servidor (por exemplo, em um bucket S3/R2).

## Webhooks

Cadastre em **Administração → Webhooks**. Cada envio é um `POST` com JSON:

```json
{ "event": "ticket.closed", "companyId": 1, "sentAt": "2026-10-19T17:28:49.000Z", "data": { "id": 1000, "status": "closed" } }
```

O cabeçalho `X-Webhook-Signature` traz `sha256=<HMAC do corpo com o segredo do webhook>`. Para validar em Node.js:

```js
const crypto = require("crypto");
const expected = "sha256=" + crypto.createHmac("sha256", SEGREDO).update(corpoBruto).digest("hex");
const valido = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers["x-webhook-signature"]));
```

Por segurança, URLs que apontam para a rede interna (localhost, 10.x, 192.168.x, 169.254.x etc.) são recusadas. Em desenvolvimento, `WEBHOOK_ALLOW_PRIVATE_URLS=true` libera esses endereços.

## Inteligência artificial

A IA usa a API do Claude, da Anthropic. Para ligar, crie uma chave em https://platform.claude.com e preencha no `.env`:

| Variável | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da Cerqueira Labs, usada pelos planos com chave da plataforma. |
| `DATA_ENCRYPTION_KEY` | Criptografa as chaves que os clientes cadastram e os tokens da API oficial (`openssl rand -hex 32`). Vazia = derivada do `JWT_SECRET`. Se mudar, chaves e tokens precisam ser cadastrados de novo. |
| `AI_MODEL` | Modelo usado (padrão `claude-opus-5-5`). |
| `AI_ASSISTANT_DELAY_MS` | Espera antes de o assistente responder, para juntar mensagens enviadas em sequência (padrão 8000). |

A IA só funciona quando estas condições valem:

1. **Plano**: o superadmin marca **Módulo de IA liberado** no plano, em **Plataforma → Planos**. Planos novos começam sem IA. Na atualização, só o plano 1 ("Interno") vem liberado.
2. **Chave**: no mesmo plano, o superadmin escolhe de quem é a chave da API:
   - **Da Cerqueira Labs**: usa `ANTHROPIC_API_KEY` da instalação. O consumo é custo da plataforma, controlado pelo limite de **solicitações de IA por mês** de cada empresa.
   - **Do cliente**: o administrador de cada empresa cadastra a própria chave da Anthropic em **Administração → Inteligência artificial**. O consumo é cobrado na conta do cliente e não há limite mensal. Sem chave cadastrada, a IA fica desligada na empresa.
3. **Empresa**: o administrador deixa ligada a opção **Usar IA nesta empresa** (ligada por padrão). Desligada, os botões de IA somem para todos da empresa e o assistente virtual para de responder.

A chave do cliente é verificada com a Anthropic antes de ser salva, fica criptografada no banco (AES-256-GCM) e nunca volta para o navegador: a tela mostra só os 4 últimos caracteres. Se a Anthropic recusar a chave depois (revogada ou sem crédito), a IA avisa o atendente e o assistente transfere a conversa para a equipe.

Na mesma tela, a empresa vê o consumo do mês feito com a chave que o plano usa: solicitações e tokens de entrada e saída, no total e por recurso. Para quem usa a própria chave, o valor exato fica no painel da Anthropic.

Para controlar o gasto da plataforma:

- Sugestões, resumos, revisões e respostas do assistente contam igualmente no limite mensal.
- Cada usuário pode fazer até 20 solicitações por minuto.
- Cada solicitação fica registrada na tabela `AiUsages`, com tokens de entrada e saída e de quem era a chave (`keySource`), para separar o custo da plataforma do custo de cada cliente.

**Para o atendente**: no campo de mensagem, o botão de IA sugere uma resposta, resume a conversa (o resumo pode ser salvo como nota) e reescreve o rascunho (corrigir, mais formal, mais cordial, mais curto). Nada é enviado ao cliente sem o atendente revisar.

**Assistente virtual**: o administrador ativa em **Administração → Inteligência artificial** e cadastra a base de conhecimento (horários, preços, políticas, perguntas frequentes). O assistente:

- responde só tickets aguardando, sem atendente, fora de grupos, e depois que o cliente escolheu a fila no menu;
- usa somente a base de conhecimento e as instruções da empresa, e não inventa preços nem políticas;
- transfere para a equipe quando não sabe a resposta, quando o cliente pede uma pessoa, em reclamações e cancelamentos, se a IA falhar ou depois do limite de respostas por conversa. A transferência envia a mensagem configurada, deixa uma nota no ticket com o motivo e, fora do horário da fila, também a mensagem de fora do horário;
- para quando alguém aceita o ticket ou responde ao cliente pelo celular, e volta a valer quando o ticket é encerrado e reaberto.

Quando o modelo recusa um pedido por política de uso, a API tenta de novo em um modelo alternativo recomendado pela Anthropic (`fallbacks: "default"`).

## Aplicativo no celular e no computador (PWA)

O sistema pode ser instalado como aplicativo: no Chrome ou Edge, pelo ícone de instalar na barra de endereço; no iPhone, em **Compartilhar → Adicionar à Tela de Início**. O nome do aplicativo vem de `BRAND_NAME`.

- Sem internet, abre uma tela avisando que está sem conexão, em vez de uma página de erro.
- Com a permissão do navegador, avisa nova mensagem e conexão caída mesmo com a aba em segundo plano. Tocar no aviso abre o ticket.
- A instalação exige HTTPS (ou `localhost`).

## Kanban

Em **Kanban**, os tickets aguardando e abertos aparecem em colunas. Supervisores e administradores criam, renomeiam, colorem e reordenam as etapas (por exemplo: Novo, Proposta enviada, Aguardando pagamento). A primeira coluna, **Sem etapa**, recebe os tickets que ainda não foram classificados.

- Arrastar um cartão muda a etapa do ticket para todos, em tempo real.
- Cada pessoa vê os mesmos tickets que vê na lista: o atendente vê os seus e os aguardando das suas filas; supervisor e administrador veem todos.
- A etapa é só uma classificação: não muda o status, a fila nem o responsável.

## Campanhas

Em **Administração → Campanhas** (administrador e supervisor, quando o plano libera), a empresa envia uma mensagem para os contatos de uma ou mais etiquetas.

- Público: até 5.000 contatos por campanha. Grupos e contatos que pediram para sair ficam de fora.
- A mensagem aceita `{{name}}` e `{{firstName}}`.
- Entre um envio e outro há uma espera aleatória (padrão de 20 a 60 segundos; mínimo de 5 no QR Code e de 1 na API oficial) e os envios só acontecem na janela de horário escolhida, no fuso da empresa.
- A campanha pode ser agendada, pausada, retomada e cancelada. Se o servidor reiniciar, ela continua de onde parou.
- O relatório mostra, contato a contato, quem recebeu, quem ficou de fora (por exemplo, por ter pedido para sair) e as falhas com o motivo.
- Se o contato responder SAIR, PARAR, STOP, DESCADASTRAR ou CANCELAR em até 30 dias depois de receber uma campanha, ele recebe uma confirmação e sai de todas as campanhas da empresa.
- As mensagens enviadas ficam no histórico do contato, em um ticket encerrado, sem ocupar a fila. Se o cliente responder, o atendimento segue o caminho normal.

**Pela API oficial**: ao escolher uma conexão da API oficial, a campanha envia um modelo (template) aprovado pela Meta em vez de texto livre. A tela lista os modelos aprovados da conta, pede um valor para cada variável (`{{1}}`, `{{2}}`...) e mostra a prévia. Os valores aceitam `{{name}}` e `{{firstName}}`, preenchidos com o nome de cada contato (sem nome, vai "cliente"). A linha "responda SAIR" não pode ser acrescentada a um modelo: escreva a instrução no próprio modelo. A Meta cobra cada conversa iniciada, na conta do cliente.

> **Risco**: envio em massa por QR Code pode levar ao bloqueio do número pelo WhatsApp. Use só com contatos que pediram para receber, mantenha os intervalos e evite listas compradas. Pela API oficial, a Meta também pode limitar ou bloquear números com muitas denúncias.

## API oficial do WhatsApp

Além do QR Code, uma conexão pode usar a API oficial da Meta (WhatsApp Cloud API), de dois jeitos:

- **Conexão guiada (Coexy)**: a empresa abre um link e autoriza a conexão com o Facebook. Não precisa criar app na Meta, e o número pode continuar no app WhatsApp Business do celular. É um módulo do plano, porque o Coexy cobra da Cerqueira Labs por conexão. Veja [docs/coexy.md](docs/coexy.md).
- **App próprio na Meta**: a empresa cria o app no developers.facebook.com e informa os dados na conexão. O passo a passo está em [docs/whatsapp-cloud-api.md](docs/whatsapp-cloud-api.md).

Resumo da conexão guiada:

1. O superadmin cadastra a chave do Coexy e cria o recebimento em **Plataforma → API oficial (Coexy)**, e libera o módulo no plano, com o limite de conexões por empresa.
2. A empresa escolhe **API oficial com conexão guiada** em **Conexões → Adicionar WhatsApp**, clica em **Conectar número** e abre o link.
3. Em até um minuto a conexão aparece como conectada. Se a Meta tirar o acesso, a conexão mostra **Reconectar**, com o mesmo link.

Resumo do app próprio:

1. Em **Conexões → Adicionar WhatsApp**, escolha **API oficial da Meta** e informe o ID do número de telefone, o ID da conta do WhatsApp Business, o token de acesso e a chave secreta do app. O sistema confere os dados com a Meta antes de salvar.
2. Abra a conexão de novo para copiar a **URL de callback** e o **token de verificação**, e cadastre os dois no app da Meta, assinando o campo `messages`.
3. O token e a chave secreta ficam criptografados no banco (com `DATA_ENCRYPTION_KEY`) e nunca voltam para o navegador.

Como funciona:

- Cada mensagem recebida tem a assinatura `X-Hub-Signature-256` conferida com a chave secreta do app. Sem assinatura válida, o evento é descartado.
- **Janela de 24 horas**: a Meta só permite texto livre até 24 horas depois da última mensagem do cliente. Fora dela, o ticket mostra um aviso e o botão **Enviar template**, que lista os templates aprovados da conta.
- Texto, imagem, áudio, vídeo e documento chegam e saem normalmente; figurinhas e localização chegam. As confirmações de entregue e lido também.
- A Meta cobra por conversa, direto na conta do cliente na Meta.
- `WHATSAPP_CLOUD_API_URL` troca o endereço da Graph API (padrão `https://graph.facebook.com/v21.0`), útil para testes.
- Na conexão guiada, as mensagens passam pelo Coexy com o token do canal, e os eventos de todas as conexões chegam em `/webhooks/coexy`, assinados com `X-Coexy-Signature`.

## Fluxos de atendimento

Em **Administração → Fluxos**, o administrador monta a conversa automática que acontece antes da equipe, e em **Conexões** escolhe o fluxo de cada conexão.

O editor tem dois modos, com o mesmo resultado:

- **Quadro**: cada etapa é um cartão. Arraste para organizar, puxe uma ligação do ponto à direita de uma etapa (ou de cada opção de um menu) até a etapa seguinte, e selecione uma ligação ou etapa e aperte Delete para removê-la. Clicar numa etapa abre os campos dela no painel ao lado; **Organizar** arruma as etapas em colunas a partir da inicial. A posição de cada etapa é salva com o fluxo.
- **Lista**: as mesmas etapas, uma embaixo da outra, com a próxima etapa escolhida em listas. Funciona só com o teclado.

Cada etapa é de um tipo:

| Etapa | O que faz |
|---|---|
| Mensagem | Envia um texto e segue para a próxima etapa. |
| Menu de opções | Envia opções numeradas. O cliente responde com o número ou com o texto da opção. |
| Pergunta | Faz uma pergunta e guarda a resposta em um campo do contato (por exemplo, "Pedido"). |
| Enviar para fila | Coloca o ticket na fila escolhida, com mensagem opcional. O fluxo termina. |
| Encerrar atendimento | Encerra o ticket, com mensagem opcional. O fluxo termina. |

- O fluxo roda em tickets novos, aguardando e sem atendente. Enquanto ele roda, o menu de filas, o assistente virtual e a mensagem de fora do horário ficam de fora.
- Depois de 3 respostas inválidas em um menu, ou quando uma etapa não tem próxima, o fluxo termina e o ticket fica aguardando a equipe. Se alguém aceitar o ticket no meio, o fluxo para.
- O fluxo roda de novo só quando o ticket é encerrado e o cliente volta a escrever.
- O editor confere cada etapa antes de salvar e recusa mensagens que apontam umas para as outras sem esperar resposta. O **Simulador**, ao lado, mostra a conversa como o cliente verá, sem enviar nada.
- Os textos aceitam `{{name}}` e `{{firstName}}`.

## Transcrição de áudio

A IA do Claude não recebe áudio, então os áudios dos clientes são transcritos pela OpenAI (modelo `gpt-transcribe`). O custo é da Cerqueira Labs.

1. **Chave**: o superadmin cadastra a chave da API da OpenAI em **Plataforma → Transcrição de áudio**. Ela é conferida com a OpenAI antes de ser salva, fica criptografada no banco (com `DATA_ENCRYPTION_KEY`) e nunca volta para o navegador. Sem chave na tela, vale `OPENAI_API_KEY` do `.env`.
2. **Plano**: em **Plataforma → Planos**, marque **Transcrição de áudio liberada** e defina os **minutos por mês** de cada empresa (0 = sem limite). Na atualização, só o plano 1 ("Interno") vem liberado.

Como funciona:

- Todo áudio que um cliente envia (QR Code ou API oficial) é transcrito em segundo plano. Na conversa, aparece "Transcrevendo o áudio…" e depois o texto embaixo do player.
- Áudios dos atendentes não são transcritos.
- O resumo, a sugestão de resposta e o assistente virtual leem a transcrição como fala do cliente. O assistente espera a transcrição terminar antes de responder.
- Quando a empresa chega ao limite de minutos do mês, os áudios param de ser transcritos até o mês seguinte.
- A tela de transcrição mostra, por empresa, quantos áudios e minutos foram transcritos no mês. Cada uso também fica na tabela `TranscriptionUsages`.
- `TRANSCRIPTION_MODEL` e `TRANSCRIPTION_LANGUAGE` (padrão `pt`) trocam o modelo e o idioma.

## Segurança

- Segredos JWT fracos, conhecidos ou com menos de 32 caracteres impedem o backend de iniciar.
- Não há cadastro público. Empresas são criadas pelo superadmin e usuários pelo administrador de cada empresa.
- Todo acesso é filtrado pela empresa do usuário logado, inclusive os eventos em tempo real e o token da API.
- Conexões, filas e exclusão de tickets e contatos só podem ser alterados por administradores, e o backend faz essa checagem.
- As mídias só abrem por links assinados que expiram. O arquivo não fica público.
- O login e o cadastro têm limite de tentativas (20 a cada 15 minutos por IP).
- Cabeçalhos de segurança HTTP são aplicados com `helmet`.
- As mensagens do cliente vão para a IA marcadas como conteúdo da conversa, e o assistente é instruído a não seguir ordens vindas delas. Ele só escreve texto para o cliente e não executa nenhuma ação no sistema.

## Desenvolvimento local

Requisitos: Node.js 22 e MariaDB 10.6. O Redis é opcional no desenvolvimento.

```bash
# Backend
cd backend
cp .env.example .env    # preencha banco e segredos JWT
npm install
npm run build
npx sequelize db:migrate
npx sequelize db:seed:all
npm run dev

# Frontend (outro terminal)
cd frontend
cp .env.example .env    # VITE_BACKEND_URL aponta para o backend
npm install
npm run dev
```

### Testes

Os testes do backend usam um banco separado definido em `backend/.env.test`:

```bash
DB_HOST=127.0.0.1
DB_DIALECT=mysql
DB_NAME=whaticket_test
DB_USER=root
DB_PASS=sua-senha
```

```bash
cd backend && npm test
```

Os testes de IA usam um servidor local que imita a API da Anthropic, sem chave nem custo. Os testes da fila com Redis só rodam quando `REDIS_TEST_URL` está definido (por exemplo, `redis://127.0.0.1:6379/15`). Os testes de armazenamento usam um S3 local simulado e não precisam de conta.

O CI (`.github/workflows/ci.yaml`) roda o build e os testes do backend e o build do frontend em todo pull request.

## Créditos e licença

Projeto derivado do [Whaticket Open Source](https://github.com/canove/whaticket), distribuído sob a licença MIT. O aviso de copyright original está em [LICENSE](LICENSE).
