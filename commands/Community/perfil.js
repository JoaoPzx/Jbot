/**
 * commands/Community/perfil.js
 * Versão final adaptada (LARGURA = 1200 px) conforme pedido.
 *
 * Dimensões:
 *  - Canvas: 1200 x 780
 *  - Top area height: 390
 *  - Bottom wallpaper: 390
 *
 * Requisitos:
 *  - node-canvas
 *  - fontes SF Pro em ./assets/fonts/
 *  - model Perfil em ../../models/Perfil
 *
 * Comportamento:
 *  - remove coluna direita inteira
 *  - caixas translúcidas maiores (Insígnias e Inventário)
 *  - pontos e moedas empilhados ao lado direito do inventário (dentro da área útil)
 *  - nickname abaixo do avatar
 *  - bio ocupando faixa central entre boxes e wallpaper
 *  - não exibe "Nenhuma insígnia"/"Nenhum item" quando arrays vazios (fica em branco)
 */

const { AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas");
const fs = require("fs");
const path = require("path");
const Perfil = require("../../models/Perfil");

// ---------------- fonts ----------------
const fontsFolder = path.join(__dirname, "../../assets/fonts");
const tryNames = (list) => {
    for (const n of list) {
        const p = path.join(fontsFolder, n);
        if (fs.existsSync(p)) return p;
    }
    return null;
};
const regCandidates = ["SFPRODISPLAYREGULAR.OTF","SFPRODISPLAYREGULAR.otf","SFProDisplayRegular.otf","SFProDisplay-Regular.otf"];
const medCandidates = ["SFPRODISPLAYMEDIUM.OTF","SFPRODISPLAYMEDIUM.otf","SFProDisplayMedium.otf","SFProDisplay-Medium.otf"];
const boldCandidates= ["SFPRODISPLAYBOLD.OTF","SFPRODISPLAYBOLD.otf","SFProDisplayBold.otf","SFProDisplay-Bold.otf"];

const fontRegularPath = tryNames(regCandidates);
const fontMediumPath  = tryNames(medCandidates);
const fontBoldPath    = tryNames(boldCandidates);

if (fontRegularPath) console.log("Font regular found:", fontRegularPath);
if (fontMediumPath)  console.log("Font medium found:", fontMediumPath);
if (fontBoldPath)    console.log("Font bold found:", fontBoldPath);

try {
    if (fontRegularPath) Canvas.registerFont(fontRegularPath, { family: "SF Pro Display", weight: "400" });
    if (fontMediumPath)  Canvas.registerFont(fontMediumPath,  { family: "SF Pro Display", weight: "500" });
    if (fontBoldPath)    Canvas.registerFont(fontBoldPath,    { family: "SF Pro Display", weight: "700" });
    if (fontRegularPath || fontMediumPath || fontBoldPath) {
        console.log("✓ SF Pro Display fonts registered (partial ok if some missing)");
    } else {
        console.warn("⚠️ SF Pro Display fonts not found. Canvas will fallback to system fonts.");
    }
} catch (e) {
    console.warn("Erro registrando fontes:", e);
}

// ---------------- utilities ----------------
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
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, y);
            line = words[n] + " ";
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    if (line) ctx.fillText(line.trim(), x, y);
    return y;
}

async function safeLoadImage(src) {
    if (!src) return null;
    try {
        return await Canvas.loadImage(src);
    } catch (e) {
        return null;
    }
}

// ---------------- command ----------------
module.exports = {
    name: "perfil",
    description: "Gera perfil (layout personalizado, largura reduzida para 1200).",

    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;

        // load or create profile
        let perfil = await Perfil.findOne({ userId: target.id });
        if (!perfil) {
            perfil = await Perfil.create({
                userId: target.id,
                bio: "Olá! Eu ainda não personalizei meu perfil.",
                wallpaper: null,
                insignias: [],
                inventario: [],
                pontos: 0,
                moedas: 0
            });
        }

        // dims (width reduced to 1200)
        const WIDTH = 1200;
        const HEIGHT = 780;
        const TOP = 390; // top area height
        const DIVIDER = 4;
        const PADDING = 18;
        const RADIUS = 24;

        // theme
        const theme = {
            bg: "#071018",
            cardFill: "rgba(0,0,0,0.28)",
            glass: "rgba(255,255,255,0.03)",
            panelStroke: "rgba(255,255,255,0.06)",
            textMain: "#E8F1F6",
            textMuted: "#B7C2C8",
            accent: "#9fb6c8",
            border: "rgba(180,200,215,0.10)",
            divider: "rgba(255,255,255,0.06)"
        };

        const canvas = Canvas.createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext("2d", { alpha: false });

        // clear background
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // outer rounded card
        ctx.save();
        roundRect(ctx, 10, 10, WIDTH - 20, HEIGHT - 20, RADIUS + 6);
        ctx.fillStyle = theme.cardFill;
        ctx.fill();
        ctx.restore();

        // outer stroke
        ctx.lineWidth = 3;
        ctx.strokeStyle = theme.border;
        roundRect(ctx, 10, 10, WIDTH - 20, HEIGHT - 20, RADIUS + 6);
        ctx.stroke();

        // top glass block
        const topX = 20, topY = 20, topW = WIDTH - 40, topH = TOP - 24;
        ctx.save();
        roundRect(ctx, topX, topY, topW, topH, RADIUS);
        const gTop = ctx.createLinearGradient(topX, topY, topX, topY + topH);
        gTop.addColorStop(0, "rgba(255,255,255,0.02)");
        gTop.addColorStop(1, "rgba(0,0,0,0.06)");
        ctx.fillStyle = gTop;
        ctx.fill();
        ctx.restore();

        // ---------------- Avatar ----------------
        const avatarSize = 240;
        const avatarX = 52;
        const avatarY = 56;

        const avatarImg = await safeLoadImage(target.displayAvatarURL({ extension: "png", size: 1024 }));

        if (avatarImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.04)";
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // avatar borders
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(159,182,200,0.10)";
        ctx.stroke();

        // ---------------- Top boxes layout (wider boxes and repositioning) ----------------
        const startX = avatarX + avatarSize + 36; // left edge for boxes
        // make Insígnias and Inventário taller, per request (stretched down)
        const insW = 320, insH = 230;
        const gap = 10;
        const invW = 320, invH = insH;
        // right stacked small boxes for pontos/moedas (inside area, not external)
        const rightColW = 185, rightColH = Math.floor((insH - 18) / 2);

        // positions
        const insX = startX;
        const insY = 65;

        const invX = insX + insW + gap;
        const invY = insY;

        const rightX = invX + invW + gap;
        const rightY = insY;

        // draw glass boxes
        function drawGlass(x, y, w, h, r = 16) {
            ctx.save();
            roundRect(ctx, x, y, w, h, r);
            ctx.fillStyle = "rgba(0,0,0,0.36)";
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            roundRect(ctx, x, y, w, h, r);
            ctx.stroke();

            // subtle top highlight
            const hg = ctx.createLinearGradient(x, y, x, y + 40);
            hg.addColorStop(0, "rgba(255,255,255,0.02)");
            hg.addColorStop(1, "rgba(255,255,255,0.00)");
            ctx.fillStyle = hg;
            roundRect(ctx, x, y, w, h, r);
            ctx.fill();
            ctx.restore();
        }

        drawGlass(insX, insY, insW, insH, 18);
        drawGlass(invX, invY, invW, invH, 18);
        drawGlass(rightX, rightY, rightColW, rightColH, 12);
        drawGlass(rightX, rightY + rightColH + 18, rightColW, rightColH, 12);

        // --------------- Titles and content ----------------
        // Insígnias title
        ctx.fillStyle = theme.textMain;
        ctx.font = "700 26px 'SF Pro Display'";
        ctx.fillText("Insígnias:", insX + 1, insY + -8);

        // Insígnias content: if empty -> leave blank (no "Nenhuma insígnia")
        ctx.font = "24px 'SF Pro Display'";
        ctx.fillStyle = theme.textMuted;
        const insignias = Array.isArray(perfil.insignias) ? perfil.insignias : [];
        if (insignias.length) {
            // draw as grid or wrapped lines
            let cursorX = insX + 18;
            let cursorY = insY + 78;
            const iconSize = 30;
            const spacing = 12;
            const maxRowWidth = insW - 36;
            for (let i = 0; i < insignias.length; i++) {
                const token = insignias[i];
                const w = ctx.measureText(token).width + spacing;
                if (cursorX + w > insX + 18 + maxRowWidth) {
                    cursorX = insX + 18;
                    cursorY += iconSize + 12;
                    if (cursorY > insY + insH - 56) break;
                }
                // draw token (emoji/text)
                ctx.fillText(token, cursorX, cursorY + 20);
                cursorX += w;
            }
        }

        // Inventário title + content
        ctx.fillStyle = theme.textMain;
        ctx.font = "700 26px 'SF Pro Display'";
        ctx.fillText("Inventário:", invX + 1, invY + -8);

        ctx.font = "24px 'SF Pro Display'";
        ctx.fillStyle = theme.textMuted;
        const inventario = Array.isArray(perfil.inventario) ? perfil.inventario : [];
        if (inventario.length) {
            let cursorX = invX + 18;
            let cursorY = invY + 78;
            const iconSize = 30;
            const spacing = 12;
            const maxRowWidth = invW - 36;
            for (let i = 0; i < inventario.length; i++) {
                const token = inventario[i];
                const w = ctx.measureText(token).width + spacing;
                if (cursorX + w > invX + 18 + maxRowWidth) {
                    cursorX = invX + 18;
                    cursorY += iconSize + 12;
                    if (cursorY > invY + invH - 36) break;
                }
                ctx.fillText(token, cursorX, cursorY + 20);
                cursorX += w;
            }
        }

        // Points and Coins in right stacked boxes (inside area)
        ctx.font = "700 18px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Pontos:", rightX + 14, rightY + 28);
        ctx.font = "600 22px 'SF Pro Display'";
        ctx.fillStyle = theme.textMuted;
        ctx.fillText(String(perfil.pontos || 0), rightX + 14, rightY + 28 + 36);

        ctx.font = "700 18px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        ctx.fillText("Moedas:", rightX + 14, rightY + rightColH + 18 + 28);
        ctx.font = "600 22px 'SF Pro Display'";
        ctx.fillStyle = theme.textMuted;
        ctx.fillText(String(perfil.moedas || 0), rightX + 14, rightY + rightColH + 18 + 28 + 36);

        // ---------------- nickname under avatar ----------------
        ctx.font = "700 34px 'SF Pro Display'";
        ctx.fillStyle = theme.textMain;
        const nickname = target.username;
        const nickWidth = ctx.measureText(nickname).width;
        const nickX = avatarX + avatarSize / 2 - nickWidth / 2;
        ctx.fillText(nickname, nickX, avatarY + avatarSize + 48);

        // ---------------- big bio row (full width between boxes and wallpaper) ----------------
        const bioRowX = insX;
        const bioRowY = insY + insH + 15;
        const bioRowW = (rightX + rightColW) - insX; // fit to rightmost stacked boxes edge
        const bioRowH = 70;
        // draw glass row
        ctx.save();
        roundRect(ctx, bioRowX, bioRowY, bioRowW, bioRowH, 12);
        ctx.fillStyle = "rgba(0,0,0,0.34)";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        roundRect(ctx, bioRowX, bioRowY, bioRowW, bioRowH, 12);
        ctx.stroke();
        ctx.restore();

        ctx.font = "400 20px 'SF Pro Display'";
        ctx.fillStyle = theme.textMuted;
        const fullBio = perfil.bio || "";
        wrapText(ctx, fullBio, bioRowX + 18, bioRowY + 42, bioRowW - 36, 26);

        // ---------------- Wallpaper area (bottom) ----------------
        ctx.save();
        roundRect(ctx, 20, TOP + DIVIDER, WIDTH - 40, HEIGHT - TOP - 40, RADIUS - 6);
        ctx.clip();

        if (perfil.wallpaper) {
            const wp = await safeLoadImage(perfil.wallpaper);
            if (wp) {
                // cover logic
                const targetW = WIDTH - 40;
                const targetH = HEIGHT - TOP - 40;
                const ratio = Math.max(targetW / wp.width, targetH / wp.height);
                const drawW = wp.width * ratio;
                const drawH = wp.height * ratio;
                const dx = 20 + (targetW - drawW) / 2;
                const dy = TOP + DIVIDER + (targetH - drawH) / 2;
                ctx.drawImage(wp, dx, dy, drawW, drawH);
            } else {
                ctx.fillStyle = "rgba(0,0,0,0.22)";
                ctx.fillRect(20, TOP + DIVIDER, WIDTH - 40, HEIGHT - TOP - 40);
            }
        } else {
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.fillRect(20, TOP + DIVIDER, WIDTH - 40, HEIGHT - TOP - 40);
        }
        ctx.restore();

        // final stroke
        ctx.lineWidth = 4;
        ctx.strokeStyle = theme.border;
        roundRect(ctx, 10, 10, WIDTH - 20, HEIGHT - 20, RADIUS + 6);
        ctx.stroke();

        // export
        const buffer = canvas.toBuffer("image/png");
        const attachment = new AttachmentBuilder(buffer, { name: "perfil.png" });
        return message.reply({ files: [attachment] });
    }
};
