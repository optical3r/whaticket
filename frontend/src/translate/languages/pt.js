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
          actions: "Ações",
        },
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
      backendErrors: {
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
