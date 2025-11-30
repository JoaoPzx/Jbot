const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    quantidade: { type: Number, default: 1 }
});

const PerfilSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },

    casamento: { type: String, default: null },


    bio: { type: String, default: "Olá! Eu ainda não personalizei meu perfil." },
    wallpaper: { type: String, default: null },
    cor: { type: String, default: "preto" },

    pontuacoes: {
    type: [
        {
            temaId: { type: String, required: true },  // id do tema
            total: { type: Number, default: 0 },       // pontos acumulados
            partidas: { type: Number, default: 0 }     // número de partidas
        }
    ],
    default: []
},



    pontos: { type: Number, default: 0 },
    moedas: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },


    comboBonus: { type: Number, default: 1 },
    comboItems: { type: Number, default: 0 }, // quantidade de itens combo no inventário

    insignias: {
  type: [
    {
      temaId: { type: String, required: true },
      nome: { type: String, required: true },
      nomeLower: { type: String, required: true },
      insigniaEmoji: { type: String, default: null },
      insigniaEmojiId: { type: String, default: null },
      pontos: { type: Number, default: 0 },
      grantedAt: { type: Date, default: Date.now }
    }
  ],
  default: []
},


    inventario: {
        type: [ItemSchema],
        default: []
    }
});

module.exports = mongoose.model("Perfil", PerfilSchema);