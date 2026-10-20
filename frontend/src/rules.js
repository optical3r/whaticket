const managerRules = [
	"drawer-manager-items:view",
	"tickets-manager:showall",
	"tags:manage",
	"closeReasons:manage",
	"reports:view",
	"campaigns:manage",
];

const rules = {
	user: {
		static: [],
	},

	supervisor: {
		static: [...managerRules],
	},

	admin: {
		static: [
			...managerRules,
			"drawer-admin-items:view",
			"user-modal:editProfile",
			"user-modal:editQueues",
			"ticket-options:deleteTicket",
			"ticket-options:transferWhatsapp",
			"contacts-page:deleteContact",
			"connections-page:manageConnections",
			"webhooks:manage",
			"ai:manage",
		],
	},
};

export default rules;
