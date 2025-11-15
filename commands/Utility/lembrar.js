const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    name: "lembrar",
    description: "Cria um lembrete com ação pendente.",

    async execute(message, args) {

        const canalLembretesID = "1438687451668283573"; // 🔥 Coloque aqui o canal onde os lembretes aparecerão

        if (!args.length)
            return message.reply("❌ Você precisa escrever o lembrete. Exemplo: `;lembrar atualizar comando ;help`");

        const texto = args.join(" ");
        const canal = message.client.channels.cache.get(canalLembretesID);

        if (!canal)
            return message.reply("❌ Canal de lembretes não encontrado. Verifique o ID.");

        // ==========================
        // EMBED 1 — AÇÃO PENDENTE
        // ==========================
        const embed1 = new EmbedBuilder()
            .setColor("Yellow")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("⚠️ AÇÃO PENDENTE!")
            .setDescription(`📝 **${texto}**`)
            .setFooter({ text: new Date().toLocaleString("pt-BR") });

        // BOTÃO
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("confirmar_acao")
                .setLabel("Atualizar Ação")
                .setStyle(ButtonStyle.Success)
        );

        await canal.send({ embeds: [embed1], components: [row] });

        if (message.deletable) message.delete().catch(() => {});
    }
};
