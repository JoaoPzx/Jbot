const { EmbedBuilder, inlineCode, IntentsBitField } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "loja",
    description: "Loja de itens do bot.",

    async execute(message, args) {

        // Lista de itens da loja
        const itens = {
            dica: {
                nome: "Dica",
                emoji: "<:icon_dica:1441174865032904745>",
                preco: 5,
                desc: "Revela a **primeira e última letra** da resposta.",
                aliases: ["d"]
            },

            resposta: {
                nome: "Resposta",
                emoji: "<:icon_resposta:1441904668748939374>",
                preco: 20,
                desc: "Revela a **resposta** da imagem da Rodada.",
                aliases: ["r"]
            },

            tempo: {
                nome: "Tempo",
                emoji: "<:icon_tempo:1441174907445837907>",
                preco: 30,
                desc: "Adiciona +3 segundos ao tempo de acerto da partida.",
                aliases: ["t"]
            },

            nitro: {
                nome: "Nitro",
                emoji: "<:icon_nitro:1441530028658790430>",
                preco: 50,
                desc: "Reduz o intervalo entre imagens de **10s → 5s** durante toda a partida.",
                aliases: ["n"]
            },

            pulo: {
                nome: "Pulo",
                emoji: "<:icon_pulo:1441182320462790786>",
                preco: 70,
                desc: "Pula a imagem de uma rodada da partida.",
                aliases: ["s"]
            },

            combo: {
                nome: "Combo",
                emoji: "<:icon_combo:1441177424124448868>",
                preco: 100,
                desc: "Aumenta a pontuação do jogador progressivamente (+1, +2, +3...).",
                aliases: ["c"]
            },

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
                .setTitle("LOJA DE ITENS JBOT")
                .setDescription("<:shop100:1441161458175180921> Bem-vindo(a) a Loja de itens do JBot, confira os nossos itens e seus valores:")
                .addFields(
                    Object.keys(itens).map(key => ({name: `${itens[key].emoji} ${itens[key].nome}`, value: `**<:coin1:1441491987537727669> ${itens[key].preco} Moedas**`, inline: true}))
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
            .setTitle("Compra realizada!")
            .setDescription(`<:compras:1441605176392945835> ${message.author} aqui estão os seus itens!`)
            .addFields(
                {name: "Produto", value: `${item.emoji} **${quantidade}** ${item.nome}`, inline: true},
                {name: "Preço", value: `**<:coin1:1441491987537727669> ${custoTotal}** Moedas`, inline: true},
                {name: "Saldo", value: `**<:carteira:1440068592354725888> ${perfil.moedas}** Moedas`, inline: true}
            )

        return message.reply({ embeds: [embed] });
    }
};
