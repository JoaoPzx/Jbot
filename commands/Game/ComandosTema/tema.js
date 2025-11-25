const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");

// Monta o nome com o emoji da insígnia
function nomeComInsignia(tema) {
    if (tema.insigniaEmoji) {
        return `${tema.insigniaEmoji} ${tema.nomeOriginal || tema.nome}`;
    }
    return tema.nomeOriginal || tema.nome;
}

module.exports = {
    name: "tema",
    description: "Mostra informações detalhadas sobre um tema.",

    async execute(message, args) {

        function erro(txt) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setDescription(`<:fecharerr:1442682279322325095> ${txt}`)
                ],
                allowedMentions: { repliedUser: false }
            });
        }

        // ==============================
        // ARGUMENTO
        // ==============================
        const entradaRaw = args[0];
        if (!entradaRaw) return erro("Uso correto: `;temainfo <tema>`");

        const entrada = entradaRaw.toLowerCase();

        // ==============================
        // CARREGAR TEMAS
        // ==============================
        const temas = await Tema.find({});
        if (!temas.length) return erro("Não há temas cadastrados.");

        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        // ==============================
        // BUSCA (mesma lógica do ;play)
        // ==============================
        const tema = ordenados.find(t => {
            const nome = (t.nomeOriginal || t.nome).toLowerCase();
            return (
                nome.startsWith(entrada) ||
                nome.includes(entrada) ||
                t.nomeLower === entrada
            );
        });

        if (!tema) return erro(`O tema **${entradaRaw}** não existe.`);

        // ==============================
        // DADOS
        // ==============================
        const nomeExibir = nomeComInsignia(tema);
        const totalImagens = tema.imagens?.length ?? 0;
        const criadoPor = tema.criadoPor ? `<@${tema.criadoPor}>` : "Desconhecido";
        const ultimaImagem = totalImagens > 0
            ? `\`${tema.imagens[tema.imagens.length - 1].resposta}\``
            : "Nenhuma imagem";

        // ==============================
// RECORDISTA
// ==============================
        let textoRecordista;

        if (tema.record?.userId && tema.record?.pontos > 0) {
        textoRecordista = `<@${tema.record.userId}> - **${tema.record.pontos} pontos**`;
        } else {
    // Se não houver recordista → BOT é o recordista padrão
        textoRecordista = `<@${message.client.user.id}> - **0 pontos**`;
}


        // ==============================
        // EMBED
        // ==============================
        const embed = new EmbedBuilder()
            .setColor("#3498db")
            .setDescription("**<:tema:1440424182759428206> INFORMAÇÕES DO TEMA**")
            .setAuthor({name: message.client.user.username, iconURL: message.client.user.displayAvatarURL()})
            .addFields(
                { name: "Nome", value: `**${nomeExibir}**`, inline: true },
                { name: "Imagens", value: `<:imagemjbot:1440425616359952445> **${totalImagens}**`, inline: true },
                { name: "Recordista", value: `<:medalrec:1442253575576354876> ${textoRecordista}`, inline: true },
                { name: "Criado por", value: `<:criador:1440422996652064838> ${criadoPor}`, inline: true },
                { name: "Criado em", value: `<:calendariorec:1439655247579447326> <t:${Math.floor(new Date(tema.dataCriacao).getTime() / 1000)}:d>`, inline: true},
                { name: "Última adição", value: `<:newjbot:1440423555744534699> ${ultimaImagem}`, inline: true }
            )
            .setFooter({text: `Solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()})
            .setTimestamp();

        // ==============================
// BANNER (tema ou padrão)
// ==============================
const { BANNER_PADRAO } = require("../../Utility/banners");
const bannerFinal = tema.banner || BANNER_PADRAO;

embed.setImage(bannerFinal);


        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: true } });
    }
};
