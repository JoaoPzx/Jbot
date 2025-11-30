const mongoose = require("mongoose");

const TemaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    nomeLower: { type: String, required: true },
    nomeOriginal: { type: String, default: null },

    // ============================================================
    // 🔥 RECORDISTA DO TEMA (com nível e data)
    // ============================================================
    record: {
        userId: { type: String, default: null },
        pontos: { type: Number, default: 0 },
        nivel: { type: Number, default: 0 },
        data: { type: Date, default: null }
    },

    // ============================================================
    // 🔥 PONTUAÇÃO ACUMULADA POR USUÁRIO NO TEMA
    // ============================================================
    pontuacoes: [
        {
            userId: { type: String, required: true },
            total: { type: Number, default: 0 },      // total acumulado
            partidas: { type: Number, default: 0 }    // quantas partidas ele jogou no tema
        }
    ],

    criadoPor: { type: String, default: null },
    dataCriacao: { type: Date, default: Date.now },

    // ============================================================
    // 🔥 BANNER DO TEMA
    // ============================================================
    banner: { type: String, default: null },

    // ============================================================
    // 🔥 LISTA DE IMAGENS DO TEMA
    // ============================================================
    imagens: [
        {
            resposta: { type: String, required: true },
            url: { type: String, required: true },
            addedBy: { type: String, default: null },
            addedAt: { type: Date, default: Date.now }
        }
    ],

    // ============================================================
    // 🔥 INSÍGNIA DO TEMA (USADA NO PERFIL)
    // ============================================================
    insignia: { type: String, default: null },
    insigniaEmoji: { type: String, default: null },
    insigniaEmojiId: { type: String, default: null },

});

module.exports = mongoose.model("Tema", TemaSchema);
