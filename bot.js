// Importation des modules nécessaires
const cron = require("node-cron"); // Module pour planifier des tâches
const fs = require("fs"); // Module pour interagir avec le système de fichiers
const { REST } = require("@discordjs/rest"); // Classe pour interagir avec l'API Discord
const { Routes } = require("discord-api-types/v9"); // Pour utiliser les routes de l'API Discord
const { google } = require("googleapis"); // Client API Google
const config = require("./config.json"); // Fichier de configuration
const { Client, Intents } = require("discord.js"); // Importation du client Discord.js et des intents

// Configuration des variables globales
const clientId = config.CLIEN_ID;
const token = config.TOKEN;
const youtubeApiKey = config.YOUTUBE_API_KEY;
const channelId = config.CHANNEL_ID;

// Initialisation d'un tableau pour stocker les commandes du bot
const commands = [];
// Lecture du répertoire des commandes et stockage des commandes dans le tableau
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

// Initialisation du client REST pour interagir avec l'API Discord
const rest = new REST({ version: "9" }).setToken(token);

// Essaie de recharger les commandes du bot à chaque démarrage
(async () => {
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

// Création d'une nouvelle instance du client Discord
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
  ],
});
// Initialisation de l'API YouTube
const youtube = google.youtube("v3");
client.commands = new Map();
// Associe chaque commande à son nom pour une utilisation facile
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Lecture du répertoire des événements et exécution de chaque fichier d'événement
const eventFiles = fs
  .readdirSync("./events")
  .filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  event(client);
}

// Quand le bot est prêt...
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Configure l'activité du bot defini dans ./config.json
  const { name, type, url } = config.activity;
  client.user.setActivity(name, { type, url });
});

// Quand une interaction (une commande slash) est créée...
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  // ... récupère la commande de l'interaction
  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  // ... essaie d'exécuter la commande
  try {
    await command.execute(interaction, { youtube, youtubeApiKey, channelId });
  } catch (error) {
    // ... gère les erreurs et les log dans un fichier
    console.error(error);
    fs.appendFileSync("error.log", `${new Date().toISOString()} - ${error}\n`);
    await interaction.reply({
      content: "Il y a eu une erreur lors de l'exécution de cette commande!",
      ephemeral: true,
    });
  }
});

// Connecte le bot à Discord
client.login(token);
