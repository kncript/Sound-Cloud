require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const express = require('express');

// Tạo web server nhỏ để mở port, giúp Render không bị ngủ đông
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord Music Bot is running 24/7!');
});

app.listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
});

// Khởi tạo Discord Client với các Intent đầy đủ
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Khởi tạo Discord Player
const player = new Player(client);

client.once('ready', async () => {
    // Đăng ký các trình trích xuất mặc định (hỗ trợ YouTube, SoundCloud, Spotify...)
    await player.extractors.loadMulti(DefaultExtractors);
    console.log(`Logged in as ${client.user.tag}!`);
});

// Lắng nghe sự kiện tin nhắn để điều khiển bot
client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. Lệnh !play
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

            return message.reply(`🎵 Đã thêm vào hàng đợi: **${track.title}**`);
        } catch (e) {
            console.error(e);
            return message.reply('❌ Đã xảy ra lỗi khi cố gắng phát bài hát này!');
        }
    }

    // 2. Lệnh !skip
    else if (command === '!skip') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Không có bài hát nào đang phát!');

        queue.node.skip();
        return message.reply('⏭️ Đã bỏ qua bài hát hiện tại!');
    }

    // 3. Lệnh !stop (Dừng và thoát voice)
    else if (command === '!stop') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue) return message.reply('❌ Bot không ở trong phòng Voice!');

        queue.delete();
        return message.reply('⏹️ Đã dừng nhạc và rời khỏi phòng!');
    }

    // 4. Lệnh !pause (Tạm dừng)
    else if (command === '!pause') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Không có nhạc đang phát để tạm dừng!');

        queue.node.pause();
        return message.reply('⏸️ Đã tạm dừng phát nhạc.');
    }

    // 5. Lệnh !resume (Tiếp tục phát)
    else if (command === '!resume') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue) return message.reply('❌ Không có hàng đợi nào!');

        queue.node.resume();
        return message.reply('▶️ Đã tiếp tục phát nhạc!');
    }

    // 6. Lệnh !queue (Xem danh sách chờ)
    else if (command === '!queue') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Hàng đợi đang trống!');

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray();

        const queueString = tracks.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}`).join('\n');

        return message.reply(
            `**Đang phát:** ${currentTrack.title}\n\n**Hàng đợi tiếp theo:**\n${queueString || 'Không còn bài hát nào trong hàng đợi'}`
        );
    }

    // 7. Lệnh !volume (Chỉnh âm lượng)
    else if (command === '!volume') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Bot chưa phát nhạc!');

        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 100) {
            return message.reply(`🔊 Âm lượng hiện tại: **${queue.node.volume}%**. Hãy nhập số từ 0 đến 100.`);
        }

        queue.node.setVolume(vol);
        return message.reply(`🔊 Đã chỉnh âm lượng thành: **${vol}%**`);
    }
});

// Đăng nhập bot qua token
client.login(process.env.DISCORD_TOKEN);