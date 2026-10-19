# API oficial do WhatsApp (Cloud API): o que já está pronto e o que falta

Hoje toda conexão usa QR Code (`Whatsapps.channel = "qrcode"`). A estrutura para receber a API oficial da Meta já existe; este guia lista o que falta implementar quando a decisão for tomada.

## O que já está pronto

| Parte | Onde |
|---|---|
| Campo `channel` em cada conexão (`qrcode` ou `cloudapi`) | migration `20261019000005-add-channel-to-whatsapps` |
| Roteamento por canal: cada conexão usa a implementação do seu canal | `backend/src/providers/WhatsApp/whatsappProvider.ts` |
| Contrato único que qualquer canal implementa (`WhatsappProvider`) | mesmo arquivo |
| Tratamento de mensagens recebidas independente do canal (`handleMessage`, `handleMessageAck`) | `backend/src/handlers/handleWhatsappEvents.ts` |
| Separação por empresa: a conexão define a empresa de cada conversa | `handleMessage` busca a conexão e usa `companyId` dela |

## O que falta

1. **Credenciais por conexão.** Nova migration em `Whatsapps` com `phoneNumberId`, `wabaId` e `accessToken`. O token deve ficar criptografado no banco.
2. **Implementação `CloudApiProvider`** em `providers/WhatsApp/Implementations/cloudapi.ts`, seguindo `WhatsappProvider`:
   - `init`: valida as credenciais na Graph API e marca a conexão como `CONNECTED`. Não existe QR Code.
   - `sendMessage` / `sendMedia`: `POST /{phoneNumberId}/messages`.
   - `sendSeen`: marca como lida (`status: "read"`).
   - `checkNumber`, `getProfilePicUrl` e `getContacts` não têm equivalente direto: retornar o número normalizado, vazio e lista vazia.
   - `logout` / `removeSession`: só limpam o estado local.
3. **Registrar o canal** em `providersByChannel` (`cloudapi: CloudApiProvider`). Com isso `availableChannels` passa a incluir `cloudapi`.
4. **Webhook de entrada**, por exemplo `GET/POST /webhooks/whatsapp-cloud`:
   - `GET`: responde o desafio de verificação (`hub.verify_token`).
   - `POST`: valida a assinatura `X-Hub-Signature-256` com o App Secret, identifica a conexão pelo `phone_number_id` e converte cada evento em `handleMessage` (mensagens) ou `handleMessageAck` (status `delivered`/`read`).
   - Mídias recebidas: baixar pela Graph API e entregar como `MediaPayload`.
5. **Janela de 24 horas e templates.** Fora da janela só é possível enviar templates aprovados. É preciso:
   - guardar a hora da última mensagem do cliente no ticket;
   - bloquear o envio de texto livre fora da janela, com erro claro na tela;
   - cadastrar e enviar templates (nova tabela e tela).
6. **Frontend.** No modal de conexão, escolher o canal. Para `cloudapi`, pedir as credenciais em vez de mostrar QR Code.
7. **Custos.** A Meta cobra por conversa. Vale registrar o volume por empresa para repassar nos planos.

## Teste recomendado

Use o número de teste que a Meta fornece no app de desenvolvedor. Isso permite validar envio, recebimento e webhook sem afetar um número real.
