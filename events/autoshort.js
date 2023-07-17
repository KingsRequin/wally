// Importation des modules nécessaires
const { google } = require("googleapis"); // Client API Google
const { MessageEmbed } = require("discord.js"); // Outil pour créer des embeds sur Discord
const config = require("../config.json"); // Fichier de configuration

// Variables globales à partir du fichier de configuration
const youtubeApiKey = config.YOUTUBE_API_KEY;
const channelId = config.CHANNEL_ID;
const discordChannelId = config.DISCORD_CHANNEL_ID;
const logChannelId = config.LOG_CHANNEL_ID;

// Initialisation de l'API YouTube
const youtube = google.youtube("v3");
let latestVideoId = null; // Stockage de l'ID de la dernière vidéo consultée
let firstCheck = true; // Variable pour savoir s'il s'agit de la première vérification

// Exportation de la fonction principale
module.exports = function (client) {
  // Permet au client d'appeler la fonction de vérification des nouvelles vidéos
  client.checkNewVideos = checkNewVideos;

  // Lorsque le bot est prêt...
  client.on("ready", () => {
    // Vérifie immédiatement les nouvelles vidéos...
    checkNewVideos();

    // ... puis vérifie toutes les heures
    setInterval(checkNewVideos, 60 * 60 * 1000); //Attention a ne pas trop spam, l'api de google a une limite d'utilisation gratuite

    // Envoie un message dans le canal de logs pour signaler que le bot a démarré
    logEmbed(
      "Démarrage du bot",
      "Le bot a démarré et est configuré pour vérifier les nouvelles vidéos chaque heure",
      "#0099ff"
    );
  });

  // Fonction de vérification des nouvelles vidéos
  async function checkNewVideos() {
    // Essaie de faire une requête à l'API YouTube...
    try {
      //... requête à l'API YouTube pour récupérer la dernière vidéo du canal spécifié
      const response = await youtube.search.list({
        key: youtubeApiKey,
        channelId,
        part: "snippet",
        order: "date",
        maxResults: 1,
      });

      // ... récupère les informations de la vidéo
      const video = response.data.items[0];
      const shortUrl = `https://www.youtube.com/shorts/${video.id.videoId}`;

      //... log l'information sur l'embed
      logEmbed(
        "Réponse de l'API YouTube",
        `Réponse reçue de l'API YouTube: ${JSON.stringify(video)}`,
        "#44cc11",
        shortUrl
      );

      //... vérifie si l'ID de la vidéo est différent de celui de la dernière vidéo vérifiée
      if (video.id.videoId !== latestVideoId) {
        latestVideoId = video.id.videoId; // Met à jour l'ID de la dernière vidéo

        // Si ce n'est pas la première vérification, envoie un message dans le canal Discord avec le lien de la vidéo
        if (!firstCheck) {
          client.channels.cache
            .get(discordChannelId)
            .send(`# Et un Short et un !\n${shortUrl}\n@everyone`);
          logEmbed(
            "Nouveau short posté",
            `Short posté avec l'ID: ${latestVideoId}`,
            "#00aaee",
            shortUrl
          );
          logEmbed(
            "Confirmation",
            `Nouveau short avec l'ID: ${latestVideoId} posté avec succès !`,
            "#44cc11",
            shortUrl
          );
        } else {
          logEmbed(
            "Première vérification",
            "Première vérification, pas de publication sur Discord...",
            "#ffaa00"
          );
          firstCheck = false; // Met à jour la variable de première vérification
        }
      } else {
        // Si l'ID de la vidéo est le même que celui de la dernière vidéo vérifiée, alors il n'y a pas de nouvelle vidéo
        logEmbed(
          "Confirmation",
          "Pas de nouveaux shorts à poster pour le moment.",
          "#44cc11"
        );
      }
    } catch (error) {
      // Gère les erreurs lors de l'appel à l'API YouTube
      if (error.response) {
        const { code, message } = error.response.data.error;
        logEmbed(
          "Erreur de l'API YouTube",
          `Erreur code ${code} lors de la demande à l'API YouTube: ${message}`,
          "#ff0000"
        );
      } else {
        // Gère les autres types d'erreurs
        logEmbed(
          "Autre erreur",
          `Erreur durant l'opération: ${error}`,
          "#ff0000"
        );
      }
    }
  }

  // Fonction pour envoyer un message sous forme d'embed dans le canal de logs
  function logEmbed(title, description, color, url) {
    const embed = new MessageEmbed()
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setColor(color);

    // Si un URL est fourni, l'ajoute à l'embed
    if (url) {
      embed.setURL(url);
    }

    // Si le canal de logs est défini...
    if (logChannelId) {
      // ... Envoie l'embed dans le canal de logs
      const logChannel = client.channels.cache.get(logChannelId);
      // Vérifie que le canal existe bien avant d'essayer d'y envoyer le message
      if (logChannel) {
        logChannel.send({ embeds: [embed] });
      } else {
        console.error(
          "Le canal de logs défini dans la configuration n'existe pas."
        );
      }
    } else {
      // Si le canal de logs n'est pas défini, envoie un message dans la console
      console.warn("Aucun canal de logs défini dans la configuration.");
    }
  }
};
