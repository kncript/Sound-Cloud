require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { SoundCloudExtractor } = require('@discord-player/extractor');
const express = require('express');

// Web server giữ bot sống 24/7 trên Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('SoundCloud Music Bot is running 24/7!');
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

// Khởi tạo Player với cấu hình bộ đệm tối ưu tránh abort kết nối
const player = new Player(client, {
    skipFFmpeg: false
});

client.once('ready', async () => {
    await player.extractors.register(SoundCloudExtractor, {});
    console.log(`Logged in as ${client.user.tag}! (SoundCloud Only)`);
});

// Bắt sự kiện lỗi chi tiết để tránh crash bot
player.events.on('error', (queue, error) => {
    console.error(`[Player Error] ${error.message}`);
});

player.events.on('playerError', (queue, error) => {
    console.error(`[Queue Error] ${error.message}`);
    if (queue && queue.metadata && queue.metadata.channel) {
        queue.metadata.channel.send(`⚠️ Gặp lỗi đường truyền khi phát bài hát này, đang tự động chuyển...`);
    }
});

player.events.on('audioTrackAdd', (queue, track) => {
    queue.metadata.channel.send(`🎵 Đã thêm vào hàng đợi SoundCloud: **${track.title}**`);
});

player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`▶️ Đang phát từ SoundCloud: **${track.title}**`);
});

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === '!play') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ Vui lòng nhập tên bài hát hoặc từ khóa trên SoundCloud!');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('❌ Bạn cần vào một phòng Voice Channel trước!');

        try {
            // Tìm kiếm trực tiếp tối ưu hóa cho SoundCloud
            const searchResult = await player.search(query, {
                requestedBy: message.author,
                searchEngine: 'soundcloud' // Ép công cụ tìm kiếm chuẩn SoundCloud
            });

            if (!searchResult || !searchResult.hasTracks()) {
                return message.reply('❌ Không tìm thấy bài hát nào trên SoundCloud!');
            }

            await player.play(voiceChannel, searchResult, {
                nodeOptions: {
                    metadata: message,
                    selfDeaf: false,
                    volume: 100,
                    connectionTimeout: 45000, // Tăng thời gian chờ lên 45 giây để chống timeout trên Render
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 300000,
                }
            });
        } catch (e) {
            console.error(e);
            return message.reply('❌ Đã xảy ra lỗi kết nối mạng tới SoundCloud.');
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
});

client.login(process.env.DISCORD_TOKEN);