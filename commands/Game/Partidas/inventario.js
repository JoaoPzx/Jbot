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

        // Garantir estrutura
        if (!Array.isArray(perfil.inventario)) {
            perfil.inventario = [];
            await perfil.save();
        }

        // ============================
        // TABELA DE ITENS PADRÃO
        // ============================
        const tabelaItens = {
            dica:      { nome: "Dica",      emoji: "<:icon_dica:1441174865032904745>" },
            tempo:     { nome: "Tempo",     emoji: "<:icon_tempo:1441174907445837907>" },
            nitro:     { nome: "Nitro",     emoji: "<:icon_nitro:1441530028658790430>" },
            pular:      { nome: "Pular",      emoji: "<:icon_pulo:1441182320462790786>" },
            combo:     { nome: "Combo",     emoji: "<:icon_combo:1441177424124448868>" },
            resposta:  { nome: "Resposta",  emoji: "<:icon_resposta:1441904668748939374>" },
        };

        // ============================
        // CRIAR MAPA DE QUANTIDADES
        // ============================
        const qtd = {};

        for (const key of Object.keys(tabelaItens)) {
            qtd[key] = 0;
        }

        for (const item of perfil.inventario) {
            if (qtd.hasOwnProperty(item.nome)) {
                qtd[item.nome] = item.quantidade;
            }
        }

        // ============================
        // MONTAR EMBED
        // ============================
        const embed = new EmbedBuilder()
            .setColor("#00c8ff")
            .setTitle(`<:bag1:1441541837847265430> Inventário de ${message.author.username}`)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Use ;loja para comprar itens!" })
            .setTimestamp();

        const fields = [];

        for (const key of Object.keys(tabelaItens)) {
            const item = tabelaItens[key];

            fields.push({
                name: item.nome,
                value: `${item.emoji} **${qtd[key]}**`,
                inline: true
            });
        }

        embed.addFields(fields);

        return message.reply({ embeds: [embed] });
    }
};
