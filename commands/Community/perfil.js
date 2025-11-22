/**
 * commands/Community/perfil.js
 * Layout ORIGINAL restaurado e corrigido.
 * - Insígnias e Inventário lado a lado
 * - Caixa do avatar, bio e wallpaper funcionando
 * - PNGs do inventário funcionando
 * - 5 itens + 1 slot livre
 */

const { AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas");
const fs = require("fs");
const path = require("path");
const Perfil = require("../../models/Perfil");




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
// COMMAND
// ============================= 
module.exports = {
    name: "perfil",
    description: "Exibe seu perfil com layout padronizado.",

    async execute(message) {

        const iconMoeda = await safeLoadImage(path.join(__dirname, "../../../assets/icons/moeda.png"));
        const target = message.mentions.users.first() || message.author;
        

        let perfil = await Perfil.findOne({ userId: target.id });
        if (!perfil) {
            perfil = await Perfil.create({
                userId: target.id,
                bio: "Olá! Eu ainda não personalizei meu perfil.",
                wallpaper: null,
                insignias: [],
                inventario: [],
                total: 0,
                moedas: 0
            });
        }

        // =============================
        // DIMENSÕES
        // =============================
        const WIDTH = 1200;
        const HEIGHT = 780;
        const TOP = 390;

        const canvas = Canvas.createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext("2d");

        // =============================
        // TEMA
        // =============================
        const theme = {
            bg: "#071018",
            cardFill: "rgba(0,0,0,0.28)",
            textMain: "#E8F1F6",
            textMuted: "#b7c2c8",
        };

        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // =============================
        // AVATAR
        // =============================
        const avatarSize = 240;
        const avatarX = 52;
        const avatarY = 56;

        const avatarImg = await safeLoadImage(
            target.displayAvatarURL({ extension: "png", size: 1024 })
        );

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

        // =============================
        // POSIÇÕES DO LAYOUT ORIGINAL
        // =============================
        const startX = avatarX + avatarSize + 36;

        const insW = 260;
        const insH = 230;

        // Insígnias
        const insX = startX;
        const insY = 65;

        // Inventário
        const invX = insX + insW + 10;
        const invY = insY;
        const invW = 260;
        const invH = 230;

        // Coluna da direita
        const rightX = invX + invW + 10;
        const rightY = insY;
        const rightW = 300;
        const rightH = 72;

        // =============================
        // DESENHAR CAIXAS
        // =============================
        function drawGlass(x, y, w, h, r = 18) {
            ctx.save();
            roundRect(ctx, x, y, w, h, r);
            ctx.fillStyle = "rgba(0,0,0,0.34)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.06)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        drawGlass(insX, insY, insW, insH);
        drawGlass(invX, invY, invW, invH);
        drawGlass(rightX, rightY, rightW, rightH);
        drawGlass(rightX, rightY + rightH + 7, rightW, rightH);
        drawGlass(rightX, rightY + rightH * 2 + 14, rightW, rightH);

        // =============================
        // TÍTULO INSÍGNIAS
        // =============================
        ctx.font = "26px 'SF Pro Display Bold'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Insígnias:", insX + 1, insY - 8);

        // Render insígnias
        ctx.font = "22px 'SF Pro Display'";
        ctx.fillStyle = theme.textMuted;

        const insignias = perfil.insignias || [];
        let ix = insX + 18;
        let iy = insY + 70;

        for (let token of insignias) {
            ctx.fillText(token, ix, iy);
            ix += ctx.measureText(token).width + 16;
            if (ix > insX + insW - 30) {
                ix = insX + 18;
                iy += 36;
            }
        }

        // =============================
        // INVENTÁRIO TÍTULO
        // =============================
        ctx.font = "26px 'SF Pro Display Bold'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Inventário:", invX + 1, invY - 8);

        // =============================
        // ÍCONES PNG DO INVENTÁRIO
        // =============================
        // 5 itens + espaço para o sexto
        const iconMap = {
            dica: "assets/icons/dica.png",
            tempo: "assets/icons/tempo.png",
            nitro: "assets/icons/nitro.png",
            combo: "assets/icons/combo.png",
            pulo: "assets/icons/pulo.png",
        };

        const invItens = perfil.inventario || [];

        let pos = [
            [invX + 7,  invY + 10],
            [invX + 130, invY + 10],
            [invX + 7,  invY + 90],
            [invX + 130, invY + 90],
            [invX + 7,  invY + 170],
            // espaço para o 6º item depois
        ];

        ctx.font = "22px 'SF Pro Display'";
        ctx.fillStyle = "WHITE";

        for (let i = 0; i < invItens.length && i < 5; i++) {
            const item = invItens[i];
            const iconPath = iconMap[item.nome];

            if (iconPath && fs.existsSync(iconPath)) {
                const icon = await Canvas.loadImage(iconPath);
                const [px, py] = pos[i];

                ctx.drawImage(icon, px, py, 55, 55); // ícone
                ctx.fillText(`x${item.quantidade}`, px + 54, py + 28);
                ctx.fillStyle = "WHITE"
            }
        }

        // ============================================
        // COLUNA DIREITA — PONTOS / MOEDAS / CASAMENTO
        // ============================================

        ctx.font = "700 20px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Pontos:", rightX + 10, rightY + 31);

        ctx.font = "20px 'SF Pro Display Medium'";
        ctx.fillStyle = "WHITE";
        ctx.fillText(String(perfil.pontos || 0), rightX + 86, rightY + 33);

    // Título
        ctx.font = "700 20px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Moedas:", rightX + 10, rightY + rightH + 22 + 28);

// Ícone + texto

        if (iconMoeda) {
        ctx.drawImage(
        iconMoeda,
        rightX + 14,                        // posição X do ícone
        rightY + rightH + 28 + 14,       // posição Y do ícone
        26, 26                               // tamanho do ícone
    );
}

// Valor das moedas
        ctx.font = "20px 'SF Pro Display Medium'";
        ctx.fillStyle = "WHITE";
        ctx.fillText(String(perfil.moedas || 0),rightX + 63 + 32, rightY + rightH + 17 + 34);                      // deslocar texto para direita do ícone

// Casamento
        ctx.font = "700 20px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Casamento:", rightX + 10, rightY + 199);

        ctx.font = "20px 'SF Pro Display Medium'";
        ctx.fillStyle = "WHITE";
        ctx.fillText(String(perfil.moedas || 0),rightX + 95 + 32, rightY + rightH + 94 + 34); 
        


        // =============================
        // Nickname
        // =============================
        ctx.font = "34px 'SF Pro Display Bold'";
        ctx.fillStyle = theme.textMain;
        const nick = target.username;
        ctx.fillText(nick, avatarX + 62, avatarY + avatarSize + 48);

        // =============================
        // BIO BOX
        // =============================
        const bioX = insX;
        const bioY = insY + insH + 20;
        const bioW = rightX + rightW - insX;
        const bioH = 70;

        drawGlass(bioX, bioY, bioW, bioH);

        ctx.font = "25px 'SF Pro Display'";
        ctx.fillStyle = "#ffffff";
        wrapText(ctx, perfil.bio, bioX + 20, bioY + 43, bioW - 40, 26);

        // =============================
        // WALLPAPER
        // =============================
        ctx.save();
        roundRect(ctx, 20, TOP, WIDTH - 40, HEIGHT - TOP - 20, 16);
        ctx.clip();

        if (perfil.wallpaper) {
            const wp = await safeLoadImage(perfil.wallpaper);
            if (wp) ctx.drawImage(wp, 20, TOP, WIDTH - 40, HEIGHT - TOP - 20);
        }
        ctx.restore();

        // =============================
        // ENVIAR
        // =============================
        const buffer = canvas.toBuffer("image/png");
        const attachment = new AttachmentBuilder(buffer, { name: "perfil.png" });

        return message.reply({ files: [attachment] });
    }
};
