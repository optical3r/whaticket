# API oficial do WhatsApp (Cloud API): como configurar

Cada conexão pode usar QR Code (`Whatsapps.channel = "qrcode"`) ou a API oficial da Meta (`cloudapi`). Este guia mostra como preparar a conta na Meta e ligar uma conexão oficial.

## Antes de começar

- O backend precisa estar em um endereço público com HTTPS. A Meta não entrega mensagens para `localhost` nem para HTTP.
- Defina `DATA_ENCRYPTION_KEY` no `.env` (`openssl rand -hex 32`). Ela criptografa o token e a chave secreta. Se mudar depois, os dados precisam ser cadastrados de novo.

## 1. Criar o app na Meta

1. Em https://developers.facebook.com, crie um app do tipo **Business** e adicione o produto **WhatsApp**.
2. Em **WhatsApp → Configuração da API**, anote o **ID do número de telefone** e o **ID da conta do WhatsApp Business**. Para testar, use o número de teste que a Meta oferece.
3. Gere um **token permanente** em **Configurações do negócio → Usuários do sistema**, com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`. O token temporário da tela de teste expira em 24 horas.
4. Em **Configurações do app → Básico**, copie a **Chave secreta do app**.

## 2. Criar a conexão no sistema

1. Em **Conexões → Adicionar WhatsApp**, escolha **API oficial da Meta (Cloud API)**.
2. Preencha nome, ID do número de telefone, ID da conta do WhatsApp Business, token de acesso e chave secreta do app.
3. Ao salvar, o sistema confere os dados na Graph API. Se estiverem certos, a conexão aparece como conectada. Não existe QR Code.

Para trocar o token ou a chave secreta depois, edite a conexão e preencha só o campo novo. Campos em branco mantêm o valor salvo.

## 3. Cadastrar o webhook

1. Abra a conexão de novo. A tela mostra a **URL de callback** (`https://SEU-BACKEND/webhooks/whatsapp-cloud/ID-DA-CONEXÃO`) e o **token de verificação**.
2. No app da Meta, em **WhatsApp → Configuração → Webhook**, cole os dois e clique em **Verificar e salvar**.
3. Assine o campo **messages**.

Cada evento recebido tem a assinatura `X-Hub-Signature-256` conferida com a chave secreta do app; eventos sem assinatura válida são descartados.

## Como funciona no dia a dia

- **Mensagens recebidas**: texto, botões, imagem, áudio, vídeo, documento, figurinha e localização viram mensagens do ticket, como no QR Code.
- **Mensagens enviadas**: texto, imagem, áudio, vídeo e documento. As confirmações de entregue e lido atualizam o ticket.
- **Janela de 24 horas**: a Meta só aceita texto livre até 24 horas depois da última mensagem do cliente. Fora dela, o ticket mostra um aviso e o botão **Enviar template**, que lista os templates aprovados da conta. Os templates são criados e aprovados no **Gerenciador do WhatsApp** da Meta.
- **Custos**: a Meta cobra por conversa, na conta do cliente.
- **Limitações**: a API oficial não importa os contatos do celular nem mostra a foto de perfil. Campanhas por enquanto só saem por conexões de QR Code.

## Onde está no código

| Parte | Onde |
|---|---|
| Implementação do canal (`CloudApiProvider`) e webhook | `backend/src/providers/WhatsApp/Implementations/cloudapi.ts` |
| Rotas do webhook | `backend/src/routes/cloudWebhookRoutes.ts` |
| Credenciais criptografadas | `backend/src/helpers/CloudApiCredentials.ts`, tabela `CloudApiCredentials` |
| Janela de 24 horas | `backend/src/helpers/CloudWindow.ts`, campo `Tickets.lastInboundAt` |
| Envio de template | `backend/src/services/WbotServices/SendTemplateService.ts` |
| Endereço da Graph API | variável `WHATSAPP_CLOUD_API_URL` (padrão `https://graph.facebook.com/v21.0`) |
