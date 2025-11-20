const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "inventario",
    aliases: ["inv", "bag"],
    description: "Mostra os itens que você possui no inventário.",

    async execute(message) {

        const userId = message.author.id;

        let perfil = await Perfil.findOne({ userId });
        if (!perfil) {
            perfil = await Perfil.create({ userId, moedas: 0, inventario: [] });
        }

        // Garantir formato correto do inventário
        if (!Array.isArray(perfil.inventario)) {
            perfil.inventario = [];
            await perfil.save();
        }

        // ============================
        // TABELA DE ITENS (com emoji)
        // ============================
        const tabelaItens = {
            dica:  { emoji: "💡" },
            nitro: { emoji: "⚡" },
            vida:  { emoji: "❤️" },
            tempo: { emoji: "⏳" },
            skip:  { emoji: "⏭️" }
        };

        const embed = new EmbedBuilder()
            .setColor("#00c8ff")
            .setTitle(`🎒 Inventário de ${message.author.username}`)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Use ;loja para comprar itens!" })
            .setTimestamp();

        // Se vazio
        if (perfil.inventario.length === 0) {
            embed.addFields({
                name: "📦 Inventário vazio",
                value: "Você não possui nenhum item. Use `;loja` para comprar!",
                inline: false
            });

            return message.reply({ embeds: [embed] });
        }

        // ============================
        // ADICIONAR ITENS INLINE
        // ============================
        const fields = [];

        for (const item of perfil.inventario) {

            const emoji = tabelaItens[item.nome]?.emoji || "📦";

            fields.push({
                name: `${emoji} x${item.quantidade}`,
                value: `\u200b`,
                inline: true
            });
        }

        embed.addFields(fields);

        return message.reply({ embeds: [embed] });
    }
};
