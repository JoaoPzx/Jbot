const { EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");

module.exports = {
    name: "imgdelete",
    description: "Remove uma imagem de um tema pela resposta.",

    async execute(message, args) {

        // 1) PERMISSÃO
        if (!message.member.permissions.has("Administrator")) {
            return message.reply("❌ Você não tem permissão para usar este comando.");
        }

        if (!args.length) {
            return message.reply("❌ Uso correto: `;imgdelete <tema> <resposta>`");
        }

        /* =====================================================
           2) PROCESSAR ABREVIAÇÃO DO TEMA
        ====================================================== */
        const entradaRaw = args.shift();
        const entrada = entradaRaw.toLowerCase();

        const temas = await Tema.find({});
        if (!temas.length) {
            return message.reply("❌ Não há temas cadastrados.");
        }

        // Ordenar alfabeticamente por nomeOriginal
        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        // Buscar pela abreviação (ex: "t" → "The100")
        const tema = ordenados.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema) {
            return message.reply(`❌ Nenhum tema encontrado correspondente a **${entradaRaw}**.`);
        }

        const temaNomeExibir = tema.nomeOriginal || tema.nome;

        /* =====================================================
           3) PROCESSAR RESPOSTA A SER REMOVIDA
        ====================================================== */
        const resposta = args.join(" ").toLowerCase().trim();

        if (!resposta) {
            return message.reply("❌ Você precisa informar a resposta a ser removida.");
        }

        /* =====================================================
           4) BUSCAR A IMAGEM PELA RESPOSTA
        ====================================================== */
        const index = tema.imagens.findIndex(
            img => img.resposta.toLowerCase() === resposta
        );

        if (index === -1) {
            return message.reply(
                `❌ Nenhuma imagem com a resposta **${resposta}** foi encontrada no tema **${temaNomeExibir}**.`
            );
        }

        const removida = tema.imagens[index];

        /* =====================================================
           5) REMOVER E SALVAR
        ====================================================== */
        tema.imagens.splice(index, 1);
        await tema.save();

        /* =====================================================
           6) CONFIRMAÇÃO
        ====================================================== */
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("🗑️ Imagem Removida")
            .setDescription(
                `A imagem com resposta **\`${resposta}\`** foi removida do tema **\`${temaNomeExibir}\`**.`
            )
            .setThumbnail(removida.url)
            .setFooter({ text: "Ação concluída com sucesso!" });

        return message.channel.send({ embeds: [embed] });
    },
};
