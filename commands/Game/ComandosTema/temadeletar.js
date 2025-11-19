const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");
const Tema = require("../../../models/Tema");

// ===============================
// EMBEDS PADRÃO (erro / aviso)
// ===============================
function embedErro(message, texto) {
    return {
        embeds: [
            new EmbedBuilder()
                .setColor("#ff4d4d")
                .setAuthor({
                    name: message.client.user.username,
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setDescription(`❌ ${texto}`)
        ],
        allowedMentions: { repliedUser: false }
    };
}

module.exports = {
    name: "temadeletar",
    description: "Deleta um tema existente com confirmação.",

    async execute(message, args) {

        // 1) PERMISSÃO
        if (!message.member.permissions.has("Administrator")) {
            return message.reply(embedErro(message, "Você não tem permissão para usar este comando."));
        }

        if (!args.length) {
            return message.reply(embedErro(message, "Uso correto: `;temadeletar <tema>`"));
        }

        /* =====================================================
           2) Buscar tema pela abreviação
        ====================================================== */
        const entradaRaw = args[0];
        const entrada = entradaRaw.toLowerCase();

        const temas = await Tema.find({});
        if (!temas.length)
            return message.reply(embedErro(message, "Não há temas cadastrados."));

        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        const tema = ordenados.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema)
            return message.reply(embedErro(message, `Nenhum tema encontrado correspondente a **${entradaRaw}**.`));

        const temaNomeExibir = tema.nomeOriginal || tema.nome;

        /* =====================================================
           3) EMBED DE CONFIRMAÇÃO
        ====================================================== */
        const embedConfirm = new EmbedBuilder()
            .setColor("#ED4245")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("⚠️ Confirmar exclusão do tema?")
            .setDescription(
                `Você está prestes a excluir o tema **\`${temaNomeExibir}\`**.\n` +
                `Esta ação é **irreversível** e removerá todas as imagens e respostas associadas.`
            )
            .setFooter({ text: "Confirme abaixo para continuar." });

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("confirmar_deletar_tema")
                .setLabel("Excluir Tema")
                .setEmoji("🗑️")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("cancelar_deletar_tema")
                .setLabel("Cancelar")
                .setEmoji("❌")
                .setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({
            embeds: [embedConfirm],
            components: [botoes]
        });

        /* =====================================================
           4) COLETOR DE BOTÕES
        ====================================================== */
        const coletor = msg.createMessageComponentCollector({
            filter: i =>
                ["confirmar_deletar_tema", "cancelar_deletar_tema"].includes(i.customId),
            time: 15000
        });

        coletor.on("collect", async (i) => {

            // Apenas quem executou pode clicar
            if (i.user.id !== message.author.id) {
                return i.reply({
                    content: "❌ Apenas quem executou o comando pode confirmar.",
                    ephemeral: true
                });
            }

            /* ===== CANCELAR ===== */
            if (i.customId === "cancelar_deletar_tema") {
                coletor.stop("cancelado");

                return i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#99AAB5")
                            .setAuthor({
                                name: message.client.user.username,
                                iconURL: message.client.user.displayAvatarURL()
                            })
                            .setDescription("❌ Ação cancelada.")
                    ],
                    components: []
                });
            }

            /* ===== CONFIRMAR ===== */
            if (i.customId === "confirmar_deletar_tema") {
                coletor.stop("confirmado");

                await Tema.deleteOne({ _id: tema._id });

                return i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setAuthor({
                                name: message.client.user.username,
                                iconURL: message.client.user.displayAvatarURL()
                            })
                            .setTitle("🗑️ Tema Deletado")
                            .setDescription(`O tema **\`${temaNomeExibir}\`** foi removido com sucesso!`)
                            .setFooter({ text: "Ação concluída com sucesso!" })
                    ],
                    components: []
                });
            }
        });

        /* =====================================================
           5) TEMPO ESGOTADO
        ====================================================== */
        coletor.on("end", (_, motivo) => {
            if (["confirmado", "cancelado"].includes(motivo)) return;

            msg.edit({
                embeds: [
                    embedConfirm.setFooter({ text: "⏳ Tempo esgotado — operação cancelada." })
                ],
                components: []
            }).catch(() => {});
        });
    },
};
