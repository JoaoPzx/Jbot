const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");

module.exports = {
    name: "resetrecord",
    aliases: ["rr", "resetrec", "zerarrecord"],
    description: "Reseta o recordista de um tema.",

    async execute(message, args) {
        if (!message.member.permissions.has("Administrator")) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Você não tem permissão para usar este comando.")
                ],
                allowedMentions: { repliedUser: false }
            });
        }

        if (!args[0]) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Uso correto: `;resetrecord <tema>`")
                ],
                allowedMentions: { repliedUser: false }
            });
        }

        const entrada = args[0].toLowerCase();
        const temas = await Tema.find({});

        if (!temas.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Nenhum tema cadastrado.")
                ],
                allowedMentions: { repliedUser: false }
            });
        }

        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`<:fecharerr:1442682279322325095> Nenhum tema encontrado para **${entrada}**.`)
                ],
                allowedMentions: { repliedUser: false }
            });
        }

        // Insignia no nome do tema
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeExibir = `${insignia}${tema.nomeOriginal || tema.nome}`;

        if (!tema.record?.userId) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#f1c40f")
                        .setDescription(`⚠️ O tema **${nomeExibir}** não possui recorde registrado.`)
                ],
                allowedMentions: { repliedUser: false }
            });
        }

        tema.record = {
            userId: null,
            pontos: 0,
            data: null
        };
        await tema.save();

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("🔁 Recorde Resetado!")
        .setDescription(
            `O recorde do tema **${nomeExibir}** foi **resetado com sucesso**!\n\n` +
            `Agora **qualquer jogador** pode conquistar o trono novamente e se tornar o **novo lendário recordista!** ✨`
        );

        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
};
