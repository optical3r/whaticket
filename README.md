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
- **Dashboard**: volume de tickets do dia.
- **API**: envio de mensagens por `POST /api/messages/send`, autenticado pelo token da empresa (em **Configurações**).
- **Idiomas**: português (Brasil), o padrão, e inglês. A troca fica no ícone de idioma da barra superior e da tela de login.
- **Temas**: claro (padrão) e escuro, seguindo o design system Cerqueira Labs.

O roteiro de evolução (API oficial do WhatsApp e campanhas) está no plano de implementação aprovado.

## Empresas, planos e superadmin

- O administrador criado pelo seed é o **superadmin**. Ele vê o menu **Plataforma**, com as telas **Empresas** e **Planos**.
- Não existe cadastro público: cada empresa é criada pelo superadmin, junto com o seu primeiro administrador.
- Ao suspender uma empresa, os usuários dela perdem o acesso e as conexões do WhatsApp são desligadas. Os dados e o login do WhatsApp ficam guardados, e reativar a empresa religa as conexões.
- Ao atualizar uma instalação anterior, todos os dados existentes vão para a empresa 1 ("Cerqueira Labs", plano "Interno"), e o administrador mais antigo vira superadmin.
- Cada conexão tem um canal (`qrcode` hoje). A estrutura para a API oficial está descrita em [docs/whatsapp-cloud-api.md](docs/whatsapp-cloud-api.md).

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
| `ANTHROPIC_API_KEY` | Chave da API. Vazia = IA desligada. |
| `AI_MODEL` | Modelo usado (padrão `claude-opus-5-5`). |
| `AI_ASSISTANT_DELAY_MS` | Espera antes de o assistente responder, para juntar mensagens enviadas em sequência (padrão 8000). |

A IA só funciona quando as três condições valem:

1. **Instalação**: `ANTHROPIC_API_KEY` preenchida.
2. **Plano**: o superadmin marca **Módulo de IA liberado** no plano, em **Plataforma → Planos**. Planos novos começam sem IA. Na atualização, só o plano 1 ("Interno") vem liberado.
3. **Empresa**: o administrador deixa ligada a opção **Usar IA nesta empresa**, em **Administração → Inteligência artificial** (ligada por padrão). Desligada, os botões de IA somem para todos da empresa e o assistente virtual para de responder.

Os custos ficam na conta da chave configurada, que pertence à instalação e não a cada cliente. Para controlar o gasto:

- Cada plano define as **solicitações de IA por mês** de cada empresa. Sugestões, resumos, revisões e respostas do assistente contam igualmente.
- Cada usuário pode fazer até 20 solicitações por minuto.
- Cada solicitação fica registrada na tabela `AiUsages`, com tokens de entrada e saída, para conferir o custo por empresa.

**Para o atendente**: no campo de mensagem, o botão de IA sugere uma resposta, resume a conversa (o resumo pode ser salvo como nota) e reescreve o rascunho (corrigir, mais formal, mais cordial, mais curto). Nada é enviado ao cliente sem o atendente revisar.

**Assistente virtual**: o administrador ativa em **Administração → Inteligência artificial** e cadastra a base de conhecimento (horários, preços, políticas, perguntas frequentes). O assistente:

- responde só tickets aguardando, sem atendente, fora de grupos, e depois que o cliente escolheu a fila no menu;
- usa somente a base de conhecimento e as instruções da empresa, e não inventa preços nem políticas;
- transfere para a equipe quando não sabe a resposta, quando o cliente pede uma pessoa, em reclamações e cancelamentos, se a IA falhar ou depois do limite de respostas por conversa. A transferência envia a mensagem configurada, deixa uma nota no ticket com o motivo e, fora do horário da fila, também a mensagem de fora do horário;
- para quando alguém aceita o ticket ou responde ao cliente pelo celular, e volta a valer quando o ticket é encerrado e reaberto.

Quando o modelo recusa um pedido por política de uso, a API tenta de novo em um modelo alternativo recomendado pela Anthropic (`fallbacks: "default"`).

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
