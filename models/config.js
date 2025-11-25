const mongoose = require("mongoose");

const ConfigSchema = new mongoose.Schema({
    tipo: { type: String, required: true },
    valor: { type: Number, default: 0 }
});

module.exports = mongoose.model("Config", ConfigSchema);
