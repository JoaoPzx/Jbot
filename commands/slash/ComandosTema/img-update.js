const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");
const Tema = require("../../../models/Tema");
const cloudinary = require("../../Utility/cloudinary");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("img-update")
        .setDescription("Atualiza uma imagem ou resposta de um tema.")
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Selecione o tema.")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(opt =>
            opt.setName("resposta_atual")
                .setDescription("Resposta atual da imagem.")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(opt =>
            opt.setName("nova_resposta")
                .setDescription("Nova resposta (opcional).")
                .setRequired(false)
        )
        .addAttachmentOption(opt =>
            opt.setName("nova_imagem")
                .setDescription("Nova imagem (opcional).")
                .setRequired(false)
        ),

    // ==================================
    // AUTOCOMPLETE
    // ==================================
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);

        // Autocomplete do tema
        if (focused.name === "tema") {
            const temas = await Tema.find({});
            const value = focused.value.toLowerCase();

            const filtrados = temas
                .filter(t => (t.nomeOriginal || t.nome).toLowerCase().includes(value))
                .slice(0, 25)
                .map(t => ({
                    name: t.nomeOriginal || t.nome,
                    value: t.nomeLower
                }));

            return interaction.respond(filtrados);
        }

        // Autocomplete da resposta
        if (focused.name === "resposta_atual") {
            const temaLower = interaction.options.getString("tema");
            const tema = await Tema.findOne({ nomeLower: temaLower });
            if (!tema) return interaction.respond([]);

            const value = focused.value.toLowerCase();

            const respostas = tema.imagens
                .map(img => img.resposta)
                .filter(r => r.toLowerCase().includes(value))
                .slice(0, 25)
                .map(r => ({ name: r, value: r }));

            return interaction.respond(respostas);
        }
    },

    // ==================================
    // EXECUTAR
    // ==================================
    async execute(interaction) {
        const temaLower = interaction.options.getString("tema");
        const respostaAtual = interaction.options.getString("resposta_atual").toLowerCase();
        const novaResposta = interaction.options.getString("nova_resposta")?.toLowerCase() || null;
        const novaImagem = interaction.options.getAttachment("nova_imagem");

        const tema = await Tema.findOne({ nomeLower: temaLower });
        if (!tema) {
            return interaction.reply({
                ephemeral: true,
                embeds: [new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription("<:fecharerr:1442682279322325095> Tema não encontrado.")]
            });
        }

        const item = tema.imagens.find(img => img.resposta.toLowerCase() === respostaAtual);

        if (!item) {
            return interaction.reply({
                ephemeral: true,
                embeds: [new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription("<:fecharerr:1442682279322325095> Esta resposta não existe no tema.")]
            });
        }

        // ==================================
        // VERIFICAR DUPLICIDADE DE NOVA RESPOSTA
        // ==================================
        if (novaResposta) {
            const existe = tema.imagens.some(img =>
                img.resposta.toLowerCase() === novaResposta &&
                img.resposta.toLowerCase() !== respostaAtual
            );

            if (existe) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`<:fecharerr:1442682279322325095> Já existe um item com a resposta \`${novaResposta}\`.`)]
                });
            }
        }

        // ==================================
        // ATUALIZAR IMAGEM (se enviada)
        // ==================================
        if (novaImagem) {
            if (!novaImagem.contentType?.startsWith("image/")) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> O arquivo enviado não é uma imagem válida.")]
                });
            }

            // Deletar imagem antiga
            try {
                const publicId = item.url.split("/").slice(-1)[0].split(".")[0];
                await cloudinary.uploader.destroy(`jbot/${temaLower}/${publicId}`);
            } catch (err) {
                console.error("Erro ao deletar imagem antiga:", err);
            }

            // Subir nova imagem
            const respostaID = (novaResposta || respostaAtual)
                .replace(/[^a-z0-9]/gi, "_")
                .toLowerCase();

            let upload;
            try {
                upload = await cloudinary.uploader.upload(novaImagem.url, {
                    folder: `jbot/${temaLower}`,
                    public_id: respostaID,
                    resource_type: "image",
                    format: "png",
                    transformation: [
                        { fetch_format: "auto" },
                        { quality: "auto:best" }
                    ]
                });
            } catch (err) {
                console.error(err);
                return interaction.reply({
                    ephemeral: true,
                    embeds: [new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Erro ao salvar nova imagem no Cloudinary.")]
                });
            }

            item.url = upload.secure_url;
        }

        // ==================================
        // ATUALIZAR A RESPOSTA (se enviada)
        // ==================================
        if (novaResposta) {
            item.resposta = novaResposta;
        }

        await tema.save();

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(`<:checkjf:1443729850568413256> **Imagem atualizada com sucesso!**\n\n**<:tema:1440424182759428206> Tema:** \`${tema.nomeOriginal}\`\n\n**<:questionsjf:1442959438720929822> Resposta atualizada:** \`${item.resposta}\``);

        return interaction.reply({ embeds: [embed] });
    }
};
