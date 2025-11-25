const { EmbedBuilder } = require("discord.js");
const validarItem = require("../../Utility/validarItem");
const { iniciarRodada } = require("./play");

module.exports = {
    name: "pular",
    aliases: ["s"],

    async execute(message) {

        // Middleware (validação geral)
        const contexto = await validarItem(message, "pulo");
        if (!contexto || contexto.reply) return contexto;

        const { partida, perfil, item } = contexto;

        // ❌ Não pode pular se partida estiver pausada
        if (partida.pausada) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Você não pode **pular imagem** enquanto a partida está pausada.")
                ]
            });
        }

        // ❌ Não pode pular se não houver imagem ativa
        if (!partida.itemAtual || !partida.rodadaEmCurso) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Nenhuma imagem ativa no momento.")
                ]
            });
        }

        // ❌ Só pode 5 pulos por partida
        partida.pulosUsados = partida.pulosUsados || 0;
        if (partida.pulosUsados >= 5) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Você atingiu o limite de **5 pulos por partida**.")
                ]
            });
        }

        // Consome item do inventário
        item.quantidade--;
        if (item.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(it => it.nome !== "pulo");
        }
        await perfil.save();

        partida.pulosUsados++;

        // FINALIZA O COLETOR ATUAL (SEM ENCERRAR PARTIDA)
        if (partida.coletor) {
            try {
                partida.coletor.stop("pulado"); // <- IMPORTANTÍSSIMO
            } catch (err) {
                console.error("Erro ao parar coletor no pulo:", err);
            }
            partida.coletor = null;
        }

        // Limpa a rodada atual sem alterar tempo/nível
        partida.rodadaEmCurso = false;
        partida.rodadaTerminada = true;
        partida.itemAtual = null;

        // EMBED DE CONFIRMAÇÃO
        const embed = new EmbedBuilder()
            .setColor("#ffaa00")
            .setDescription(`<:icon_pulo:1441182320462790786> Você utilizou 1 pulo **${partida.pulosUsados}/5 pulos.**`)

        await message.reply({ embeds: [embed] });

        // INICIA NOVA RODADA IMEDIATAMENTE
        setTimeout(() => {
            iniciarRodada(message, partida);
        }, 1000); // leve atraso para não sobrepor mensagens
    }
};
