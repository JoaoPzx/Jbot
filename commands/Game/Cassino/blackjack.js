const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Perfil = require("../../../models/Perfil");

// =======================
// ARMAZENAMENTO TEMPORÁRIO
// =======================
const mesas = new Map();

// =======================
// FUNÇÕES DE BARALHO
// =======================
const naipes = ["♠", "♥", "♦", "♣"];
const valores = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function criarBaralho() {
    const baralho = [];
    for (const n of naipes)
        for (const v of valores)
            baralho.push({ naipe: n, valor: v });
    return baralho.sort(() => Math.random() - 0.5);
}

function valorCarta(carta) {
    if (["J", "Q", "K"].includes(carta.valor)) return 10;
    if (carta.valor === "A") return 11;
    return parseInt(carta.valor);
}

function calcularMao(mao) {
    let total = mao.reduce((sum, c) => sum + valorCarta(c), 0);
    let ases = mao.filter(c => c.valor === "A").length;

    while (total > 21 && ases > 0) {
        total -= 10;
        ases--;
    }
    return total;
}

function formatMao(mao) {
    return mao.map(c => `\`${c.valor}${c.naipe}\``).join(" ");
}

// =======================
// EMBED DO JOGO
// =======================
function gerarEmbed(mesa, ocultarDealer = true) { 
    const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setDescription("**<:jokerjf:1443710562218410084> BLACKJACK JFLUX**")
        .addFields({
            name: "<:poker:1443701815240822905> Sua mão",
            value: `${formatMao(mesa.jogador)}\n**Total:** ${calcularMao(mesa.jogador)}`
        });

    if (ocultarDealer) {
        embed.addFields({
            name: "<:dealerjf:1443701951614161072> Dealer",
            value: `\`${mesa.dealer[0].valor}${mesa.dealer[0].naipe}\` \`❓\``,
        });
    } else {
        embed.addFields({
            name: "<:dealerjf:1443701951614161072> Dealer",
            value: `${formatMao(mesa.dealer)}\n**Total:** ${calcularMao(mesa.dealer)}`
        });
    }

    embed.addFields({
        name: "Aposta",
        value: `<:apostajf:1443711116948541501> ${mesa.aposta} moedas`
    });

    return embed;
}

// =======================
// BOTÕES
// =======================
function botoesJogo() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("bj_hit").setLabel("Comprar").setEmoji("💰").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("bj_stand").setLabel("Parar").setEmoji("🛑").setStyle(ButtonStyle.Danger)
    );
}

function botoesDesativados() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("off1").setLabel("Comprar").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("off2").setLabel("Parar").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
}

// =======================
// FUNÇÃO DE INFO
// =======================
function enviarInfo(message) {
    const embed = new EmbedBuilder()
        .setColor("#d4af37")
        .setTitle("📘 Informações do Blackjack JFlux")
        .setImage("https://i.ibb.co/wNqbnznL/Chat-GPT-Image-27-de-nov-de-2025-18-59-09.png") // coloque aqui o link da imagem grande que geramos
        .setDescription(
            "Bem-vindo ao **Blackjack JFlux**, clássico jogo de cartas do cassino!\n" +
            "Aqui você enfrenta o Dealer tentando chegar o mais próximo possível de **21**."
        )
        .addFields(
            {
                name: "🎮 Como jogar",
                value:
                "• Você recebe **duas cartas** no começo.\n" +
                "• O Dealer recebe uma carta aberta e uma escondida.\n" +
                "• O objetivo é chegar o mais próximo possível de **21**, sem ultrapassar.\n" +
                "• Se estourar, perde automaticamente."
            },
            {
                name: "🟩 Comprar (Hit)",
                value: "Puxa uma nova carta para tentar aumentar seu total."
            },
            {
                name: "🟥 Parar (Stand)",
                value: "Finaliza sua jogada e força o Dealer a jogar."
            },
            {
                name: "💰 Apostas",
                value:
                "• **Mínimo:** 20 moedas\n" +
                "• **Máximo:** 100.000 moedas\n" +
                "• **Vitória:** você ganha **2x** o valor apostado\n" +
                "• **Empate:** sua aposta é devolvida\n" +
                "• **Derrota:** você perde a aposta"
            },
            {
                name: "🃏 Valores das cartas",
                value:
                "• Números = valor normal\n" +
                "• J, Q, K = 10\n" +
                "• A = 11 (vira 1 automaticamente se você estourar)"
            }
        )
        .setFooter({ text: "Boa sorte! Jogue com sabedoria." });

    return message.reply({ embeds: [embed] });
}

// =======================
// COMANDO PREFIXO REAL
// =======================
async function execute(message, args) {

    // ===========================
    // ARGUMENTO "INFO"
    // ===========================
    if (args[0]?.toLowerCase() === "info") {
        return enviarInfo(message);
    }

    const aposta = parseInt(args[0]);
    const userId = message.author.id;

    // VALIDAR APOSTA
    if (!aposta || isNaN(aposta))
        return message.reply("<:fecharerr:1442682279322325095> Informe uma aposta válida. Ex: `;bj 50`");

    if (aposta < 20)
        return message.reply("<:fecharerr:1442682279322325095> A aposta mínima é **20 moedas**.");

    if (aposta > 100000)
        return message.reply("<:fecharerr:1442682279322325095> A aposta máxima é **100.000 moedas**.");

    const perfil = await Perfil.findOne({ userId });
    if (!perfil || perfil.moedas < aposta)
        return message.reply("<:fecharerr:1442682279322325095> Você não tem moedas suficientes.");

    // DESCONTAR APOSTA
    perfil.moedas -= aposta;
    await perfil.save();

    // VER SE O USUÁRIO JÁ TEM UMA MESA
    if (mesas.has(userId))
        return message.reply("<:fecharerr:1442682279322325095> Você já tem um jogo ativo.");

    // CRIAR MESA
    const baralho = criarBaralho();
    const mesa = {
        jogador: [baralho.pop(), baralho.pop()],
        dealer: [baralho.pop(), baralho.pop()],
        baralho,
        canal: message.channel.id,
        aposta,
        user: userId
    };

    mesas.set(userId, mesa);

    const embed = gerarEmbed(mesa, true);

    const msg = await message.reply({
        embeds: [embed],
        components: [botoesJogo()]
    });

    mesa.msgId = msg.id;
}

// =======================
// EXPORTAR TUDO
// =======================
module.exports = {
    name: "blackjack",
    aliases: ["bj"],
    description: "Jogue blackjack clássico!",
    execute,
    mesas,
    calcularMao,
    gerarEmbed,
    botoesJogo,
    botoesDesativados
};
