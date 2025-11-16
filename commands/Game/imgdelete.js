const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const Tema = require("../../models/Tema");
const cloudinary = require("../../commands/Utility/cloudinary");

// Formata o nome do tema com insígnia
function nomeComInsignia(tema) {
    return tema.insigniaEmoji
        ? `${tema.insigniaEmoji} ${tema.nomeOriginal || tema.nome}`
        : (tema.nomeOriginal || tema.nome);
}

// Embed de erro padrão
function embedErro(txt, message) {
    return message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor("#ff4d4d")
                .setAuthor({
                    name: message.client.user.username,
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setDescription(`❌ ${txt}`)
        ],
        allowedMentions: { repliedUser: false }
    });
}

module.exports = {
    name: "imgdelete",
    description: "Remove uma imagem de um tema pela resposta.",

    async execute(message, args) {

        // 1️⃣ Permissão
        if (!message.member.permissions.has("Administrator"))
            return embedErro("Você não tem permissão para usar este comando.", message);

        if (!args.length)
            return embedErro("Uso correto: `;imgdelete <tema> <resposta>`", message);

        // 2️⃣ Processar tema (aceita abreviação)
        const entradaRaw = args.shift();
        const entrada = entradaRaw.toLowerCase();

        const temas = await Tema.find({});
        if (!temas.length) return embedErro("Não há temas cadastrados.", message);

        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema)
            return embedErro(`Nenhum tema encontrado correspondente a **${entradaRaw}**.`, message);

        const nomeExibir = nomeComInsignia(tema);

        // 3️⃣ Processar resposta da imagem
        const resposta = args.join(" ").toLowerCase().trim();
        if (!resposta)
            return embedErro("Você precisa informar a resposta a ser removida.", message);

        const imgIndex = tema.imagens.findIndex(img =>
            img.resposta.toLowerCase() === resposta
        );

        if (imgIndex === -1)
            return embedErro(
                `Nenhuma imagem com a resposta **${resposta}** foi encontrada no tema **${nomeExibir}**.`,
                message
            );

        const imagem = tema.imagens[imgIndex];

        // 4️⃣ Confirmação com botões
        const embedConfirm = new EmbedBuilder()
            .setColor("#f1c40f")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setDescription(
                `⚠️ Confirmar exclusão da imagem?\n\n` +
                `📘 **Tema:** ${nomeExibir}\n` +
                `💬 **Resposta:** \`${resposta}\``
            )
            .setImage(imagem.url);

        const btns = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("delete_confirm")
                .setLabel("Sim, excluir")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("delete_cancel")
                .setLabel("Cancelar")
                .setStyle(ButtonStyle.Secondary)
        );

        const msgConfirm = await message.reply({
            embeds: [embedConfirm],
            components: [btns],
            allowedMentions: { repliedUser: false }
        });

        // Botões Collector
        const collector = msgConfirm.createMessageComponentCollector({
            time: 15000
        });

        collector.on("collect", async i => {
            if (i.user.id !== message.author.id)
                return i.reply({ content: "❌ Só quem executou o comando pode interagir.", ephemeral: true });

            if (i.customId === "delete_cancel") {
                collector.stop("cancelado");
                return i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#2ecc71")
                            .setDescription("Operação cancelada ✔️")
                    ],
                    components: []
                });
            }

            // 5️⃣ Remover da Cloudinary
            try {
                const publicId = imagem.url.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`jbot/${tema.nomeLower}/${publicId}`);
            } catch {}

            // 6️⃣ Remover do banco
            tema.imagens.splice(imgIndex, 1);
            await tema.save();

            collector.stop("removido");

            return i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#e74c3c")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setTitle("🗑️ Imagem Removida")
                        .setDescription(
                            `Imagem removida do tema **${nomeExibir}**!\n` +
                            `💬 Resposta: \`${resposta}\``
                        )
                        .setThumbnail(imagem.url)
                ],
                components: []
            });
        });

        collector.on("end", (_, motivo) => {
            if (motivo === "time") {
                msgConfirm.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("⏳ Tempo expirado, operação cancelada automaticamente.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }
};
