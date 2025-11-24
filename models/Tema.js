const mongoose = require("mongoose");

const TemaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    nomeLower: { type: String, required: true },
    nomeOriginal: { type: String, default: null },

    // 🔥 RECORD DO TEMA (agora com nível)
    record: {
        userId: { type: String, default: null },
        pontos: { type: Number, default: 0 },
        nivel: { type: Number, default: 0 }, // ⭐ NOVO CAMPO
        data: { type: Date, default: null }
    },

    // 🔥 NOVO SISTEMA DE ACÚMULO DE PONTOS 🔥
    pontuacoes: [
        {
            userId: String,
            total: { type: Number, default: 0 },
            partidas: { type: Number, default: 0 }
        }
    ],

    criadoPor: { type: String, default: null },
    dataCriacao: { type: Date, default: Date.now },

    banner: { type: String, default: null },

    imagens: [
        {
            resposta: { type: String, required: true },
            url: { type: String, required: true },
            addedBy: { type: String, default: null },
            addedAt: { type: Date, default: null }
        }
    ],

    insignia: { type: String, default: null },
    insigniaEmoji: { type: String, default: null },
    insigniaEmojiId: { type: String, default: null },

    partidasJogadas: { type: Number, default: 0 }
});

module.exports = mongoose.model("Tema", TemaSchema);
