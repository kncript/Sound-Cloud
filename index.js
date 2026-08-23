const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');

// Tạo web server nhỏ để mở port, giúp Render không đưa ứng dụng vào trạng thái ngủ đông
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('SoundCloud Bot is running 24/7!');
});

app.listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
});

// Khởi tạo Discord Bot với các Intent cần thiết
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;

    if (message.content.startsWith('!play')) {
        const args = message.content.split(' ');
        const query = args[1];

        if (!query) {
            return message.reply('❌ Vui lòng nhập đường dẫn bài hát SoundCloud!');
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ Bạn cần vào một phòng Voice Channel trước!');
        }

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            // Kiểm tra link SoundCloud hợp lệ
            if (!play.soundCloud.so(query)) {
                return message.reply('❌ Link bạn vừa nhập không phải là link SoundCloud hợp lệ!');
            }

            // Lấy thông tin bài hát và tạo stream
            const songInfo = await play.soundcloud(query);
            const stream = await play.stream(query);

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            const player = createAudioPlayer();
            connection.subscribe(player);
            player.play(resource);

            message.reply(`🎵 Đang phát: **${songInfo.name || query}**`);
        } catch (error) {
            console.error('Lỗi phát nhạc:', error);
            message.reply('❌ Đã xảy ra lỗi khi cố gắng phát bài hát này!');
        }
    }
});

// Đăng nhập bot thông qua token bảo mật trên Render
client.login(process.env.DISCORD_TOKEN);