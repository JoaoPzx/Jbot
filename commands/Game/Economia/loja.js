const { EmbedBuilder, inlineCode } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "loja",
    description: "Loja de itens do bot.",

    async execute(message, args) {

        // Lista de itens da loja
        const itens = {
            dica: {
                nome: "💡 Dica",
                preco: 5,
                desc: "Revela a **primeira e última letra** da resposta.",
                aliases: ["d"]
            },

            nitro: {
                nome: "⚡ Nitro",
                preco: 50,
                desc: "Reduz o intervalo entre imagens de **10s → 5s** durante toda a partida.",
                aliases: ["n"]
            },

            tempo: {
                nome: "⏰ Tempo",
                preco: 25,
                desc: "Adiciona +2 segundos ao tempo de acerto da partida.",
                aliases: ["t"]
            }
        };

        // Carregar perfil do jogador
        let perfil = await Perfil.findOne({ userId: message.author.id });
        if (!perfil) perfil = await Perfil.create({ userId: message.author.id });

        // ==================================================
        // 🛈 ;loja info
        // ==================================================
        if (args[0] && args[0].toLowerCase() === "info") {

            const embed = new EmbedBuilder()
                .setColor("#3498db")
                .setTitle("ℹ️ Informações dos Itens da Loja")
                .setDescription("Veja abaixo como cada item funciona:\n");

            for (const key of Object.keys(itens)) {
                embed.addFields({
                    name: itens[key].nome,
                    value: itens[key].desc,
                    inline: false
                });
            }

            return message.reply({ embeds: [embed] });
        }

        // ==================================================
        // 🛒 Mostrar LOJA (sem argumentos)
        // ==================================================
        if (!args.length) {

            const embed = new EmbedBuilder()
                .setColor("Purple")
                .setTitle("🏪 LOJA JBOT")
                .setDescription("Bem-vindo(a) a Loja de itens do JBot, confira os nossos itens e seus valores:")
                .addFields(
                    Object.keys(itens).map(key => ({name: `${itens[key].nome}`, value: `**💵 ${itens[key].preco} Moedas**`, inline: true}))
                );

            return message.reply({ embeds: [embed] });
        }

        // ==================================================
        // 🛍️ COMPRA DE ITEM
        // ==================================================

        const argItemBruto = args[0].toLowerCase();
        const quantidade = parseInt(args[1]) || 1;

        // Procurar item por nome ou alias
        const keyItem = Object.keys(itens).find(
            k =>
                k === argItemBruto ||
                itens[k].aliases.includes(argItemBruto)
        );

        if (!keyItem) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❌ Item não encontrado.\nUse `;loja` para ver os itens.")
                ]
            });
        }

        const item = itens[keyItem];
        const custoTotal = item.preco * quantidade;

        // Verificar saldo
        if (perfil.moedas < custoTotal) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(
                            `❌ Moedas insuficientes!\n` +
                            `💰 Total: **${custoTotal} moedas**\n` +
                            `Você possui apenas **${perfil.moedas} moedas**.`
                        )
                ]
            });
        }

        // Descontar moedas
        perfil.moedas -= custoTotal;

        // Adicionar ao inventário com quantidade
        let itemInv = perfil.inventario.find(i => i.nome === keyItem);

        if (!itemInv) {
            perfil.inventario.push({
                nome: keyItem,
                quantidade
            });
        } else {
            itemInv.quantidade += quantidade;
        }

        await perfil.save();

        // Embed de confirmação
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("✔️ Compra realizada!")
            .addFields(
                {name: "🛍 Item", value: `**${quantidade}** ${item.nome}(s)`, inline: true},
                {name: "💵 Preço", value: `**${custoTotal}** Moedas`, inline: true},
                {name: "💰 Saldo", value: `**${perfil.moedas}** Moedas`, inline: true}
            )

        return message.reply({ embeds: [embed] });
    }
};
