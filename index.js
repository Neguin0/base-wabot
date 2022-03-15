const {
	default: WASocket,
	DisconnectReason,
	useSingleFileAuthState,
	downloadContentFromMessage,
	prepareWAMessageMedia,
	generateWAMessageFromContent,
	generateMessageID,
	proto,
} = require('@adiwajshing/baileys');
const Pino = require('pino');
const axios = require('axios').default;
const fs = require('fs');
const { writeFile } = require('fs/promises');
const path = require('path').join;
const {
	Boom
} = require('@hapi/boom');
const {
	state,
	saveState
} = useSingleFileAuthState(
	path('session.json'),
	Pino({
		level: 'silent'
	})
);
const checkVersion = async () => {
	let BASE_URL = 'https://web.whatsapp.com/check-update?version=1&platform=web';
	const { data: JSONData } = await axios.get(BASE_URL);
	let version = JSONData.currentVersion.split('.').map(v => parseInt(v));
	return version;
};

var criandoFig = false;
var vermelho = '\u001b[31m';
var azul = '\u001b[34m';
var reset = '\u001b[0m';
var verde = '\u001B[32m';
var amarelo = '\u001B[33m';
function random(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
const Json = (json) => JSON.stringify(json, null, '\t');
const getGroupAdmins = participants => {
	admins = [];
	for (let i of participants) {
		i.admin ? admins.push(i.id) : '';
	}
	return admins;
};
function ramUsage() {
	return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100 + "MB";
}
function cpuUsage() {
	return Math.round(process.cpuUsage().system / 1024 / 1024 * 100) / 100 + "MB";
}

const connect = async () => {
	let version = await checkVersion();
	const client = WASocket({
		printQRInTerminal: true,
		auth: state,
		logger: Pino({
			level: 'silent'
		}),
		version
	});
	client.ev.on('creds.update', saveState);
	client.ev.on('connection.update', async (up) => {
		try {
			const { lastDisconnect, connection } = up;
			if (connection) { console.log('Connection Status: ', connection); }
			let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

			if (connection === 'close') {
				if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete Session and Scan Again`); process.exit(); }
				else if (reason === DisconnectReason.connectionClosed) { console.log('Connection closed, reconnecting....'); connect(); }
				else if (reason === DisconnectReason.connectionLost) { console.log('Connection Lost from Server, reconnecting...'); connect(); }
				else if (reason === DisconnectReason.connectionReplaced) { console.log('Connection Replaced, Another New Session Opened, Please Close Current Session First'); process.exit(); }
				else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Delete ${session} and Scan Again.`); process.exit(); }
				else if (reason === DisconnectReason.restartRequired) { console.log('Restart Required, Restarting...'); connect(); }
				else if (reason === DisconnectReason.timedOut) { console.log('Connection TimedOut, Reconnecting...'); connect(); }
				else { console.log(`Unknown DisconnectReason: ${reason}|${connection}`) }
			}
		} catch (e) {
			console.log(vermelho, "ERROR:", e);
		}
	})
	client.ev.on('group-participants.update', json => { });
	client.ev.on('messages.upsert', async m => {
		try {
			if (!m.messages[0]) return;
			if (m.type !== 'notify') return;
			const dados = m.messages[0];
			if (dados.key.remoteJid === 'status@broadcast') return;
			//console.log(JSON.stringify(dados, null, '   '))
			const jid = dados.key.remoteJid;
			const id = dados.key.participant || dados.key.remoteJid;
			const jidBot = client.user.id.replace(/:.+@/, '@');
			const nick = dados.pushName;
			const info = dados.message;
			const type = Object.keys(info).length > 0 ? Object.keys(info)[0] : '';
			const msg =
				info && info.extendedTextMessage ?
					info.extendedTextMessage.text :
					info && info.conversation ?
						info.conversation :
						info && info.imageMessage ?
							info.imageMessage.caption :
							'';
			const mentioned =
				type == 'extendedTextMessage' &&
					info &&
					info.extendedTextMessage &&
					info.extendedTextMessage.contextInfo &&
					info.extendedTextMessage.contextInfo.participant ?
					info.extendedTextMessage.contextInfo.participant :
					'';
			const mentions =
				type == 'extendedTextMessage' &&
					info &&
					info.extendedTextMessage &&
					info.extendedTextMessage.contextInfo &&
					info.extendedTextMessage.contextInfo.mentionedJid ?
					info.extendedTextMessage.contextInfo.mentionedJid :
					'';
			const cmd = msg.startsWith('/') ? msg.split(' ')[0].slice(1) : null;
			const text = cmd ? msg.slice(cmd.length + 2) : '';
			const args = text.split(' ');
			const reply = texto => client.sendMessage(jid, { text: texto }, { quoted: dados });
			const send = texto => client.sendMessage(jid, { text: texto });
			const sendTo = (to, texto) => client.sendMessage(to, { text: texto });
			const replyJson = texto => client.sendMessage(jid, { text: JSON.stringify(texto, null, '\t'), quoted: dados });
			const mention = (texto, mark) => client.sendMessage(jid, { text: texto, contextInfo: { mentionedJid: [addMentionsInArray(texto)] } }, (mark ? { quoted: dados } : {}));
			const mentionArray = (texto, ment, mark) => client.sendMessage(jid, { text: texto, contextInfo: { mentionedJid: ment } }, (mark ? { quoted: dados } : {}));
			const addMentionsInArray = (texto) => {
				const re = /@[0-9]+/g
				if (!re.test(texto)) return [];
				var mentioneds = [];
				for (let i of texto.match(re))
					mentioneds.push(i.replace(/@/g, '') + "@s.whatsapp.net");
				return mentioneds;
			};
			//const isDono = Dono.includes(id);
			const isGroup = jid.endsWith('@g.us');
			const groupMetadata = isGroup ? await client.groupMetadata(jid) : '';
			const groupName = isGroup ? groupMetadata.subject : '';
			const groupMembers = isGroup ? groupMetadata.participants : '';
			const groupAdmins = isGroup ? getGroupAdmins(groupMembers) : '';
			const isBotGroupAdmins = groupAdmins.includes(jidBot);
			const isGroupAdmins = groupAdmins.includes(id);
			const Botao =
				info && info.buttonsResponseMessage && info.buttonsResponseMessage.selectedButtonId ?
					info.buttonsResponseMessage.selectedButtonId : '';
			const ButaoTamplate =
				info && info.templateButtonReplyMessage && info.templateButtonReplyMessage.selectedId ?
					info.templateButtonReplyMessage.selectedId : '';
			const ListRow =
				info && info.listResponseMessage && info.listResponseMessage.singleSelectReply && info.listResponseMessage.singleSelectReply.selectedRowId ?
					info.listResponseMessage.singleSelectReply.selectedRowId : '';
			const ListTitle =
				info &&
					info.listResponseMessage &&
					info.listResponseMessage.contextInfo &&
					info.listResponseMessage.contextInfo.quotedMessage &&
					info.listResponseMessage.contextInfo.quotedMessage.listMessage &&
					info.listResponseMessage.contextInfo.quotedMessage.listMessage.sections &&
					info.listResponseMessage.contextInfo.quotedMessage.listMessage.sections[0].title ?
					info.listResponseMessage.contextInfo.quotedMessage.listMessage.sections[0].title : '';
			if (cmd && !isGroup) console.log(`${verde}[CMD] ${reset}${msg} ${amarelo}de ${azul}${nick}${reset}`);
			if (cmd && isGroup) console.log(`${verde}[CMD] ${reset}${msg} ${amarelo}de ${azul}${nick} ${amarelo}em ${azul}${groupName}${reset}`);
			if (fs.existsSync(`Comandos/${cmd}.js`)) {
				var cmdFile = fs.readFileSync(`Comandos/${cmd}.js`);
				eval(cmdFile.toString());
			}
			if (cmd === "exc") {
				if (!IsDono) return reply('Comando apenas para o dono!');
				eval(`(async =>{
					try{${text}} catch(err){ reply(err.toString()) }
				})()`);
			}
		} catch (e) { console.log(vermelho, "ERROR:", e, reset) }
	});
};
connect();