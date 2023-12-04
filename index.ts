import { Client, GatewayIntentBits, Message, VoiceState } from "discord.js";
import {
  AudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
} from "@discordjs/voice";
import { addSpeechEvent, VoiceMessage } from "discord-speech-recognition";
import dotenv from "dotenv";
import fs from "fs";
import { getVoiceStream } from "./tts";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
  ],
});

addSpeechEvent(client, {
  lang: process.env.LANG,
  profanityFilter: false,
  ignoreBots: true,
});

const audioPlayerMap = new Map<string, AudioPlayer>();

client.on("voiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
  if (newState.channel == null && oldState.channel != null) {
    let membersInChannel = oldState.channel.members.filter(
      (member) => !member.user.bot
    );
    if (membersInChannel.size == 0) {
      const connection = getVoiceConnection(oldState.guild.id);
      if (!connection) return;
      connection.disconnect();
    }
  }
});

client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  if (msg.content.trim() == "+join") {
    const voiceChannel = msg.member?.voice.channel;
    if (voiceChannel) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      const audioPlayer = new AudioPlayer();
      connection.subscribe(audioPlayer);
      audioPlayerMap.set(voiceChannel.guild.id, audioPlayer);
    }

    msg.delete();
  }
});

client.on("speech", async (msg: VoiceMessage) => {
  const member = msg.member;
  const messageContent = msg.content;

  // If bot didn't recognize speech, content will be empty
  if (!messageContent || member == null) return;
  console.log(messageContent);

  let data = fs.readFileSync("list_of_banned_words.txt").toString("utf-8");
  let list = data.split("\n");

  for (let word of list) {
    let isFullWord = !word.toLowerCase().trim().endsWith("*");
    let modifiedMessageContent = messageContent.trim().toLowerCase();
    let modifiedWord = word.trim().toLowerCase().replace("*", "");

    if (isFullWord) {
      const wordsInSentence = modifiedMessageContent.split(" ");
      for (const wordInSentence of wordsInSentence) {
        if (wordInSentence.toLowerCase().trim() == modifiedWord) {
          const stream = getVoiceStream(
            `${msg.author.username} is being racist`
          );
          const audioResource = createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
          });

          const audioPlayer = audioPlayerMap.get(msg.guild.id);
          if (audioPlayer) {
            audioPlayer.play(audioResource);
          }

          console.log(
            `${msg.author.username} used a banned word, making him disconnect!`
          );
          if (member.voice) {
            member.voice.disconnect();
          }
        }
      }
    } else {
      if (modifiedMessageContent.includes(modifiedWord)) {
        const stream = getVoiceStream(`${msg.author.username} is being racist`);
        const audioResource = createAudioResource(stream, {
          inputType: StreamType.Arbitrary,
          inlineVolume: true,
        });

        const audioPlayer = audioPlayerMap.get(msg.guild.id);
        if (audioPlayer) {
          audioPlayer.play(audioResource);
        }

        console.log(
          `${msg.author.username} is being racist, making him disconnect!`
        );
        if (member.voice) {
          member.voice.disconnect();
        }
      }
    }
  }
});

client.on("ready", () => {
  console.log("Ready!");
});

client.login(process.env.DISCORD_KEY);
