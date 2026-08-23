const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const play = require('play-dl');

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
    if (!message.guild) return;

    // Ví dụ lệnh phát nhạc: !play <link_soundcloud_hoặc_youtube>
    if (message.content.startsWith('!play')) {
        const args = message.content.split(' ');
        const query = args[1];

        if (!query) {
            return message.reply('Vui lòng nhập đường dẫn bài hát!');
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('Bạn cần vào một phòng Voice Channel trước!');
        }

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            // Sử dụng play-dl để stream nhạc
            const stream = await play.stream(query);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            const player = createAudioPlayer();
            connection.subscribe(player);
            player.play(resource);

            message.reply(`Đang phát: ${query}`);
        } catch (error) {
            console.error(error);
            message.reply('Đã xảy ra lỗi khi phát nhạc!');
        }
    }
});

// Đăng nhập bot sử dụng biến môi trường DISCORD_TOKEN trên Render
client.login(process.env.DISCORD_TOKEN);