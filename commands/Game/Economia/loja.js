const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "loja",
    description: "Loja de itens do bot.",

    async execute(message, args) {

        // Lista de itens da loja
        const itens = {
            dica: {
                nome: "Dica",
                nomePlural: "Dicas",
                emoji: "<:icon_dica:1441174865032904745>",
                preco: 5,
                desc: "Revela de **30 a 50%** das letras da resposta.",
                aliases: ["d"]
            },

            resposta: {
                nome: "Resposta",
                nomePlural: "Respostas",
                emoji: "<:icon_resposta:1441904668748939374>",
                preco: 20,
                desc: "Revela a **resposta completa** da imagem da rodada.",
                aliases: ["r"]
            },

            tempo: {
                nome: "Tempo",
                nomePlural: "Tempos",
                emoji: "<:icon_tempo:1441174907445837907>",
                preco: 30,
                desc: "Adiciona **+3 segundos** ao tempo da partida.",
                aliases: ["t"]
            },

            nitro: {
                nome: "Nitro",
                nomePlural: "Nitros",
                emoji: "<:icon_nitro:1441530028658790430>",
                preco: 50,
                desc: "Reduz o intervalo de **10s → 5s** em toda a partida.",
                aliases: ["n"]
            },

            pular: {
                nome: "Pular",
                nomePlural: "Pulos",
                emoji: "<:icon_pulo:1441182320462790786>",
                preco: 70,
                desc: "Pula a imagem da rodada (Máx 5 por partida).",
                aliases: ["s"]
            },

            combo: {
                nome: "Combo",
                nomePlural: "Combos",
                emoji: "<:icon_combo:1441177424124448868>",
                preco: 100,
                desc: "Aumenta progressivamente a pontuação do jogador.",
                aliases: ["c"]
            }
        };


        // 🔥 Conversor igual ao do sistema bancário
        function parseAmount(str) {
            str = str.toLowerCase();

            if (/^\d+(\.\d+)?k$/.test(str)) {
                return Math.round(parseFloat(str) * 1000);
            }
            if (/^\d+(\.\d+)?m$/.test(str)) {
                return Math.round(parseFloat(str) * 1_000_000);
            }
            if (/^\d+(\.\d+)?b$/.test(str)) {
                return Math.round(parseFloat(str) * 1_000_000_000);
            }
            if (/^\d+(\.\d+)?$/.test(str)) {
                return Math.round(parseFloat(str));
            }

            return NaN;
        }


        // Carregar perfil
        let perfil = await Perfil.findOne({ userId: message.author.id });
        if (!perfil) perfil = await Perfil.create({ userId: message.author.id });


        // ===============================
        // ;loja info
        // ===============================
        if (args[0] && args[0].toLowerCase() === "info") {
            const embed = new EmbedBuilder()
                .setColor("#3498db")
                .setTitle("<:informacoes_jbot:1442172090756370625> Informações dos Itens")
                .setFooter({
                    text: "Use ;loja <item> <quantidade> para comprar",
                    iconURL: "https://i.ibb.co/N2NncX3f/informacoes.png"
                });

            for (const key of Object.keys(itens)) {
                embed.addFields({
                    name: `${itens[key].emoji} ${itens[key].nome}`,
                    value: itens[key].desc,
                    inline: false
                });
            }

            return message.reply({ embeds: [embed] });
        }


        // ===============================
        // Mostrar loja
        // ===============================
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor("Purple")
                .setTitle("Loja de Itens do JBot")
                .setDescription("<:shop100:1441161458175180921> Confira nossos itens:")
                .setFooter({
                    text: "Use ;loja <item> <quantidade> para comprar",
                    iconURL: "https://i.ibb.co/N2NncX3f/informacoes.png"
                })
                .addFields(
                    Object.keys(itens).map(key => ({
                        name: `${itens[key].emoji} ${itens[key].nome}`,
                        value: `**<:coin1:1441491987537727669> ${itens[key].preco.toLocaleString("pt-BR")} moedas**`,
                        inline: true
                    }))
                );

            return message.reply({ embeds: [embed] });
        }


        // ===============================
        // COMPRA
        // ===============================
        const argItemBruto = args[0].toLowerCase();
        const quantidadeRaw = args[1] || "1";

        const quantidade = parseAmount(quantidadeRaw);

        if (!quantidade || quantidade <= 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❌ Quantidade inválida. Use números normais ou `1k`, `2m`, etc.")
                ]
            });
        }

        // Encontrar item
        const keyItem = Object.keys(itens).find(
            k => k === argItemBruto || itens[k].aliases.includes(argItemBruto)
        );

        if (!keyItem) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❌ Item não encontrado. Use `;loja` para ver os itens.")
                ]
            });
        }

        const item = itens[keyItem];

        const precoTotal = item.preco * quantidade;
        const precoFmt = precoTotal.toLocaleString("pt-BR");


        // Saldo insuficiente
        if (perfil.moedas < precoTotal) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(
                            `❌ Moedas insuficientes.\n` +
                            `💰 Preço: **${precoFmt}**\n` +
                            `💸 Seu saldo: **${perfil.moedas.toLocaleString("pt-BR")}**`
                        )
                ]
            });
        }

        // Debitar
        perfil.moedas -= precoTotal;

        // Inserir no inventário
        let itemInv = perfil.inventario.find(i => i.nome === keyItem);
        if (!itemInv) {
            perfil.inventario.push({ nome: keyItem, quantidade });
        } else {
            itemInv.quantidade += quantidade;
        }

        await perfil.save();


        // Nome plural automático
        const nomeFinal = quantidade === 1 ? item.nome : item.nomePlural;

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Compra realizada!")
            .setDescription(`<:compras:1442177278099591279> ${message.author}, sua compra foi concluída!`)
            .addFields(
                {
                    name: "Produto",
                    value: `${item.emoji} **${quantidade.toLocaleString("pt-BR")} ${nomeFinal}**`,
                    inline: true
                },
                {
                    name: "Preço Total",
                    value: `**<:coin1:1441491987537727669> ${precoFmt}**`,
                    inline: true
                },
                {
                    name: "Saldo Atual",
                    value: `**<:carteira:1440068592354725888> ${perfil.moedas.toLocaleString("pt-BR")}**`,
                    inline: true
                }
            );

        return message.reply({ embeds: [embed] });
    }
};
