const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");
const { BANNER_PADRAO } = require("../../Utility/banners");

// Função para mostrar nome com insígnia
function nomeComInsignia(tema) {
    if (tema.insigniaEmoji) {
        return `${tema.insigniaEmoji} ${tema.nomeOriginal || tema.nome}`;
    }
    return tema.nomeOriginal || tema.nome;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("temainfo")
        .setDescription("Mostra informações detalhadas sobre um tema.")
        .addStringOption(option =>
            option.setName("tema")
                .setDescription("Selecione ou digite o nome do tema.")
                .setAutocomplete(true)
                .setRequired(true)
        ),

    // ==============================
    // AUTOCOMPLETE
    // ==============================
    async autocomplete(interaction) {
        const value = interaction.options.getFocused()?.toLowerCase() || "";
        const temas = await Tema.find({});

        const filtrados = temas
            .filter(t => (t.nomeOriginal || t.nome).toLowerCase().includes(value))
            .sort((a, b) => (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome))
            .slice(0, 25)
            .map(t => ({
                name: `${t.nomeOriginal}`,
                value: t.nomeLower
            }));

        return interaction.respond(filtrados);
    },

    // ==============================
    // EXECUÇÃO DO COMANDO
    // ==============================
    async execute(interaction) {

        function erro(txt) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setAuthor({
                            name: interaction.client.user.username,
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                        .setDescription(`<:fecharerr:1442682279322325095> ${txt}`)
                ],
                ephemeral: true
            });
        }

        const entrada = interaction.options.getString("tema").toLowerCase();
        const temas = await Tema.find({});
        if (!temas.length) return erro("Não há temas cadastrados.");

        const tema = temas.find(t => t.nomeLower === entrada);
        if (!tema) return erro(`O tema **${entrada}** não existe.`);

        const nomeExibir = nomeComInsignia(tema);
        const totalImagens = tema.imagens?.length ?? 0;
        const criadoPor = tema.criadoPor ? `<@${tema.criadoPor}>` : "Desconhecido";

        // Última imagem adicionada (apenas nome)
        const ultimaImagem = totalImagens > 0
            ? `\`${tema.imagens[tema.imagens.length - 1].resposta}\``
            : "Nenhuma imagem";

        // Recordista
        const textoRecordista = (tema.record?.userId && tema.record?.pontos > 0)
            ? `<@${tema.record.userId}> - **${tema.record.pontos} pontos**`
            : `<@${interaction.client.user.id}> - **0 pontos**`;

        // ==============================
        // EMBED FINAL
        // ==============================
        const embed = new EmbedBuilder()
            .setColor("#3498db")
            .setDescription("**<:tema:1440424182759428206> INFORMAÇÕES DO TEMA**")
            .setAuthor({
                name: interaction.client.user.username,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .addFields(
                { name: "Nome", value: `**${nomeExibir}**`, inline: true },
                { name: "Imagens", value: `<:imagemjbot:1440425616359952445> **${totalImagens}**`, inline: true },
                { name: "Recordista", value: `<:medalrec:1442253575576354876> ${textoRecordista}`, inline: true },
                { name: "Criado por", value: `<:criador:1440422996652064838> ${criadoPor}`, inline: true },
                { name: "Criado em", value: `<:calendariorec:1439655247579447326> <t:${Math.floor(new Date(tema.dataCriacao).getTime() / 1000)}:d>`, inline: true},
                { name: "Última adição", value: `<:newjbot:1440423555744534699> ${ultimaImagem}`, inline: true }
            )
            .setFooter({
                text: `Solicitado por ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        // Banner
        embed.setImage(tema.banner || BANNER_PADRAO);

        return interaction.reply({ embeds: [embed] });
    }
};
