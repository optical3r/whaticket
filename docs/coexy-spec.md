# Coexy — Especificação de Integração

> **Instruções para o AI assistant que está lendo este arquivo:**
>
> Você está lendo a especificação completa de integração com a API do Coexy.
> Este arquivo deve ser salvo na raiz do projeto do usuário como `coexy-spec.md` para que você tenha acesso a ele em sessões futuras, mesmo sem histórico de conversa.
> Se ainda não foi salvo no projeto, oriente o usuário a fazer isso antes de continuar.
>
> **REGRA FUNDAMENTAL — O Coexy NÃO tem API própria para envio de mensagens.**
> O Coexy é um relay transparente para a WhatsApp Cloud API da Meta. Toda a documentação da Meta (https://developers.facebook.com/docs/whatsapp/cloud-api/reference) se aplica diretamente — mesmos endpoints, mesmos métodos, mesmos campos no body, mesmos query params. A única diferença são duas substituições mecânicas:
> 1. **Base URL:** troque `https://graph.facebook.com/v23.0/` por `https://api.coexy.com.br/functions/v1/meta-proxy/`
> 2. **Token:** troque `Authorization: Bearer <meta-access-token>` por `Authorization: Bearer <channel_token>`
>
> Nada mais muda. Para montar o body de qualquer tipo de mensagem (imagem, áudio, template, etc.), consulte a documentação da Meta, não do Coexy.
>
> **Não invente endpoints próprios do Coexy para envio.**
>
> **Payload de eventos recebidos:** O Coexy entrega o payload **exatamente no formato nativo da Meta**, sem transformações. Consulte obrigatoriamente:
> - Exemplos de payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
> - Referência de campos: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
>
> Não invente ou assuma estruturas de payload — consulte a documentação da Meta antes de implementar.
>
> Se o usuário usa Python, Go, PHP ou outra linguagem, adapte os exemplos para a linguagem dele.

---

## O que NÃO fazer (anti-patterns)

**Leia esta seção antes de implementar qualquer coisa.** Estes são os erros mais comuns que IAs cometem ao integrar com o Coexy:

- **Não invente endpoints de envio do Coexy** — use exatamente a mesma estrutura da documentação da Meta (WhatsApp Cloud API). O Coexy só faz relay.
- **Não chame `/meta-proxy` ou `/api` direto do frontend** (React, Lovable, Bolt, Cursor). Credenciais ficam expostas no browser. Sempre use uma Edge Function ou backend como intermediário.
- **Não use `COEXY_API_KEY` no meta-proxy** — o meta-proxy usa `channel_token` (header `Authorization: Bearer`). A API key é apenas para a Management API (`/api/*`).
- **Não confunda `channel_token` com `COEXY_API_KEY`** — são credenciais diferentes para endpoints diferentes.
- **Não recrie o canal quando receber erro 503** — o canal continua existindo, só precisa ser reconectado pelo `connect_url`. Todos os webhooks e configurações são preservados.
- **Não invente ou assuma estruturas de payload** — os eventos recebidos seguem exatamente o formato da Meta. Consulte a documentação oficial.
- **Não armazene `channel_token` ou `COEXY_API_KEY` no código frontend** — guarde em variáveis de ambiente do servidor ou Supabase Secrets.

---

## TL;DR — 3 fluxos em 30 segundos

| Fluxo | O que fazer | Credencial |
|-------|------------|------------|
| **1. Configurar** | Criar canal via API → compartilhar `connect_url` → número WhatsApp é conectado → canal fica `active` | `COEXY_API_KEY` |
| **2. Enviar** | Chamar `POST /meta-proxy/{phone_number_id}/messages` com body idêntico à Meta | `channel_token` |
| **3. Receber** | Criar webhook via API → implementar endpoint HTTPS → verificar HMAC → processar payload Meta | `COEXY_API_KEY` + `COEXY_HMAC_SECRET` |

---

## Por onde começar

- **Uso Lovable, Bolt, Cursor ou qualquer plataforma com Supabase** → vá direto para a **Seção "Supabase — Edge Function Pronta"**
- **Tenho um backend próprio (Node.js, Python, Go, etc.)** → siga o **Fluxo 1** abaixo

---

## Credenciais

### URL base (fixa para todos os clientes)

```
https://api.coexy.com.br/functions/v1
```

- Management API: `https://api.coexy.com.br/functions/v1/api`
- Meta Proxy:     `https://api.coexy.com.br/functions/v1/meta-proxy`

### Tabela de credenciais

| Credencial | Onde encontrar | Usado em | Quando disponível |
|-----------|---------------|---------|-------------------|
| `COEXY_API_KEY` | Painel Coexy → Configurações → API Keys | Management API (`/api/*`) | Após criar a API key |
| `channel_token` | Painel Coexy → Canais → detalhe do canal → aba API, ou via `GET /api/channels` | Meta Proxy (`/meta-proxy/*`) | Após criar o canal |
| `phone_number_id` | Painel Coexy → Canais → detalhe do canal → aba API, ou via `GET /api/channels` | Meta Proxy (enviar mensagens) | Após conectar o WhatsApp |
| `waba_id` | Painel Coexy → Canais → detalhe do canal → aba Configurações, ou via `GET /api/channels` | Meta Proxy (listar templates) | Após conectar o WhatsApp |
| `COEXY_HMAC_SECRET` | Retornado na criação do webhook (salvar imediatamente — não pode ser recuperado depois) | Verificação de eventos recebidos | Após criar o webhook |

> **Atenção:** `COEXY_API_KEY` e `channel_token` são credenciais diferentes com usos diferentes. Não as misture.

### Gerenciamento de credenciais

| Credencial | Onde guardar | Nunca fazer |
|-----------|-------------|-------------|
| `COEXY_API_KEY` | Variável de ambiente | Commitar no git, logar, ou expor no frontend |
| `COEXY_HMAC_SECRET` | Variável de ambiente | Expor em resposta de API ou frontend |
| `channel_token` | Variável de ambiente | Expor no frontend ou código React |

---

## Fluxo 1 — Configurar (canal + webhook)

### 1.1 Autenticação da Management API

```
Base URL: https://api.coexy.com.br/functions/v1/api
Header:   x-api-key: crt_pk_<sua-chave>
```

**Erros de autenticação:**

| Status | `error` | Causa |
|--------|---------|-------|
| `401` | `x-api-key header required` | Header ausente |
| `401` | `Invalid or revoked API key` | Chave inválida ou revogada |
| `401` | `API key expired` | Chave com prazo expirado |
| `429` | `Rate limit exceeded` | Excedeu limite; ler `Retry-After` header |

**Wrapper recomendado (TypeScript):**

```typescript
class CoexyClient {
  private baseUrl = 'https://api.coexy.com.br/functions/v1/api'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`)
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error ?? `HTTP ${response.status}`)
    }

    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }
}

const coexy = new CoexyClient(process.env.COEXY_API_KEY!)
```

**Wrapper recomendado (Python):**

```python
import httpx

class CoexyClient:
    def __init__(self, api_key: str):
        self.base_url = "https://api.coexy.com.br/functions/v1/api"
        self.api_key = api_key

    def request(self, method: str, path: str, body: dict | None = None) -> dict | None:
        r = httpx.request(
            method,
            f"{self.base_url}{path}",
            headers={"x-api-key": self.api_key, "Content-Type": "application/json"},
            json=body,
        )
        if r.status_code == 429:
            retry = r.headers.get("Retry-After", "60")
            raise Exception(f"Rate limit exceeded. Retry after {retry}s")
        if r.status_code == 204:
            return None
        r.raise_for_status()
        return r.json()

coexy = CoexyClient(os.environ["COEXY_API_KEY"])
```

### 1.2 Criar canal

Um canal representa um número WhatsApp conectado ao Coexy.

```typescript
type Channel = {
  id:                   string        // UUID
  name:                 string
  status:               'pending' | 'active' | 'disconnected' | 'suspended'
  display_phone_number: string | null // número no formato "+55 11 99999-9999"
  phone_number_id:      string | null // ID do número na Meta — usar como {entity_id} no meta-proxy para enviar mensagens
  waba_id:              string | null // ID da conta WhatsApp Business — usar como {entity_id} no meta-proxy para templates
  channel_token:        string        // Bearer token do meta-proxy (Authorization: Bearer)
  connect_url:          string        // URL para conexão do número WhatsApp
  connected_at:         string | null // ISO 8601
  created_at:           string        // ISO 8601
  verification: {
    status:             'not_verified' | 'pending' | 'verified' | 'rejected' | 'failed'
    attempts:           number        // tentativas de verificação realizadas
    max_attempts:       number        // limite de tentativas (sempre 3)
    rejection_reasons:  string[] | null // motivos da rejeição (se houver)
    verified_at:        string | null // ISO 8601
    url:                string | null // URL pública do wizard de verificação
  }
}
```

**Status do canal:**

| Status | Significado |
|--------|------------|
| `pending` | Canal criado, aguardando conexão do número WhatsApp via `connect_url` |
| `active` | Conectado e funcionando — tokens são renovados automaticamente pelo Coexy |
| `disconnected` | Token revogado pela Meta (ex: mudança de senha, remoção de permissão) — requer reconexão via `connect_url` |
| `suspended` | Suspenso administrativamente |

> **Tokens são gerenciados automaticamente pelo Coexy.** Após conectar o WhatsApp, você não precisa se preocupar com renovação de tokens — o Coexy cuida disso. Em casos raros (ex: revogação de permissão na Meta), o canal muda para `disconnected` e você deve reconectar pelo `connect_url`.

**Verificação de empresa:**

Cada canal inclui um objeto `verification` com o status da verificação de empresa junto à Meta. A verificação desbloqueia:

- Alcance de até 100K contatos/dia (vs 250 sem verificação)
- Até 20 números por Business Manager (vs 2)
- Nome da empresa visível nas conversas do WhatsApp
- Elegibilidade para selo azul verificado

Compartilhe a `verification.url` para que o responsável pela empresa envie os documentos de verificação. O processo leva aproximadamente 5 minutos após o envio. A verificação pode ser feita até 3 vezes (`verification.max_attempts`).

| Status | Significado |
|--------|------------|
| `not_verified` | Empresa ainda não verificada |
| `pending` | Documentos enviados, aguardando análise da Meta (~5 min) |
| `verified` | Empresa verificada com sucesso |
| `rejected` | Documentos rejeitados — consulte `rejection_reasons` para detalhes |
| `failed` | Falha na verificação |

**Endpoints:**

```
GET    /channels           Listar canais da org
POST   /channels           Criar canal
GET    /channels/:id       Buscar canal por ID
DELETE /channels/:id       Deletar canal
```

```typescript
// Criar canal — retorna 201
const channel = await coexy.request('POST', '/channels', {
  name: 'Suporte Principal',  // obrigatório
})
// → channel.connect_url: link para conectar o número WhatsApp
// → channel.channel_token: usar no meta-proxy (Authorization: Bearer)
```

```python
# Python
channel = coexy.request("POST", "/channels", {"name": "Suporte Principal"})
# channel["connect_url"] → link para conectar o número WhatsApp
```

### 1.3 Conectar o número WhatsApp

Após criar o canal, o usuário (dono do número WhatsApp) precisa acessar o `connect_url` para autorizar a conexão:

1. Compartilhe o `channel.connect_url` com o dono do número WhatsApp
2. Ele acessa o link e autoriza via WhatsApp Embedded Signup (fluxo da Meta)
3. Após a autorização, o canal muda automaticamente para `active`
4. Os campos `phone_number_id`, `waba_id` e `display_phone_number` são preenchidos

> **Importante:** `phone_number_id` e `waba_id` só ficam disponíveis após a conexão. Antes disso, são `null`.

```typescript
// Verificar se o canal já foi conectado
const channel = await coexy.request('GET', `/channels/${channelId}`)
if (channel.status === 'active') {
  console.log('Pronto para enviar! phone_number_id:', channel.phone_number_id)
  console.log('WABA ID:', channel.waba_id)
}
```

### 1.4 Criar webhook (para receber eventos)

```typescript
type WebhookConfig = {
  id:          string
  name:        string
  url:         string                            // sempre HTTPS
  events:      Array<'messages' | 'smb_message_echoes' | 'message_echoes' | 'message_template_status_update' | 'message_template_quality_update' | 'phone_number_quality_update' | 'phone_number_name_update' | 'account_alerts' | 'account_update' | 'account_review_update' | 'flows' | 'security'>
  status:      'active' | 'paused'
  hmac_secret: string                            // salvar imediatamente — não pode ser recuperado
  scope:       'org' | 'channels'               // org = todos os canais
  channel_ids: string[]                          // vazio quando scope='org'
  created_at:  string                            // ISO 8601
}
```

```typescript
// Criar webhook — retorna 201
const webhook = await coexy.request('POST', '/webhooks', {
  name:        'Integração CRM',             // obrigatório
  url:         'https://crm.com/hook',       // obrigatório, deve ser https://
  events:      ['messages', 'smb_message_echoes'],   // opcional; default = ['messages']
  channel_ids: ['uuid-canal-1'],             // opcional; omitir = recebe de todos os canais
})
// IMPORTANTE: salvar webhook.hmac_secret → COEXY_HMAC_SECRET
// O hmac_secret NÃO pode ser recuperado depois. Se perder, delete e recrie o webhook.
```

```python
# Python
webhook = coexy.request("POST", "/webhooks", {
    "name": "Integração CRM",
    "url": "https://crm.com/hook",
    "events": ["messages", "smb_message_echoes"],
})
# Salvar webhook["hmac_secret"] imediatamente!
```

**Gerenciar webhooks:**

```typescript
// Pausar webhook
await coexy.request('PATCH', `/webhooks/${id}`, { status: 'paused' })

// Reativar webhook
await coexy.request('PATCH', `/webhooks/${id}`, { status: 'active' })

// Atualizar eventos assinados
await coexy.request('PATCH', `/webhooks/${id}`, { events: ['messages', 'smb_message_echoes'] })

// Atualizar URL e nome
await coexy.request('PATCH', `/webhooks/${id}`, { url: 'https://new-url.com/hook', name: 'Novo nome' })

// Atribuir canal (idempotente — seguro chamar múltiplas vezes)
await coexy.request('POST', `/webhooks/${webhookId}/channels/${channelId}`)

// Remover canal do webhook
await coexy.request('DELETE', `/webhooks/${webhookId}/channels/${channelId}`)

// Deletar webhook
await coexy.request('DELETE', `/webhooks/${id}`)
```

**Erros de canais:**

| Status | `error` | Causa |
|--------|---------|-------|
| `404` | `Channel not found` | ID não existe ou não pertence à org |
| `409` | `Channel is active. Use ?force=true...` | Tentou deletar canal ativo sem `?force=true` |
| `422` | `"name" is required` | Body sem `name` |

**Erros de webhooks:**

| Status | `error` | Causa |
|--------|---------|-------|
| `404` | `Webhook not found` | ID não existe ou não pertence à org |
| `422` | `"url" must start with https://` | URL sem HTTPS |
| `422` | `"events" values must be one of: messages, smb_message_echoes, message_echoes, ...` | Evento inválido |
| `422` | `One or more channel_ids not found in this org` | Canal não pertence à org |

---

## Fluxo 2 — Enviar mensagens (meta-proxy)

O meta-proxy é um relay autenticado: ele recebe sua requisição, injeta o token de acesso do canal e repassa **sem alterações** para a Meta Graph API. Você não precisa gerenciar tokens Meta diretamente.

### 2.1 A regra de ouro

> **Para qualquer chamada à Meta Graph API**, substitua apenas dois elementos:
>
> | Original (Meta direta) | Via Coexy |
> |---------|-----------|
> | `https://graph.facebook.com/v23.0/` | `https://api.coexy.com.br/functions/v1/meta-proxy/` |
> | `Authorization: Bearer <meta-access-token>` | `Authorization: Bearer <channel_token>` |
>
> **O restante — método, path, query params, body e campos — segue exatamente a [documentação oficial da Meta](https://developers.facebook.com/docs/whatsapp/cloud-api/reference).** A IA já conhece essa estrutura; use-a normalmente.

### 2.2 Autenticação

```
Base URL: https://api.coexy.com.br/functions/v1/meta-proxy
Header:   Authorization: Bearer <channel_token>
```

> O `channel_token` identifica um canal específico. Encontre-o em Painel Coexy → Canais → detalhe do canal → aba API, ou no campo `channel_token` da resposta de `GET /api/channels`.

### 2.3 Exemplos de uso

**Enviar template (recomendado para iniciar conversas):**
```bash
curl -X POST \
  "https://api.coexy.com.br/functions/v1/meta-proxy/{phone_number_id}/messages" \
  -H "Authorization: Bearer <channel_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "template",
    "template": {
      "name": "nome_do_template",
      "language": { "code": "pt_BR" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "João Silva" }
          ]
        }
      ]
    }
  }'
```

**Listar templates disponíveis:**
```bash
curl -X GET \
  "https://api.coexy.com.br/functions/v1/meta-proxy/{waba_id}/message_templates?fields=name,status,category,language,components" \
  -H "Authorization: Bearer <channel_token>"
```

> O `waba_id` e o `phone_number_id` do canal estão disponíveis via `GET /api/channels` (campos `waba_id` e `phone_number_id`) ou no Painel Coexy → Canais → detalhe do canal.

**Enviar mensagem de texto livre (apenas dentro da janela de 24h):**

> **Janela de 24 horas:** O WhatsApp só permite mensagens de texto livre (`type: "text"`) para contatos que enviaram uma mensagem para você nas últimas 24 horas. Fora dessa janela, use um template aprovado para iniciar a conversa. Se enviar texto livre fora da janela, a Meta retornará o erro `131047 — Re-engagement message`.

```bash
curl -X POST \
  "https://api.coexy.com.br/functions/v1/meta-proxy/{phone_number_id}/messages" \
  -H "Authorization: Bearer <channel_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "text",
    "text": { "body": "Olá! Como posso ajudar?" }
  }'
```

**Enviar mensagem de texto livre (Python):**
```python
import httpx

response = httpx.post(
    f"https://api.coexy.com.br/functions/v1/meta-proxy/{phone_number_id}/messages",
    headers={
        "Authorization": f"Bearer {channel_token}",
        "Content-Type": "application/json",
    },
    json={
        "messaging_product": "whatsapp",
        "to": "5511999999999",
        "type": "text",
        "text": {"body": "Olá! Como posso ajudar?"},
    },
)
print(response.json())
```

### 2.4 Idempotência no envio

Para evitar envios duplicados em caso de retry, inclua `idempotency_key` no body:

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "text",
  "text": { "body": "Confirmação do pedido #42" },
  "idempotency_key": "pedido-42-confirmacao"
}
```

O Coexy remove o campo antes de encaminhar para a Meta e garante que a mesma mensagem não seja enviada duas vezes com a mesma chave. Se uma mensagem com a mesma chave já foi enviada, o Coexy retorna o `wamid` original sem reenviar.

### 2.5 Erros do meta-proxy

| Status | `error` | Causa | O que fazer |
|--------|---------|-------|-------------|
| `401` | `Authorization header required` | Header `Authorization` ausente | Adicionar `Authorization: Bearer <channel_token>` |
| `401` | `Invalid channel token` | Token inválido ou canal não existe | Verificar o `channel_token` no painel ou via `GET /api/channels` |
| `403` | `Channel is not active` | Canal desconectado ou suspenso | Verificar status do canal; se `disconnected`, reconectar via `connect_url` |
| `429` | `Rate limit exceeded` | Limite de 100 req/min por canal | Aguardar o tempo indicado no header `Retry-After` |
| `503` | `CHANNEL_DISCONNECTED` | Token Meta foi revogado (ex: mudança de senha, remoção de permissão na Meta) | **Não recrie o canal.** Acesse o `connect_url` do canal para reconectar. Todos os webhooks e configurações são preservados. |

> **Sobre o erro 503:** Em operação normal, o Coexy renova tokens automaticamente e você nunca verá esse erro. Ele só ocorre quando a Meta revoga o acesso por motivos externos (ex: o dono do número removeu a permissão do app).

### 2.6 Segurança — nunca chame do frontend

**Lovable, Bolt e Cursor geram código React (frontend).** Qualquer credencial no código React fica visível no browser.

**Regra obrigatória:**
> Toda chamada ao meta-proxy **deve passar por um backend ou Edge Function**, que guarda o `channel_token` como secret de servidor.

```
❌ Frontend React → https://api.coexy.com.br/functions/v1/meta-proxy/...
✅ Frontend React → Supabase Edge Function → https://api.coexy.com.br/functions/v1/meta-proxy/...
```

---

## Fluxo 3 — Receber eventos (webhook)

O Coexy entrega eventos via `POST` para a URL configurada no webhook. O body é o **payload nativo da Meta**, sem transformações.

### 3.1 Headers presentes em toda entrega

```
X-Coexy-Signature: sha256=<hex>   — assinatura HMAC-SHA256 do body
User-Agent:        Coexy-Webhooks/1.0
Content-Type:      application/json
```

### 3.2 Verificar a assinatura HMAC — obrigatório

**Nunca processar um evento sem verificar a assinatura.** Sem essa verificação, qualquer pessoa que descubra sua URL pode forjar eventos.

Regras:
- Calcular o HMAC sobre o **body como string raw** — antes de fazer `JSON.parse()`
- Usar comparação em tempo constante (`crypto.subtle.verify()`) — nunca `===`
- Se falhar: retornar `401` e **não processar nada**

**TypeScript (Web Crypto API — Node 18+, Deno, Bun, Cloudflare Workers):**

```typescript
async function verifySignature(
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader.startsWith('sha256=')) return false

  const expectedHex = signatureHeader.slice(7)
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const expectedBytes = new Uint8Array(expectedHex.length / 2)
  for (let i = 0; i < expectedHex.length; i += 2) {
    expectedBytes[i / 2] = parseInt(expectedHex.slice(i, i + 2), 16)
  }

  return crypto.subtle.verify('HMAC', key, expectedBytes, encoder.encode(body))
}
```

**Python:**

```python
import hmac
import hashlib

def verify_signature(body: bytes, signature_header: str, secret: str) -> bool:
    if not signature_header.startswith("sha256="):
        return False

    expected_hex = signature_header[7:]
    computed = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(computed, expected_hex)
```

### 3.3 Responder 200 antes de processar — obrigatório

O Coexy aguarda **no máximo 10 segundos** pela resposta. Se o timeout for excedido, a entrega é marcada como falha e reagendada.

Schedule de retentativas:

| Tentativa | Delay após falha |
|-----------|-----------------|
| 1ª | imediata |
| 2ª | 30 segundos |
| 3ª | 2 minutos |
| 4ª | 10 minutos |
| Definitiva | falha permanente |

**Pattern correto:**
```typescript
// ✅ Responde 200 e processa async
processEvent(event).catch(console.error)
return new Response('OK', { status: 200 })

// ❌ Errado — processa antes de responder (pode exceder 10s)
await processEvent(event)
return new Response('OK', { status: 200 })
```

### 3.4 Idempotência — obrigatório

O mesmo evento pode ser entregue mais de uma vez (retentativas, falhas de rede). Use o campo `wamid` (o `id` da mensagem no payload) como chave de idempotência.

**TypeScript (Prisma):**
```typescript
async function processEvent(payload: unknown) {
  // ... extrair mensagem do payload Meta (ver 3.5)
  const existing = await db.messages.findUnique({ where: { wamid } })
  if (existing) return  // já processado — ignorar silenciosamente

  await db.messages.create({ data: { wamid, /* ... */ } })
}
```

**SQL (upsert):**
```sql
INSERT INTO messages (wamid, from_number, body, received_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (wamid) DO NOTHING;
```

### 3.5 Exemplo de payload — mensagem de texto recebida

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "1517032953486921",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15550783881",
          "phone_number_id": "1128059963726893"
        },
        "contacts": [{
          "profile": { "name": "João Silva" },
          "wa_id": "5511987654321"
        }],
        "messages": [{
          "id": "wamid.HBgMNTUzNDkyNjU3Mjk4FQIAERgUQ0U0NzZCNzJCRjlFMTA3RjgzNzYA",
          "from": "5511987654321",
          "timestamp": "1749600000",
          "type": "text",
          "text": { "body": "Olá, quero saber sobre meu pedido" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

Para outros tipos (imagem, áudio, status, etc.) consulte a [documentação da Meta](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples).

### 3.6 Padrão de processamento

**TypeScript:**

```typescript
export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const signature = request.headers.get('x-coexy-signature') ?? ''

  const valid = await verifySignature(body, signature, process.env.COEXY_HMAC_SECRET!)
  if (!valid) return new Response('Unauthorized', { status: 401 })

  // Responder 200 IMEDIATAMENTE — processar async
  processPayload(JSON.parse(body)).catch(console.error)
  return new Response('OK', { status: 200 })
}

function processPayload(payload: unknown): void {
  const data = payload as { entry?: Array<{ changes?: Array<{ value: Record<string, unknown> }> }> }

  for (const entry of data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value

      // Mensagens recebidas — value.messages[]
      for (const msg of (value.messages as unknown[]) ?? []) {
        handleMessage(msg, value)
      }

      // Status de mensagens enviadas — value.statuses[]
      for (const status of (value.statuses as unknown[]) ?? []) {
        handleStatus(status)
      }
    }
  }
}
```

**Python (Flask):**

```python
from flask import Flask, request, jsonify
import threading

app = Flask(__name__)

@app.route("/webhook/coexy", methods=["POST"])
def webhook():
    body = request.get_data()
    signature = request.headers.get("x-coexy-signature", "")

    if not verify_signature(body, signature, os.environ["COEXY_HMAC_SECRET"]):
        return "Unauthorized", 401

    # Responder 200 IMEDIATAMENTE — processar em background
    payload = request.get_json()
    threading.Thread(target=process_payload, args=(payload,)).start()
    return "OK", 200

def process_payload(payload: dict):
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})

            for msg in value.get("messages", []):
                handle_message(msg, value)

            for status in value.get("statuses", []):
                handle_status(status)
```

---

## Supabase — Edge Function Pronta (Lovable / Bolt / Cursor)

> **Para usuários de plataformas no-code/low-code:** este é o caminho mais simples. Não requer servidor próprio — rode direto no Supabase do seu projeto.

### Estrutura de arquivos

```
supabase/functions/
└── coexy-webhook/
    └── index.ts
```

### Variáveis de ambiente

Configurar em **Supabase Dashboard → Edge Functions → Secrets**:

```
COEXY_HMAC_SECRET=<valor de webhook.hmac_secret retornado na criação>
```

### Edge Function completa

```typescript
// supabase/functions/coexy-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Verificação HMAC ─────────────────────────────────────────────────────────

async function verifySignature(
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader.startsWith('sha256=')) return false

  const expectedHex = signatureHeader.slice(7)
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const expectedBytes = new Uint8Array(expectedHex.length / 2)
  for (let i = 0; i < expectedHex.length; i += 2) {
    expectedBytes[i / 2] = parseInt(expectedHex.slice(i, i + 2), 16)
  }

  return crypto.subtle.verify('HMAC', key, expectedBytes, encoder.encode(body))
}

// ── Processamento ─────────────────────────────────────────────────────────────

async function processEvent(event: Record<string, unknown>): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  for (const entry of (event.entry as unknown[]) ?? []) {
    const e = entry as { changes?: unknown[] }
    for (const change of e.changes ?? []) {
      const value = (change as { value: Record<string, unknown> }).value

      // Mensagens recebidas
      for (const msg of (value.messages as unknown[]) ?? []) {
        const m = msg as Record<string, unknown>
        const wamid = m.id as string

        await supabase.from('messages').upsert(
          {
            wamid,
            from_number:  m.from,
            type:         m.type,
            payload:      m,
            received_at:  new Date(Number(m.timestamp) * 1000).toISOString(),
          },
          { onConflict: 'wamid' },
        )
      }

      // Status de mensagens enviadas
      for (const st of (value.statuses as unknown[]) ?? []) {
        const s = st as Record<string, unknown>
        await supabase
          .from('messages')
          .update({ status: s.status })
          .eq('wamid', s.id)
      }
    }
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()
  const signature = req.headers.get('x-coexy-signature') ?? ''
  const secret = Deno.env.get('COEXY_HMAC_SECRET')

  if (!secret) {
    console.error('COEXY_HMAC_SECRET não configurado')
    return new Response('Server misconfigured', { status: 500 })
  }

  const valid = await verifySignature(body, signature, secret)
  if (!valid) {
    console.warn('Assinatura HMAC inválida — requisição rejeitada')
    return new Response('Unauthorized', { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(body) as Record<string, unknown>
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Responder 200 ANTES de processar
  if (typeof EdgeRuntime !== 'undefined') {
    EdgeRuntime.waitUntil(processEvent(event).catch(console.error))
  } else {
    processEvent(event).catch(console.error)
  }

  return new Response('OK', { status: 200 })
})
```

### Deploy

```bash
supabase functions deploy coexy-webhook

# Configurar o secret via CLI (alternativa ao Dashboard)
supabase secrets set COEXY_HMAC_SECRET=<valor>
```

### Registrar a URL do webhook no Coexy

Após o deploy, registre a URL da função como webhook:

```typescript
const response = await fetch('https://api.coexy.com.br/functions/v1/api/webhooks', {
  method: 'POST',
  headers: {
    'x-api-key': 'crt_pk_<sua-chave>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Meu App',
    url: 'https://<seu-project-ref>.supabase.co/functions/v1/coexy-webhook',
    events: ['messages', 'smb_message_echoes'],
  }),
})
const webhook = await response.json()
// Salvar webhook.hmac_secret como COEXY_HMAC_SECRET no Supabase Secrets
```

### Tabela de mensagens sugerida (migração)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_messages.sql
create table messages (
  id           uuid primary key default gen_random_uuid(),
  wamid        text not null unique,   -- chave de idempotência
  from_number  text,
  type         text,
  status       text default 'received',
  payload      jsonb,
  received_at  timestamptz,
  created_at   timestamptz default now()
);

alter table messages enable row level security;
```

### Checklist de Go-Live

- [ ] `COEXY_HMAC_SECRET` configurado em Supabase Dashboard → Secrets
- [ ] URL do webhook começa com `https://`
- [ ] Função retorna 200 antes de processar (já garantido pelo código acima)
- [ ] Testei enviando uma mensagem real e verifiquei os logs da Edge Function

---

## Referência rápida

| Preciso... | Como fazer |
|-----------|-----------|
| Listar meus canais | `GET /api/channels` com `x-api-key` |
| Criar um canal | `POST /api/channels` com `{ "name": "..." }` |
| Obter link de conexão | `channel.connect_url` da resposta |
| Ver se o canal está conectado | `channel.status === 'active'` |
| Obter `phone_number_id` | `channel.phone_number_id` (disponível após conexão) |
| Obter `waba_id` | `channel.waba_id` (disponível após conexão) |
| Criar webhook | `POST /api/webhooks` com `url`, `name`, `events` |
| Pausar webhook | `PATCH /api/webhooks/:id` com `{ "status": "paused" }` |
| Atualizar eventos do webhook | `PATCH /api/webhooks/:id` com `{ "events": ["messages", "smb_message_echoes"] }` |
| Atribuir canal a webhook | `POST /api/webhooks/:wid/channels/:cid` |
| Enviar mensagem | `POST /meta-proxy/{phone_number_id}/messages` com `Authorization: Bearer <channel_token>` |
| Listar templates | `GET /meta-proxy/{waba_id}/message_templates` com `Authorization: Bearer <channel_token>` |
| Verificar assinatura | `verifySignature(body, header, secret)` — ver Fluxo 3.2 |
| Reconectar canal desconectado | Acessar `channel.connect_url` novamente |
| Ver entregas de webhook | Painel Coexy → Webhooks |

**URL base para todos os endpoints:** `https://api.coexy.com.br/functions/v1`
