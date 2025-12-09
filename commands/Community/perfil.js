const { AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas");
const fs = require("fs");
const path = require("path");
const Perfil = require("../../models/Perfil");
const Tema = require("../../models/Tema");
const twemoji = require("twemoji");
const { parse } = require("twemoji-parser");
const { loadImage } = require("canvas");





// =============================
// Utils
// =============================
function roundRect(ctx, x, y, w, h, r = 12) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    text = String(text);
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, y);
            line = words[n] + " ";
            y += lineHeight;
        } else line = testLine;
    }
    if (line) ctx.fillText(line.trim(), x, y);
    return y;
}

async function safeLoadImage(src) {
    if (!src) return null;
    try {
        return await Canvas.loadImage(src);
    } catch {
        return null;
    }
}

// =============================
// THEMES
// =============================

function getTheme(cor) {
    switch ((cor || "").toLowerCase()) {
        case "branco":
            return {
                bg: "#FFFAFA",
                cardFill: "#D3D3D3",
                textMain: "#000000",
                textMuted: "#000000",
            };
        case "azul":
            return {
                bg: "#062069",
                cardFill: "rgba(0,0,0,0.25)",
                textMain: "#D9E8FF",
                textMuted: "#9BB2D1",
            };
        case "rosa":
            return {
                bg: "#AA336A",
                cardFill: "#1a0e16",
                textMain: "#FFD6EA",
                textMuted: "#C7A2B7",
            };
        case "vermelho":
            return {
                bg: "#8b0000",
                cardFill: "#1a0c0c",
                textMain: "#FFD5D5",
                textMuted: "#C9A1A1",
            };
        case "roxo":
            return {
                bg: "#4B0082",
                cardFill: "#170e24",
                textMain: "#ECD4FF",
                textMuted: "#B9A2C7",
            };
            case "dourado":
            return {
                bg: "#b59410",
                cardFill: "#705714",
                textMain: "#ffffff",
                textMuted: "#ffffff",
            };
            case "verde":
            return {
                bg: "#06402b",
                cardFill: "#20392c",
                textMain: "#ffffff",
                textMuted: "#ffffff",
            };
            case "laranja":
            return {
                bg: "#DC582A",
                cardFill: "#A84420",
                textMain: "#ffffff",
                textMuted: "#ffffff",
            };
        case "preto":
        default:
            return {
                bg: "#0B0B0C",
                cardFill: "rgba(0,0,0,0.32)",
                textMain: "#ffffff",
                textMuted: "#ffffff",
            };
        
    }
}

// ======================================================================
// 🔵 FUNÇÃO PARA DESENHAR TEXTO + EMOJIS TWEMOJI NO CANVAS
// ======================================================================
async function drawTextWithEmoji(ctx, text, x, y, fontSize = 26) {

    const parsed = parse(text, { assetType: "png" });
    let offsetX = x;

    for (const part of parsed) {
        if (part.url) {
            const img = await loadImage(part.url);
            const size = fontSize + 6;
            ctx.drawImage(img, offsetX, y - size + 6, size, size);
            offsetX += size + 2;
        } else {
            ctx.fillText(part.text, offsetX, y);
            offsetX += ctx.measureText(part.text).width;
        }
    }
}



// =============================
// COMMAND
// =============================
module.exports = {
    name: "perfil",
    description: "Exibe seu perfil com layout padronizado.",

    async execute(message) {

        const target = message.mentions.users.first() || message.author;

        let perfil = await Perfil.findOne({ userId: target.id });
        if (!perfil) {
            perfil = await Perfil.create({
                userId: target.id,
                bio: "Olá! Eu ainda não personalizei meu perfil.",
                wallpaper: null,
                cor: "preto",
                insignias: [],
                inventario: [],
                pontos: 0,
                moedas: 0
            });
        }

        const WIDTH = 1100;
        const HEIGHT = 780;
        const TOP = 390;

        const canvas = Canvas.createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext("2d");

        const theme = getTheme(perfil.cor || "preto");

        // Fundo
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // =============================
        // BORDA EXTERNA (DEVE VIR AGORA)
        // =============================
        ctx.save();
        roundRect(ctx, 4, 4, WIDTH - 8, HEIGHT - 8, 18);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.stroke();
        ctx.restore();

        // =============================
        // WALLPAPER (APENAS PARTE DE BAIXO)
        // =============================
        const wpX = 6;
        const wpY = TOP;
        const wpW = WIDTH - 12;
        const wpH = HEIGHT - TOP - 6;

        ctx.save();
        ctx.beginPath();

        // Top quadrado
        ctx.moveTo(wpX, wpY);
        ctx.lineTo(wpX + wpW, wpY);

        // Descer à direita
        ctx.lineTo(wpX + wpW, wpY + wpH - 16);

        // Canto inferior direito arredondado
        ctx.quadraticCurveTo(
            wpX + wpW,
            wpY + wpH,
            wpX + wpW - 16,
            wpY + wpH
        );

        // Base
        ctx.lineTo(wpX + 16, wpY + wpH);

        // Canto inferior esquerdo arredondado
        ctx.quadraticCurveTo(
            wpX,
            wpY + wpH,
            wpX,
            wpY + wpH - 16
        );

        // Subindo
        ctx.lineTo(wpX, wpY);

        ctx.closePath();
        ctx.clip();

        if (perfil.wallpaper) {
            const wp = await safeLoadImage(perfil.wallpaper);
            if (wp) ctx.drawImage(wp, wpX, wpY, wpW, wpH);
        }

        ctx.restore();

        // =============================
        // AVATAR
        // =============================
        const avatarSize = 240;
        const avatarX = 52;
        const avatarY = 56;

        const avatarImg = await safeLoadImage(
            target.displayAvatarURL({ extension: "png", size: 1024 })
        );

        // avatar LISO com borda glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
        );
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Halo do avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2 + 4,
            0,
            Math.PI * 2
        );
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        // =============================
        // POSICIONAMENTO
        // =============================
        const insX = avatarX + avatarSize + 36;
        const insY = 65;
        const insW = 260;
        const insH = 230;

        const invX = insX + insW + 224;
        const invY = insY;
        const invW = 260;
        const invH = 230;

        const rightX = invW + 340;
        const rightY = insY;
        const rightW = 200;
        const rightH = 72;

        // =============================
        // CAIXAS GLASS
        // =============================
        function glass(x, y, w, h, r = 18) {
            ctx.save();
            roundRect(ctx, x, y, w, h, r);
            ctx.fillStyle = theme.cardFill;
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.06)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        glass(insX, insY, insW, insH);
        glass(invX, invY, invW, invH);
        glass(rightX, rightY, rightW, rightH);
        glass(rightX, rightY + rightH + 7, rightW, rightH);
        glass(rightX, rightY + rightH * 2 + 14, rightW, rightH);


// INSÍGNIAS (ÍCONES DOS TEMAS)
// =============================
ctx.font = "20px 'SF Pro Display Bold'";
ctx.fillStyle = theme.textMain;
ctx.fillText("Insígnias:", insX + 1, insY - 8);

// perfil.insignias agora guarda nomeLower dos temas
// =====================================================
// 🔥 NOVO SISTEMA DE INSÍGNIAS (objetos, não strings)
// =====================================================

// perfil.insignias agora é uma lista de objetos
const insigniaDocs = perfil.insignias || [];

// extrair os temaId das insígnias salvas no perfil
const temaIds = insigniaDocs.map(i => i.temaId);

// buscar os temas correspondentes no Mongo
let temasInsignias = [];
if (temaIds.length > 0) {
    temasInsignias = await Tema.find({
        _id: { $in: temaIds }
    }).lean();
}

// montar ícones das insígnias
const icons = [];

for (const tema of temasInsignias) {
    if (!tema.insigniaEmoji) continue;

    // pegar o ID do emoji do tema, animado ou não
    const match = tema.insigniaEmoji.match(/<?a?:\w+:(\d+)>?/);
    if (!match) continue;

    const id = match[1];
    const animated = tema.insigniaEmoji.startsWith("<a:");
    const ext = animated ? "gif" : "png";

    const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=96&quality=lossless`;

    try {
        const img = await Canvas.loadImage(url);
        icons.push({ img, nome: tema.nome });
    } catch (e) {
        continue;
    }
}


// Desenhar grid de ícones.
// 4 por linha, 48x48 cada, com padding interno.
const iconSize = 42;
const paddingX = 16;
const paddingY = 12;
const gapX = 20;
const gapY = 12;

let col = 0;
let row = 0;

for (const { img } of icons) {
    const x = insX + paddingX + (iconSize + gapX) * col;
    const y = insY + paddingY + (iconSize + gapY) * row;

    ctx.drawImage(img, x, y, iconSize, iconSize);

    col++;
    if (x + iconSize + gapX > insX + insW - paddingX - iconSize) {
        col = 0;
        row++;
    }
}


        // =============================
        // INVENTÁRIO
        // =============================
        ctx.font = "20px 'SF Pro Display Bold'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Inventário:", invX + 1, invY - 8);

        const iconMap = {
            dica: "assets/icons/dica.png",
            resposta: "assets/icons/resposta.png",
            tempo: "assets/icons/tempo.png",
            nitro: "assets/icons/nitro.png",
            sobrevida: "assets/icons/sobrevida.png",
            combo: "assets/icons/combo.png",
        };

        const invItens = perfil.inventario || [];
        let pos = [
            [invX + 7, invY + 10],
            [invX + 130, invY + 10],
            [invX + 7, invY + 90],
            [invX + 130, invY + 90],
            [invX + 7, invY + 170],
            [invX + 130, invY + 170]
        ];

        ctx.font = "22px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;

        for (let i = 0; i < invItens.length && i < 6; i++) {
            const item = invItens[i];
            const iconPath = iconMap[item.nome];

            if (iconPath && fs.existsSync(iconPath)) {
                const icon = await Canvas.loadImage(iconPath);
                const [px, py] = pos[i];
                ctx.drawImage(icon, px, py, 55, 55);
                ctx.fillText(`x${item.quantidade}`, px + 54, py + 28);
            }
        }

        // =============================
        // COLUNA DIREITA
        // =============================
        ctx.font = "700 20px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Pontos:", rightX + 12, rightY + 25);

        const iconPontos = await safeLoadImage(path.join(__dirname, "../../assets/icons/pontos.png"));

        const px = rightX + 11;
        const py = rightY + 35;

        // desenha ícone DO LADO do nome
        if (iconPontos) {
        const iconSize = 25;
     ctx.drawImage(iconPontos, px, py, iconSize, iconSize);

    // texto após o ícone (movendo junto)
     ctx.fillText(perfil.pontos, px + iconSize + 7, py + 20);
} else {
    // fallback
    ctx.fillText(perfil.pontos, px, py + 21);
}

        ctx.font = "700 20px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Moedas:", rightX + 12, rightY + rightH + 22 + 9);

        const iconMoeda = await safeLoadImage(path.join(__dirname, "../../assets/icons/moedas.png"));

       const mx = rightX + 11;
        const my = rightY + 115;

        // desenha ícone DO LADO do nome
        if (iconMoeda) {
        const iconSize = 25;
     ctx.drawImage(iconMoeda, mx, my, iconSize, iconSize);

    // texto após o ícone (movendo junto)
     ctx.fillText(perfil.moedas, mx + iconSize + 7, my + 21);
} else {
    // fallback
    ctx.fillText(perfil.moedas, mx, my + 21);
}

        // ===============================
        // CASAMENTO
        // ===============================
        ctx.font = "700 20px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Casamento:", rightX + 11, rightY + 182);

        // carregar ícone da aliança
        const iconCasamento = await safeLoadImage(
        path.join(__dirname, "../../assets/icons/casamento.png")
);

        let casamentoTexto = "Nenhum";

        // busca nome do parceiro no Discord
        if (perfil.casamento) {
    try {
        const parceiro = await message.client.users.fetch(perfil.casamento);
        casamentoTexto = parceiro.username;
    } catch {
        casamentoTexto = "Desconhecido";
    }
}

        // posição inicial do grupo (ícone + texto)
        const cx = rightX + 11;
        const cy = rightY + 190;

        // desenha ícone DO LADO do nome
        if (iconCasamento) {
        const iconSize = 25;
     ctx.drawImage(iconCasamento, cx, cy, iconSize, iconSize);

    // texto após o ícone (movendo junto)
     ctx.fillText(casamentoTexto, cx + iconSize + 7, cy + 21);
} else {
    // fallback
    ctx.fillText(casamentoTexto, cx, cy + 21);
}




        // =============================
        // NICKNAME
        // =============================
        ctx.font = "34px 'SF Pro Display Bold'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText(target.username, avatarX + 62, avatarY + avatarSize + 48);

// =============================
// BIO
// =============================
// =============================
// BIO (substituir a chamada antiga por este bloco)
// =============================
const bioX = insX;
const bioY = insY + insH + 12;
const bioW = rightX + rightW - 55;
const bioH = 70;

glass(bioX, bioY, bioW, bioH);

// configura fonte / cor antes de desenhar (ajuste se necessário)
ctx.font = "23px 'SF Pro Display'";
ctx.fillStyle = theme.textMain || "#ffffff";

// coordenadas de início para o texto (pequena margem à esquerda e central vertical)
const textStartX = bioX + 16;
const textStartY = bioY + Math.floor(bioH / 2) + 8; // centraliza verticalmente ~ ajuste se necessário

// largura máxima do texto (respeita margens internas)
const maxWidth = bioW - 32;

// assegura que perfil.bio exista e seja string
const bioText = (perfil && perfil.bio) ? String(perfil.bio) : "";

// chama o helper que desenha texto + emojis
// assinatura esperada: drawTextWithEmoji(ctx, text, x, y, fontSize, options?)
// caso o seu drawTextWithEmoji aceite um objeto de opções, passamos maxWidth/align
try {
    await drawTextWithEmoji(ctx, bioText, textStartX, textStartY, 23, { maxWidth, align: "left" });
} catch (err) {
    console.error("Erro em drawTextWithEmoji ao desenhar a bio:", err);
    // fallback simples: desenha apenas texto sem emoji
    ctx.fillText(bioText.slice(0, 120), textStartX, textStartY); // corta se for muito longo
}

// =============================
// ENVIAR
// =============================
const buffer = canvas.toBuffer("image/png");
const attachment = new AttachmentBuilder(buffer, { name: "perfil.png" });

return message.reply({ files: [attachment] });

    }
};
