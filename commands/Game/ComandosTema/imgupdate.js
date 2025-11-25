const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");

module.exports = {
    name: "imgupdate",
    description: "Atualiza a resposta e/ou imagem de um tema existente.",

    async execute(message, args) {
        if (!message.member.permissions.has("Administrator")) {
            return message.channel.send("<:fecharerr:1442682279322325095> Você não tem permissão para usar este comando.");
        }

        if (!args[0]) {
            return message.channel.send(
                "<:fecharerr:1442682279322325095> Uso: `;imgupdate <tema> <resposta_antiga> <nova_resposta>` + nova imagem (opcional)"
            );
        }

        /* =====================================================
           1) PROCESSAR ABREVIAÇÃO DO TEMA
        ====================================================== */
        const entradaRaw = args.shift();
        const entrada = entradaRaw.toLowerCase();

        const temas = await Tema.find({});
        if (!temas.length) return message.reply("<:fecharerr:1442682279322325095> Não há temas cadastrados.");

        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        const tema = ordenados.find(
            t => (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema) {
            return message.channel.send(`<:fecharerr:1442682279322325095> O tema **${entradaRaw}** não existe.`);
        }

        /* =====================================================
           2) LER ANTIGA E NOVA RESPOSTA
           Suporte a respostas com espaços usando aspas
        ====================================================== */
        const fullArgs = args.join(" ");
        let antigaResposta, novaResposta;

        const regex = /"([^"]+)"\s+(.+)/;
        const match = fullArgs.match(regex);

        if (match) {
            antigaResposta = match[1].toLowerCase();
            novaResposta = match[2].toLowerCase();
        } else {
            const split = Math.floor(args.length / 2);
            antigaResposta = args.slice(0, split).join(" ").toLowerCase();
            novaResposta = args.slice(split).join(" ").toLowerCase();
        }

        if (!antigaResposta || !novaResposta) {
            return message.channel.send("<:fecharerr:1442682279322325095> Use: `;imgupdate tema \"resposta antiga\" nova resposta`");
        }

        /* =====================================================
           3) ENCONTRAR A IMAGEM
        ====================================================== */
        const imagem = tema.imagens.find(img => img.resposta === antigaResposta);

        if (!imagem) {
            return message.channel.send(
                `<:avisojf:1442687822208303215> A resposta **${antigaResposta}** não foi encontrada no tema **${tema.nomeOriginal}**.`
            );
        }

        /* =====================================================
           4) ATUALIZAR IMAGEM SE HOUVER ANEXO
        ====================================================== */
        const attachment = message.attachments.first();
        const urlRegex = /(https?:\/\/[^\s]+)/gi;

        if (attachment) {
            await new Promise(r => setTimeout(r, 1200));
            imagem.url = attachment.url.split("?")[0]; // limpa parâmetros
        } else {
            // Verifica se há link no texto
            const link = fullArgs.match(urlRegex);
            if (link) imagem.url = link[0].split("?")[0];
        }

        /* =====================================================
           5) ATUALIZAR RESPOSTA
        ====================================================== */
        imagem.resposta = novaResposta.toLowerCase();

        await tema.save();

        /* =====================================================
           6) EMBED BONITO DE CONFIRMAÇÃO
        ====================================================== */
        const embed = new EmbedBuilder()
            .setColor("Yellow")
            .setAuthor({
                name: "Imagem atualizada ✔️",
                iconURL: message.client.user.displayAvatarURL()
            })
            .setDescription(
                `🖼 **Tema:** \`${tema.nomeOriginal}\`\n` +
                `✏️ **De:** \`${antigaResposta}\`\n` +
                `➡️ **Para:** \`${novaResposta}\``
            )
            .setThumbnail(imagem.url)
            .setFooter({ text: `Atualizado por ${message.author.username}` });

        return message.channel.send({ embeds: [embed] });
    }
};
