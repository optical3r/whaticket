const messages = {
  pt: {
    translations: {
      signup: {
        title: "Cadastre-se",
        toasts: {
          success: "Usuário criado com sucesso! Faça seu login!!!.",
          fail: "Erro ao criar usuário. Verifique os dados informados.",
        },
        form: {
          name: "Nome",
          email: "Email",
          password: "Senha",
        },
        buttons: {
          submit: "Cadastrar",
          login: "Já tem uma conta? Entre!",
        },
      },
      login: {
        title: "Login",
        form: {
          email: "Email",
          password: "Senha",
        },
        buttons: {
          submit: "Entrar",
          register: "Não tem uma conta? Cadastre-se!",
        },
      },
      auth: {
        toasts: {
          success: "Login efetuado com sucesso!",
        },
      },
      dashboard: {
        charts: {
          perDay: {
            title: "Tickets hoje: ",
          },
        },
        messages: {
          inAttendance: {
            title: "Em Atendimento"
          },
          waiting: {
            title: "Aguardando"
          },
          closed: {
            title: "Finalizado"
          }
        }
      },
      connections: {
        title: "Conexões",
        toasts: {
          deleted: "Conexão com o WhatsApp excluída com sucesso!",
        },
        confirmationModal: {
          deleteTitle: "Deletar",
          deleteMessage: "Você tem certeza? Essa ação não pode ser revertida.",
          disconnectTitle: "Desconectar",
          disconnectMessage:
            "Tem certeza? Você precisará ler o QR Code novamente.",
        },
        buttons: {
          add: "Adicionar WhatsApp",
          disconnect: "desconectar",
          tryAgain: "Tentar novamente",
          qrcode: "QR CODE",
          newQr: "Novo QR CODE",
          connecting: "Conectando",
          edit: "Editar conexão",
          delete: "Excluir conexão",
        },
        toolTips: {
          disconnected: {
            title: "Falha ao iniciar sessão do WhatsApp",
            content:
              "Certifique-se de que seu celular esteja conectado à internet e tente novamente, ou solicite um novo QR Code",
          },
          qrcode: {
            title: "Esperando leitura do QR Code",
            content:
              "Clique no botão 'QR CODE' e leia o QR Code com o seu celular para iniciar a sessão",
          },
          connected: {
            title: "Conexão estabelecida!",
          },
          timeout: {
            title: "A conexão com o celular foi perdida",
            content:
              "Certifique-se de que seu celular esteja conectado à internet e o WhatsApp esteja aberto, ou clique no botão 'Desconectar' para obter um novo QR Code",
          },
        },
        table: {
          name: "Nome",
          status: "Status",
          lastUpdate: "Última atualização",
          default: "Padrão",
          actions: "Ações",
          session: "Sessão",
        },
      },
      whatsappModal: {
        title: {
          add: "Adicionar WhatsApp",
          edit: "Editar WhatsApp",
        },
        form: {
          name: "Nome",
          default: "Padrão",
          farewellMessage: "Mensagem de despedida"
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "WhatsApp salvo com sucesso.",
      },
      qrCode: {
        message: "Leia o QrCode para iniciar a sessão",
      },
      contacts: {
        title: "Contatos",
        toasts: {
          deleted: "Contato excluído com sucesso!",
        },
        searchPlaceholder: "Pesquisar...",
        confirmationModal: {
          deleteTitle: "Deletar ",
          importTitlte: "Importar contatos",
          deleteMessage:
            "Tem certeza que deseja deletar este contato? Todos os tickets relacionados serão perdidos.",
          importMessage: "Deseja importas todos os contatos do telefone?",
        },
        buttons: {
          import: "Importar Contatos",
          add: "Adicionar Contato",
        },
        table: {
          name: "Nome",
          whatsapp: "WhatsApp",
          email: "Email",
          actions: "Ações",
        },
      },
      contactModal: {
        title: {
          add: "Adicionar contato",
          edit: "Editar contato",
        },
        form: {
          mainInfo: "Dados do contato",
          extraInfo: "Informações adicionais",
          name: "Nome",
          number: "Número do Whatsapp",
          email: "Email",
          extraName: "Nome do campo",
          extraValue: "Valor",
        },
        buttons: {
          addExtraInfo: "Adicionar informação",
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Contato salvo com sucesso.",
      },
      quickAnswersModal: {
        title: {
          add: "Adicionar Resposta Rápida",
          edit: "Editar Resposta Rápida",
        },
        form: {
          shortcut: "Atalho",
          message: "Resposta Rápida",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Resposta Rápida salva com sucesso.",
      },
      queueModal: {
        title: {
          add: "Adicionar fila",
          edit: "Editar fila",
        },
        form: {
          name: "Nome",
          color: "Cor",
          greetingMessage: "Mensagem de saudação",
        },
        hours: {
          section: "Horário de atendimento",
          help: "Sem horários definidos, a fila atende o tempo todo. Fora do horário, o cliente recebe a mensagem abaixo (no máximo a cada 6 horas por conversa).",
          enabled: "Aberto",
          start: "Início",
          end: "Fim",
          outOfHoursMessage: "Mensagem fora do horário",
          useHours: "Definir horário de atendimento",
          weekdays: {
            "0": "Domingo",
            "1": "Segunda-feira",
            "2": "Terça-feira",
            "3": "Quarta-feira",
            "4": "Quinta-feira",
            "5": "Sexta-feira",
            "6": "Sábado",
          },
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
      },
      userModal: {
        title: {
          add: "Adicionar usuário",
          edit: "Editar usuário",
        },
        form: {
          name: "Nome",
          email: "Email",
          password: "Senha",
          profile: "Perfil",
          whatsapp: "Conexão Padrão",
        },
        profiles: {
          admin: "Administrador",
          supervisor: "Supervisor",
          user: "Atendente",
        },
        buttons: {
          okAdd: "Adicionar",
          okEdit: "Salvar",
          cancel: "Cancelar",
        },
        success: "Usuário salvo com sucesso.",
      },
      chat: {
        noTicketMessage: "Selecione um ticket para começar a conversar.",
      },
      ticketsManager: {
        buttons: {
          newTicket: "Novo",
        },
      },
      ticketsQueueSelect: {
        placeholder: "Filas",
      },
      tickets: {
        toasts: {
          deleted: "O ticket que você estava foi deletado.",
        },
        notification: {
          message: "Mensagem de",
        },
        tabs: {
          open: { title: "Inbox" },
          closed: { title: "Resolvidos" },
          search: { title: "Busca" },
        },
        search: {
          placeholder: "Buscar tickets e mensagens",
        },
        buttons: {
          showAll: "Todos",
        },
      },
      transferTicketModal: {
        title: "Transferir Ticket",
        fieldLabel: "Digite para buscar usuários",
        fieldQueueLabel: "Transferir para fila",
        fieldConnectionLabel: "Transferir para conexão",
        fieldQueuePlaceholder: "Selecione uma fila",
        fieldConnectionPlaceholder: "Selecione uma conexão",
        noOptions: "Nenhum usuário encontrado com esse nome",
        buttons: {
          ok: "Transferir",
          cancel: "Cancelar",
        },
      },
      ticketsList: {
        pendingHeader: "Aguardando",
        assignedHeader: "Atendendo",
        noTicketsTitle: "Nada aqui!",
        noTicketsMessage:
          "Nenhum ticket encontrado com esse status ou termo pesquisado",
        connectionTitle: "Conexão que está sendo utilizada atualmente.",
        aiTag: "IA",
        aiTagTitle: "O assistente virtual está atendendo esta conversa.",
        buttons: {
          accept: "Aceitar",
        },
      },
      newTicketModal: {
        title: "Criar Ticket",
        fieldLabel: "Digite para pesquisar o contato",
        add: "Adicionar",
        buttons: {
          ok: "Salvar",
          cancel: "Cancelar",
        },
      },
      mainDrawer: {
        listItems: {
          dashboard: "Dashboard",
          connections: "Conexões",
          tickets: "Tickets",
          contacts: "Contatos",
          quickAnswers: "Respostas Rápidas",
          queues: "Filas",
          administration: "Administração",
          users: "Usuários",
          settings: "Configurações",
          platform: "Plataforma",
          companies: "Empresas",
          plans: "Planos",
          tags: "Etiquetas",
          closeReasons: "Motivos de encerramento",
          reports: "Relatórios",
          webhooks: "Webhooks",
          ai: "Inteligência artificial",
                },
        appBar: {
          user: {
            profile: "Perfil",
            logout: "Sair",
          },
          darkMode: "Modo escuro",
        },
      },
      languageSelector: {
        label: "Idioma",
      },
      notifications: {
        noTickets: "Nenhuma notificação.",
      },
      queues: {
        title: "Filas",
        table: {
          name: "Nome",
          color: "Cor",
          greeting: "Mensagem de saudação",
          actions: "Ações",
        },
        buttons: {
          add: "Adicionar fila",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage:
            "Você tem certeza? Essa ação não pode ser revertida! Os tickets dessa fila continuarão existindo, mas não terão mais nenhuma fila atribuída.",
        },
      },
      queueSelect: {
        inputLabel: "Filas",
      },
      quickAnswers: {
        title: "Respostas Rápidas",
        table: {
          shortcut: "Atalho",
          message: "Resposta Rápida",
          actions: "Ações",
        },
        buttons: {
          add: "Adicionar Resposta Rápida",
        },
        toasts: {
          deleted: "Resposta Rápida excluída com sucesso.",
        },
        searchPlaceholder: "Pesquisar...",
        confirmationModal: {
          deleteTitle:
            "Você tem certeza que quer excluir esta Resposta Rápida: ",
          deleteMessage: "Esta ação não pode ser revertida.",
        },
      },
      users: {
        title: "Usuários",
        table: {
          name: "Nome",
          email: "Email",
          profile: "Perfil",
          whatsapp: "Conexão Padrão",
          actions: "Ações",
        },
        buttons: {
          add: "Adicionar usuário",
        },
        toasts: {
          deleted: "Usuário excluído com sucesso.",
        },
        confirmationModal: {
          deleteTitle: "Excluir",
          deleteMessage:
            "Todos os dados do usuário serão perdidos. Os tickets abertos deste usuário serão movidos para a fila.",
        },
      },
      settings: {
        success: "Configurações salvas com sucesso.",
        title: "Configurações",
        company: {
          title: "Sua empresa",
          plan: "Plano",
          usage: "Uso do plano",
          users: "Usuários",
          connections: "Conexões",
          queues: "Filas",
          of: "de",
          termsAccepted: "Termos de uso aceitos em {{date}} por {{by}}.",
          termsPending: "Os termos de uso da conexão por QR Code ainda não foram aceitos.",
        },
        apiToken: {
          label: "Token da API",
          help: "Use este token no cabeçalho Authorization (Bearer) para enviar mensagens pela API. Ele é exclusivo da sua empresa.",
        },
        timezone: {
          label: "Fuso horário da empresa",
          help: "Usado no horário de atendimento das filas e nos relatórios.",
          saved: "Fuso horário salvo.",
        },
        closing: {
          title: "Encerramento de tickets",
          closeReasonRequired: "Exigir motivo ao encerrar",
          closeReasonHelp: "Vale quando houver motivos cadastrados em Motivos de encerramento.",
        },
        csat: {
          title: "Pesquisa de satisfação",
          enabled: "Enviar pesquisa ao encerrar o ticket",
          message: "Pergunta enviada ao cliente",
          thanks: "Agradecimento após a resposta",
          help: "O cliente responde com um número de 1 a 5. A resposta fica registrada no ticket encerrado, sem reabri-lo.",
          save: "Salvar textos",
        },
      },
      messagesList: {
        header: {
          assignedTo: "Atribuído à:",
          buttons: {
            return: "Retornar",
            resolve: "Resolver",
            reopen: "Reabrir",
            accept: "Aceitar",
          },
        },
      },
      messagesInput: {
        placeholderOpen: "Digite uma mensagem ou tecle ''/'' para utilizar as respostas rápidas cadastrada",
        placeholderClosed:
          "Reabra ou aceite esse ticket para enviar uma mensagem.",
        signMessage: "Assinar",
      },
      contactDrawer: {
        header: "Dados do contato",
        buttons: {
          edit: "Editar contato",
        },
        extraInfo: "Outras informações",
      },
      ticketOptionsMenu: {
        delete: "Deletar",
        transfer: "Transferir",
        confirmationModal: {
          title: "Deletar o ticket do contato",
          message:
            "Atenção! Todas as mensagens relacionadas ao ticket serão perdidas.",
        },
        buttons: {
          delete: "Excluir",
          cancel: "Cancelar",
        },
      },
      confirmationModal: {
        buttons: {
          confirm: "Ok",
          cancel: "Cancelar",
        },
      },
      messageOptionsMenu: {
        delete: "Deletar",
        reply: "Responder",
        confirmationModal: {
          title: "Apagar mensagem?",
          message: "Esta ação não pode ser revertida.",
        },
      },
      companies: {
        title: "Empresas",
        buttons: {
          add: "Nova empresa",
          edit: "Editar empresa",
          suspend: "Suspender",
          reactivate: "Reativar",
        },
        table: {
          name: "Empresa",
          plan: "Plano",
          status: "Situação",
          users: "Usuários",
          connections: "Conexões",
          createdAt: "Criada em",
          actions: "Ações",
        },
        status: {
          active: "Ativa",
          suspended: "Suspensa",
        },
        toasts: {
          created: "Empresa criada.",
          updated: "Empresa atualizada.",
          suspended: "Empresa suspensa.",
          reactivated: "Empresa reativada.",
        },
        confirmSuspend: {
          title: "Suspender {{name}}?",
          message: "Os usuários da empresa perdem o acesso e as conexões do WhatsApp são desligadas. Os dados são mantidos e você pode reativar depois.",
        },
      },
      companyModal: {
        title: {
          add: "Nova empresa",
          edit: "Editar empresa",
        },
        form: {
          name: "Nome da empresa",
          plan: "Plano",
          adminSection: "Primeiro administrador",
          adminName: "Nome",
          adminEmail: "E-mail",
          adminPassword: "Senha (mínimo de 5 caracteres)",
        },
        buttons: {
          cancel: "Cancelar",
          save: "Salvar",
          create: "Criar empresa",
        },
      },
      plans: {
        title: "Planos",
        buttons: {
          add: "Novo plano",
          edit: "Editar plano",
          delete: "Excluir plano",
        },
        table: {
          name: "Plano",
          users: "Usuários",
          connections: "Conexões",
          queues: "Filas",
          aiMonthlyRequests: "IA por mês",
          actions: "Ações",
        },
        aiOff: "Não liberada",
        aiClientKey: "Chave do cliente",
        toasts: {
          saved: "Plano salvo.",
          deleted: "Plano excluído.",
        },
        confirmDelete: {
          title: "Excluir o plano {{name}}?",
          message: "Só é possível excluir planos que nenhuma empresa usa.",
        },
      },
      planModal: {
        title: {
          add: "Novo plano",
          edit: "Editar plano",
        },
        form: {
          name: "Nome do plano",
          users: "Limite de usuários",
          connections: "Limite de conexões",
          queues: "Limite de filas",
          aiMonthlyRequests: "Solicitações de IA por mês",
          aiEnabled: "Módulo de IA liberado",
          aiKeySource: "Chave da API usada",
          aiKeyPlatform: "Da Cerqueira Labs (o consumo é custo da plataforma)",
          aiKeyCompany: "Do cliente (cada empresa cadastra a própria chave e paga o próprio consumo)",
          aiMonthlyRequestsHelp: "Limite de cada empresa do plano. Sugestões, resumos, revisões e respostas do assistente contam igual."
        },
        buttons: {
          cancel: "Cancelar",
          save: "Salvar",
        },
      },
      termsModal: {
        title: "Antes de conectar um número",
        intro: "A conexão por QR Code usa clientes não oficiais do WhatsApp. Leia com atenção antes de continuar:",
        items: {
          ban: "O WhatsApp pode bloquear o número conectado, de forma temporária ou definitiva.",
          official: "O uso não é autorizado pelo WhatsApp. A alternativa oficial é a API do WhatsApp Business (Cloud API).",
          responsibility: "Evite envios em massa e mensagens não solicitadas: são a principal causa de bloqueio.",
          support: "Se o número for bloqueado, não temos como reverter o bloqueio.",
        },
        checkbox: "Li e entendo os riscos da conexão por QR Code para a minha empresa.",
        buttons: {
          later: "Agora não",
          accept: "Aceitar e continuar",
        },
        success: "Termos aceitos. Você já pode criar conexões.",
        nonAdmin: "Um administrador da sua empresa precisa aceitar os termos de uso antes de criar conexões.",
      },
      connectionAlert: {
        title: "Conexão do WhatsApp fora do ar",
        message: "A conexão {{names}} não está conectada. As mensagens dessa conexão não chegam até ela voltar.",
        message_plural: "As conexões {{names}} não estão conectadas. As mensagens dessas conexões não chegam até elas voltarem.",
        action: "Ver conexões",
        toast: "A conexão {{name}} caiu. Abra Conexões para reconectar.",
      },
      suspended: {
        message: "O acesso da sua empresa está suspenso. Fale com a Cerqueira Labs.",
      },
      tags: {
        title: "Etiquetas",
        buttons: {
          add: "Nova etiqueta",
          edit: "Editar etiqueta",
          delete: "Excluir etiqueta",
        },
        table: {
          name: "Etiqueta",
          color: "Cor",
          actions: "Ações",
        },
        toasts: {
          saved: "Etiqueta salva.",
          deleted: "Etiqueta excluída.",
        },
        confirmDelete: {
          title: "Excluir a etiqueta {{name}}?",
          message: "Ela será removida de todos os tickets e contatos.",
        },
        empty: "Nenhuma etiqueta cadastrada.",
      },
      tagModal: {
        title: {
          add: "Nova etiqueta",
          edit: "Editar etiqueta",
        },
        form: {
          name: "Nome",
          color: "Cor",
        },
        buttons: {
          cancel: "Cancelar",
          save: "Salvar",
        },
      },
      tagSelector: {
        ticketTags: "Etiquetas do ticket",
        contactTags: "Etiquetas do contato",
        placeholder: "Adicionar etiqueta",
        noOptions: "Nenhuma etiqueta. Peça a um gestor para cadastrar.",
        filter: "Etiquetas",
      },
      closeReasons: {
        title: "Motivos de encerramento",
        buttons: {
          add: "Novo motivo",
          edit: "Editar motivo",
          delete: "Excluir motivo",
        },
        table: {
          name: "Motivo",
          actions: "Ações",
        },
        toasts: {
          saved: "Motivo salvo.",
          deleted: "Motivo excluído.",
        },
        confirmDelete: {
          title: "Excluir o motivo {{name}}?",
          message: "Tickets já encerrados com ele ficam sem motivo.",
        },
        form: {
          name: "Nome do motivo",
        },
        empty: "Nenhum motivo cadastrado.",
      },
      closeTicketModal: {
        title: "Encerrar ticket",
        reason: "Motivo do encerramento",
        reasonOptional: "Motivo do encerramento (opcional)",
        none: "Sem motivo",
        buttons: {
          cancel: "Cancelar",
          confirm: "Encerrar",
        },
      },
      ticketNotes: {
        title: "Notas internas",
        help: "Visíveis só para a equipe. O cliente não recebe.",
        placeholder: "Escreva uma nota",
        add: "Adicionar nota",
        delete: "Excluir nota",
        empty: "Nenhuma nota neste ticket.",
        deletedUser: "Usuário removido",
        assistant: "Assistente virtual",
      },
      reports: {
        title: "Relatórios",
        filters: {
          from: "De",
          to: "Até",
          queue: "Fila",
          user: "Atendente",
          all: "Todos",
          apply: "Atualizar",
        },
        export: "Exportar CSV",
        cards: {
          created: "Tickets abertos",
          closed: "Tickets encerrados",
          firstResponse: "Tempo médio de 1ª resposta",
          resolution: "Tempo médio de resolução",
          csat: "Satisfação média",
          csatAnswers: "{{answered}} de {{sent}} pesquisas respondidas",
          noData: "Sem dados no período",
        },
        source: "Período: {{from}} a {{to}} ({{timezone}})",
        charts: {
          showTable: "Ver tabela",
          showChart: "Ver gráfico",
          day: "Dia",
          rating: "Nota {{rating}}",
          byDay: "Tickets por dia",
          created: "Abertos",
          closed: "Encerrados",
          csat: "Distribuição das notas",
        },
        tables: {
          byQueue: "Por fila",
          byUser: "Por atendente",
          byReason: "Por motivo de encerramento",
          queue: "Fila",
          user: "Atendente",
          reason: "Motivo",
          created: "Abertos",
          closed: "Encerrados",
          firstResponse: "1ª resposta",
          resolution: "Resolução",
          rating: "Nota média",
          noQueue: "Sem fila",
          noUser: "Sem atendente",
          noReason: "Sem motivo",
        },
        units: {
          seconds: "s",
          minutes: "min",
          hours: "h",
          days: "d",
        },
      },
      webhooks: {
        title: "Webhooks",
        help: "Envie eventos dos atendimentos para outros sistemas. Cada envio é assinado no cabeçalho X-Webhook-Signature (HMAC SHA-256 com o segredo do webhook).",
        buttons: {
          add: "Novo webhook",
          edit: "Editar webhook",
          delete: "Excluir webhook",
          test: "Enviar teste",
        },
        table: {
          name: "Nome",
          url: "URL",
          events: "Eventos",
          status: "Último envio",
          actions: "Ações",
        },
        status: {
          never: "Nunca enviado",
          ok: "OK ({{status}})",
          error: "Erro: {{error}}",
        },
        toasts: {
          saved: "Webhook salvo.",
          deleted: "Webhook excluído.",
          testOk: "Teste enviado com sucesso.",
          testError: "O teste falhou: {{error}}",
        },
        confirmDelete: {
          title: "Excluir o webhook {{name}}?",
          message: "Os eventos deixam de ser enviados para esta URL.",
        },
        empty: "Nenhum webhook cadastrado.",
        events: {
          ticket_created: "Ticket criado",
          ticket_closed: "Ticket encerrado",
          ticket_rated: "Ticket avaliado",
          message_received: "Mensagem recebida",
          message_sent: "Mensagem enviada",
        },
      },
      webhookModal: {
        title: {
          add: "Novo webhook",
          edit: "Editar webhook",
        },
        form: {
          name: "Nome",
          url: "URL (https://...)",
          events: "Eventos",
          active: "Ativo",
          secret: "Segredo para validar a assinatura",
        },
        buttons: {
          cancel: "Cancelar",
          save: "Salvar",
        },
      },
      dashboardCards: {
        open: "Em atendimento",
        pending: "Aguardando",
        closedToday: "Encerrados hoje",
        firstResponseToday: "1ª resposta média hoje",
        csatToday: "Satisfação hoje",
        now: "Agora",
        today: "Hoje",
        unitTickets: "ticket",
        unitTickets_plural: "tickets",
        source: "Fonte: tickets da sua empresa",
      },
      aiAssist: {
        button: "Ajuda da IA",
        working: "A IA está escrevendo",
        suggest: "Sugerir resposta",
        summarize: "Resumir conversa",
        rewriteTitle: "Reescrever o rascunho",
        rewriteHint: "Escreva um rascunho para reescrever",
        modes: {
          improve: "Corrigir e melhorar",
          formal: "Mais formal",
          friendly: "Mais cordial",
          shorter: "Mais curto",
        },
      },
      aiSummary: {
        title: "Resumo da conversa",
        loading: "Gerando o resumo. Isso pode levar alguns segundos.",
        notice: "Resumo gerado por IA. Confira antes de usar.",
        close: "Fechar",
        saveAsNote: "Salvar como nota",
        saved: "Resumo salvo nas notas do ticket.",
        notePrefix: "Resumo gerado por IA:",
      },
      ai: {
        title: "Inteligência artificial",
        loading: "Carregando",
        usage: {
          title: "Uso neste mês",
          requests: "Solicitações de IA",
          help: "Inclui sugestões, resumos, revisões de texto e respostas do assistente. A contagem recomeça no dia 1º. Modelo:",
          notConfigured: "A IA ainda não foi configurada no servidor. Peça ao responsável pela instalação para definir ANTHROPIC_API_KEY.",
          notInPlan: "O plano da sua empresa não inclui o módulo de IA. Fale com a Cerqueira Labs para liberar.",
          enabled: "Usar IA nesta empresa",
          enabledHelp: "Desligado, ninguém da empresa vê os botões de IA e o assistente virtual para de responder.",
          turnedOn: "IA ligada para a empresa.",
          turnedOff: "IA desligada para a empresa.",
          tokens: "Tokens no mês",
          tokensValue: "{{input}} de entrada · {{output}} de saída",
          helpClientKey: "Consumo feito com a chave da sua empresa e cobrado na sua conta da Anthropic, onde fica o valor exato. A contagem recomeça no dia 1º. Modelo:",
          table: {
            feature: "Recurso",
            requests: "Solicitações",
            input: "Tokens de entrada",
            output: "Tokens de saída",
          },
          features: {
            suggest: "Sugestão de resposta",
            summary: "Resumo da conversa",
            rewrite: "Revisão de texto",
            assistant: "Assistente virtual",
          },
        },
        key: {
          title: "Chave da API da Anthropic",
          help: "O plano da sua empresa usa a sua própria chave: o consumo de IA é cobrado na sua conta da Anthropic. Crie a chave em platform.claude.com, em API Keys. A chave fica guardada criptografada e não aparece de novo nesta tela.",
          savedHint: "Chave cadastrada, terminada em",
          missing: "Nenhuma chave cadastrada. A IA fica desligada até você cadastrar uma.",
          label: "Chave da API",
          replace: "Nova chave (substitui a atual)",
          save: "Salvar chave",
          checking: "Verificando a chave",
          remove: "Remover chave",
          saved: "Chave verificada e salva.",
          removed: "Chave removida. A IA ficou desligada.",
          confirmRemove: "Remover a chave da API?",
          confirmRemoveMessage: "A IA para de funcionar na empresa até uma nova chave ser cadastrada.",
        },
        assistant: {
          title: "Assistente virtual",
          help: "Responde os clientes que aguardam na fila usando a base de conhecimento abaixo. Ele transfere a conversa para a equipe quando não sabe a resposta, quando o cliente pede uma pessoa ou depois do limite de respostas. Quando alguém aceita o ticket, ele para.",
          enabled: "Ativar o assistente virtual",
          name: "Nome do assistente",
          instructions: "Instruções para o assistente",
          instructionsHelp: "Tom de voz, o que pode ou não oferecer, como se apresentar. Exemplo: trate o cliente por você e não fale de preços.",
          handoffMessage: "Mensagem ao transferir para a equipe",
          handoffMessageHelp: "Enviada ao cliente quando o assistente passa a conversa para uma pessoa.",
          maxReplies: "Limite de respostas por conversa",
          maxRepliesHelp: "Depois disso, a conversa vai para a equipe.",
          save: "Salvar",
          saved: "Configurações do assistente salvas.",
        },
        knowledge: {
          title: "Base de conhecimento",
          help: "O que a IA pode usar para responder: horários, preços, endereço, políticas e perguntas frequentes. Escreva como explicaria a um novo atendente.",
          add: "Novo artigo",
          empty: "Nenhum artigo cadastrado. Sem artigos, o assistente transfere quase todas as conversas para a equipe.",
          table: {
            title: "Título",
            size: "Caracteres",
            status: "Situação",
            actions: "Ações",
          },
          active: "Ativo",
          inactive: "Inativo",
          edit: "Editar artigo",
          delete: "Excluir artigo",
          saved: "Artigo salvo.",
          deleted: "Artigo excluído.",
          confirmDelete: "Excluir o artigo {{title}}?",
          confirmDeleteMessage: "A IA deixa de usar estas informações.",
        },
      },
      knowledgeModal: {
        title: {
          add: "Novo artigo",
          edit: "Editar artigo",
        },
        form: {
          title: "Título",
          content: "Conteúdo",
          contentHelp: "Use frases completas e informações atuais.",
          active: "Ativo (a IA usa este artigo)",
        },
        buttons: {
          cancel: "Cancelar",
          save: "Salvar",
        },
      },
      backendErrors: {
        ERR_AI_NOT_CONFIGURED: "A IA não está configurada no servidor.",
        ERR_AI_NOT_IN_PLAN: "O plano da sua empresa não inclui IA.",
        ERR_AI_DISABLED: "A IA está desligada para a sua empresa.",
        ERR_AI_KEY_MISSING: "Cadastre a chave da API da Anthropic em Inteligência artificial para usar a IA.",
        ERR_AI_INVALID_KEY: "A Anthropic recusou a chave. Confira se ela está correta, ativa e com acesso ao modelo.",
        ERR_AI_KEY_NOT_ALLOWED: "O plano da sua empresa usa a chave da Cerqueira Labs.",
        ERR_PLAN_INVALID_AI_KEY_SOURCE: "Escolha de quem é a chave da API.",
        ERR_AI_LIMIT_REACHED: "O limite de uso de IA deste mês acabou.",
        ERR_AI_TOO_MANY_REQUESTS: "Muitas solicitações de IA em pouco tempo. Aguarde um minuto.",
        ERR_AI_BUSY: "A IA está sobrecarregada no momento. Tente de novo em instantes.",
        ERR_AI_UNAVAILABLE: "A IA não respondeu. Tente de novo em instantes.",
        ERR_AI_REFUSED: "A IA não pôde atender este pedido.",
        ERR_AI_INCOMPLETE: "A resposta da IA ficou incompleta. Tente de novo.",
        ERR_AI_EMPTY_RESPONSE: "A IA não devolveu uma resposta. Tente de novo.",
        ERR_AI_NO_MESSAGES: "Esta conversa ainda não tem mensagens.",
        ERR_AI_EMPTY_TEXT: "Escreva um texto antes de pedir a revisão.",
        ERR_AI_TEXT_TOO_LONG: "O texto é longo demais para revisar (máximo de 4.000 caracteres).",
        ERR_AI_INVALID_MODE: "Opção de revisão inválida.",
        ERR_AI_INVALID_SETTINGS: "Confira os campos: nome com 2 a 60 caracteres, mensagem de transferência preenchida e limite entre 1 e 50.",
        ERR_AI_INSTRUCTIONS_TOO_LONG: "As instruções podem ter até 4.000 caracteres.",
        ERR_KNOWLEDGE_INVALID_TITLE: "Informe um título com 2 a 120 caracteres.",
        ERR_KNOWLEDGE_EMPTY: "Escreva o conteúdo do artigo.",
        ERR_KNOWLEDGE_ARTICLE_TOO_LARGE: "Cada artigo pode ter até 20.000 caracteres. Divida em mais de um artigo.",
        ERR_KNOWLEDGE_NOT_FOUND: "Artigo não encontrado.",
        ERR_KNOWLEDGE_TOO_MANY: "Limite de 200 artigos atingido.",
        ERR_KNOWLEDGE_TOO_LARGE: "A base de conhecimento ativa passou de 200.000 caracteres. Desative ou resuma artigos antigos.",
        ERR_INVALID_PROFILE: "Perfil inválido.",
        ERR_TAG_NOT_FOUND: "Etiqueta não encontrada.",
        ERR_TAG_INVALID_NAME: "Informe um nome de etiqueta com até 40 caracteres.",
        ERR_TAG_INVALID_COLOR: "Escolha uma cor válida.",
        ERR_TAG_NAME_ALREADY_EXISTS: "Já existe uma etiqueta com esse nome.",
        ERR_NOTE_EMPTY: "Escreva a nota antes de salvar.",
        ERR_NOTE_TOO_LONG: "A nota pode ter no máximo 5.000 caracteres.",
        ERR_NOTE_NOT_FOUND: "Nota não encontrada.",
        ERR_QUEUE_INVALID_SCHEDULE: "Confira os horários: use o formato HH:mm em cada dia aberto.",
        ERR_INVALID_TIMEZONE: "Fuso horário inválido.",
        ERR_CLOSE_REASON_REQUIRED: "Escolha um motivo para encerrar o ticket.",
        ERR_CLOSE_REASON_NOT_FOUND: "Motivo de encerramento não encontrado.",
        ERR_CLOSE_REASON_INVALID_NAME: "Informe um nome de motivo com até 80 caracteres.",
        ERR_CLOSE_REASON_NAME_ALREADY_EXISTS: "Já existe um motivo com esse nome.",
        ERR_INVALID_SETTING_VALUE: "Valor inválido para esta configuração.",
        ERR_REPORT_INVALID_RANGE: "Confira o período: a data inicial deve ser anterior ou igual à final.",
        ERR_REPORT_RANGE_TOO_LONG: "Escolha um período de até 366 dias.",
        ERR_WEBHOOK_INVALID_NAME: "Informe um nome com até 80 caracteres.",
        ERR_WEBHOOK_INVALID_URL: "Informe uma URL http(s) válida, sem usuário e senha.",
        ERR_WEBHOOK_INVALID_EVENTS: "Escolha pelo menos um evento.",
        ERR_WEBHOOK_NOT_FOUND: "Webhook não encontrado.",
        ERR_WEBHOOK_LIMIT: "Limite de 10 webhooks por empresa.",
        ERR_WEBHOOK_BLOCKED_ADDRESS: "Esta URL aponta para um endereço interno e não é permitida.",
        ERR_COMPANY_SUSPENDED: "O acesso da sua empresa está suspenso. Fale com a Cerqueira Labs.",
        ERR_COMPANY_NOT_FOUND: "Empresa não encontrada.",
        ERR_COMPANY_INVALID_NAME: "Informe um nome de empresa com pelo menos 2 caracteres.",
        ERR_COMPANY_NAME_ALREADY_EXISTS: "Já existe uma empresa com esse nome.",
        ERR_COMPANY_ADMIN_REQUIRED: "Preencha nome, e-mail válido e senha (mínimo de 5 caracteres) do administrador.",
        ERR_COMPANY_INVALID_STATUS: "Situação inválida.",
        ERR_CANNOT_SUSPEND_OWN_COMPANY: "Você não pode suspender a sua própria empresa.",
        ERR_USER_EMAIL_ALREADY_EXISTS: "Já existe um usuário com esse e-mail.",
        ERR_PLAN_NOT_FOUND: "Plano não encontrado.",
        ERR_PLAN_INVALID_NAME: "Informe um nome de plano com pelo menos 2 caracteres.",
        ERR_PLAN_INVALID_LIMIT: "Os limites precisam ser números inteiros (mínimo 1 para usuários e conexões).",
        ERR_PLAN_NAME_ALREADY_EXISTS: "Já existe um plano com esse nome.",
        ERR_PLAN_IN_USE: "Este plano está em uso por pelo menos uma empresa. Troque o plano dessas empresas antes de excluir.",
        ERR_PLAN_LIMIT_USERS: "Seu plano chegou ao limite de usuários. Fale com a Cerqueira Labs para ampliar.",
        ERR_PLAN_LIMIT_CONNECTIONS: "Seu plano chegou ao limite de conexões. Fale com a Cerqueira Labs para ampliar.",
        ERR_PLAN_LIMIT_QUEUES: "Seu plano chegou ao limite de filas. Fale com a Cerqueira Labs para ampliar.",
        ERR_TERMS_NOT_ACCEPTED: "Aceite os termos de uso da conexão por QR Code antes de criar uma conexão.",
        ERR_CHANNEL_NOT_AVAILABLE: "Este tipo de conexão ainda não está disponível.",
        ERR_NO_OTHER_WHATSAPP: "Deve haver pelo menos um WhatsApp padrão.",
        ERR_NO_DEF_WAPP_FOUND:
          "Nenhum WhatsApp padrão encontrado. Verifique a página de conexões.",
        ERR_WAPP_NOT_INITIALIZED:
          "Esta sessão do WhatsApp não foi inicializada. Verifique a página de conexões.",
        ERR_WAPP_CHECK_CONTACT:
          "Não foi possível verificar o contato do WhatsApp. Verifique a página de conexões",
        ERR_WAPP_INVALID_CONTACT: "Este não é um número de Whatsapp válido.",
        ERR_WAPP_DOWNLOAD_MEDIA:
          "Não foi possível baixar mídia do WhatsApp. Verifique a página de conexões.",
        ERR_INVALID_CREDENTIALS:
          "Erro de autenticação. Por favor, tente novamente.",
        ERR_SENDING_WAPP_MSG:
          "Erro ao enviar mensagem do WhatsApp. Verifique a página de conexões.",
        ERR_DELETE_WAPP_MSG: "Não foi possível excluir a mensagem do WhatsApp.",
        ERR_OTHER_OPEN_TICKET: "Já existe um tíquete aberto para este contato.",
        ERR_SESSION_EXPIRED: "Sessão expirada. Por favor entre.",
        ERR_TOO_MANY_REQUESTS:
          "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        ERR_USER_CREATION_DISABLED:
          "A criação do usuário foi desabilitada pelo administrador.",
        ERR_NO_PERMISSION: "Você não tem permissão para acessar este recurso.",
        ERR_DUPLICATED_CONTACT: "Já existe um contato com este número.",
        ERR_NO_SETTING_FOUND: "Nenhuma configuração encontrada com este ID.",
        ERR_NO_CONTACT_FOUND: "Nenhum contato encontrado com este ID.",
        ERR_NO_TICKET_FOUND: "Nenhum tíquete encontrado com este ID.",
        ERR_NO_USER_FOUND: "Nenhum usuário encontrado com este ID.",
        ERR_NO_WAPP_FOUND: "Nenhum WhatsApp encontrado com este ID.",
        ERR_CREATING_MESSAGE: "Erro ao criar mensagem no banco de dados.",
        ERR_CREATING_TICKET: "Erro ao criar tíquete no banco de dados.",
        ERR_FETCH_WAPP_MSG:
          "Erro ao buscar a mensagem no WhtasApp, talvez ela seja muito antiga.",
        ERR_QUEUE_COLOR_ALREADY_EXISTS:
          "Esta cor já está em uso, escolha outra.",
        ERR_WAPP_GREETING_REQUIRED:
          "A mensagem de saudação é obrigatório quando há mais de uma fila.",
      },
    },
  },
};

export { messages };
