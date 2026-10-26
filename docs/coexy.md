# API oficial com conexão guiada (Coexy)

A conexão guiada liga o número de WhatsApp de uma empresa à API oficial da Meta sem que a empresa crie um app no developers.facebook.com. O sistema cria um canal no [Coexy](https://coexy.com.br) para cada conexão. A empresa abre um link, autoriza a conexão com a conta do Facebook que administra o WhatsApp dela e pronto.

O Coexy é um intermediário da Graph API da Meta. As mensagens seguem o formato oficial da Meta, só que passam pelo Coexy com o token do canal. A especificação completa está em [coexy-spec.md](coexy-spec.md).

O modo antigo, com app próprio na Meta ([whatsapp-cloud-api.md](whatsapp-cloud-api.md)), continua disponível.

## Custos

- O Coexy cobra da Cerqueira Labs um valor fixo por conexão, por mês (hoje R$ 55), sem acréscimo sobre as mensagens.
- A Meta cobra as conversas direto na forma de pagamento da conta do WhatsApp Business de cada empresa.

Por isso a conexão guiada é um módulo do plano, com limite de conexões por empresa.

## Configuração na plataforma (superadmin)

1. Em **Plataforma → API oficial (Coexy)**, cole a **chave da API** do Coexy (painel do Coexy → Configurações → API Keys). O sistema confere a chave com o Coexy antes de salvar e a guarda criptografada (`DATA_ENCRYPTION_KEY`).
2. Clique em **Criar recebimento**. O sistema cria no Coexy um webhook para todas as conexões, apontando para `https://SEU-BACKEND/webhooks/coexy`, e guarda a chave de assinatura que o Coexy mostra uma única vez.
   - O endereço precisa ser HTTPS. Ele vem de `BACKEND_URL` (mais `PROXY_PORT`, quando não é 80 nem 443) ou de `COEXY_WEBHOOK_URL`.
   - Se o endereço do sistema mudar, a tela avisa. Use **Recriar recebimento**.
3. Em **Plataforma → Planos**, ligue **Conexão guiada da API oficial liberada** e defina **Conexões guiadas por empresa** (0 = sem limite). Na atualização, só o plano 1 ("Interno") vem liberado, com 1 conexão.

A mesma tela lista todas as conexões guiadas, por empresa, com a situação e a verificação de cada uma.

## Na empresa

1. Em **Conexões → Adicionar WhatsApp**, escolha **API oficial com conexão guiada** e salve. Não há campos da Meta para preencher.
2. Na lista, clique em **Conectar número**. A tela mostra o link de conexão:
   - **Conectar número** abre o link. Quem administra o WhatsApp da empresa entra com o Facebook e autoriza.
   - O link pode ser copiado e enviado para outra pessoa da empresa. Ele não expira e serve também para reconectar.
3. Em até um minuto a conexão aparece como conectada. O botão **Verificar agora** confere na hora.

O número pode continuar no app WhatsApp Business do celular (coexistência). As mensagens enviadas pelo app entram no ticket como enviadas pela empresa. As conversas anteriores à conexão não são importadas.

### Verificação da empresa na Meta

A tela da conexão mostra a situação da verificação e o link para enviar os documentos (até 3 tentativas). Sem verificação, o número alcança até 250 contatos novos por dia. Com verificação, até 100 mil, e o nome da empresa aparece nas conversas.

## Como funciona

- **Envio**: o canal usa os mesmos endereços da Graph API, trocando `https://graph.facebook.com/vXX.0` por `https://api.coexy.com.br/functions/v1/meta-proxy` e o token da Meta pelo token do canal. Janela de 24 horas, modelos, campanhas, mídia e confirmações de leitura funcionam como no modo com app próprio.
- **Idempotência**: todo envio leva um `idempotency_key`. Nas campanhas, a chave é `campaign-<campanha>-<contato>`, então uma etapa repetida não manda a mesma mensagem duas vezes.
- **Limite**: o Coexy aceita 100 requisições por minuto por canal. Uma resposta 429 espera o `Retry-After` (até 30 segundos) e tenta de novo, até 3 vezes.
- **Recebimento**: o Coexy entrega os eventos de todas as conexões em `POST /webhooks/coexy`.
  - Cada entrega tem o cabeçalho `X-Coexy-Signature: sha256=<hex>`, conferido sobre o corpo bruto com a chave guardada. Sem assinatura válida, a resposta é 401 e nada é processado.
  - A resposta 200 sai antes do processamento, porque o Coexy espera no máximo 10 segundos.
  - Cada evento vai para a conexão do seu `phone_number_id`.
  - Uma mensagem já gravada (mesmo `wamid`) não é gravada de novo.
- **Eventos assinados**:
  - `messages`: mensagens dos clientes e situação das enviadas.
  - `smb_message_echoes`: mensagens enviadas pelo app no celular.
  - `channel_health_update`: número restrito, bloqueado ou banido, ou queda de qualidade. Ao receber esse evento, o sistema relê o canal.
- **Mídia recebida**: primeiro `GET /meta-proxy/{media_id}`, depois um GET na `url` devolvida, exatamente como veio, com o mesmo token. A `url` vale cerca de 5 minutos. Se o download falhar, o sistema pede uma nova `url` uma vez. Se ainda assim falhar, a mensagem entra no ticket com o aviso "[Arquivo recebido, mas não foi possível baixá-lo]".
- **Situação do canal**: o Coexy não avisa quando um canal conecta ou desconecta.
  - Um envio recusado com 403 ou 503 marca a conexão como desconectada na hora. A lista mostra **Reconectar**, que abre o mesmo link: o canal nunca é recriado.
  - Os canais aguardando o número (ou uma reconexão) são consultados a cada minuto por até 2 dias. Todos os canais são consultados a cada 20 minutos e quando o servidor inicia.
- **Exclusão**: excluir a conexão apaga o canal no Coexy (`DELETE /api/channels/:id?force=true`). Se o Coexy não responder, a conexão continua e a exclusão pode ser repetida.

## Variáveis de ambiente

Todas são opcionais.

| Variável | Para que serve |
|---|---|
| `COEXY_API_KEY` | Chave da API, se não for cadastrada na tela. A da tela tem prioridade. |
| `COEXY_HMAC_SECRET` | Chave de assinatura do webhook, se ele foi criado fora do sistema. |
| `COEXY_WEBHOOK_URL` | Endereço público do recebimento, quando não é `BACKEND_URL` + `/webhooks/coexy`. |
| `COEXY_API_URL` | Endereço do Coexy (padrão `https://api.coexy.com.br/functions/v1`). Só para testes. |

## Onde está no código

| Parte | Onde |
|---|---|
| Chave, webhook, canais e regras do plano | `backend/src/libs/coexy.ts` |
| Criar, sincronizar, desconectar e apagar canais; consulta periódica | `backend/src/services/CoexyServices/CoexyChannelService.ts` |
| Envio pelo proxy, mídia e eventos | `backend/src/providers/WhatsApp/Implementations/cloudapi.ts` (`provider: "coexy"`) |
| Rota do webhook | `backend/src/routes/cloudWebhookRoutes.ts` (`POST /webhooks/coexy`) |
| Tela da plataforma | `frontend/src/pages/Coexy` |
| Testes (Coexy falso) | `backend/src/__tests__/unit/Phase6/Coexy.spec.ts` |
