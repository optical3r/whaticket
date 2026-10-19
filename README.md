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
- **Usuários**: perfis de administrador e atendente.
- **Dashboard**: volume de tickets do dia.
- **API**: envio de mensagens por `POST /api/messages/send`, autenticado por token.
- **Idiomas**: português (Brasil), o padrão, e inglês. A troca fica no ícone de idioma da barra superior e da tela de login.
- **Temas**: claro (padrão) e escuro, seguindo o design system Cerqueira Labs.

O roteiro de evolução (multiempresa, API oficial do WhatsApp, IA, relatórios e campanhas) está no plano de implementação aprovado.

## Arquitetura

| Parte | Tecnologia |
|---|---|
| Backend | Node.js 22, TypeScript, Express, Sequelize, Socket.IO |
| Banco | MariaDB 10.6 (ou MySQL 5.7+) |
| WhatsApp | Camada de provedores trocável em `backend/src/providers/WhatsApp`: `wwebjs` (padrão) e `zapo` |
| Frontend | React, Material UI e Vite |

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

`scripts/backup.sh` salva o banco, as sessões do WhatsApp (para não precisar ler o QR Code de novo) e as mídias em `backups/<data>`. Backups com mais de `BACKUP_RETENTION_DAYS` dias (padrão 14) são apagados.

```bash
./scripts/backup.sh

# Agendamento diário às 3h15 (crontab -e)
15 3 * * * cd /caminho/do/projeto && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Guarde uma cópia fora do servidor (por exemplo, em um bucket S3/R2).

## Segurança

- Segredos JWT fracos, conhecidos ou com menos de 32 caracteres impedem o backend de iniciar.
- O cadastro público de usuários vem **desativado**. Novos usuários são criados por um administrador.
- Conexões, filas e exclusão de tickets e contatos só podem ser alterados por administradores, e o backend faz essa checagem.
- As mídias só abrem por links assinados que expiram. O arquivo não fica público.
- O login e o cadastro têm limite de tentativas (20 a cada 15 minutos por IP).
- Cabeçalhos de segurança HTTP são aplicados com `helmet`.

## Desenvolvimento local

Requisitos: Node.js 22 e MariaDB 10.6.

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

O CI (`.github/workflows/ci.yaml`) roda o build e os testes do backend e o build do frontend em todo pull request.

## Créditos e licença

Projeto derivado do [Whaticket Open Source](https://github.com/canove/whaticket), distribuído sob a licença MIT. O aviso de copyright original está em [LICENSE](LICENSE).
