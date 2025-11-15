const { EmbedBuilder } = require('discord.js');
const Tema = require('../../models/Tema');

module.exports = {
    name: 'imgshow',
    description: 'Mostra uma imagem e sua resposta de um tema.',

    async execute(message, args) {

        // =============================
        // 1. VALIDAR ARGUMENTOS
        // =============================
        const temaArg = args.shift()?.toLowerCase();
        const resposta = args.join(" ").toLowerCase();

        if (!temaArg || !resposta) {
            return message.reply({
                content: "❌ Uso correto: `;imgshow <tema> <resposta>`",
                allowedMentions: { repliedUser: false }
            });
        }

        // =============================
        // 2. BUSCAR TEMA PELO nomeLower
        // =============================
        const tema = await Tema.findOne({ nomeLower: temaArg });

        if (!tema) {
            return message.reply({
                content: `⚠️ O tema **${temaArg}** não existe.`,
                allowedMentions: { repliedUser: false }
            });
        }

        const nomeExibir = tema.nomeOriginal;

        // =============================
        // 3. BUSCAR IMAGEM PELA RESPOSTA
        // =============================
        const imagem = tema.imagens.find(img => img.resposta.toLowerCase() === resposta);

        if (!imagem) {
            return message.reply({
                content: `⚠️ Nenhuma imagem encontrada para **${resposta}** no tema **${nomeExibir}**.`,
                allowedMentions: { repliedUser: false }
            });
        }

        // =============================
        // 4. EMBED
        // =============================
        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle(`🖼️ Tema: ${nomeExibir}`)
            .setDescription(`💬 **Resposta:** ${imagem.resposta}`)
            .setImage(imagem.url)
            .setFooter({
                text: `Comando solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        // =============================
        // 5. RESPONDER
        // =============================
        return message.reply({
            embeds: [embed],
            allowedMentions: { repliedUser: false }
        });
    },
};
