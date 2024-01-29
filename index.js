import express from "express";
import { Client } from "discord.js";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const port = process.env.PORT || 4000;

const client = new Client({
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

client.on("ready", () => {
  app.listen(port, () => {
    console.log(`Bot is running on port ${port}`);
  });
});

const IGNORE_PREFIX = "!";
const CHANNELS = ["1201400806159691947"];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith(IGNORE_PREFIX)) return;
  if (
    !CHANNELS.includes(message.channelId) &&
    !message.mentions.users.has(client.user.id)
  )
    return;

  await message.channel.sendTyping();

  const sendTypingInterval = setInterval(() => {
    message.channel.sendTyping();
  }, 5000);

  let conversation = [];
  conversation.push({
    role: "system",
    content: "Sabe Tudo é um chat amigavel.",
  });

  let prevMessages = await message.channel.messages.fetch({ limit: 10 });
  prevMessages.reverse();

  prevMessages.forEach((msg) => {
    if (msg.author.bot && msg.author.id !== client.user.id) return;
    if (msg.content.startsWith(IGNORE_PREFIX)) return;

    const username = msg.author.username
      .replace(/\s+/g, "_")
      .replace(/[^\w\s]/gi, "");

    if (msg.author.id === client.user.id) {
      conversation.push({
        role: "assistant",
        name: username,
        content: msg.content,
      });
      return;
    }

    conversation.push({
      role: "user",
      name: username,
      content: msg.content,
    });
  });

  const response = await openai.chat.completions
    .create({
      model: "gpt-3.5-turbo",
      messages: conversation,
    })
    .catch((error) => console.error("OpenAI Error:\n", error));
  clearInterval(sendTypingInterval);

  if (!response) {
    message.reply(
      "Tive um problema com a API da OpenAI. Tente novamente mais tarde"
    );
    return;
  }

  message.reply(response.choices[0].message.content.substring(0, 2000));
});

client.login(process.env.TOKEN);
