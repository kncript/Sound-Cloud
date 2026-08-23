require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { YouTubeExtractor, SoundCloudExtractor } = require('@discord-player/extractor');
const express = require('express');

// Tạo web server nhỏ để mở port giúp Render duy trì 24/7
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord Music Bot is running 24/7!');
});

app.listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const player = new Player(client);

client.once('ready', async () => {
    await player.extractors.register(YouTubeExtractor, {});
    await player.extractors.register(SoundCloudExtractor, {});
    console.log(`Logged in as ${client.user.tag}!`);
});

// Bắt sự kiện lỗi của player để tránh bot bị crash ngầm
player.events.on('error', (queue, error) => {
    console.error(`[Player Error] ${error.message}`);
});

player.events.on('playerError', (queue, error) => {
    console.error(`[Queue Error] ${error.message}`);
});

player.events.on('audioTrackAdd', (queue, track) => {
    queue.metadata.channel.send(`🎵 Đã thêm vào hàng đợi: **${track.title}**`);
});

player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`▶️ Đang phát: **${track.title}**`);
});

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === '!play') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ Vui lòng nhập tên bài hát hoặc đường dẫn!');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('❌ Bạn cần vào một phòng Voice Channel trước!');

        try {
            const { track } = await player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: message,
                    selfDeaf: true,
                    volume: 80,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 300000,
                }
            });
        } catch (e) {
            console.error(e);
            return message.reply('❌ Không thể phát bài hát này (IP của Render có thể bị YouTube giới hạn, hãy thử tìm bằng tên bài hát thay vì link trực tiếp)!');
        }
    }

    else if (command === '!skip') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Không có bài hát nào đang phát!');
        queue.node.skip();
        return message.reply('⏭️ Đã bỏ qua bài hát hiện tại!');
    }

    else if (command === '!stop') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue) return message.reply('❌ Bot không ở trong phòng Voice!');
        queue.delete();
        return message.reply('⏹️ Đã dừng nhạc và rời khỏi phòng!');
    }

    else if (command === '!pause') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Không có nhạc đang phát để tạm dừng!');
        queue.node.pause();
        return message.reply('⏸️ Đã tạm dừng phát nhạc.');
    }

    else if (command === '!resume') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue) return message.reply('❌ Không có hàng đợi nào!');
        queue.node.resume();
        return message.reply('▶️ Đã tiếp tục phát nhạc!');
    }
});

client.login(process.env.DISCORD_TOKEN);