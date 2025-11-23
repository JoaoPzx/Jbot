const {
    SlashCommandBuilder,
    EmbedBuilder,
} = require("discord.js");

const Perfil = require("../../../models/Perfil");
const Tema = require("../../../models/Tema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addinsignia")
        .setDescription("⚙️ (Teste) Adiciona uma insígnia manualmente a um membro.")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Usuário que receberá a insígnia")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("tema")
                .setDescription("Tema ao qual pertence a insígnia")
                .setAutocomplete(true)
                .setRequired(true)
        ),

    // ================================================
    // 🔥 AUTOCOMPLETE DOS TEMAS
    // ================================================
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();

        const temas = await Tema.find(
            focused
                ? { nomeLower: { $regex: focused, $options: "i" } }
                : {}
        )
            .sort({ nome: 1 })
            .limit(25);

        const results = temas.map(t => ({
            name: t.nome,
            value: t.nomeLower
        }));

        return interaction.respond(results);
    },

    // ================================================
    // 🔥 EXECUTAR O COMANDO
    // ================================================
    async execute(interaction) {

    const user = interaction.options.getUser("usuario");
    const temaLower = interaction.options.getString("tema");

    const tema = await Tema.findOne({ nomeLower: temaLower });

    if (!tema) {
        return interaction.reply({
            content: "❌ Tema não encontrado no banco.",
            ephemeral: true
        });
    }

    // 🔑 chave da insígnia passa a ser o nomeLower do tema
    const key = tema.nomeLower;

    let perfil = await Perfil.findOne({ userId: user.id });

    if (!perfil) {
        perfil = await Perfil.create({
            userId: user.id,
            bio: "Olá! Eu ainda não personalizei meu perfil.",
            wallpaper: null,
            cor: "preto",
            insignias: [],
            inventario: [],
            pontos: 0,
            moedas: 0
        });
    }

    // Impedir duplicação
    if (perfil.insignias.includes(key)) {
        return interaction.reply({
            content: `⚠️ O usuário **já possui** a insígnia do tema \`${tema.nome}\`.`,
            ephemeral: true
        });
    }

    // Salvar referência do tema
    perfil.insignias.push(key);
    await perfil.save();

    const embed = new EmbedBuilder()
        .setColor("#00ffbb")
        .setTitle("🏅 Insígnia Adicionada!")
        .setDescription(
            `A insígnia do tema **${tema.nome}** foi adicionada ao membro:\n\n` +
            `👤 **${user.tag}**`
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp()
        .setFooter({
            text: "Comando temporário — apenas para testes",
            iconURL: interaction.client.user.displayAvatarURL()
        });

    return interaction.reply({ embeds: [embed] });
}};
