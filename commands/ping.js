const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const os = require("os");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Affiche le ping du bot et l'utilisation du CPU et de la RAM."
    ),
  async execute(interaction) {
    const cpuUsage = process.cpuUsage();
    const ramUsage = process.memoryUsage();

    const totalCpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000;
    const totalRamUsage = (ramUsage.rss / os.totalmem()) * 100;

    const embed = new MessageEmbed().setTitle("Statistiques du bot").addFields(
      {
        name: "Ping du bot",
        value: `${
          Date.now() - interaction.createdTimestamp
        }ms <a:PING_PONG:1116477938204942366>`,
      },
      {
        name: "CPU",
        value: `${totalCpuUsage.toFixed(2)}%<a:loading:1116477936476884992>`,
      },
      {
        name: "RAM",
        value: `${totalRamUsage.toFixed(2)}%<a:loading:1116477936476884992>`,
      }
    );

    await interaction.reply({ embeds: [embed] });
  },
};
