const { EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");

module.exports = {
    name: "palavras",
    description: "Lista todas as palavras de um tema, com visual aprimorado e suporte a abreviação.",

    async execute(message, args) {

        const entradaRaw = args[0];
        if (!entradaRaw) {
            return message.reply("❌ Uso correto: `;palavras <tema>`");
        }

        const entrada = entradaRaw.toLowerCase();

        const temas = await Tema.find({});
        if (!temas.length) {
            return message.reply("❌ Não há temas cadastrados.");
        }

        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        const tema = ordenados.find(t =>
            (t.nomeOriginal || t.nome || "").toLowerCase().startsWith(entrada)
        );

        if (!tema) {
            return message.reply(`❌ O tema **${entradaRaw}** não existe.`);
        }

        if (!tema.imagens.length) {
            return message.reply(`⚠️ O tema **${tema.nomeOriginal || tema.nome}** não possui palavras cadastradas.`);
        }

        // ✅ CORRIGIDO: usa a insígnia REAL salva no banco
        const insignia = tema.insigniaEmoji ? tema.insigniaEmoji + " " : "";
        const nomeFinal = `${insignia}${tema.nomeOriginal || tema.nome}`;

        const total = tema.imagens.length;

        const palavrasOrdenadas = tema.imagens
            .map(img => img.resposta.toUpperCase())
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

        const lista = "```\n" + palavrasOrdenadas.join("\n") + "\n```";

        const embed = new EmbedBuilder()
            .setColor("#9b59b6")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle(`📝 Palavras do tema: ${nomeFinal}`)
            .setDescription(`**1 – ${total}**\n\n${lista}`)
            .setFooter({
                text: `${total} palavra(s) cadastrada(s) • solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
