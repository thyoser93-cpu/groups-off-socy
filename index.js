const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { nanoid } = require('nanoid');

// --- CONFIGURATION (Environment Variables) ---
const TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const CLIENT_ID = process.env.CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const GUILD_ID = process.env.GUILD_ID || 'YOUR_GUILD_ID_HERE';
const PORT = process.env.PORT || 8000;

// --- DATABASE SETUP ---
const DB_FILE = './database.json';
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ keys: {} }));
}

function getDB() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// --- DISCORD BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('gerar')
        .setDescription('Gera uma chave de acesso para o GOTH PREDICTOR')
        .addStringOption(option =>
            option.setName('duracao')
                .setDescription('Tempo de duração da chave')
                .setRequired(true)
                .addChoices(
                    { name: '1 Hora', value: '1h' },
                    { name: '1 Dia', value: '1d' },
                    { name: '7 Dias', value: '7d' },
                    { name: '30 Dias', value: '30d' },
                    { name: 'Vitalicia', value: 'life' }
                ))
].map(command => command.toJSON());

client.once('ready', () => {
    console.log(`[BOT] Logado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    (async () => {
        try {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log('[BOT] Slash commands registrados com sucesso.');
        } catch (error) {
            console.error(error);
        }
    })();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'gerar') {
        const duration = interaction.options.getString('duracao');
        const key = `GOTH-${nanoid(8).toUpperCase()}`;
        
        const now = Date.now();
        let expiresAt = 0;
        
        switch(duration) {
            case '1h': expiresAt = now + 3600000; break;
            case '1d': expiresAt = now + 86400000; break;
            case '7d': expiresAt = now + 604800000; break;
            case '30d': expiresAt = now + 2592000000; break;
            case 'life': expiresAt = 9999999999999; break;
        }

        const db = getDB();
        db.keys[key] = { duration, expiresAt, createdAt: now, used: false };
        saveDB(db);

        const embed = new EmbedBuilder()
            .setTitle('🔑 CHAVE GERADA!')
            .setColor('#ffffff')
            .setDescription(`Abaixo está sua chave de acesso para o **GOTH PREDICTOR**.`)
            .addFields(
                { name: 'Key', value: `\`${key}\``, inline: true },
                { name: 'Duração', value: duration.toUpperCase(), inline: true },
                { name: 'Expira em', value: expiresAt === 9999999999999 ? 'Nunca' : new Date(expiresAt).toLocaleString('pt-BR'), inline: false }
            )
            .setFooter({ text: 'GOTH PREDICTOR - Premium System' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

client.login(TOKEN);

// --- API SERVER ---
const app = express();
app.use(cors());
app.use(express.json());

app.get('/validate/:key', (req, res) => {
    const key = req.params.key;
    const db = getDB();
    const keyInfo = db.keys[key];

    if (!keyInfo) {
        return res.status(404).json({ valid: false, message: 'Chave não encontrada.' });
    }

    if (Date.now() > keyInfo.expiresAt) {
        return res.status(403).json({ valid: false, message: 'Chave expirada.' });
    }

    res.json({ valid: true, expiresAt: keyInfo.expiresAt });
});

app.listen(PORT, () => {
    console.log(`[API] Servidor rodando na porta ${PORT}`);
    console.log(`[API] KOYEB DETECTADA: Use a URL que a Koyeb te der no Predictor!`);
    console.log(`[API] Exemplo: https://goth-bot-pedro.koyeb.app`);
});
