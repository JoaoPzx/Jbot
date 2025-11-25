const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");

module.exports = {
    name: "ver",
    aliases: ["show"],
    description: "Mostra uma imagem aleatória de um tema.",

    async execute(message, args) {

        // === Função utilitária de embed ===
        const criarEmbed = (cor, texto) => {
            return new EmbedBuilder()
                .setColor(cor)
                .setDescription(texto)
        };

        // === Validação: parâmetro ausente ===
        if (!args[0])
            return message.reply({
                embeds: [
                    criarEmbed("Yellow", "<:avisojf:1442687822208303215> **Uso correto:** `;imgshow <tema> <resposta opcional>`")
                ]
            });

        // Normalizar valores
        const entradaTema = args.shift().toLowerCase().trim();
        const entradaResp = args.join(" ").toLowerCase().trim();

        // Buscar temas
        const temas = await Tema.find({});
        if (!temas.length)
            return message.reply({
                embeds: [
                    criarEmbed("Yellow", "<:avisojf:1442687822208303215> **Nenhum tema cadastrado ainda.**")
                ]
            });

        // Buscar tema por abreviação
        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entradaTema)
        );

        if (!tema)
            return message.reply({
                embeds: [
                    criarEmbed("Red", `<:fecharerr:1442682279322325095> **O tema \`${entradaTema}\` não existe.**`)
                ]
            });

        // Tema sem imagens
        if (!tema.imagens.length)
            return message.reply({
                embeds: [
                    criarEmbed("Yellow", `<:mailboxjf:1442960089085382928> **O tema \`${tema.nomeOriginal || tema.nome}\` não possui imagens.**`)
                ]
            });

        let imagem;

        // Buscar imagem específica pela resposta
        if (entradaResp) {
            imagem = tema.imagens.find(img =>
                img.resposta.toLowerCase() === entradaResp
            );
            if (!imagem)
                return message.reply({
                    embeds: [
                        criarEmbed("Red", `<:fecharerr:1442682279322325095> **Nenhuma imagem encontrada com a resposta \`${entradaResp}\`.**`)
                    ]
                });
        } else {
            imagem = tema.imagens[tema.imagens.length - 1];
        }

        // === Informações formatadas ===
        const insignia = tema.insigniaEmoji || "";
        const temaNomeFinal = `${insignia} ${tema.nomeOriginal || tema.nome}`.trim();

        const addedBy = imagem.addedBy
            ? `<@${imagem.addedBy}>`
            : "Desconhecido";

        const dataAdicao = imagem.addedAt
            ? `<t:${Math.floor(new Date(imagem.addedAt).getTime() / 1000)}:f>`
            : "Não informada";

        // === Embed final ===
        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .addFields(
                { name: "Tema", value: temaNomeFinal, inline: true },
                { name: "Resposta", value: `<:questionsjf:1442959438720929822> \`${imagem.resposta}\``, inline: true },
                { name: "Adicionado por", value: `<:user:1440074090663645355> ${addedBy}`, inline: true },
                { name: "Data", value: `<:calendariorec:1439655247579447326> ${dataAdicao}`, inline: true }
            )
            .setImage(imagem.url)
            .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
            

        return message.reply({ embeds: [embed] });
    }
};
