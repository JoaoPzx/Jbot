const { EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");

module.exports = {
    name: "temacriar",
    description: "Cria um novo tema no banco de dados.",

    async execute(message, args) {
        if (!message.member.permissions.has("Administrator")) {
            return message.channel.send("❌ Você não tem permissão para usar este comando.");
        }

        const nomeOriginal = args[0]; // mantém exatamente como o usuário escreveu
        if (!nomeOriginal) {
            return message.channel.send("❌ Use: `;temacriar <nome_do_tema>`");
        }

        // Não permitir espaços (opção sua — posso liberar se quiser)
        if (nomeOriginal.includes(" ")) {
            return message.channel.send("❌ O nome do tema não pode conter espaços. Exemplo: `The100`, `HarryPotter`, `Valorant`.");
        }

        const nomeLower = nomeOriginal.toLowerCase();

        // Verificar se já existe tema com nomeLower
        const existente = await Tema.findOne({ nomeLower });
        if (existente) {
            return message.channel.send(`⚠️ O tema **${existente.nome}** já existe!`);
        }

        // Criar novo tema
        const novoTema = new Tema({
            nome: nomeOriginal,     // salva o nome exatamente como escrito
            nomeLower,              // salva versão padronizada para buscas
            criadoPor: message.author.id,
            dataCriacao: new Date(),
            banner: null,
            imagens: [],
            partidasJogadas: 0
        });

        await novoTema.save();

        // EMBED BONITO
        const embed = new EmbedBuilder()
            .setColor("#57F287") // verde Discord
            .setAuthor({
                name: "Jbot — Tema criado!",
                iconURL: message.client.user.displayAvatarURL()
            })
            .setDescription(`🎉 **Novo tema criado com sucesso!**`)
            .addFields(
                { name: "📌 Nome do Tema", value: `\`${nomeOriginal}\``, inline: false },
                { name: "🧩 Palavras", value: "`0`", inline: false },
                { name: "🧑‍💻 Criado por", value: `<@${message.author.id}>`, inline: false },
                { name: "🗓 Criado em", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Solicitado por ${message.author.username}` });

        return message.channel.send({ embeds: [embed] });
    }
};
