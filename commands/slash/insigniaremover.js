const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");

function erro(txt) {
    return new EmbedBuilder().setColor("#ff4d4d").setDescription(`❌ ${txt}`);
}

function ok(txt) {
    return new EmbedBuilder().setColor("#f1c40f").setDescription(txt);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("insigniaremover")
        .setDescription("Remove a insígnia (emoji ou imagem) de um tema.")

        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Escolha o tema.")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    // Autocomplete dos temas
    async autocomplete(interaction) {
        try {
            const focused = interaction.options.getFocused().toLowerCase();

            const temas = await Tema.find({});
            const lista = temas
                .map(t => t.nomeOriginal || t.nome)
                .filter(n => n.toLowerCase().includes(focused))
                .slice(0, 25);

            return interaction.respond(
                lista.map(n => ({ name: n, value: n }))
            );
        } catch (err) {
            console.error("Erro no autocomplete de /insigniaremover:", err);
            return interaction.respond([]);
        }
    },

    async execute(interaction) {
        const temaEntrada = interaction.options.getString("tema").toLowerCase().replace(/\s+/g, "");
        const tema = await Tema.findOne({ nomeLower: temaEntrada });

        if (!tema) {
            return interaction.reply({ embeds: [erro("Tema não encontrado.")], ephemeral: true });
        }

        if (!tema.insignia && !tema.insigniaEmoji) {
            return interaction.reply({
                embeds: [erro(`O tema **${tema.nome}** não possui nenhuma insígnia.`)],
                ephemeral: true
            });
        }

        // Remover
        tema.insignia = null;
        tema.insigniaEmoji = null;
        await tema.save();

        return interaction.reply({
            embeds: [
                ok(`Insígnia removida com sucesso!\n\nTema: **${tema.nome}**`)
            ]
        });
    }
};
