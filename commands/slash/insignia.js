const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder
} = require("discord.js");

const Tema = require("../../models/Tema");
const axios = require("axios");
const sharp = require("sharp");

function erro(txt) {
    return new EmbedBuilder().setColor("#ff4d4d").setDescription(`❌ ${txt}`);
}

function ok(txt) {
    return new EmbedBuilder().setColor("#f1c40f").setDescription(txt);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("insignia")
        .setDescription("Define uma insígnia para um tema, criando um EMOJI custom no servidor.")

        // obrigatório primeiro
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Escolha o tema.")
                .setAutocomplete(true)
                .setRequired(true)
        )

        // opcionais
        .addAttachmentOption(opt =>
            opt.setName("imagem")
                .setDescription("Imagem PNG/JPG/WEBP para transformar em EMOJI.")
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("emoji")
                .setDescription("Emoji custom (Ex: <:Insig_The100:123>)")
                .setRequired(false)
        ),

    // ==============================
    // AUTOCOMPLETE DOS TEMAS
    // ==============================
    async autocomplete(interaction) {
        try {
            const focused = interaction.options.getFocused().toLowerCase();

            const temas = await Tema.find({});
            const lista = temas
                .map(t => t.nomeOriginal || t.nome)
                .filter(n => n.toLowerCase().includes(focused))
                .slice(0, 25);

            return interaction.respond(lista.map(n => ({ name: n, value: n })));
        } catch (err) {
            console.error("Erro no autocomplete /insignia:", err);
            return interaction.respond([]);
        }
    },

    // ==============================
    // EXECUÇÃO DO COMANDO
    // ==============================
    async execute(interaction) {

        const temaInput = interaction.options.getString("tema");
        const temaLower = temaInput.toLowerCase().replace(/\s+/g, "");
        const tema = await Tema.findOne({ nomeLower: temaLower });

        if (!tema)
            return interaction.reply({ embeds: [erro("Tema não encontrado.")], ephemeral: true });

        const imagem = interaction.options.getAttachment("imagem");
        const emojiString = interaction.options.getString("emoji");

        const guild = interaction.guild;

        // ==============================
        // PASSO 1 — remover emoji antigo
        // ==============================
        if (tema.insigniaEmojiId) {
            const oldEmoji = guild.emojis.cache.get(tema.insigniaEmojiId);
            if (oldEmoji) {
                try { await oldEmoji.delete("Atualizando insígnia"); } catch {}
            }
        }

        // ==============================
        // PRIORIDADE — EMOJI CUSTOM DO USUÁRIO
        // ==============================
        if (emojiString) {
            const match = emojiString.match(/^<a?:([^:]+):(\d+)>$/);

            if (!match) {
                return interaction.reply({
                    embeds: [erro("Envie um emoji custom válido. Ex: <:Insig_The100:123456789>")],
                    ephemeral: true
                });
            }

            const name = `Insig_${tema.nome.replace(/\s+/g, "")}`;
            const emojiId = match[2];

            // clonar o emoji do usuário → criando um novo no servidor
            const url = `https://cdn.discordapp.com/emojis/${emojiId}.png?size=128&quality=lossless`;
            let newEmoji;

            try {
                newEmoji = await guild.emojis.create({
                    name,
                    attachment: url
                });
            } catch (e) {
                console.error(e);
                return interaction.reply({
                    embeds: [erro("Falha ao criar o emoji no servidor.")],
                    ephemeral: true
                });
            }

            tema.insigniaEmoji = `<:${newEmoji.name}:${newEmoji.id}>`;
            tema.insigniaEmojiId = newEmoji.id;
            await tema.save();

            return interaction.reply({
                embeds: [ok(`Insígnia (emoji) atualizada para o tema **${tema.nome}**!\n${tema.insigniaEmoji}`)]
            });
        }

        // ==============================
        // SE O USUÁRIO MANDOU UMA IMAGEM
        // ==============================
        if (imagem) {

            if (!imagem.contentType?.startsWith("image/")) {
                return interaction.reply({
                    embeds: [erro("Envie uma imagem válida PNG/JPG/WEBP.")],
                    ephemeral: true
                });
            }

            // baixar imagem
            const response = await axios.get(imagem.url, { responseType: "arraybuffer" });
            const buffer = Buffer.from(response.data);

            // redimensionar para 128x128
           // cria um canvas 128x128 com fundo transparente
            const resized = await sharp(buffer)
            .resize({
            width: 128,
            height: 128,
            fit: "contain",    // impede corte
            background: { r: 0, g: 0, b: 0, alpha: 0 } // transparente
    })
    .png()
    .toBuffer();


            const emojiName = `Insig_${tema.nome.replace(/\s+/g, "")}`;

            // criar emoji
            let newEmoji;
            try {
                newEmoji = await guild.emojis.create({
                    name: emojiName,
                    attachment: resized
                });
            } catch (e) {
                console.error(e);
                return interaction.reply({
                    embeds: [erro("Falha ao criar o emoji no servidor.")],
                    ephemeral: true
                });
            }

            // salvar
            tema.insigniaEmoji = `<:${newEmoji.name}:${newEmoji.id}>`;
            tema.insigniaEmojiId = newEmoji.id;
            await tema.save();

            return interaction.reply({
                embeds: [ok(`Insígnia criada como emoji!\nTema: **${tema.nome}**\n${tema.insigniaEmoji}`)]
            });
        }

        return interaction.reply({
            embeds: [erro("Envie um emoji OU uma imagem para definir a insígnia.")],
            ephemeral: true
        });
    }
};
