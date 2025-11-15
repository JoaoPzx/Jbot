const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder
} = require("discord.js");

const Tema = require("../../models/Tema");
const { redimensionarBanner } = require("../../commands/Utility/redimensionarBanner");

// =====================
// EMBED PADRÃO (ERRO)
// =====================
function embedErro(txt) {
    return new EmbedBuilder()
        .setColor("#ff4d4d")
        .setDescription(`❌ ${txt}`);
}

// =====================
// EMBED SUCESSO
// =====================
function embedSucesso(temaNome, url, atualizado) {
    return new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎨 Banner do Tema Atualizado")
        .addFields(
            { name: "Tema", value: `**${temaNome}**`, inline: true },
            {
                name: "Status",
                value: atualizado ? "🔄 Atualizado" : "🆕 Adicionado",
                inline: true
            }
        )
        .setImage(url)
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("banner")
        .setDescription("Adiciona ou atualiza o banner de um tema.")
        .addAttachmentOption(opt =>
            opt.setName("imagem")
                .setDescription("Envie a imagem (anexo, arrastada ou copiar imagem).")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Nome do tema (com autocomplete).")
                .setAutocomplete(true)
                .setRequired(true)
        ),

    // ==========================
    // AUTOCOMPLETE
    // ==========================
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();

        const temas = await Tema.find({});
        const lista = temas
            .map(t => t.nomeOriginal || t.nome)
            .filter(n => n.toLowerCase().includes(focused))
            .slice(0, 25);

        return interaction.respond(lista.map(n => ({
            name: n,
            value: n
        })));
    },

    // ==========================
    // EXECUTAR COMANDO
    // ==========================
    async execute(interaction) {

        const imagem = interaction.options.getAttachment("imagem");
        const entradaRaw = interaction.options.getString("tema");
        const entrada = entradaRaw.toLowerCase();

        // ==========================
        // VALIDAÇÃO
        // ==========================
        if (!imagem.contentType?.startsWith("image/")) {
            return interaction.reply({
                embeds: [embedErro("A imagem deve ser PNG, JPG, JPEG ou WEBP.")],
                ephemeral: true
            });
        }

        const temas = await Tema.find({});
        if (!temas.length) {
            return interaction.reply({
                embeds: [embedErro("Nenhum tema cadastrado.")],
                ephemeral: true
            });
        }

        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        const tema = ordenados.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema) {
            return interaction.reply({
                embeds: [embedErro(`Nenhum tema encontrado correspondente a **${entradaRaw}**.`)],
                ephemeral: true
            });
        }

        const nomeExibir = tema.nomeOriginal || tema.nome;

        // ==========================
        // REDIMENSIONAR
        // ==========================
        let bufferFinal;
        try {
            bufferFinal = await redimensionarBanner(imagem.url);
        } catch (e) {
            console.error(e);
            return interaction.reply({
                embeds: [embedErro("Erro ao processar a imagem enviada.")],
                ephemeral: true
            });
        }

        const novoArquivo = new AttachmentBuilder(bufferFinal, {
            name: `${tema.nomeLower}_banner.jpg`
        });

        // ==========================
        // ENVIAR E PEGAR URL FINAL
        // ==========================
        let msgTemp;
        try {
            msgTemp = await interaction.channel.send({ files: [novoArquivo] });
        } catch (e) {
            return interaction.reply({
                embeds: [embedErro("Falha ao gerar a URL final do banner.")],
                ephemeral: true
            });
        }

        const rawURL = msgTemp.attachments.first()?.url;
        const cdnURL = rawURL.split("?")[0]; // remove parâmetros

        // Aguarda replicação da CDN e remove o anexo
        setTimeout(() => {
            msgTemp.delete().catch(() => {});
        }, 6000);

        // ==========================
        // SALVAR NO BANCO
        // ==========================
        const foiAtualizado = !!tema.banner;

        tema.banner = cdnURL;
        await tema.save();

        // ==========================
        // RESPOSTA FINAL
        // ==========================
        return interaction.reply({
            embeds: [embedSucesso(nomeExibir, cdnURL, foiAtualizado)]
        });
    },
};
