const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = '!';

client.once('ready', () => {
    console.log(`🎵 Bot Nhạc đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const channel = message.member?.voice.channel;
        if (!channel) {
            return message.reply('❌ Bạn phải vào một kênh voice trước đã!');
        }

        const query = args.join(' ');
        if (!query) {
            return message.reply('❌ Hãy nhập tên bài hát hoặc link YouTube cần phát!');
        }

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            const loadingMsg = await message.reply(`🔍 Đang tìm kiếm: **${query}**...`);

            let streamData = await play.search(query, { limit: 1 });
            if (!streamData.length) {
                return loadingMsg.edit('❌ Không tìm thấy bài hát nào phù hợp!');
            }

            const songUrl = streamData[0].url;
            const stream = await play.stream(songUrl);

            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            await loadingMsg.edit(`🎶 Đang phát: **${streamData[0].title}**`);

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

        } catch (error) {
            console.error(error);
            message.reply('❌ Đã xảy ra lỗi khi phát nhạc!');
        }
    }

    if (command === 'stop') {
        const channel = message.member?.voice.channel;
        if (channel) {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            connection.destroy();
            message.reply('⏹️ Đã dừng nhạc và ngắt kết nối!');
        }
    }
});

// Thay "TOKEN_BOT_CUA_BAN" bằng Token thật của con Sound Cloud vừa tạo
client.login("MTU0MTAxODE3MzMyMTY0NjE3MQ.G5Wmy8.2jRNqo8CUh2qZyeaYTNE2AHCcarlJleKy84chY");