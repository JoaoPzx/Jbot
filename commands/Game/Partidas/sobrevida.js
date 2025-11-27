// commands/Community/chance.js
const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");
const playModule = require("./play"); // ajuste se seu caminho for diferente
const partidasAtivas = playModule.partidasAtivas;
const recentEncerradas = playModule.recentEncerradas;
const iniciarRodada = playModule.iniciarRodada;

module.exports = {
  name: "sobrevida",
  aliases: ["s"],
  description: "Restaura uma partida encerrada por tempo (janela 15s).",
  async execute(message, args) {
    try {
      const channelId = message.channel.id;

      // 1) Verifica se já existe uma partida ativa — não pode restaurar se já existir.
      if (partidasAtivas.has(channelId)) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor("#ff4d4d").setDescription("<:fecharerr:1442682279322325095> Já existe uma partida ativa neste canal.")]
        });
      }

      // 2) Verifica se há snapshot recente
      const entry = recentEncerradas.get(channelId);
      if (!entry) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor("#ff4d4d").setDescription("<:fecharerr:1442682279322325095> Não existe uma partida recuperável (expirada ou inexistente).")]
        });
      }

      const { snapshot } = entry;

      // 3) Valida inventário do usuário (consome 1 item 'chance')
      let perfil = await Perfil.findOne({ userId: message.author.id });
      if (!perfil) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor("#ff4d4d").setDescription("<:fecharerr:1442682279322325095> Seu perfil não foi encontrado.")]
        });
      }

      if (!Array.isArray(perfil.inventario)) perfil.inventario = [];

      const item = perfil.inventario.find(i => i.nome === "chance");
      if (!item || item.quantidade <= 0) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor("#ff4d4d").setDescription("<:fecharerr:1442682279322325095> Você não possui **Sobreviadas** no seu inventário.")]
        });
      }

      // 4) Consome 1 chance
      item.quantidade -= 1;
      if (item.quantidade <= 0) perfil.inventario = perfil.inventario.filter(i => i.nome !== "sobrevida");
      await perfil.save();

      // 5) Re-cria a partida com a snapshot
      const partida = {
        autorId: snapshot.tema?.criadoPor || message.author.id,
        tema: snapshot.tema,
        nivel: snapshot.nivel || 1,
        ranking: snapshot.ranking || {},
        cor: snapshot.cor || "#5865F2",
        coletor: null,
        timeout: null,
        pausada: false,
        encerrada: false,
        temaNomeExibir: snapshot.temaNomeExibir,
        inicio: Date.now(),
        rodadaEmCurso: false,
        rodadaTerminada: false,
        combos: snapshot.combos || {},
        embedRodada: null,
        tempoExtraGlobal: snapshot.tempoExtraGlobal || 0,
        tempoBoostNiveisRestantes: snapshot.tempoBoostNiveisRestantes || 0,
        podeUsarTempoAgora: true,
        podeUsarNitroAgora: true,
        nitro: snapshot.nitro || false,
    };

      // Registra novamente como ativa
      partidasAtivas.set(channelId, partida);

      // Limpa a snapshot (consumida) e seu timer
      if (entry.timer) clearTimeout(entry.timer);
      recentEncerradas.delete(channelId);

      // 6) Mensagem para canal e reinicia rodada com o mesmo NIVEL (tempo calculado normalmente para o nível)
      const embed = new EmbedBuilder()
        .setColor("#00C8FF")
        .setDescription(`**<:icon_sobrevida:1443390286159155342> Partida restaurada com sucesso por ${message.author}.**`)
        .setFooter({text: "Partida continuando em 10s"})


      await message.channel.send({ embeds: [embed] });

      // pequena espera e iniciar rodada (mantém estado de ranking/pontos e nível)
      setTimeout(() => iniciarRodada(message, partida), 10000);

    } catch (err) {
      console.error("Erro em comando chance:", err);
      return message.reply({
        embeds: [new EmbedBuilder().setColor("#ff4d4d").setDescription("<:fecharerr:1442682279322325095> Erro ao tentar recuperar a partida.")]
      });
    }
  }
};
