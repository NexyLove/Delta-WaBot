import './config.js'
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason, 
    makeCacheableSignalKeyStore, 
    downloadMediaMessage,
    prepareWAMessageMedia, 
    generateWAMessageFromContent, 
    proto 
} from '@whiskeysockets/baileys'
import P from 'pino'
import chalk from 'chalk'
import { Boom } from '@hapi/boom'
import fs, { existsSync, readFileSync, writeFileSync, watchFile, unwatchFile, unlinkSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { exec } from 'child_process'
import { promisify } from 'util'
import { raceWithFallback, cleanFileName, getBufferFromUrl, colorize } from './lib/ytdl.js'
import yts from 'yt-search'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import printLog from './lib/console.js'
import readline from 'readline'

let messageCache = new Map()

const execPromise = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const databaseFile = join(__dirname, 'lib', 'database.json')
const reaccionesPath = join(__dirname, 'lib', 'reacciones.json')

const cleanTmp = () => {
    const tempDir = join(__dirname, 'tmp')
    if (!existsSync(tempDir)) return mkdirSync(tempDir) 

    fs.readdirSync(tempDir).forEach(file => {
        const filePath = join(tempDir, file)
        try {
            const stat = fs.statSync(filePath)
            if (Date.now() - stat.mtimeMs > 300000) { 
                unlinkSync(filePath)
            }
        } catch {}
    })
}
setInterval(cleanTmp, 600000)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function isValidPhoneNumber(number) {
    try {
        let num = String(number).replace(/\s+/g, '')
        if (num.startsWith('+521')) {
            num = num.replace('+521', '+52')
        } else if (num.startsWith('+52') && num[4] === '1') {
            num = num.replace('+52 1', '+52')
        }
        return num.length > 10 
    } catch (error) {
        return false
    }
}

const decodeJid = (jid) => {
    if (!jid) return jid
    if (typeof jid !== 'string') return jid
    
    if (/:\d+@/gi.test(jid)) {
        let decode = jid.match(/:(\d+)@/gi)
        if (decode && decode[0]) {
            return jid.replace(decode[0], '@s.whatsapp.net')
        }
    }
    
    if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us') || jid.includes('@broadcast')) {
        return jid
    }
    
    return jid + '@s.whatsapp.net'
}

global.db = { data: { users: {}, chats: {}, settings: {}, mods: [] } }

global.db.write = () => {
    try {
        writeFileSync(databaseFile, JSON.stringify(global.db.data, null, 2))
        return true
    } catch (e) {
        return false
    }
}

try {
    if (existsSync(databaseFile)) {
        global.db.data = JSON.parse(readFileSync(databaseFile, 'utf-8'))
    }
} catch (e) {
    global.db.data = { users: {}, chats: {}, settings: {}, mods: [] }
}

let reaccionesData = {}
if (existsSync(reaccionesPath)) {
    reaccionesData = JSON.parse(readFileSync(reaccionesPath, 'utf-8'))
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sessions')
    const { version } = await fetchLatestBaileysVersion()
    
    let opcion
    let methodCode = false
    let methodCodeQR = false
    let phoneNumber = ""

    if (!methodCodeQR && !methodCode && !fs.existsSync(`./sessions/creds.json`)) {
        do {
            console.log('')
            console.log(chalk.white('   ¿Cómo quieres conectar?'))
            console.log(chalk.white('   ') + chalk.hex('#00FFFF')('1) ') + chalk.white('Usar código QR'))
            console.log(chalk.white('   ') + chalk.hex('#00FFFF')('2) ') + chalk.white('Usar código de 8 dígitos'))
            process.stdout.write(chalk.white('   » Tu opción: '))
            opcion = await question('')
            if (!/^[1-2]$/.test(opcion)) {
                console.log(chalk.red('   Solo opciones 1 o 2'))
            }
        } while (opcion !== '1' && opcion !== '2' || fs.existsSync(`./sessions/creds.json`))
    }

    console.info = () => {}

    const conn = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: opcion === '1',
        auth: { 
            creds: state.creds, 
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) 
        },
        browser: ["Ubuntu", "Chrome", "110.0.5481.178"],
        syncFullHistory: false,
        markOnlineOnConnect: true
    })
    
    conn.getName = (jid, withoutContact = false) => {
    jid = decodeJid(jid)
    withoutContact = conn.withoutContact || withoutContact
    let v
    if (jid.endsWith('@g.us')) return new Promise(async (resolve) => {
        v = global.db.data.chats[jid] || {}
        if (!(v.name || v.subject)) v = await conn.groupMetadata(jid) || {}
        resolve(v.name || v.subject || jid.split('@')[0])
    })
    else v = jid === '0@s.whatsapp.net' ? { jid, name: 'WhatsApp' } : jid === decodeJid(conn.user.id) ? conn.user : (global.db.data.users[jid] || {})
    return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || jid.split('@')[0]
}


conn.getName = (jid, withoutContact = false) => {
    jid = decodeJid(jid) || ''
    withoutContact = conn.withoutContact || withoutContact
    let v
    if (typeof jid === 'string' && jid.endsWith('@g.us')) return new Promise(async (resolve) => {
        v = global.db.data.chats[jid] || {}
        if (!(v.name || v.subject)) v = await conn.groupMetadata(jid).catch(() => ({}))
        resolve(v.name || v.subject || jid.split('@')[0])
    })
    else v = jid === '0@s.whatsapp.net' ? { jid, name: 'WhatsApp' } : jid === decodeJid(conn.user?.id) ? conn.user : (global.db.data.users[jid] || {})
    return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || (typeof jid === 'string' ? jid.split('@')[0] : '')
}

conn.ev.on('group-participants.update', async (anu) => {
    const { id, participants, action } = anu
    const chatJid = id
    if (!global.db.data) return 
    const chat = global.db.data.chats?.[chatJid] || {}

    for (let num of participants) {
        try {
            const userJid = typeof num === 'string' ? num : num.id
            if (!userJid) continue
            
            const metadata = await conn.groupMetadata(chatJid).catch(() => ({}))
            let userName = await conn.getName(userJid)
            
            let pp = 'https://cdn.russellxz.click/23c6f81a.jpg'
            try { 
                pp = await conn.profilePictureUrl(userJid, 'image') 
            } catch (e) {}

            if (action === 'add' && chat.welcome) {
                const { createWelcome } = await import('./lib/welcome.js')
                const buffer = await createWelcome(userName, metadata.subject || 'Grupo', metadata.participants?.length || 0, pp)
                let welcomeText = chat.sWelcome || `¡Bienvenidx al grupo! Disfruta de tu estadía.`
                let finalMsg = `*✧ ‧₊˚* \`BIENVENIDO/A\` *୧ֹ˖ ⑅ ࣪⊹*\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n‧₊˚✰ *Grupo:* ${metadata.subject || 'Grupo'}\n‧₊˚ꕤ *Usuario:* @${userJid.split('@')[0]}\n\n‧₊˚❀ *Mensaje:*\n\n   ${welcomeText}`
                await conn.sendMessage(chatJid, { image: buffer, caption: finalMsg, mentions: [userJid] })
            } 
            else if (action === 'remove' && chat.bye) {
                const { createBye } = await import('./lib/bye.js')
                const buffer = await createBye(userName, metadata.subject || 'Grupo', metadata.participants?.length || 0, pp)
                let byeText = chat.sBye || `Un miembro ha dejado el grupo.`
                let finalMsg = `*✧ ‧₊˚* \`DESPEDIDA\` *୧ֹ˖ ⑅ ࣪⊹*\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n‧₊˚✰ *Grupo:* ${metadata.subject || 'Grupo'}\n‧₊˚ꕤ *Usuario:* @${userJid.split('@')[0]}\n\n‧₊˚❀ *Mensaje:*\n\n   ${byeText}`
                await conn.sendMessage(chatJid, { image: buffer, caption: finalMsg, mentions: [userJid] })
            }
        } catch (err) {
            console.error(err)
        }
    }
})


const getAdmins = (participants) => {
    return participants.filter(p => p.admin !== null).map(p => p.id)
}

const checkAdmin = async (conn, from, sender) => {
    const groupMetadata = await conn.groupMetadata(from)
    const admins = getAdmins(groupMetadata.participants)
    const botId = decodeJid(conn.user.id)
    const isUserAdmin = admins.includes(decodeJid(sender))
    const isBotAdmin = admins.includes(botId)
    return { isUserAdmin, isBotAdmin }
}


    if (!fs.existsSync(`./sessions/creds.json`)) {
        if (opcion === '2' || methodCode) {
            opcion = '2'
            if (!conn.authState.creds.registered) {
                let addNumber
                if (!!phoneNumber) {
                    addNumber = String(phoneNumber).replace(/[^0-9]/g, '')
                } else {
                    do {
                        console.log(chalk.hex('#00FFFF')('INGRESAR NÚMERO'))
                        console.log(chalk.white('[+] '))
                        phoneNumber = await question('')
                        phoneNumber = String(phoneNumber).replace(/\D/g, '')
                        if (!phoneNumber.startsWith('+')) phoneNumber = `+${phoneNumber}`
                    } while (!await isValidPhoneNumber(phoneNumber))
                    addNumber = phoneNumber.replace(/\D/g, '')
                    setTimeout(async () => {
                        let codeBot = await conn.requestPairingCode(addNumber)
                        codeBot = codeBot.match(/.{1,4}/g)?.join("-") || codeBot
                        console.log(chalk.hex('#00FFFF')('🔐 CÓDIGO GENERADO'))
                        console.log(chalk.hex('#00FFFF')('──────────────────────────'))
                        console.log(chalk.white('╔══════════════════════╗'))
                        console.log(chalk.white('║        ' + codeBot + '        ║'))
                        console.log(chalk.white('╚══════════════════════╝'))
                        console.log(chalk.hex('#00FFFF')('──────────────────────────'))
                    }, 1000)
                }
            }
        }
    }

    conn.ev.on('creds.update', saveCreds)

                
                conn.ev.on('messages.upsert', async (m) => {
    if (!m || !m.messages || m.messages.length === 0) return
    if (m.type !== 'notify') return

    const msg = m.messages[0]
    if (!msg.message || !msg.key || !msg.key.remoteJid) return
    
    const msgId = `${msg.key.remoteJid}-${msg.key.id}`
    
    const messageType = Object.keys(msg.message)[0]
    const isGroup = msg.key.remoteJid.endsWith('@g.us')
    
    if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        if (text.trim()) {
            const prefix = isGroup ? 'GRUPO' : 'PRIVADO'
            console.log(`[${prefix}] ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`)
        }
    } else if (messageType === 'imageMessage') {
        console.log(isGroup ? '[GRUPO] Imagen' : '[PRIVADO] Imagen')
    } else if (messageType === 'videoMessage') {
        console.log(isGroup ? '[GRUPO] Video' : '[PRIVADO] Video')
    } else if (messageType === 'audioMessage') {
        console.log(isGroup ? '[GRUPO] Audio' : '[PRIVADO] Audio')
    } else if (messageType === 'stickerMessage') {
        console.log(isGroup ? '[GRUPO] Sticker' : '[PRIVADO] Sticker')
    } else if (messageType === 'documentMessage') {
        console.log(isGroup ? '[GRUPO] Documento' : '[PRIVADO] Documento')
    } else {
        console.log(isGroup ? '[GRUPO] Otro tipo' : '[PRIVADO] Otro tipo')
    }
    
    await processMessage(m, msgId)
})

async function processMessage(m, msgId) {
    const msg = m.messages[0]
    
    try {
        const from = msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const sender = msg.key.participant || msg.key.remoteJid
        const pushName = msg.pushName || 'Usuario'
        const realSender = decodeJid(sender)
        
        if (isGroup) {
    await waitForGroupSync(conn, from)
}

        if (!global.db.data.cooldowns) global.db.data.cooldowns = {}

        if (!global.db.data) global.db.data = { users: {}, chats: {}, settings: {}, mods: [] }
        if (!global.db.data.users) global.db.data.users = {}
        if (!global.db.data.settings) global.db.data.settings = {}

        if (typeof global.db.data.settings[conn.user.jid] !== 'object') {
            global.db.data.settings[conn.user.jid] = {
                onlyowner: false,
                antiprivado: false
            }
        }
        
        if (!global.db.data.users[realSender]) {
            global.db.data.users[realSender] = {
                name: pushName,
                banned: false,
                lastBannedNotice: 0,
                level: 1,
                exp: 0,
                coin: 0,
                money: 0,
                health: 100,
                totalCommands: 0,
                birthday: 'Sin especificar',
                gender: 'Sin especificar',
                harem: [],
                lastwork: 0,
                lastslut: 0,
                lastcrime: 0,
                lastHunt: 0,
                lastFish: 0,
                lastmine: 0,
                lastcofre: 0,
                lastAdventure: 0,
                lastDungeon: 0,
                stickerPack: '',
                stickerAuthor: ''
    }
            global.db.write()
        }

        let user = global.db.data.users[realSender]
        
        if (user) {
            if (!('name' in user)) user.name = pushName
            if (!('level' in user)) user.level = 1
            if (!('exp' in user)) user.exp = 0
            if (!('coin' in user)) user.coin = 0
            if (!('money' in user)) user.money = 0
            if (!('health' in user)) user.health = 100
            if (!('totalCommands' in user)) user.totalCommands = 0
            if (!('birthday' in user)) user.birthday = 'Sin especificar'
            if (!('gender' in user)) user.gender = 'Sin especificar'
            if (!('harem' in user)) user.harem = []
            if (!('lastwork' in user)) user.lastwork = 0
            if (!('lastslut' in user)) user.lastslut = 0
            if (!('lastcrime' in user)) user.lastcrime = 0
            if (!('lastHunt' in user)) user.lastHunt = 0
            if (!('lastFish' in user)) user.lastFish = 0
            if (!('lastmine' in user)) user.lastmine = 0
            if (!('lastcofre' in user)) user.lastcofre = 0
            if (!('lastAdventure' in user)) user.lastAdventure = 0
            if (!('lastDungeon' in user)) user.lastDungeon = 0
            if (!('stickerPack' in user)) user.stickerPack = ''
            if (!('stickerAuthor' in user)) user.stickerAuthor = ''
}

        if (isGroup) {
            if (!global.db.data.chats) global.db.data.chats = {}
            if (typeof global.db.data.chats[from] !== 'object') {
                global.db.data.chats[from] = {
                    welcome: false,
                    bye: false,
                    antilink: false,
                    economy: true,
                    sWelcome: '',
                    sBye: ''
                }
            }
            let chat = global.db.data.chats[from]
            if (!('welcome' in chat)) chat.welcome = false
            if (!('bye' in chat)) chat.bye = false
            if (!('antilink' in chat)) chat.antilink = false
            if (!('economy' in chat)) chat.economy = true 
            if (!('sWelcome' in chat)) chat.sWelcome = ''
            if (!('sBye' in chat)) chat.sBye = ''
        }
     
        const settings = global.db.data.settings[conn.user.jid] || {}
        const isOwner = global.owner.some(o => realSender.includes(o[0]))

        if (user && user.banned && !isOwner) return 

        if (settings.onlyowner && !isOwner) {
            return
        }

        if (!isGroup && settings.antiprivado && !isOwner) return

        const type = Object.keys(msg.message)[0]
        let body = ''
        
        if (type === 'conversation') body = msg.message.conversation || ''
        else if (type === 'extendedTextMessage') body = msg.message.extendedTextMessage.text || ''
        else if (type === 'imageMessage') body = msg.message.imageMessage.caption || ''
        else if (type === 'videoMessage') body = msg.message.videoMessage.caption || ''
        else if (type === 'documentMessage') body = msg.message.documentMessage.caption || ''

        body = body.trim()

        if (isGroup && global.db.data.chats[from]?.antilink) {
            const linkRegex = /https?:\/\/[^\s]+/gi
            if (linkRegex.test(body)) {
                const groupMetadata = await conn.groupMetadata(from)
                const isUserAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin !== null
                if (!isUserAdmin) {
                    const botNumber = decodeJid(conn.user.id)
                    const isBotAdmin = groupMetadata.participants.find(p => p.id === botNumber)?.admin !== null
                    if (isBotAdmin) {
                        await conn.sendMessage(from, { delete: msg.key })
                        await conn.groupParticipantsUpdate(from, [sender], 'remove')
                        return 
                    }
                }
            }
        }

        printLog(msg, conn)

        const prefixList = Array.isArray(global.prefix) ? global.prefix : [global.prefix]
        let usedPrefix = null

        if (body && body.length > 0) {
    for (const p of prefixList) {
        if (!p || p.length === 0) continue
        if (body.startsWith(p)) {
            usedPrefix = p
            break
        }
    }
}

        const prefixCommands = ['prefix', 'prefijo', 'Prefijo', 'Prefix', 'PREFIJO']
        if (prefixCommands.includes(body.toLowerCase())) {
            return conn.sendMessage(from, { text: `✰ *prefijo:* ${prefixList[0]}` }, { quoted: msg })
        }

        if (usedPrefix !== null && usedPrefix !== undefined) {
            const commandText = body.slice(usedPrefix.length).trim()
            const args = commandText.split(/ +/)
            const command = args.shift().toLowerCase()
            const text = args.join(' ')
            const q = text
            
            const reply = async (text) => {
                if (!text) return
                return conn.sendMessage(from, { text: String(text) }, { quoted: msg })
            }

            const isOwner = [conn.user.id.split(':')[0], ...global.owner.map(v => v[0])].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(realSender)
            const isMod = isOwner || global.db.data.mods.includes(realSender)

if (isGroup && global.db.data.chats[from]?.modoadmin) {
    const { isUserAdmin } = await checkAdmin(conn, from, sender)
    if (!isUserAdmin && !isOwner) return
}
                                 
global.db.data.users[realSender].totalCommands += 1
global.db.data.users[realSender].exp += Math.floor(Math.random() * 15) + 5

let userStats = global.db.data.users[realSender]
let expRequired = userStats.level * 500

 if (userStats.exp >= expRequired) {
    userStats.level += 1
    userStats.exp = 0 
}
               
                const reactions = [
                    'angry', 'enojado', 'bath', 'bañarse', 'bite', 'morder', 'bleh', 'lengua', 'blush', 'sonrojarse',
                    'bored', 'aburrido', 'clap', 'aplaudir', 'coffee', 'cafe', 'cry', 'llorar', 'cuddle', 'acurrucarse',
                    'dance', 'bailar', 'drunk', 'borracho', 'eat', 'comer', 'facepalm', 'happy', 'feliz', 'hug', 
                    'abrazar', 'kill', 'matar', 'kiss', 'muak', 'laugh', 'reirse', 'lick', 'lamer', 'slap', 'hi',
                    'sleep', 'dormir', 'smoke', 'fumar', 'spit', 'escupir', 'step', 'think', 'pensar', 'love', 
                    'enamorado', 'pat', 'poke', 'pout', 'punch', 'pegar', 'run', 'correr', 'sad', 'triste', 
                    'scared', 'asustado', 'seduce', 'shy', 'timido', 'walk', 'caminar', 'wink', 'guiñar', 
                    'smile', 'sonreir', 'highfive', '5', 'wave', 'hola']

                const reactionsKeys = Object.keys(reaccionesData)

                switch (command) {
                    case 'menu': case 'help': {
    const args = body.trim().split(' ');
    let categoria = args.length > 1 ? args[1].toLowerCase() : 'all';
    
    const crearSeccion = (titulo, comandos) => {
        return `\`˖ ֹ੭୧ ${titulo} ⊹ ࣪ ⑅\`\n${comandos.join('\n')}\n\n`;
    };
    
    const secciones = {
        info: crearSeccion('INFO BOT', [
            `‧₊˚✰ *${usedPrefix}status*`,
            `> ⋆.˚ Estado y estadísticas del bot ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}ping • ${usedPrefix}p*`,
            `> ⋆.˚ Mide mi velocidad de respuesta ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}sug • ${usedPrefix}sugerencia*`,
            `> ⋆.˚ Envía sugerencias al owner ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}report • ${usedPrefix}reporte*`,
            `> ⋆.˚ Reporta errores o problemas ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}owner • ${usedPrefix}creadora*`,
            `> ⋆.˚ Muestra contacto de la creadora ˚.⋆`,
            `₊˚✰ *${usedPrefix}adquirir • ${usedPrefix}comprarbot*`,
            `> ⋆.˚ contacto para comprar o rentar ˚.⋆`
        ]),
        
        descargas: crearSeccion('DESCARGAS', [
            `‧₊˚✰ *${usedPrefix}pin • ${usedPrefix}pinterest*`,
            `> ⋆.˚ Descarga imágenes de Pinterest ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}play • ${usedPrefix}ytmp3*`,
            `> ⋆.˚ Audio MP3 de YouTube ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}play2 • ${usedPrefix}ytmp4*`,
            `> ⋆.˚ Video MP4 de YouTube ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}tiktok • ${usedPrefix}ttdl • ${usedPrefix}tt*`,
            `> ⋆.˚ Descarga videos de TikTok ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}facebook • ${usedPrefix}fb*`,
            `> ⋆.˚ Descarga videos de Facebook ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}instagram • ${usedPrefix}ig*`,
            `> ⋆.˚ Descarga videos de Instagram ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}mediafire • ${usedPrefix}mf*`,
            `> ⋆.˚ Descarga archivos de MediaFire ˚.⋆`
        ]),
        
        utilidades: crearSeccion('UTILIDADES', [
            `‧₊˚✰ *${usedPrefix}s • ${usedPrefix}sticker*`,
            `> ⋆.˚ Crea sticker de imagen/video ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}brat*`,
            `> ⋆.˚ Texto a sticker ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}bratvid*`,
            `> ⋆.˚ Convierte texto a sticker animado˚.⋆`,
            `‧₊˚✰ *${usedPrefix}setmeta*`,
            `> ⋆.˚ Cambia nombre de pack y autor de sticker ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}cal • ${usedPrefix}calcular*`,
            `> ⋆.˚ Calculadora matemática ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}toimg • ${usedPrefix}img*`,
            `> ⋆.˚ Convierte sticker a imagen ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}readviewonce • ${usedPrefix}read*`,
            `> ⋆.˚ Ver fotos/videos de vista única ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}getpic • ${usedPrefix}pfp*`,
            `> ⋆.˚ Obtiene foto de perfil de usuario ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}gemini • ${usedPrefix}deepseek*`,
            `> ⋆.˚ Pregunta a la inteligencia artificial ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}tomp3*`,
            `> ⋆.˚ Convierte video a audio ˚.⋆`,
        ]),
        
        grupos: crearSeccion('GRUPOS', [
            `‧₊˚✰ *${usedPrefix}open • ${usedPrefix}close*`,
            `> ⋆.˚ abre/cierra el grupo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}welcome • ${usedPrefix}bye*`,
            `> ⋆.˚ crea un mensaje de bienvenida/despedida ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}antilink*`,
            `> ⋆.˚ elimina a quien manda un link automáticamente˚.⋆`,
            `‧₊˚✰ *${usedPrefix}kick*`,
            `> ⋆.˚ elimina usuario del grupo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}promote*`,
            `> ⋆.˚ Asciende a usuario a admin ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}demote*`,
            `> ⋆.˚ Quita admin a usuario ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}hidetag • ${usedPrefix}tag*`,
            `> ⋆.˚ Etiqueta silenciosa a todos ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}invocar • ${usedPrefix}tagall*`,
            `> ⋆.˚ Etiqueta a todos los miembros ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}infogp • ${usedPrefix}gp*`,
            `> ⋆.˚ Muestra información del grupo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}onlyadmin*`,
            `> ⋆.˚ Modo solo administradores ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}del • ${usedPrefix}delate*`,
            `> ⋆.˚ Borra mensaje ˚.⋆`
        ]),
        
        perfil: crearSeccion('PERFIL', [
            `‧₊˚✰ *${usedPrefix}profile*`,
            `> ⋆.˚ Muestra tu perfil completo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}setbirth*`,
            `> ⋆.˚ Establece tu cumpleaños ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}setgenre*`,
            `> ⋆.˚ Establece tu género ˚.⋆`
        ]),
        
        economia: crearSeccion('ECONOMÍA', [
            `‧₊˚✰ *${usedPrefix}work • ${usedPrefix}trabajar*`,
            `> ⋆.˚ Trabaja para ganar dinero ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}slut • ${usedPrefix}prostituirse*`,
            `> ⋆.˚ Actividad de riesgo/recompensa ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}crimen • ${usedPrefix}crime*`,
            `> ⋆.˚ Comete un crimen por dinero ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}cazar • ${usedPrefix}hunt*`,
            `> ⋆.˚ Caza animales (requiere salud) ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}pescar • ${usedPrefix}fish*`,
            `> ⋆.˚ Pesca en el río ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}cofre • ${usedPrefix}coffer*`,
            `> ⋆.˚ Abre un cofre del tesoro ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}minar • ${usedPrefix}mine*`,
            `> ⋆.˚ Mina minerales (requiere salud) ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}aventura • ${usedPrefix}adventure*`,
            `> ⋆.˚ Aventura en la mazmorra ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}dungeon • ${usedPrefix}mazmorra*`,
            `> ⋆.˚ Explora una mazmorra ˚.⋆`
        ]),
        
        anime: crearSeccion('ANIME REACT', [
            `> *⊹ EMOCIONES*`,
            `‧₊˚✰ *${usedPrefix}angry • ${usedPrefix}enojado*`,
            `> ⋆.˚ Expresa enojo o frustración ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}blush • ${usedPrefix}sonrojarse*`,
            `> ⋆.˚ Muestra timidez o vergüenza ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}bored • ${usedPrefix}aburrido*`,
            `> ⋆.˚ Demuestra aburrimiento ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}cry • ${usedPrefix}llorar*`,
            `> ⋆.˚ Expresa tristeza o llanto ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}happy • ${usedPrefix}feliz*`,
            `> ⋆.˚ Muestra felicidad o alegría ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}sad • ${usedPrefix}triste*`,
            `> ⋆.˚ Expresa melancolía o pena ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}scared • ${usedPrefix}asustado*`,
            `> ⋆.˚ Demuestra miedo o susto ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}shy • ${usedPrefix}timido*`,
            `> ⋆.˚ Muestra timidez o nerviosismo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}smile • ${usedPrefix}sonreir*`,
            `> ⋆.˚ Una sonrisa amistosa ˚.⋆`,
            `\n> *⊹ ACCIONES*`,
            `‧₊˚✰ *${usedPrefix}bath • ${usedPrefix}bañarse*`,
            `> ⋆.˚ Personaje bañándose ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}coffee • ${usedPrefix}cafe*`,
            `> ⋆.˚ Tomando café o bebida ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}drunk • borracho*`,
            `> ⋆.˚ Estado de embriaguez ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}eat • ${usedPrefix}comer*`,
            `> ⋆.˚ Comiendo algo delicioso ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}facepalm*`,
            `> ⋆.˚ Mano en la cara por frustración ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}kill • ${usedPrefix}matar*`,
            `> ⋆.˚ Acción violenta o de pelea ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}sleep • ${usedPrefix}dormir*`,
            `> ⋆.˚ Durmiendo o con sueño ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}smoke • ${usedPrefix}fumar*`,
            `> ⋆.˚ Fumando o con humo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}think • ${usedPrefix}pensar*`,
            `> ⋆.˚ En pensamiento profundo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}walk • ${usedPrefix}caminar*`,
            `> ⋆.˚ Caminando o paseando ˚.⋆`,
            `\n> *⊹ INTERACCIONES*`,
            `‧₊˚✰ *${usedPrefix}bite • ${usedPrefix}morder*`,
            `> ⋆.˚ Mordiendo juguetonamente ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}clap • ${usedPrefix}aplaudir*`,
            `> ⋆.˚ Aplaudiendo o celebrando ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}cuddle • ${usedPrefix}acurrucarse*`,
            `> ⋆.˚ Acurrucarse o abrazo cálido ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}dance • ${usedPrefix}bailar*`,
            `> ⋆.˚ Bailando o moviéndose ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}hug • ${usedPrefix}abrazar*`,
            `> ⋆.˚ Dando un abrazo cariñoso ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}kiss • ${usedPrefix}muak*`,
            `> ⋆.˚ Dando un beso o besito ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}lick • ${usedPrefix}lamer*`,
            `> ⋆.˚ Lamiendo o con la lengua ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}love • ${usedPrefix}enamorado*`,
            `> ⋆.˚ Enamorado o con corazón ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}pat*`,
            `> ⋆.˚ Palmaditas cariñosas ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}poke*`,
            `> ⋆.˚ Empujando o tocando ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}punch • ${usedPrefix}pegar*`,
            `> ⋆.˚ Golpeando o puñetazo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}slap • ${usedPrefix}bofetada*`,
            `> ⋆.˚ Bofetada o cachetada ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}spit • ${usedPrefix}escupir*`,
            `> ⋆.˚ Escupiendo o con desdén ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}highfive • ${usedPrefix}5*`,
            `> ⋆.˚ Choca esos cinco ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}wave • ${usedPrefix}hola*`,
            `> ⋆.˚ Saludando o despidiendo ˚.⋆`,
            `‧₊˚✰ *${usedPrefix}wink • ${usedPrefix}guiñar*`,
            `> ⋆.˚ Guiñando un ojo ˚.⋆`
        ])
    };
    
    const categoriasMap = {
        'info': 'info', 'infobot': 'info', 'informacion': 'info',
        'information': 'info', 'info-bot': 'info',
        'descargas': 'descargas', 'downloads': 'descargas',
        'descargar': 'descargas', 'download': 'descargas',
        'utilidades': 'utilidades', 'utilidad': 'utilidades',
        'tools': 'utilidades', 'herramientas': 'utilidades',
        'grupos': 'grupos', 'grupo': 'grupos', 'group': 'grupos',
        'groups': 'grupos', 'admin': 'grupos',
        'perfil': 'perfil', 'profile': 'perfil', 'user': 'perfil',
        'usuario': 'perfil',
        'economia': 'economia', 'economía': 'economia',
        'economy': 'economia', 'money': 'economia', 'dinero': 'economia',
        'anime': 'anime', 'react': 'anime', 'reacciones': 'anime',
        'reaction': 'anime', 'anime-react': 'anime'
    };
    
    categoria = categoriasMap[categoria] || categoria;
    
    if (categoria === 'all') {
        const tituloMenu = `*✧ ‧₊˚* \`${global.botName}\` *୧ֹ˖ ⑅ ࣪⊹*`;
        const encabezado = `\n‧₊˚ *usuario:* \`${pushName}\`
‧₊˚ *system:* 24/7
‧₊˚ *prefijo:* ${usedPrefix}
‧₊˚ *owner:* \`${global.dev}\`
‧₊˚ *status:* online\n`;
        const separador = `\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n`;
        const pie = `> By: \`${global.dev}\``;
        
        const menu = tituloMenu + encabezado + separador +
               secciones.info +
               secciones.descargas +
               secciones.utilidades +
               secciones.grupos +
               secciones.perfil +
               secciones.economia +
               secciones.anime +
               pie;
               
        await conn.sendMessage(from, { 
            image: { url: global.banner },
            caption: menu
        }, { quoted: msg });
        
    } else if (secciones[categoria]) {
        const tituloMenu = `*✧ ‧₊˚* \`${global.botName}\` *୧ֹ˖ ⑅ ࣪⊹*`;
        const encabezado = `\n‧₊˚ *usuario:* \`${pushName}\`
‧₊˚ *system:* 24/7
‧₊˚ *prefijo:* ${usedPrefix}
‧₊˚ *owner:* \`${global.dev}\`
‧₊˚ *status:* online\n`;
        const separador = `\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n`;
        const pie = `> By: \`${global.dev}\``;
        
        const menu = tituloMenu + encabezado + separador +
               secciones[categoria] +
               pie;
               
        await conn.sendMessage(from, { 
            image: { url: global.banner },
            caption: menu
        }, { quoted: msg });
        
    } else {
        const errorMsg = `⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n*Categoría no encontrada*\n\n*📚 Categorías disponibles:*\n• ${usedPrefix}help info - Información del bot\n• ${usedPrefix}help descargas - Comandos de descargas\n• ${usedPrefix}help utilidades - Herramientas útiles\n• ${usedPrefix}help grupos - Comandos para grupos\n• ${usedPrefix}help perfil - Comandos de perfil\n• ${usedPrefix}help economia - Sistema económico\n• ${usedPrefix}help anime - Reacciones anime\n• ${usedPrefix}help - Menú completo`;
        
        await conn.sendMessage(from, { 
            text: errorMsg 
        }, { quoted: msg });
    }
    break;
}

case 'test':
reply('ola')
break
                        
                        case 'code':
case 'qr': {
    const txt = `El comando está en mantenimiento.`;
    await conn.sendMessage(from, { text: txt }, { quoted: msg });
}
break;

                      case 'tomp3': case 'toaudio': case 'audio': {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const isVideo = msg.message?.videoMessage || quoted?.videoMessage
    
    if (!isVideo) return reply('ꕤ Envía un video con el comando o responde a uno.')
    
    try {
        const media = msg.message?.videoMessage ? msg : { message: quoted }
        const buffer = await downloadMediaMessage(
            media,
            'buffer',
            {},
            { logger: P({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
        )

        if (!buffer) return reply('ꕤ No se pudo procesar el video.')

        const tempDir = './temp'
        if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

        const videoFile = join(tempDir, `${Date.now()}_video.mp4`)
        const audioFile = join(tempDir, `${Date.now()}_audio.mp3`)
        
        writeFileSync(videoFile, buffer)
        
        await execPromise(`ffmpeg -i "${videoFile}" -vn -c:a libmp3lame -b:a 128k -ar 44100 -ac 2 "${audioFile}" -y`)

        if (!existsSync(audioFile)) return reply('ꕤ Error al extraer el audio.')

        const audioBuffer = readFileSync(audioFile)

        await conn.sendMessage(from, { 
            audio: audioBuffer, 
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: msg })

        unlinkSync(videoFile)
        unlinkSync(audioFile)

    } catch (e) {
        console.error(e)
        reply(`⚠︎ Error: ${e.message}`)
    }
}
break
  
             case 'compe':
case '4vs4':
case '4x4':
case 'ff4x4': {
    let hora = 'Por definir';
    let vs = 'Por definir';

    if (text.includes('/')) {
        let parts = text.split('/');
        hora = parts[0] ? parts[0].trim() : 'Por definir';
        vs = parts[1] ? parts[1].trim() : 'Por definir';
    } else if (text) {
        hora = text.trim();
    }

    const txt = `*✧ ‧₊˚* \`COMPE 4VS4\` *୧ֹ˖ ⑅ ࣪⊹*
⊹‧︵୨୧︵‧⊹

✧ *Hora:* ${hora}
✦ *Vs:* ${vs}

\`⊹ JUGADORES\`
‧₊˚✰ 1. 
‧₊˚✰ 2. 
‧₊˚✰ 3. 
‧₊˚✰ 4. 

\`⊹ SUPLENTES\`
‧₊˚✰ 1. 
‧₊˚✰ 2. 

> By *${global.botName}*`;

    await conn.sendMessage(from, { text: txt }, { quoted: msg });
}
break;
                        
                        case 'ownermenu': case 'menuowner': case 'modder': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    
    const ownerMenu = `*✧ ‧₊˚* \`OWNER SETTINGS\` *୧ֹ˖ ⑅ ࣪⊹*
‧₊˚ *usuario:* \`${pushName}\`
‧₊˚ *rango:* \`Owner\`
‧₊˚ *bot:* \`${global.botName}\`
‧₊˚ *prefijo:* \`${usedPrefix}\`

⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹

\`˖ ֹ੭୧ AJUSTES BOT ⊹ ࣪ ⑅\`
‧₊˚✰ *${usedPrefix}setusername* <nombre>
> ⋆.˚ Cambia mi nombre público ˚.⋆
‧₊˚✰ *${usedPrefix}setppbot* (foto)
> ⋆.˚ Cambia mi foto de perfil ˚.⋆
‧₊˚✰ *${usedPrefix}setbio* <texto>
> ⋆.˚ Cambia mi biografía ˚.⋆
‧₊˚✰ *${usedPrefix}setbanner* <link>
> ⋆.˚ Cambia mi foto ˚.⋆
‧₊˚✰ *${usedPrefix}setname* <texto>
> ⋆.˚ Cambia el nombre del bot ˚.⋆


\`˖ ֹ੭୧ CONTROL DE ACCESO ⊹ ࣪ ⑅\`
‧₊˚✰ *${usedPrefix}ban* @user
> ⋆.˚ Prohíbe el uso del bot ˚.⋆
‧₊˚✰ *${usedPrefix}unban* @user
> ⋆.˚ Devuelve el acceso (permanente) ˚.⋆
‧₊˚✰ *${usedPrefix}banlist*
> ⋆.˚ Lista de usuarios restringidos ˚.⋆
‧₊˚✰ *${usedPrefix}onlyowner* <on/off>
> ⋆.˚ Modo mantenimiento ˚.⋆

\`˖ ֹ੭୧ GESTIÓN DE EQUIPO ⊹ ࣪ ⑅\`
‧₊˚✰ *${usedPrefix}addmod* @user
> ⋆.˚ Otorga permisos de Mod ˚.⋆
‧₊˚✰ *${usedPrefix}delmod* @user
> ⋆.˚ Elimina permisos de Mod ˚.⋆
‧₊˚✰ *${usedPrefix}autoadm*
> ⋆.˚ Me da admin en el grupo ˚.⋆

\`˖ ֹ੭୧ SISTEMA Y ARCHIVOS ⊹ ࣪ ⑅\`
‧₊˚✰ *${usedPrefix}getdb*
> ⋆.˚ Envía la base de datos JSON ˚.⋆
‧₊˚✰ *${usedPrefix}stop* / *${usedPrefix}shutdown*
> ⋆.˚ Apaga el bot y guarda cambios ˚.⋆
‧₊˚✰ *${usedPrefix}bc* <texto>
> ⋆.˚ Anuncio global a todos los chats ˚.⋆

⊹₊˚‧︵‿୨୧‿︵‧˚₊⊹
────୨ৎ────
> Status: Control Total de *${global.botName}* ❀`

    await conn.sendMessage(from, { 
        image: { url: global.banner }, 
        caption: ownerMenu 
    }, { quoted: msg })
}
break


                        
              case 'comprarbot': case 'adquirir': {
    try {
        await conn.sendMessage(from, { react: { text: '⭐', key: msg.key } })

        const ownerNumber = global.owner[0][0].replace(/[^0-9]/g, '')
        const ownerName = global.dev
        const botName = global.botName
        const linkVenta = global.vlink
        
        let biography
        try {
            const status = await conn.fetchStatus(ownerNumber + '@s.whatsapp.net')
            biography = status.status || 'Sin biografía'
        } catch {
            biography = 'Soporte Oficial'
        }

        const textoAdquirir = `*✧ ‧₊˚* \`ADQUIRIR ${botName.toUpperCase()}\` *୧ֹ˖ ⑅ ࣪⊹*

Hola *${pushName}*, si buscas un bot profesional para tu grupo o quieres uno personalizado, aquí tienes la información:

✰ *BOT PERSONALIZADO:* Tu propio bot con el nombre y foto que tú elijas.
✰ *BOT PARA GRUPOS:* Adquiere a *${botName}* para gestionar y animar tu comunidad.
✰ *SOPORTE:* Servicio estable y garantizado.

*୧ֹ˖* Contacta con mi creadora mediante el contacto de abajo para precios y detalles. *⑅ ࣪⊹*`
    
        await conn.sendMessage(from, { 
            image: { url: global.venta }, 
            caption: textoAdquirir 
        }, { quoted: msg })

        const vcard = `BEGIN:VCARD
VERSION:3.0
N:;${ownerName};;;
FN:${ownerName}
ORG:Dueña Principal
TITLE:Creadora de ${botName}
item1.TEL;waid=${ownerNumber}:${ownerNumber}
item1.X-ABLabel:WhatsApp
item2.NOTE:${biography}
item2.X-ABLabel:Estado
END:VCARD`

        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: msg })

    } catch (e) {
        console.error(e)
    }
}
break

case 'top': case 'rank': {
    if (!isGroup) return reply(global.isGroupMsg)
    
    if (args.length === 0) return reply(`ꕤ Ejemplo: *${usedPrefix}top lesbianas ricas*`)
    
    const topName = args.join(' ')
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants.map(p => p.id)
    
    const userCount = participants.length
    
    if (userCount < 2) {
        return reply(`✰ Necesitas al menos 2 personas para hacer un top.`)
    }
    
    const topCount = Math.min(userCount, 10)
    
    const shuffleArray = array => array.sort(() => Math.random() - 0.5)
    const shuffledParticipants = shuffleArray([...participants])
    
    let texto = `Top ${topCount} ${topName}\n`
    
    let mentions = []
    for (let i = 0; i < topCount; i++) {
        const user = shuffledParticipants[i]
        const shortId = user.split('@')[0]
        
        texto += `‧₊˚✰ @${shortId}\n`
        mentions.push(user)
    }
    
    await conn.sendMessage(from, { text: texto, mentions: mentions }, { quoted: msg })
}
break
                    
case 'formarparejas': case 'parejas': case 'casar': {
    if (!isGroup) return reply(global.isGroupMsg)
    
    const cooldownTime = 90000 
    const lastUsed = global.db.data.cooldowns[sender] || 0
    const remainingTime = cooldownTime - (Date.now() - lastUsed)

    if (remainingTime > 0) {
        const segundos = Math.ceil(remainingTime / 1000)
        return reply(`ꕤ *Espera un momento* ꕤ\n\nDebes esperar *${segundos} segundos* para volver a formar parejas.`)
    }

    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants.map(p => p.id)
    
    if (participants.length < 4) return reply('ꕤ No hay suficientes personas para formar parejas.')

    let numParejas = parseInt(args[0])
    if (isNaN(numParejas) || numParejas < 1) numParejas = 3
    if (numParejas > 5) numParejas = 5

    let shuffeled = participants.sort(() => 0.5 - Math.random())
    let parejasFormadas = []
    let mentions = []

    for (let i = 0; i < numParejas * 2; i += 2) {
        if (shuffeled[i] && shuffeled[i + 1]) {
            parejasFormadas.push({ p1: shuffeled[i], p2: shuffeled[i + 1] })
            mentions.push(shuffeled[i], shuffeled[i + 1])
        }
    }

    const frases = [
        "¡Hacen una pareja increíble! ❤️",
        "El destino los ha unido, ¿será amor? ✨",
        "¡Vivan los novios! 💍",
        "Hay una chispa especial aquí... 🌹",
        "Cupido no se equivoca. 💘"
    ]

    let texto = `*✧ ‧₊˚* \`PAREJAS FORMADAS\` *୧ֹ˖ ⑅ ࣪⊹*\n⊹‧︵୨୧︵‧⊹\n\n`
    
    parejasFormadas.forEach((pareja, index) => {
        let frase = frases[Math.floor(Math.random() * frases.length)]
        texto += `‧₊˚✰ *Pareja #${index + 1}:*\n`
        texto += `   ⋆.˚ @${pareja.p1.split('@')[0]} 💓 @${pareja.p2.split('@')[0]}\n`
        texto += `> ${frase}\n\n`
    })

    texto += `⋆.˚ ૮꒰ ˶• ᴗ •˶꒱ა ¡Mucha suerte! ˚.⋆`

    global.db.data.cooldowns[sender] = Date.now()

    await conn.sendMessage(from, { text: texto, mentions: mentions }, { quoted: msg })
}
break
                        
                        case 'onlyadmin': case 'modoadmin': {
    if (!isGroup) return reply(global.isGroupMsg)
    const { isUserAdmin } = await checkAdmin(conn, from, sender)
    if (!isUserAdmin) return reply(global.isAdminMsg)
    
    if (!args[0]) return reply(`ꕤ ¿Qué deseas hacer?\n\nUso: *${usedPrefix + command} on* o *off*`)
    
    const currentState = global.db.data.chats[from]?.modoadmin || false
    
    if (args[0] === 'on') {
        if (currentState === true) {
            reply('✰ El modo *onlyadmin* ya estaba activado.')
        } else {
            global.db.data.chats[from].modoadmin = true
            reply('✰ El modo *onlyadmin* ha sido activado.')
        }
    } else if (args[0] === 'off') {
        if (currentState === false) {
            reply('✰ El modo *onlyadmin* ya estaba desactivado.')
        } else {
            global.db.data.chats[from].modoadmin = false
            reply('✰ El modo *onlyadmin* ha sido desactivado.')
        }
    } else {
        reply('ꕤ Opción inválida. Usa *on* o *off*.')
    }
}
break
                        
                        case 'infogp': case 'gp': case 'groupinfo': {
    if (!isGroup) return reply(global.isGroupMsg)
    
    try {
        const groupMetadata = await conn.groupMetadata(from)
        const participants = groupMetadata.participants
        const chat = global.db.data.chats[from] || {}
        
        const { antilink, welcome, bye, economy, modoadmin } = chat
        const totalreg = Object.keys(global.db.data.users).length

        let pp
        try {
            pp = await conn.profilePictureUrl(from, 'image')
        } catch (e) {
            pp = global.banner
        }

        let text = `✧ ‧₊˚ GRUPO ${groupMetadata.subject} ୧ֹ˖ ⑅ ࣪⊹

⊹ ESTADÍSTICAS
‧₊˚✰ *Usuarios:* ${participants.length}
‧₊˚✰ *Registrados:* ${totalreg.toLocaleString()}

⊹ CONFIGURACIONES
‧₊˚✰ *Anti-Links:* ${antilink ? '✓ Activado' : '✗ Desactivado'}
‧₊˚✰ *Bienvenidas:* ${welcome ? '✓ Activado' : '✗ Desactivado'}
‧₊˚✰ *Despedida:* ${bye ? '✓ Activado' : '✗ Desactivado'}
‧₊˚✰ *Economía:* ${economy ? '✓ Activado' : '✗ Desactivado'}
‧₊˚✰ *Onlyadmin:* ${modoadmin ? '✓ Activado' : '✗ Desactivado'}

⋆.˚ Configuración actual del grupo ˚.⋆`

        await conn.sendMessage(from, { 
            image: { url: pp }, 
            caption: text 
        }, { quoted: msg })

    } catch (err) {
        console.error(err)
        reply('✰ Error al obtener la info del grupo.')
    }
}
break
                        
case 'economia': case 'economy': {
    if (!isGroup) return reply(global.isGroupMsg)
    const { isUserAdmin } = await checkAdmin(conn, from, sender)
    if (!isUserAdmin) return reply(global.isAdminMsg)
    
    if (!args[0]) return reply(`ꕤ ¿Qué deseas hacer?\n\nUso: *${usedPrefix + command} on* o *off*`)
    
    const currentState = global.db.data.chats[from]?.economy || false
    
    if (args[0] === 'on') {
        if (currentState === true) {
            reply('✰ La economía *ya estaba activada* en este grupo.')
        } else {
            global.db.data.chats[from].economy = true
            reply(`✰ La economía ha sido *activada* en este grupo. Ahora pueden ganar *${global.currency}*.`)
        }
    } else if (args[0] === 'off') {
        if (currentState === false) {
            reply('✰ La economía *ya estaba desactivada* en este grupo.')
        } else {
            global.db.data.chats[from].economy = false
            reply('✰ La economía ha sido *desactivada*.')
        }
    } else {
        reply('ꕤ Opción inválida. Usa *on* o *off*.')
    }
}
break

case 'slut': case 'prostituirse':
case 'work': case 'chambear': case 'chamba': case 'trabajar':
case 'crimen': case 'crime':
case 'cazar': case 'hunt':
case 'pescar': case 'fish':
case 'cofre': case 'coffer':
case 'minar': case 'mine':
case 'aventura': case 'adventure':
case 'dungeon': case 'mazmorra': {
    
    if (isGroup && !global.db.data.chats[from]?.economy) return reply(global.ecoOffMsg)
    
    const jsonPath = join(__dirname, 'lib', 'messages.json') 
    if (!existsSync(jsonPath)) return reply('⚠︎ Error: No se encontró el archivo lib/messages.json')
    
    const mensajes = JSON.parse(readFileSync(jsonPath, 'utf8'))
    let user = global.db.data.users[sender]
    const now = Date.now()

    const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]
    const formatTimeMs = (ms) => {
        const s = Math.ceil(ms / 1000), m = Math.floor((s % 3600) / 60)
        return `${m > 0 ? m + ' m ' : ''}${s % 60} s`
    }

    switch (command) {
        case 'slut': case 'prostituirse':
            if (now < user.lastslut) return reply(`ꕤ Espera *${formatTimeMs(user.lastslut - now)}*`)
            const evSlut = pickRandom(mensajes.slut)
            let cantSlut = evSlut.tipo === 'victoria' ? Math.floor(Math.random() * 1501) + 4000 : Math.floor(Math.random() * 1001) + 3000
            user.lastslut = now + (5 * 60 * 1000)
            evSlut.tipo === 'victoria' ? user.coin += cantSlut : (user.coin -= cantSlut, user.coin = Math.max(0, user.coin))
            reply(`ꕤ ${evSlut.mensaje} *$${cantSlut.toLocaleString()} ${global.currency}*`)
            break

        case 'work': case 'chambear': case 'chamba': case 'trabajar':
            if (now < user.lastwork) return reply(`ꕤ Espera *${formatTimeMs(user.lastwork - now)}*`)
            let rslWork = Math.floor(Math.random() * 1501) + 2000
            user.lastwork = now + (2 * 60 * 1000)
            user.coin += rslWork
            reply(`ꕤ ${pickRandom(mensajes.trabajo)} *$${rslWork.toLocaleString()} ${global.currency}*`)
            break

        case 'crimen': case 'crime':
            if (now < user.lastcrime) return reply(`ꕤ Espera *${formatTimeMs(user.lastcrime - now)}*`)
            const evCrime = pickRandom(mensajes.crimen)
            let cantCrime = Math.floor(Math.random() * 1501) + (evCrime.tipo === 'victoria' ? 6000 : 4000)
            user.lastcrime = now + (8 * 60 * 1000)
            evCrime.tipo === 'victoria' ? user.coin += cantCrime : (user.coin -= cantCrime, user.coin = Math.max(0, user.coin))
            reply(`ꕤ ${evCrime.mensaje} *$${cantCrime.toLocaleString()} ${global.currency}*`)
            break

        case 'cazar': case 'hunt':
            if (user.health < 5) return reply(`ꕤ Usa *${usedPrefix}heal* para curarte.`)
            if (now < user.lastHunt) return reply(`ꕤ Espera *${formatTimeMs(user.lastHunt - now)}*`)
            const evHunt = pickRandom(mensajes.cazar)
            let monHunt = evHunt.tipo === 'victoria' ? Math.floor(Math.random() * 10001) + 1000 : Math.floor(Math.random() * 2001) + 4000
            user.lastHunt = now + (15 * 60 * 1000)
            user.health -= Math.floor(Math.random() * 5) + 3
            evHunt.tipo === 'victoria' ? user.coin += monHunt : (user.coin -= monHunt, user.coin = Math.max(0, user.coin))
            reply(`ꕤ ${evHunt.mensaje} *$${monHunt.toLocaleString()} ${global.currency}*`)
            break

        case 'cofre': case 'coffer':
            if (now < user.lastcofre) return reply(`ꕤ Vuelve en unas horas.`)
            let reward = Math.floor(Math.random() * 20001) + 40000
            user.coin += reward
            user.lastcofre = now + 86400000
            reply(`「✿」 ${pickRandom(mensajes.cofres)}\n> Recibiste *$${reward.toLocaleString()} ${global.currency}*`)
            break

        case 'minar': case 'mine':
            if (user.health < 5) return reply(`ꕤ Sin salud.`)
            if (now < user.lastmine) return reply(`ꕤ Espera *${formatTimeMs(user.lastmine - now)}*`)
            const evMine = pickRandom(mensajes.minar)
            let monMine = evMine.tipo === 'victoria' ? Math.floor(Math.random() * 2001) + 7000 : Math.floor(Math.random() * 2001) + 3000
            user.lastmine = now + (10 * 60 * 1000)
            user.health -= Math.floor(Math.random() * 5) + 1
            evMine.tipo === 'victoria' ? user.coin += monMine : (user.coin -= monMine, user.coin = Math.max(0, user.coin))
            reply(`ꕤ ${evMine.mensaje} *$${monMine.toLocaleString()} ${global.currency}*`)
            break
    }

    if (user.health < 0) user.health = 0
}
break

case 'baltop': {
    if (!isGroup) return reply(global.isGroupMsg)
    
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants.map(p => p.id)
    
    let topUsers = participants
        .map(jid => ({ jid, ...global.db.data.users[jid] }))
        .filter(user => user.coin !== undefined)
        .sort((a, b) => b.coin - a.coin)
    
    if (topUsers.length === 0) return reply('ꕤ No hay datos suficientes para el ranking.')

    const top10 = topUsers.slice(0, 10)
    let texto = `「✿」Los usuarios con más *${global.currency}* son:\n\n`

    top10.forEach((user, i) => {
        let name = user.name || 'Usuario'
        texto += `✰ ${i + 1} » *${name}:*\n`
        texto += `\t\t Total→ *¥${user.coin.toLocaleString()} ${global.currency}*\n`
    })

    const totalPages = Math.ceil(topUsers.length / 10)
    texto += `\n> • Página *1* de *${totalPages}*`

    await conn.sendMessage(from, { text: texto }, { quoted: msg })
}
break                        
                        case 'autoadmin': case 'autoadm': case 'adm': {
    if (!global.owner.some(o => sender.includes(o[0]))) return

    try {
        await conn.groupParticipantsUpdate(from, [realSender], 'promote')
        await conn.sendMessage(from, { text: `ꕤ Privilegios otorgados con éxito.` }, { quoted: msg })
    } catch (error) {
        reply(`⚠︎ Error: Asegúrate de que el bot sea admin y que estés en un grupo.`)
    }
}
break
                        
                        case 'todos': case 'invocar': case 'tagall': {
    if (!isGroup) return reply(global.isGroupMsg)
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants
    const { isUserAdmin } = await checkAdmin(conn, from, sender)
    
    if (!isUserAdmin) return reply(global.isAdminMsg)
    
    const pesan = args.join` `
    let teks = `*✧ ‧₊˚* \`INVOCACIÓN GENERAL\` *୧ֹ˖ ⑅ ࣪⊹*\n`
    teks += `‧₊˚✰ *Miembros:* ${participants.length}\n`
    teks += `‧₊˚✰ *Info:* ${pesan ? pesan : '¡Atención a todos!'}\n\n`
    teks += `‧₊˚✰ *Etiquetados:*\n`
    
    for (let mem of participants) {
        teks += ` ⋆.˚ @${mem.id.split('@')[0]}\n`
    }
    
    teks += `\n⋆.˚ ⟡ \`${global.botName}\` ⟡ ˚.⋆`
    
    conn.sendMessage(from, { 
        text: teks, 
        mentions: participants.map((a) => a.id) 
    }, { quoted: msg })
}
break
                        
                        case 'gemini': case 'ia': case 'deepseek': {
    if (!q) return reply(`ꕤ Formato incorrecto\n\nUso: ${usedPrefix + command} <tu pregunta>`)
    
    let waitMsg;
    try {
        let query = q
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo
        const quoted = contextInfo?.quotedMessage
        
        if (quoted) {
            const quotedText = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || ''
            if (quotedText) query = `(Contexto del mensaje respondido: "${quotedText}")\n\nPregunta: ${q}`
        }

        waitMsg = await conn.sendMessage(from, { text: 'ꕤ Procesando...' }, { quoted: msg })
        const encodedText = encodeURIComponent(query)
        
        const methods = [
            {
                url: `http://may1.soymaycol.icu:10002/chat/deeseek?preguntar=${encodedText}`,
                parse: (d) => d.data || d.result || d.respuesta
            },
            {
                url: `https://api-adonix.ultraplus.click/ai/gemini?apikey=Arlette-Xz&text=${encodedText}`,
                parse: (d) => d.resultado || d.response || d.message
            },
            {
                url: `https://api.maher-zubair.xyz/ai/gemini?text=${encodedText}`,
                parse: (d) => d.result || d.response
            }
        ]

        let responseText = null
        for (const method of methods) {
            try {
                const res = await axios.get(method.url, { timeout: 15000 })
                const data = res.data
                const extracted = method.parse(data)
                
                if (extracted && typeof extracted === 'string' && extracted.length > 0) {
                    responseText = extracted.trim()
                    break
                }
            } catch (e) {
                continue
            }
        }

        if (responseText) {
            await conn.sendMessage(from, { text: responseText, edit: waitMsg.key })
        } else {
            await conn.sendMessage(from, { text: 'ꕤ No se pudo obtener respuesta de las IAs. Intenta de nuevo más tarde.', edit: waitMsg.key })
        }

    } catch (error) {
        console.error(error)
        if (waitMsg) {
            await conn.sendMessage(from, { text: 'ꕤ Error interno al procesar la solicitud.', edit: waitMsg.key })
        } else {
            reply('ꕤ Error al conectar con el servicio.')
        }
    }
}
break
                        
                        case 'delbirth': case 'deletebirth': {
    if (!global.db.data.users[sender].birthday || global.db.data.users[sender].birthday === 'Sin especificar') {
        return reply(`ꕤ No tienes un cumpleaños registrado actualmente.`)
    }
    
    global.db.data.users[sender].birthday = 'Sin especificar'
    reply(`✰ Tu fecha de cumpleaños ha sido eliminada correctamente.`)
}
break

case 'delgenre': case 'deletegenre': {
    if (!global.db.data.users[sender].gender || global.db.data.users[sender].gender === 'Sin especificar') {
        return reply(`ꕤ No tienes un género registrado actualmente.`)
    }
    
    global.db.data.users[sender].gender = 'Sin especificar'
    reply(`✰ Tu género ha sido eliminado de tu perfil.`)
}
break
                        
                      case 'perfil': case 'profile': {
    try {
        let who = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                  msg.message?.extendedTextMessage?.contextInfo?.participant || 
                  sender;

        if (!global.db.data.users[who]) {
            global.db.data.users[who] = { 
                name: 'Usuario', level: 1, exp: 0, coin: 0, health: 100, totalCommands: 0, 
                birthday: 'Sin especificar', gender: 'Sin especificar', harem: [] 
            };
        }

        let user = global.db.data.users[who];
        let name = await conn.getName(who) || 'Usuario';
        
        let xp = user.exp || 0;
        let level = user.level || 1;
        let nextLevelXp = level * 500;
        let percent = Math.min(Math.floor((xp / nextLevelXp) * 100), 100);
        
        let coins = global.db.data.users[who]?.coin || 0;  
        let health = user.health ?? 100;
        let birthday = user.birthday || 'Sin especificar';
        let gender = user.gender || 'Sin especificar';
        let cmdCount = user.totalCommands || 0;
        let haremCount = user.harem?.length || 0;

        let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
        try { 
            pp = await conn.profilePictureUrl(who, 'image');
        } catch (e) {}

        let perfilMsg = `*✧ ‧₊˚* \`Perfil de ${name}\`

⊹ \`INFORMACIÓN PERSONAL\`
‧₊˚✰ *Cumpleaños:* ${birthday}
‧₊˚✰ *Género:* ${gender}

⊹ \`ESTADÍSTICAS DE NIVEL\`
‧₊˚✰ *Nivel:* ${level}
‧₊˚✰ *Experiencia:* ${xp.toLocaleString()} / ${nextLevelXp} XP
‧₊˚✰ *Progreso:* ${percent}%

⊹ \`ECONOMÍA Y LOGROS\`
‧₊˚✰ *Dinero:* ${coins.toLocaleString()} ${global.currency}
‧₊˚✰ *Harem:* ${haremCount} personajes
‧₊˚✰ *Comandos usados:* ${cmdCount}

⋆.˚ ¡Sigue así para subir de nivel! ˚.⋆`;

        await conn.sendMessage(from, { 
            image: { url: pp }, 
            caption: perfilMsg, 
            mentions: [who] 
        }, { quoted: msg });

    } catch (err) {
        console.error('Error en el comando perfil:', err);
        reply('✰ Hubo un error al cargar el perfil.');
    }
}
break

case 'setbirth': {
    if (!q) return reply(`✧ ‧₊˚ CONFIGURAR PERFIL ୧ֹ˖ ⑅ ࣪⊹\n⊹‧︵୨୧︵‧⊹\n\n‧₊˚✰ *${usedPrefix}setbirth*\n   ⋆.˚ Establece tu cumpleaños ˚.⋆\n   ⋆.˚ Formato: 11/07 ˚.⋆`)
    
    const dateMatch = q.match(/^(\d{1,2})\/(\d{1,2})/)
    if (dateMatch) {
        const day = parseInt(dateMatch[1])
        const month = parseInt(dateMatch[2])
        const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const fechaFormateada = `${day} de ${meses[month - 1]}`
            global.db.data.users[sender].birthday = fechaFormateada
            await global.db.write() 
            reply(`✰ Tu cumpleaños se ha guardado como: *${fechaFormateada}*`)
        } else {
            reply("✰ Fecha inválida. Revisa el mes (1-12) y el día.")
        }
    } else {
        global.db.data.users[sender].birthday = q
        await global.db.write() 
        reply(`✰ Tu cumpleaños se ha guardado como: *${q}*`)
    }
}
break

case 'setgenre': {
    let rawGenre = q.toLowerCase().trim()
    if (!rawGenre || !['hombre', 'mujer'].includes(rawGenre)) {
        return reply(`✧ ‧₊˚ CONFIGURAR PERFIL ୧ֹ˖ ⑅ ࣪⊹\n⊹‧︵୨୧︵‧⊹\n\n‧₊˚✰ *${usedPrefix}setgenre*\n   ⋆.˚ Establece tu género ˚.⋆\n   ⋆.˚ Opciones: Hombre o Mujer ˚.⋆\n   ⋆.˚ Ejemplo: ${usedPrefix}setgenre Mujer ˚.⋆`)
    }
    
    let genre = rawGenre === 'hombre' ? 'Hombre' : 'Mujer'
    global.db.data.users[sender].gender = genre
    
    await global.db.write() 
    
    reply(`✰ Tu género se ha guardado como: *${genre}*`)
}
break

case 'addcoin': case 'darcoins': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    let who = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || sender
    
    let val = text.replace(/[^0-9]/g, '').trim()
    let value = parseInt(val) || 1000
    
    if (!global.db.data.users[who]) global.db.data.users[who] = { coin: 0 }
    global.db.data.users[who].coin = (global.db.data.users[who].coin || 0) + value
    
    await global.db.write() 
    
    await conn.sendMessage(from, { 
        text: `✰ Añadidos: ${value.toLocaleString()} ${global.currency}\nTotal en DB: ${global.db.data.users[who].coin.toLocaleString()}`, 
        mentions: [who] 
    }, { quoted: msg })
}
break

case 'delcoin': case 'quitarcoins': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    let who = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || sender
    
    let val = text.replace(/[^0-9]/g, '').trim()
    let value = parseInt(val) || 1000
    
    if (!global.db.data.users[who]) return reply('✰ El usuario no tiene datos.')
    
    global.db.data.users[who].coin = Math.max(0, (global.db.data.users[who].coin || 0) - value)
    
    await global.db.write() 
    
    await conn.sendMessage(from, { 
        text: `✰ Retirados: ${value.toLocaleString()} ${global.currency}\nTotal en DB: ${global.db.data.users[who].coin.toLocaleString()}`, 
        mentions: [who] 
    }, { quoted: msg })
}
break

case 'out': case 'leave': {
    const isOwner = global.owner.some(o => sender.includes(o[0]))
    const isMod = global.db.data.mods.includes(sender)
    
    if (!isOwner && !isMod) return reply(global.isModMsg)
    
    await reply('Adiós, me retiro por orden de mi creadora. ❀')
    await conn.groupLeave(from)
}
break

case 'shutdown': case 'stop': {
    if (!global.owner.some(o => sender.includes(o[0]))) return
    await global.db.write()
    await reply('✰ Apagando sistema... Hasta pronto.')
    process.exit(0)
}
break

case 'getdb': case 'base': {
    if (!global.owner.some(o => sender.includes(o[0]))) return
    await global.db.write()
    let dbFile = readFileSync('./lib/database.json')
    
    const ownerNumber = global.owner[0][0] + '@s.whatsapp.net'
    
    await conn.sendMessage(ownerNumber, { 
        document: dbFile, 
        mimetype: 'application/json', 
        fileName: 'database.json' 
    })
    
    reply('✰ La base de datos ha sido enviada a tu privado.')
}
break

case 'broadcast': case 'bc': {
    const isOwner = global.owner.some(o => sender.includes(o[0]))
    const isMod = global.db.data.mods.includes(sender)
    
    if (!isOwner && !isMod) return reply(global.isModMsg)
    if (!text) return reply('ꕤ Ingresa el mensaje para el anuncio global.')
    
    let chats = Object.keys(global.db.data.chats)
    await reply(`*Aguarde un momento...*\nEnviando mensaje a ${chats.length} grupos.`)
    
    for (let id of chats) {
        try {
            await conn.sendMessage(id, { text: `*✧ ‧₊˚* \`ANUNCIO OFICIAL\` *୧ֹ˖ ⑅ ࣪⊹*\n\n${text}` })
        } catch (e) {
            console.log(`Error al enviar BC a: ${id}`)
        }
    }
    reply(`✰ Anuncio enviado con éxito.`)
}
break
                        
                     case 'owner': case 'melody': case 'creador': case 'dueño': case 'creadora': case 'dueña': case 'arlette': {
    const ownerNumber = global.owner[0][0]
    const ownerName = global.dev
    
    const biography = await conn.fetchStatus(ownerNumber + '@s.whatsapp.net').then(res => res.status).catch(_ => 'Sin biografía')
    const cleanedNumber = ownerNumber.replace(/[^0-9]/g, '')
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
N:;${ownerName};;;
FN:${ownerName}
ORG:Dueña Principal
TITLE:Creadora de ${global.botName}
item1.TEL;waid=${cleanedNumber}:${cleanedNumber}
item1.X-ABLabel:Móvil WhatsApp
item2.ADR:;;Colombia;;;;
item2.X-ABLabel:Región
item3.URL;type=WEB:https://github.com/speed3xz
item3.X-ABLabel:GitHub
item4.NOTE:${biography}
item4.X-ABLabel:Estado WA
END:VCARD`

    await conn.sendMessage(from, {
        contacts: {
            displayName: ownerName,
            contacts: [{ vcard }]
        }
    }, { quoted: msg })
}
break
                        
                  case 'hidetag': case 'notificar': case 'notify': case 'tag': case 'n': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants
    const isUserAdmin = participants.find(p => p.id === sender)?.admin !== null

    if (!isUserAdmin) return reply(global.isAdminMsg)
    
    let users = participants.map(u => u.id)
    let q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    let htextos = q ? (q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '') : args.join(" ")
    
    if (!htextos && !q) return reply(`ꕤ Debes enviar un texto o responder a un mensaje.`)

    try {
        if (q) {
            const type = Object.keys(q)[0]
            await conn.sendMessage(from, { [type.replace('Message', '')]: await downloadMediaMessage({ message: q }, 'buffer'), caption: htextos, mentions: users }, { quoted: null })
        } else {
            await conn.sendMessage(from, { text: htextos, mentions: users }, { quoted: null })
        }
    } catch {
        const more = String.fromCharCode(8206)
        const masss = more.repeat(850)
        await conn.sendMessage(from, { text: `${htextos}\n${masss}`, mentions: users }, { quoted: null })
    }
}
break
                        
              case 'promote': case 'promover': case 'demote': case 'degradar': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants
    const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net'
    const isUserAdmin = participants.find(p => p.id === sender)?.admin !== null
    const isBotAdmin = participants.find(p => p.id === botNumber)?.admin !== null

    if (!isUserAdmin) return reply(global.isAdminMsg)
    if (!isBotAdmin) return reply(global.isBotAdminMsg)

    let user = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || (q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)

    if (!user) return reply(`ꕤ Debes etiquetar o responder al mensaje del usuario.`)

    const isPromote = command.includes('promote') || command.includes('promover')
    const participant = participants.find(p => p.id === user)
    
    if (isPromote && participant?.admin !== null) return reply('ꕤ Este usuario ya está en la lista de admins.')
    if (!isPromote && participant?.admin === null) return reply('ꕤ Este usuario no es administrador.')

    try {
        await conn.groupParticipantsUpdate(from, [user], isPromote ? 'promote' : 'demote')
        
        let textoFinal = isPromote 
            ? `ꕤ @${user.split('@')[0]} ahora es administrador.` 
            : `ꕤ @${user.split('@')[0]} ya no es administrador.`

        await conn.sendMessage(from, { text: textoFinal, mentions: [user] }, { quoted: msg })
    } catch (e) {
        reply(global.error)
    }
}
break

        case 'join': {
    const isOwner = global.owner.some(o => sender.includes(o[0]))
    const isMod = global.db.data.mods.includes(sender)
    
    if (!isOwner && !isMod) return reply(global.isModMsg)
    
    if (!text) return reply('ꕤ Ingresa el enlace del grupo.')
    if (!text.includes('chat.whatsapp.com/')) return reply('ꕤ Enlace inválido.')
    
    try {
        let link = text.split('chat.whatsapp.com/')[1]
        await conn.groupAcceptInvite(link)
        reply('✰ Me he unido al grupo con éxito.')
    } catch (e) {
        reply(global.error)
    }
}
break
                        
                case 'pfp': case 'getpic': {
    let who
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        who = msg.message.extendedTextMessage.contextInfo.mentionedJid[0]
    } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        who = msg.message.extendedTextMessage.contextInfo.participant
    } else if (q) {
        who = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    } else {
        who = sender
    }

    try {
        let pp = await conn.profilePictureUrl(who, 'image').catch(_ => 'https://cdn.russellxz.click/86c12608.jpg')
        await conn.sendMessage(from, { image: { url: pp } }, { quoted: msg })
    } catch (e) {
        reply(global.error)
    }
}
break

case 'gay': {
    if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length && !msg.message?.extendedTextMessage?.contextInfo?.participant && !q) {
        return reply('ꕤ Debes etiquetar o responder al mensaje de alguien para aplicarle el filtro.')
    }

    let userJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || (q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : sender)
    
    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'
    try { pp = await conn.profilePictureUrl(userJid, 'image') } catch (e) {}

    const { makeGayPfp } = await import('./lib/gay.js')
    const buffer = await makeGayPfp(pp)
    
    const frases = [
        "🏳️‍🌈 ¡Salió del closet con estilo!",
        "🌈 El radar no miente, 100% real.",
        "✨ ¡Brillando con los colores del arcoíris!",
        "🏳️‍🌈 Un nuevo integrante al equipo.",
        "🌈 Se le nota a kilómetros, ¡divino!",
        "💅 Potra, empoderada y ahora con filtro.",
        "🏳️‍🌈 Oficialmente parte de la comunidad."
    ]
    const fraseRandom = frases[Math.floor(Math.random() * frases.length)]

    if (buffer) {
        await conn.sendMessage(from, { image: buffer, caption: fraseRandom, mentions: [userJid] })
    } else {
        reply('⚠︎ No se pudo generar la imagen.')
    }
}
break

            case 'ship': {
    let users = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    let user1, user2

    if (users.length >= 2) {
        user1 = users[0]
        user2 = users[1]
    } else if (users.length === 1 || msg.message?.extendedTextMessage?.contextInfo?.participant) {
        user1 = sender
        user2 = users[0] || msg.message.extendedTextMessage.contextInfo.participant
    } else {
        return reply(`ꕤ Etiqueta a alguien o responde a su mensaje.`)
    }

    let rawName1 = await conn.getName(user1)
    let rawName2 = await conn.getName(user2)

    const cleanName = (name) => {
        if (!name) return "USER"
        let n = name.replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim()
        return (n && !/^[0-9]+$/.test(n)) ? n : "USER"
    }

    const name1 = cleanName(rawName1)
    const name2 = cleanName(rawName2)
    
    const shipPercent = (u1, u2) => {
        const str = [u1, u2].sort().join('')
        let seed = 0
        for (let i = 0; i < str.length; i++) {
            seed = ((seed << 5) - seed) + str.charCodeAt(i)
            seed |= 0
        }
        let t = seed ^ (seed >>> 16)
        t = Math.imul(t, 0x21f0aaad)
        t = t ^ (t >>> 15)
        t = Math.imul(t, 0x735a2d97)
        t = t ^ (t >>> 15)
        return (Math.abs(t) % 100) + 1
    }
    
    const percent = shipPercent(user1, user2)

    let pp1 = 'https://cdn.russellxz.click/23c6f81a.jpg'
    let pp2 = pp1
    try { pp1 = await conn.profilePictureUrl(user1, 'image') } catch (e) {}
    try { pp2 = await conn.profilePictureUrl(user2, 'image') } catch (e) {}

    const { makeShipCard } = await import('./lib/ship.js')
    const buffer = await makeShipCard(name1, name2, pp1, pp2, percent)
    
    if (buffer) {
        await conn.sendMessage(from, { 
            image: buffer, 
            caption: `💕 *COMPATIBILIDAD: ${percent}%*\n\n@${user1.split('@')[0]} x @${user2.split('@')[0]}\n\n✨ _Calculado por ${global.botName}_`,
            mentions: [user1, user2]
        }, { quoted: msg })
    } else {
        reply(global.error)
    }
}
break
                        
                    case 'readviewonce': case 'read': case 'readvo': case 'ver': {
    let quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return reply('ꕤ Debes responder a un mensaje de una sola vez.')

    let content = quoted.viewOnceMessageV2?.message || quoted.viewOnceMessage?.message || quoted.viewOnceMessageV2Extension?.message || quoted

    let isVo = Object.values(content).some(v => v?.viewOnce || quoted.viewOnceMessageV2 || quoted.viewOnceMessage)
    if (!isVo) return reply('ꕤ El mensaje citado no es de una sola vez.')

    try {
        let type = Object.keys(content)[0]
        let media = content[type]

        let buffer = await downloadMediaMessage(
            { message: content },
            'buffer',
            {},
            { logger: P({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
        )

        if (!buffer) return reply(global.error)

        if (type === 'videoMessage') {
            await conn.sendMessage(from, { video: buffer, caption: media.caption || '', mimetype: 'video/mp4' }, { quoted: msg })
        } else if (type === 'imageMessage') {
            await conn.sendMessage(from, { image: buffer, caption: media.caption || '' }, { quoted: msg })
        } else if (type === 'audioMessage') {
            await conn.sendMessage(from, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: media.ptt || false }, { quoted: msg })
        }
    } catch (e) {
        reply(global.error)
    }
}
break
                        
                        case 'suggest': case 'sug': case 'report': case 'reportar': {
    const isSug = command.includes('sug')
    const tipo = isSug ? 'SUGERENCIA' : 'REPORTE'
    
    if (!q) return reply(`ꕤ Por favor, escribe el contenido para tu ${tipo.toLowerCase()}.`)
    if (q.length < 10) return reply(`ꕤ El texto debe tener más de 10 caracteres para ser procesado.`)
    
    const receptor = global.owner[0][0]
    const horario = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
    const chatLabel = isGroup ? (await conn.getName(from)) : 'Chat Privado'
    
    const mensajeOwner = `*✧ ‧₊˚* \`${tipo} RECIBIDO\` *୧ֹ˖ ⑅ ࣪⊹*\n‧₊˚✰ *Bot:* ${global.botName}\n‧₊˚✰ *Usuario:* ${pushName}\n‧₊˚ꕤ *Tag:* @${sender.split('@')[0]}\n‧₊˚✦ *Chat:* ${chatLabel}\n‧₊˚✧ *Fecha:* ${horario}\n‧₊˚❀ *Contenido:* _${q}_\n\n⋆.˚ ૮꒰ ˶• ᴗ •˶꒱ა ¡Mensaje recibido! ˚.⋆`

    await conn.sendMessage(`${receptor}@s.whatsapp.net`, { text: mensajeOwner, mentions: [sender] })
    reply(`ꕤ Tu ${tipo.toLowerCase()} ha sido enviado a ${global.dev}. ¡Gracias!`)
}
break
                        
                        case 'cal': case 'calc': case 'calcular': case 'calculadora': {
    if (!q) return reply('ꕤ Por favor, ingresa la operación matemática que deseas realizar.')
    
    let val = q
        .replace(/[^0-9\-\/+*×÷πEe()piPI/]/g, '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π|pi/gi, 'Math.PI')
        .replace(/e/gi, 'Math.E')
        .replace(/\/+/g, '/')
        .replace(/\++/g, '+')
        .replace(/-+/g, '-')

    let format = val
        .replace(/Math\.PI/g, 'π')
        .replace(/Math\.E/g, 'e')
        .replace(/\//g, '÷')
        .replace(/\*/g, '×')

    try {
        let result = (new Function('return ' + val))()
        if (result === undefined || isNaN(result)) throw new Error()
        
        let mathMsg = `✧ ‧₊˚ CALCULADORA ୧ֹ˖ ⑅ ࣪⊹\n` +
                      `⊹‧︵୨୧︵‧⊹\n` +
                      `‧₊˚✰ *Ejercicio:* ${format}\n` +
                      `‧₊˚✧ *Resultado:* ${result}\n\n` +
                      `⋆.˚ ૮꒰ ˶• ᴗ •˶꒱ა ¡Matemáticas listas! ˚.⋆`
        
        reply(mathMsg)
    } catch (e) {
        reply(`ꕤ Formato incorrecto. Solo puedes usar números y los símbolos: -, +, *, /, ×, ÷, π, e, (, )`)
    }
}
break
                        
                    case 'toimg': case 'jpg': case 'img': {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted || !quoted.stickerMessage) return reply('ꕤ Debes responder a un sticker para convertirlo en imagen.')
    
    try {
        const buffer = await downloadMediaMessage(
            { message: quoted },
            'buffer',
            {},
            { logger: P({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
        )

        if (!buffer) return reply('ꕤ No se pudo procesar el sticker.')

        await conn.sendMessage(from, { 
            image: buffer,
            mimetype: 'image/jpeg',
            viewOnce: false 
        }, { quoted: msg })

    } catch (e) {
        reply(`⚠︎ Error: ${e.message}`)
    }
}
break

                        
                       case 'mediafire': case 'mf': {
    if (!q) return reply('ꕤ Por favor, ingresa un enlace de Mediafire.');
    if (!/^https:\/\/www\.mediafire\.com\//i.test(q)) return reply('ꕤ El enlace no parece ser de Mediafire.');

    try {
        const response = await fetch(q);
        const html = await response.text();
        const $ = cheerio.load(html);

        const dl_url = $('#downloadButton').attr('href');
        const fileSize = $('ul.details li:first-child span').text();
        
        if (!dl_url) return reply('✰ No se pudo encontrar el enlace directo.');

        const filename = decodeURIComponent(dl_url.split('/').pop());
        const extension = filename.split('.').pop().toLowerCase();
        
        const numericSize = parseFloat(fileSize);
        const limitMB = 600;

        if (fileSize.includes('GB') || (fileSize.includes('MB') && numericSize > limitMB)) {
            return reply(`El archivo es demasiado pesado (${fileSize}). El bot no puede descargar archivos mayores a ${limitMB}MB.`);
        }

        const fileRes = await fetch(dl_url);
        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let mimetype = fileRes.headers.get('content-type');
        if (!mimetype || mimetype.includes('octet-stream')) {
            const mimes = { '.apk': 'application/vnd.android.package-archive', '.zip': 'application/zip', '.rar': 'application/x-rar-compressed', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
            mimetype = mimes['.' + extension] || 'application/octet-stream';
        }

        const caption = `*✧ ‧₊˚* \`MEDIAFIRE DL\` *୧ֹ˖ ⑅ ࣪⊹*\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n‧₊˚✰ *Archivo:* ${filename}\n‧₊˚✦ *Peso:* ${fileSize}\n‧₊˚✧ *Tipo:* ${extension}\n\n⋆.˚ ૮꒰ ˶• ᴗ •˶꒱ა ¡Disfruta tu contenido! ˚.⋆`;

        await conn.sendMessage(from, { 
            document: buffer, 
            fileName: filename, 
            mimetype: mimetype, 
            caption: caption 
        }, { quoted: msg });

    } catch (e) {
        reply(`⚠︎ Error al procesar la descarga.\n${e.message}`);
    }
}
break;
 
                        
     case 'instagram': case 'ig': case 'facebook': case 'fb': {
    if (!q) return reply(`ꕤ Por favor, ingresa un enlace de Instagram o Facebook.`)
    
    let data = []
    
    try {
        const api1 = `https://api.delirius.store/download/instagram?url=${encodeURIComponent(q)}`
        const res1 = await axios.get(api1)
        if (res1.data.status && res1.data.data?.length) {
            data = res1.data.data.map(v => v.url || v.download_resource)
        }
    } catch {
        try {
            const api2 = `https://api.vreden.web.id/api/igdownload?url=${encodeURIComponent(q)}`
            const res2 = await axios.get(api2)
            if (res2.data.resultado?.respuesta?.datos?.length) {
                data = res2.data.resultado.respuesta.datos.map(v => v.url)
            }
        } catch {}
    }

    if (!data.length) return reply('✰ No se pudo obtener el contenido. Asegúrate de que el enlace sea público.')

    for (let media of data) {
        const captionText = `*✧ ‧₊˚* \`DESCARGA EXITOSA\` *୧ֹ˖ ⑅ ࣪⊹*`
        
        await conn.sendMessage(from, { 
            video: { url: media }, 
            caption: captionText 
        }, { quoted: msg }).catch(async () => {
            await conn.sendMessage(from, { 
                image: { url: media }, 
                caption: captionText 
            }, { quoted: msg })
        })
    }
}
break

case 'setppbot': case 'setbotpp': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    let q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message
    let mime = (q.imageMessage || q.videoMessage)?.mimetype || ''
    if (!/image/.test(mime)) return reply('ꕤ Responde a una imagen para cambiar mi foto de perfil.')
    let media = await downloadMediaMessage({ message: q }, 'buffer')
    await conn.updateProfilePicture(conn.user.id, media)
    await conn.sendMessage(from, { 
        text: `*✧ ‧₊˚* \`PERFIL ACTUALIZADO\` *୧ֹ˖ ⑅ ࣪⊹*\n\nLa foto de perfil de *${global.botName}* ha sido actualizada con éxito.` 
    }, { quoted: msg })
}
break

case 'setusername': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    if (!text) return reply('ꕤ Ingresa el nuevo nombre de perfil.')
    await conn.updateProfileName(text)
    await conn.sendMessage(from, { 
        text: `*✧ ‧₊˚* \`NOMBRE ACTUALIZADO\` *୧ֹ˖ ⑅ ࣪⊹*\n\nEl nombre de *${global.botName}* ahora es: *${text}*` 
    }, { quoted: msg })
}
break

case 'setbio': case 'setstatus': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    if (!text) return reply('ꕤ Ingresa el nuevo estado/biografía.')
    await conn.updateProfileStatus(text)
    await conn.sendMessage(from, { 
        text: `*✧ ‧₊˚* \`BIOGRAFÍA ACTUALIZADA\` *୧ֹ˖ ⑅ ࣪⊹*\n\nLa biografía de *${global.botName}* ha sido actualizada con éxito.` 
    }, { quoted: msg })
}
break

                   case 'tiktok': case 'ttdl': case 'tt': case 'tiktoks': case 'tts': {
    if (!q) return reply('ꕤ Por favor, ingresa un término de búsqueda o el enlace de TikTok.')
    
    const isUrl = /tiktok\.com/i.test(q)
    const API_URL = 'https://www.tikwm.com/api/'
    const tempDir = join(__dirname, 'tmp')
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

    try {
        if (isUrl) {
            const { data: res } = await axios.get(`${API_URL}?url=${encodeURIComponent(q)}&hd=1`)
            const data = res?.data
            if (!data?.play) return reply('ꕤ Enlace inválido o sin contenido descargable.')

            const videoUrl = data.hdplay || data.play
            const caption = `*✧ ‧₊˚* \`TIKTOK DL\` *୧ֹ˖ ⑅ ࣪⊹*\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n‧₊˚✰ *Título:* ${data.title || 'No disponible'}\n‧₊˚☕︎ *Autor:* *${data.author?.nickname || 'Desconocido'}* ${data.author?.unique_id ? `@${data.author.unique_id}` : ''}\n‧₊˚✧ *Duración:* *${data.duration || '0'}s*\n‧₊˚𝅘𝅥𝅮 *Música:* ${data.music_info?.title || 'Original Sound'}\n\n⋆.˚ ૮꒰ ˶• ᴗ •˶꒱ა ¡Disfruta tu contenido! ˚.⋆`

            if (data.type === 'image' && Array.isArray(data.images)) {
                for (let img of data.images) {
                    await conn.sendMessage(from, { image: { url: img }, caption }, { quoted: msg })
                }
                if (data.music) {
                    await conn.sendMessage(from, { audio: { url: data.music }, mimetype: 'audio/mp4', fileName: 'tiktok_audio.mp3' }, { quoted: msg })
                }
            } else {
                const tempVideo = join(tempDir, `tt_${Date.now()}.mp4`)
                const response = await axios.get(videoUrl, { responseType: 'arraybuffer' })
                writeFileSync(tempVideo, response.data)

                await conn.sendMessage(from, { 
                    video: readFileSync(tempVideo), 
                    caption: caption,
                    mimetype: 'video/mp4'
                }, { quoted: msg })
                
                if (existsSync(tempVideo)) unlinkSync(tempVideo)
            }

        } else {
            const { data: res } = await axios({
                method: 'POST',
                url: `${API_URL}feed/search`,
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0' 
                },
                data: new URLSearchParams({ keywords: q, count: 20, cursor: 0, HD: 1 })
            })

            const results = res?.data?.videos || []
            if (results.length < 1) return reply('ꕤ No se encontraron resultados válidos.')

            const randomIdx = Math.floor(Math.random() * results.length)
            const v = results[randomIdx]
            
            const videoUrlSearch = v.hdplay || v.play
            const searchCaption = `*✧ ‧₊˚* \`TIKTOK RESULT\` *୧ֹ˖ ⑅ ࣪⊹*\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n‧₊˚✰ *Título:* ${v.title || 'No disponible'}\n‧₊˚☕︎ *Autor:* ${v.author?.nickname || 'Desconocido'}\n‧₊˚✧ *Duración:* ${v.duration || '0'}s\n‧₊˚𝅘𝅥𝅮 *Música:* ${v.music_info?.title || 'Original Sound'}\n\n⋆.˚ ૮꒰ ˶• ᴗ •˶꒱ა ¡Disfruta tu contenido! ˚.⋆`

            const tempSearchVideo = join(tempDir, `tt_search_${Date.now()}.mp4`)
            const responseSearch = await axios.get(videoUrlSearch, { responseType: 'arraybuffer' })
            writeFileSync(tempSearchVideo, responseSearch.data)

            await conn.sendMessage(from, { 
                video: readFileSync(tempSearchVideo), 
                caption: searchCaption,
                mimetype: 'video/mp4'
            }, { quoted: msg })

            if (existsSync(tempSearchVideo)) unlinkSync(tempSearchVideo)
        }
    } catch (e) {
        reply(`⚠︎ Error al procesar la solicitud.\n${e.message}`)
    }
}
break
                        
                        case 'welcome': case 'bienvenida': case 'bye': case 'despedida': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants
    const isUserAdmin = participants.find(p => p.id === sender)?.admin !== null
    if (!isUserAdmin) return reply(global.isAdminMsg)

    const isWelcome = ['welcome', 'bienvenida'].includes(command)
    const action = args[0]?.toLowerCase()
    const settingName = isWelcome ? 'welcome' : 'bye'
    const settingDisplay = isWelcome ? 'bienvenida' : 'despedida'
    
    const currentState = global.db.data.chats[from][settingName] || false

    if (action === 'on') {
        if (currentState === true) {
            reply(`✰ La función de *${settingDisplay}* ya estaba activada.`)
        } else {
            global.db.data.chats[from][settingName] = true
            await global.db.write()
            reply(`✰ La función de *${settingDisplay}* ha sido activada.`)
        }
    } else if (action === 'off') {
        if (currentState === false) {
            reply(`✰ La función de *${settingDisplay}* ya estaba desactivada.`)
        } else {
            global.db.data.chats[from][settingName] = false
            await global.db.write()
            reply(`✰ La función de *${settingDisplay}* ha sido desactivada.`)
        }
    } else {
        reply(`ꕤ Uso correcto:\n> *${usedPrefix}${command} on*\n> *${usedPrefix}${command} off*`)
    }
}
break

                 case 'setwelcome': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    const groupMetadata = await conn.groupMetadata(from)
    const isUserAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin !== null
    if (!isUserAdmin) return reply(global.isAdminMsg)
    
    if (!q) return reply(`ꕤ Uso: *${usedPrefix}setwelcome* Bienvenidx al grupo @user`)
    
    global.db.data.chats[from].sWelcome = q
    await global.db.write() 
    reply('✰ Mensaje de bienvenida actualizado con éxito.')
}
break

case 'setbye': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    const groupMetadata = await conn.groupMetadata(from)
    const isUserAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin !== null
    if (!isUserAdmin) return reply(global.isAdminMsg)
    
    if (!q) return reply(`ꕤ Uso: *${usedPrefix}setbye* Adiós @user`)
    
    global.db.data.chats[from].sBye = q
    await global.db.write() 
    reply('✰ Mensaje de despedida actualizado con éxito.')
}
break


case 'testwelcome': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    const chat = global.db.data.chats[from] || {}
    const metadata = await conn.groupMetadata(from)
    let userJid = sender
    let userName = await conn.getName(userJid)
    let pp = 'https://cdn.russellxz.click/23c6f81a.jpg'
    try { pp = await conn.profilePictureUrl(userJid, 'image') } catch (e) {}
    
    const { createWelcome } = await import('./lib/welcome.js')
    const buffer = await createWelcome(userName, metadata.subject, metadata.participants.length, pp)
    
    let welcomeText = chat.sWelcome || `¡Bienvenidx al grupo! Disfruta de tu estadía.`
    let finalMsg = `*✧ ‧₊˚* \`BIENVENIDO/A\` *୧ֹ˖ ⑅ ࣪⊹*\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n‧₊˚✰ *Grupo:* ${metadata.subject}\n‧₊˚ꕤ *Usuario:* @${userJid.split('@')[0]}\n\n‧₊˚❀ *Mensaje:*\n\n   ${welcomeText}`
    
    await conn.sendMessage(from, { image: buffer, caption: finalMsg, mentions: [userJid] })
}
break

case 'testbye': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    const chat = global.db.data.chats[from] || {}
    const metadata = await conn.groupMetadata(from)
    let userJid = sender
    let userName = await conn.getName(userJid)
    let pp = 'https://cdn.russellxz.click/23c6f81a.jpg'
    try { pp = await conn.profilePictureUrl(userJid, 'image') } catch (e) {}
    
    const { createBye } = await import('./lib/bye.js')
    const buffer = await createBye(userName, metadata.subject, metadata.participants.length, pp)
    
    let byeText = chat.sBye || `Un miembro ha dejado el grupo.`
    let finalMsg = `*✧ ‧₊˚* \`DESPEDIDA\` *୧ֹ˖ ⑅ ࣪⊹*\n⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n‧₊˚✰ *Grupo:* ${metadata.subject}\n‧₊˚ꕤ *Usuario:* @${userJid.split('@')[0]}\n\n‧₊˚❀ *Mensaje:*\n\n   ${byeText}`
    
    await conn.sendMessage(from, { image: buffer, caption: finalMsg, mentions: [userJid] })
}
break

case 'brat': {
    if (!text) return reply(`ꕤ Por favor, escribe el texto para tu sticker Brat.`);

    try {
        const { makeBrat } = await import('./lib/brat.js');
        const buffer = await makeBrat(text);

        const userPack = global.db.data.users[sender]?.stickerPack || global.packname
const userAuthor = global.db.data.users[sender]?.stickerAuthor || global.dev

const sticker = new Sticker(buffer, {
    pack: userPack,
    author: userAuthor,
    type: StickerTypes.FULL,
    categories: ['🤩', '🎉'],
    quality: 70,
    background: 'transparent'
});

        const stickerBuffer = await sticker.toBuffer();
        await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });

    } catch (e) {
        reply(`⚠︎ Error al generar brat: ${e.message}`);
    }
}
break 

case 'bratvid': {
    if (!text) return reply(`ꕤ Escribe el texto.`);
    try {
        const { makeBratVid } = await import('./lib/bratvid.js');
        const id = Date.now().toString();
        const webpPath = await makeBratVid(text, id);
        const buffer = fs.readFileSync(webpPath);

        const userPack = global.db.data.users[sender]?.stickerPack || global.packname
        const userAuthor = global.db.data.users[sender]?.stickerAuthor || global.dev

        const sticker = new Sticker(buffer, {
            pack: userPack,
            author: userAuthor,
            type: StickerTypes.FULL,
            quality: 70
        });

        const stickerBuffer = await sticker.toBuffer();
        await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });

        fs.unlinkSync(webpPath);
    } catch (e) {
        reply(`⚠︎ Error: ${e.message}`);
    }
}
break
                 
                        case 's': case 'sticker': {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const isImage = msg.message?.imageMessage || quoted?.imageMessage
        const isVideo = msg.message?.videoMessage || quoted?.videoMessage
        const isSticker = msg.message?.stickerMessage || quoted?.stickerMessage

        if (!isImage && !isVideo && !isSticker) {
            return reply(`ꕤ Debes enviar o responder a una imagen, video o sticker.`)
        }

        if (isVideo) {
            const duration = msg.message?.videoMessage?.seconds || quoted?.videoMessage?.seconds
            if (duration > 15) {
                return reply(`⚠︎ El video es demasiado largo. El límite para stickers es de 15 segundos.`)
            }
        }

        const messageToDownload = quoted ? { message: quoted } : msg
        
        const buffer = await downloadMediaMessage(
            messageToDownload,
            'buffer',
            {},
            { logger: P({ level: 'silent' }), reuploadRequest: conn.updateMediaMessage }
        )

        const userPack = global.db.data.users[sender]?.stickerPack || global.packname
const userAuthor = global.db.data.users[sender]?.stickerAuthor || global.dev

const sticker = new Sticker(buffer, {
    pack: userPack,
    author: userAuthor,
    type: StickerTypes.FULL,
    categories: ['🤩', '🎉'],
    quality: 80,
    background: 'transparent'
})

        const stickerBuffer = await sticker.toBuffer()
        await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg })

    } catch (e) {
        reply(`⚠︎ Error: ${e.message}`)
    }
}
break

                case 'setmeta': {
    if (!text) return reply(`₊˚✰ *Uso:* ${usedPrefix}setmeta <pack> / <author>\n‧₊˚✰ *Ejemplo:* ${usedPrefix}setmeta ${global.db.data.users[sender]?.stickerPack || global.packname} / ${global.db.data.users[sender]?.stickerAuthor || global.dev}`)
    
    const parts = text.split(/[/|•]/).map(p => p.trim())
    
    if (parts.length >= 2) {
        const [pack, author] = parts
        
        if (!pack || !author) return reply('ꕤ Ambos campos son requeridos.')

        if (!global.db.data.users[sender]) {
            global.db.data.users[sender] = {}
        }
        
        global.db.data.users[sender].stickerPack = pack.substring(0, 30)
        global.db.data.users[sender].stickerAuthor = author.substring(0, 30)
        await global.db.write()
        
        reply(`✰ Metadatos de stickers actualizados:\n‧₊˚✰ *Pack:* ${pack}\n‧₊˚✰ *Autor:* ${author}`)
    } else {
        reply('ꕤ Formato incorrecto. Usa: pack / author')
    }
}
break

                       case 'antiprivado': case 'antipriv': case 'antiprivy': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    
    if (!global.db.data.settings[conn.user.jid]) global.db.data.settings[conn.user.jid] = {}
    let settings = global.db.data.settings[conn.user.jid]
    
    if (args[0] === 'on') {
        if (settings.antiprivado === true) return reply('ꕤ El *Modo Anti-Privado* ya estaba activado.')
        settings.antiprivado = true
        await global.db.write()
        reply(`ꕤ *Modo Anti-Privado: ON*\nEl bot ya no responderá en privados, excepto al Owner y al comando`)
    } else if (args[0] === 'off') {
        if (settings.antiprivado === false) return reply('ꕤ El *Modo Anti-Privado* ya estaba desactivado.')
        settings.antiprivado = false
        await global.db.write()
        reply('ꕤ *Modo Anti-Privado: OFF*\nEl bot ahora responderá en privados a todos.')
    } else {
        reply(`ꕤ Uso: *${usedPrefix}antiprivado on/off*`)
    }
}
break

                  case 'onlyowner': case 'modowner': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    
    if (!global.db.data.settings[conn.user.jid]) global.db.data.settings[conn.user.jid] = {}
    const currentStatus = global.db.data.settings[conn.user.jid].onlyowner || false
    
    if (args[0] === 'on') {
        if (currentStatus === true) {
            reply('ꕤ *Modo OnlyOwner:* YA estaba activado.')
        } else {
            global.db.data.settings[conn.user.jid].onlyowner = true
            reply('ꕤ *Modo OnlyOwner: ON*\nAhora solo responderé a mis dueños.')
        }
    } else if (args[0] === 'off') {
        if (currentStatus === false) {
            reply('ꕤ *Modo OnlyOwner:* YA estaba desactivado.')
        } else {
            global.db.data.settings[conn.user.jid].onlyowner = false
            reply('ꕤ *Modo OnlyOwner: OFF*\nAhora responderé a todos los usuarios.')
        }
    } else {
        reply('ꕤ Opción inválida. Usa *on* o *off*.')
    }
}
break      
                        
                case 'ytdl': case 'mp3': case 'yta': case 'ytaudio': case 'play': case 'ytmp3': 
case 'ytdl2': case 'mp4': case 'ytv': case 'play2': case 'ytmp4': {
    const text = args.join(" ")
    if (!text) return reply(`ꕤ Por favor, ingresa el nombre o link de YouTube.`)
    
    const isAudio = ['mp3', 'yta', 'ytaudio', 'play', 'ytdl', 'ytmp3'].includes(command)
    const cacheKey = `yt:${isAudio ? 'audio' : 'video'}:${text.toLowerCase()}`
    
    if (!global.ytCache) global.ytCache = {}
    
    if (global.ytCache[cacheKey] && Date.now() - global.ytCache[cacheKey].timestamp < 3600000) {
        const cached = global.ytCache[cacheKey]
        await conn.sendMessage(from, { image: { url: cached.thumbnail }, caption: cached.infoText }, { quoted: msg })
        
        if (isAudio) {
            
            await conn.sendMessage(from, { 
                audio: cached.audioData, 
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: msg })
        } else {
            await conn.sendMessage(from, { 
                video: { url: cached.download }, 
                caption: `> ✰ ${cached.title}`, 
                mimetype: 'video/mp4', 
                fileName: `${cleanFileName(cached.title)}.mp4` 
            }, { quoted: msg })
        }
        return
    }
    
    try {
        const search = await yts({ query: text, pages: 1 })
        const video = search.videos[0]
        if (!video) return reply(`✰ No se encontraron resultados.`)
        
        let infoText = `*✧ ‧₊˚* \`YOUTUBE ${isAudio ? 'AUDIO' : 'VIDEO'}\` *୧ֹ˖ ⑅ ࣪⊹*\n`
        infoText += `⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹\n`
        infoText += `› ✰ *Título:* ${video.title}\n`
        infoText += `› ✿ *Canal:* ${video.author.name}\n`
        infoText += `› ✦ *Duración:* ${video.timestamp}\n`
        if (isAudio) infoText += `› ❀ *Calidad:* 128kbps\n`
        infoText += `› ꕤ *Vistas:* ${formatViews(video.views)}\n`
        infoText += `› ❖ *Link:* _${video.url}_`
        
        await conn.sendMessage(from, { image: { url: video.thumbnail }, caption: infoText }, { quoted: msg })
        
        let result
        let attempts = 0
        const maxAttempts = 3

        while (attempts < maxAttempts) {
            result = await raceWithFallback(video.url, isAudio, video.title)
            if (result && result.download && !String(result.download).includes('Processing')) {
                break
            }
            attempts++
            if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 3500))
        }

        if (!result || !result.download || String(result.download).includes('Processing')) {
            return reply(`✰ El servidor sigue procesando el archivo. Por favor, intenta de nuevo el comando en un momento.`)
        }

        if (isAudio) {
            const response = await axios.get(result.download, { responseType: 'arraybuffer' })
            const audioData = Buffer.from(response.data)
            
            
            const tempDir = './temp'
            if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

            const inputFile = join(tempDir, `${Date.now()}_input.mp4`)
            const outputFile = join(tempDir, `${Date.now()}_output.mp3`)
            
            writeFileSync(inputFile, audioData)
            
            
            try {
                await execPromise(`ffmpeg -i "${inputFile}" -vn -c:a libmp3lame -b:a 128k -ar 44100 -ac 2 "${outputFile}" -y`)
                
                if (!existsSync(outputFile)) {
                    
                    await conn.sendMessage(from, { 
                        audio: audioData, 
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: msg })
                } else {
                    const processedAudio = readFileSync(outputFile)
                    
                    global.ytCache[cacheKey] = {
                        timestamp: Date.now(),
                        thumbnail: video.thumbnail,
                        infoText: infoText,
                        audioData: processedAudio,
                        title: video.title,
                        download: result.download
                    }
                    
                    await conn.sendMessage(from, { 
                        audio: processedAudio, 
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: msg })
                    
            
                    if (existsSync(inputFile)) unlinkSync(inputFile)
                    if (existsSync(outputFile)) unlinkSync(outputFile)
                }
                
            } catch (e) {
                console.error('Error en conversión:', e)
         
                await conn.sendMessage(from, { 
                    audio: audioData, 
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: msg })
                
                if (existsSync(inputFile)) unlinkSync(inputFile)
                if (existsSync(outputFile)) unlinkSync(outputFile)
            }
            
        } else {
         
            global.ytCache[cacheKey] = {
                timestamp: Date.now(),
                thumbnail: video.thumbnail,
                infoText: infoText,
                title: video.title,
                download: result.download
            }
            
            await conn.sendMessage(from, { 
                video: { url: result.download }, 
                caption: `> ✰ ${video.title}`, 
                mimetype: 'video/mp4', 
                fileName: `${cleanFileName(video.title)}.mp4` 
            }, { quoted: msg })
        }
    } catch (e) {
        console.error(e)
        reply(`⚠︎ Error: ${e.message}`)
    }
}
break

     case 'pinterest': case 'pin': {
    const text = args.join(" ") 
    if (!text) return reply(`ꕤ Por favor, ingresa lo que deseas buscar por Pinterest.`)
    
    try {
        if (text.includes("https://")) {
            let i = await dlPin(args[0])
            let isVideo = i.download?.includes(".mp4")
            await conn.sendMessage(from, { [isVideo ? "video" : "image"]: { url: i.download }, caption: i.title }, { quoted: msg })
        } else {
            const results = await pins(text) 
            if (!results || results.length === 0) return reply(`✰ No se encontraron resultados for "${text}".`)
            
            const selectedImage = results[Math.floor(Math.random() * results.length)]
            const pinInfo = await getPinInfo(selectedImage)
            
            const caption = `\`PINTEREST DL\`
⊹ ₊˚ ‧︵‿୨୧‿︵‧ ˚₊ ⊹
› ✰ *Tema:* ${text}
› ✦ *Título:* ${pinInfo.title || 'Sin título'}
› ꕤ *Autor:* ${pinInfo.user || 'Desconocido'}
› ❖ *Tablero:* ${pinInfo.board || 'N/A'}
› ✧ *Enlace:* _${pinInfo.link || '#'}_`

            await conn.sendMessage(from, { 
                image: { url: selectedImage.image_large_url }, 
                caption: caption 
            }, { quoted: msg })
        }
    } catch (e) {
        reply(`⚠︎ Error: ${e.message}`)
    }
}
break


                    case 'ping': case 'p': {
    const inicio = performance.now();
    
    const msg = await conn.sendMessage(from, { text: '*Calculando..*' });
    
    const fin = performance.now();
    let latenciaReal = Math.floor(fin - inicio);
    let latenciaFicticia;

    if (latenciaReal > 100) {
        latenciaFicticia = Math.floor(latenciaReal / 10.5); 
    } else {
        latenciaFicticia = latenciaReal;
    }

    if (latenciaFicticia < 5) latenciaFicticia = Math.floor(Math.random() * (15 - 5) + 5);

    await conn.sendMessage(from, { 
        text: `✰ *Lactancia:* \`${latenciaFicticia} ms\``, 
        edit: msg.key 
    });
    break;
}


                  case 'status': {
    const inicio = performance.now()
    const uptime = process.uptime()
    const h = Math.floor(uptime / 3600)
    const m = Math.floor((uptime % 3600) / 60)
    const s = Math.floor(uptime % 60)
    
    const formatMem = (bytes) => {
        const mb = bytes / 1024 / 1024
        return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`
    }
    
    const mem = process.memoryUsage()
    const freeRam = os.freemem()
    const totalRam = os.totalmem()
    const cpu = os.cpus()[0]
    
    const statusMsg = `✧ ‧₊˚ *ESTADO DE* \`${global.botName.toUpperCase()}\`

\`⊹ RECURSOS DEL SISTEMA\`
‧₊˚✰ *RAM en uso:* ${formatMem(mem.heapUsed)}
‧₊˚✰ *RAM total:* ${formatMem(totalRam)}
‧₊˚✰ *CPU (x${os.cpus().length}):* ${cpu.model.trim()}
‧₊˚✰ *Node.js:* ${process.version}

\`⊹ ESTADÍSTICAS DEL BOT\`
‧₊˚✰ *Tiempo activo:* ${h}h ${m}m ${s}s
‧₊˚✰ *Usuarios:* ${Object.keys(global.db.data?.users || {}).length}
‧₊˚✰ *Grupos:* ${Object.keys(global.db.data?.chats || {}).length}

\`⊹ INFORMACIÓN DEL HOST\`
‧₊˚✰ *Procesador:* ${cpu.speed} MHz
‧₊˚✰ *Memoria libre:* ${formatMem(freeRam)}
‧₊˚✰ *Latencia:* ${(performance.now() - inicio).toFixed(0)} ms

⋆.˚ ૮꒰ ˶• ᴗ •˶꒱ა Sistema operando correctamente ˚.⋆`

    await conn.sendMessage(from, { 
        image: { url: global.banner }, 
        caption: statusMsg,
        mentions: [sender]
    }, { quoted: msg, adReply: true })
    break
}

case 'setcoin': case 'setmoneda': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    if (!text) return reply(`ꕤ Por favor, ingresa el nuevo nombre para la moneda.`)
    
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    
    configContent = configContent.replace(/global\.currency\s*=\s*['"].*?['"]/, `global.currency = '${text}'`)
    
    fs.writeFileSync(configPath, configContent)
    global.currency = text
    reply(`✰ Moneda actualizada y guardada: *${global.currency}*`)
}
break

case 'setdev': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    if (!text) return reply(`ꕤ Por favor, ingresa el nuevo nombre de desarrollador.`)
    
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    
    configContent = configContent.replace(/global\.dev\s*=\s*['"].*?['"]/, `global.dev = '${text}'`)
    
    fs.writeFileSync(configPath, configContent)
    global.dev = text
    reply(`✰ Desarrollador actualizado y guardado: *${global.dev}*`)
}
break

case 'setname': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    if (!text) return reply(`ꕤ Por favor, ingresa el nombre para el bot.`)
    
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    
    configContent = configContent.replace(/global\.botName\s*=\s*['"].*?['"]/, `global.botName = '${text}'`)
    
    fs.writeFileSync(configPath, configContent)
    global.botName = text
    reply(`✰ Nombre actualizado y guardado: *${global.botName}*`)
}
break

case 'setprefix': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    if (!text) return reply(`ꕤ Por favor, ingresa el nuevo prefijo.`)
    
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    
    const hasCommas = text.includes(',')
    
    let prefixesArray
    let responseMessage
    
    if (hasCommas) {
        prefixesArray = text.split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
        
        const escapedPrefixes = prefixesArray.map(p => p.replace(/'/g, "\\'"))
        const formattedPrefixes = escapedPrefixes.map(p => `'${p}'`).join(', ')
        
        configContent = configContent.replace(
            /global\.prefix\s*=\s*\[.*?\]/s, 
            `global.prefix = [${formattedPrefixes}]`
        )
        
        responseMessage = `✰ Prefijos actualizados y guardados: ${prefixesArray.map(p => `*${p}*`).join(', ')}`
    } else {
        const singlePrefix = text.trim()
        prefixesArray = [singlePrefix]
        
        const escapedPrefix = singlePrefix.replace(/'/g, "\\'")
        
        configContent = configContent.replace(
            /global\.prefix\s*=\s*\[.*?\]/s, 
            `global.prefix = ['${escapedPrefix}']`
        )
        
        responseMessage = `✰ Prefijo actualizado y guardado: *${singlePrefix}*`
    }
    
    fs.writeFileSync(configPath, configContent)
    global.prefix = prefixesArray
    reply(responseMessage)
}
break

case 'setbanner': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    let link = text || (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation)
    if (!link || !link.startsWith('http')) return reply(`ꕤ Ingresa un enlace de imagen válido.`)
    
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    
    configContent = configContent.replace(/global\.banner\s*=\s*['"].*?['"]/, `global.banner = '${link}'`)
    
    fs.writeFileSync(configPath, configContent)
    global.banner = link
    reply(`✰ Banner actualizado y guardado correctamente.`)
}
break

case 'ban': case 'banuser': {
    if (!global.owner.some(o => sender.includes(o[0])) && !isMod) return reply(global.isModMsg)
    let who = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : null)
    
    if (!who) return reply('ꕤ Etiqueta o responde al mensaje del usuario que deseas banear.')
    if (global.owner.some(o => who.includes(o[0]))) return reply('✰ No puedes banear a un Owner.')
    
    if (!global.db.data.users[who]) global.db.data.users[who] = { banned: false }
    global.db.data.users[who].banned = true
    
    await global.db.write()
    
    await conn.sendMessage(from, { text: `*✧ ‧₊˚* \`USUARIO BANEADO\` *୧ֹ˖ ⑅ ࣪⊹*\n\nEl usuario @${who.split('@')[0]} ya no podrá usar el bot.`, mentions: [who] }, { quoted: msg })
}
break

case 'unban': case 'desbanear': {
    if (!global.owner.some(o => sender.includes(o[0])) && !isMod) return reply(global.isModMsg)
    
    let who = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
              msg.message?.extendedTextMessage?.contextInfo?.participant || 
              (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : null)
    
    if (!who) return reply('ꕤ Etiqueta o responde al mensaje del usuario para desbanear.')
    
    if (global.db.data.users[who]) {
        global.db.data.users[who].banned = false
        global.db.data.users[who].lastBannedNotice = 0
        
        await global.db.write() 
    }
    
    await conn.sendMessage(from, { 
        text: `*✧ ‧₊˚* \`USUARIO DESBANEADO\` *୧ֹ˖ ⑅ ࣪⊹*\n\nEl usuario @${who.split('@')[0]} ha recuperado el acceso al bot.`, 
        mentions: [who] 
    }, { quoted: msg })
}
break

case 'banlist': {
    if (!global.owner.some(o => sender.includes(o[0])) && !isMod) return reply(global.isModMsg)
    let list = Object.entries(global.db.data.users).filter(v => v[1].banned)
    if (list.length === 0) return reply('ꕤ No hay usuarios baneados actualmente.')
    
    let text = `*✧ ‧₊˚* \`LISTA DE BANEADOS\` *୧ֹ˖ ⑅ ࣪⊹*\n\n`
    for (let [jid, data] of list) {
        text += `‧₊˚✰ @${jid.split('@')[0]}\n`
    }
    await conn.sendMessage(from, { text, mentions: list.map(v => v[0]) }, { quoted: msg })
}
break

case 'rname': case 'restartname': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    configContent = configContent.replace(/global\.botName\s*=\s*['"].*?['"]/, `global.botName = 'Neko Delta'`)
    fs.writeFileSync(configPath, configContent)
    global.botName = 'Neko Delta'
    reply(`✰ Nombre del bot restablecido a: *${global.botName}*`)
}
break

case 'restartbanner': case 'rbanner': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    configContent = configContent.replace(/global\.banner\s*=\s*['"].*?['"]/, `global.banner = 'https://cdn.russellxz.click/6f6958ec.jpg'`)
    fs.writeFileSync(configPath, configContent)
    global.banner = 'https://cdn.russellxz.click/6f6958ec.jpg'
    reply(`✰ Banner restablecido con éxito.`)
}
break

case 'rprefix': case 'restartprefix': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    const defaultPrefix = '["7", "D/", "D:", "d:", "d/", "root@", "delta@", "cmd:"]'
    configContent = configContent.replace(/global\.prefix\s*=\s*\[.*\]/, `global.prefix = ${defaultPrefix}`)
    fs.writeFileSync(configPath, configContent)
    global.prefix = ["7", "D/", "D:", "d:", "d/", "root@", "delta@", "cmd:"]
    reply(`✰ Prefijos restablecidos a sus valores predeterminados.`)
}
break

case 'restartcoin': case 'restartmoneda': case 'rmoneda': case 'rcoin': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    const configPath = join(__dirname, 'config.js')
    let configContent = fs.readFileSync(configPath, 'utf8')
    configContent = configContent.replace(/global\.currency\s*=\s*['"].*?['"]/, `global.currency = 'Stars'`)
    fs.writeFileSync(configPath, configContent)
    global.currency = 'Nekoins'
    reply(`✰ Moneda restablecida a: *${global.currency}*`)
}
break

        case 'addmod': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    let who = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (msg.message?.extendedTextMessage?.contextInfo?.participant) || (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : null)
    if (!who) return reply(`ꕤ Etiqueta a la persona que será moderador.`)
    if (global.db.data.mods.includes(who)) return reply(`✰ El usuario ya es moderador.`)
    global.db.data.mods.push(who)
    await conn.sendMessage(from, { text: `✰ @${who.split('@')[0]} ahora tiene permisos de moderador.`, mentions: [who] }, { quoted: msg })
}
break

case 'delmod': {
    if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
    let who = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (msg.message?.extendedTextMessage?.contextInfo?.participant) || (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : null)
    if (!who) return reply(`ꕤ Etiqueta a la persona para quitarle el moderador.`)
    if (!global.db.data.mods.includes(who)) return reply(`✰ El usuario no es moderador.`)
    global.db.data.mods = global.db.data.mods.filter(m => m !== who)
    await conn.sendMessage(from, { text: `✰ @${who.split('@')[0]} ya no es moderador.`, mentions: [who] }, { quoted: msg })
}
break

case 'mods': case 'modlist': {
    if (global.db.data.mods.length === 0) return reply('✰ No hay moderadores asignados.')
    let list = `*✧ ‧₊˚* \`LISTA DE MODERADORES\` *୧ֹ˖ ⑅ ࣪⊹*\n\n`
    global.db.data.mods.forEach((m, i) => {
        list += `‧₊˚✰ ${i + 1}. @${m.split('@')[0]}\n`
    })
    await conn.sendMessage(from, { text: list, mentions: global.db.data.mods }, { quoted: msg })
}
break

                    case 'update': case 'up':
                        if (!global.owner.some(o => sender.includes(o[0]))) return reply(global.isOwnerMsg)
                        await reply('Reiniciando sistema...')
                        process.exit(0)
                        break

                  default:
    const react = reaccionesData[command]
    if (react) {
        const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        const quotedParticipant = msg.message.extendedTextMessage?.contextInfo?.participant
        const userId = mentionedJid || quotedParticipant || sender
        
        const userFrom = pushName 
        const userWho = userId === sender ? userFrom : (global.db.data.users[userId]?.name || 'Usuario')
        
        const isSelf = userId === sender
        const phrases = isSelf ? react.self : react.target
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)]
        
        const finalCaption = randomPhrase
            .replace(/%from%/g, userFrom)
            .replace(/%who%/g, userWho)

        try {
            const res = await axios.get(`https://api.delirius.store/search/tenor?q=${encodeURIComponent(react.query)}`)
            const gif = res.data.data[Math.floor(Math.random() * res.data.data.length)].mp4
            
            await conn.sendMessage(from, { 
                video: { url: gif }, 
                caption: finalCaption, 
                gifPlayback: true, 
                mentions: [userId, sender]
            }, { quoted: msg })
            
        } catch (e) {
            console.error(e)
        }
   }
else {
    reply(`Comando no encontrado: *${command}*\n\nUsa *${usedPrefix}help* para ver los comandos disponibles`)
}
break
                        
    case 'antilink': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    const groupMetadata = await conn.groupMetadata(from)
    const isUserAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin !== null
    if (!isUserAdmin) return reply(global.isAdminMsg)
    
    if (!global.db.data.chats[from]) global.db.data.chats[from] = { antilink: false }
    const currentStatus = global.db.data.chats[from].antilink
    const action = args[0]?.toLowerCase()
    
    if (action === 'on') {
        if (currentStatus === true) {
            reply('✰ El *Antilink* ya estaba activado.')
        } else {
            global.db.data.chats[from].antilink = true
            reply('✰ El *Antilink* ha sido activado con éxito.')
        }
    } else if (action === 'off') {
        if (currentStatus === false) {
            reply('✰ El *Antilink* ya estaba desactivado.')
        } else {
            global.db.data.chats[from].antilink = false
            reply('✰ El *Antilink* ha sido desactivado.')
        }
    } else {
        reply(`ꕤ Uso correcto:\n> *${prefix + command} on*\n> *${prefix + command} off*`)
    }
}
break

case 'open': case 'abrir': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants
    const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net'
    const isUserAdmin = participants.find(p => p.id === sender)?.admin !== null
    const isBotAdmin = participants.find(p => p.id === botNumber)?.admin !== null

    if (!isUserAdmin) return reply(global.isAdminMsg)
    if (!isBotAdmin) return reply(global.isBotAdminMsg)

    await conn.groupSettingUpdate(from, 'not_announcement')
    reply('✰ El grupo ha sido *abierto*. Ahora todos pueden enviar mensajes.')
}
break

case 'close': case 'cerrar': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants
    const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net'
    const isUserAdmin = participants.find(p => p.id === sender)?.admin !== null
    const isBotAdmin = participants.find(p => p.id === botNumber)?.admin !== null

    if (!isUserAdmin) return reply(global.isAdminMsg)
    if (!isBotAdmin) return reply(global.isBotAdminMsg)

    await conn.groupSettingUpdate(from, 'announcement')
    reply('✰ El grupo ha sido *cerrado*. Ahora solo los administradores pueden enviar mensajes.')
}
break

case 'del': case 'delete': case 'borrar': {
    if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return reply('ꕤ Responde al mensaje que deseas eliminar.')
    }

    const isGroup = from.endsWith('@g.us')
    const groupMetadata = isGroup ? await conn.groupMetadata(from) : null
    const participants = isGroup ? groupMetadata.participants : []
    const botNumber = decodeJid(conn.user.id)
    
    const isUserAdmin = isGroup ? participants.find(p => p.id === sender)?.admin !== null : false
    const isBotAdmin = isGroup ? participants.find(p => p.id === botNumber)?.admin !== null : false
    const isOwner = global.owner.some(o => sender.includes(o[0]))

    if (isGroup && !isUserAdmin && !isOwner && !isMod) {
        return reply(global.isAdminMsg)
    }

    const key = {
        remoteJid: from,
        fromMe: msg.message.extendedTextMessage.contextInfo.participant === botNumber,
        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
        participant: msg.message.extendedTextMessage.contextInfo.participant
    }

    try {
        await conn.sendMessage(from, { delete: key })
    } catch (e) {
        if (isGroup && !isBotAdmin) {
            return reply('ꕤ Necesito ser administrador para borrar mensajes de otros.')
        }
        reply('⚠︎ No pude eliminar el mensaje.')
    }
}
break

case 'kick': case 'sacar': case 'eliminar': {
    if (!from.endsWith('@g.us')) return reply(global.isGroupMsg)
    const groupMetadata = await conn.groupMetadata(from)
    const participants = groupMetadata.participants
    const botNumber = decodeJid(conn.user.id)
    const isUserAdmin = participants.find(p => p.id === sender)?.admin !== null
    const isBotAdmin = participants.find(p => p.id === botNumber)?.admin !== null
    const groupOwner = groupMetadata.owner || from.split('-')[0] + '@s.whatsapp.net'

    if (!isUserAdmin) return reply(global.isAdminMsg)
    if (!isBotAdmin) return reply(global.isBotAdminMsg)

    let user = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || (q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
    
    if (!user) return reply('ꕤ Etiqueta o responde al mensaje de quien quieras eliminar.')

    if (user === botNumber) return reply('✰ No puedo eliminarme a mí misma del grupo.')
    if (user === sender) return reply('✰ No puedes eliminarte a ti mismo.')
    if (user === groupOwner) return reply('✰ No puedo eliminar al creador del grupo.')
    
    try {
        await conn.groupParticipantsUpdate(from, [user], 'remove')
    } catch (e) {
        reply(global.error)
    }
}
break
            }
        }
    } catch (err) { 
        console.error('Error en processMessage:', err) 
    }
    messageCache.set(msgId, Date.now())
}

    conn.ev.on('connection.update', (u) => {
    if (u.connection === 'open') {
        console.log(chalk.white(' SHIROKO ONLINE '))
    }
    
    if (u.connection === 'close') {
        const statusCode = new Boom(u.lastDisconnect?.error)?.output?.statusCode
        console.log(chalk.white('Desconectado - Código:', statusCode))
        
        if (statusCode !== DisconnectReason.loggedOut) {
            console.log(chalk.cyan('Reconectando en 3 segundos...'))
            setTimeout(() => startBot(), 3000)
        } else {
            console.log(chalk.white('Sesión cerrada. Borrando carpeta sessions...'))
            
            const sessionsDir = './sessions'
            if (fs.existsSync(sessionsDir)) {
                try {
                    fs.rmSync(sessionsDir, { recursive: true, force: true })
                    console.log(chalk.green('Carpeta sessions eliminada'))
                } catch (e) {
                    console.log(chalk.red('Error borrando sessions:', e.message))
                }
            }
            
            console.log(chalk.yellow('Reinicia el bot manualmente'))
            process.exit(0)
        }
    }
})

async function getPinInfo(imageData) {
    try {
        if (imageData.pinner) {
            return {
                user: `*${imageData.pinner.full_name || imageData.pinner.username}*`,
                title: `*${imageData.title || imageData.grid_title || 'Sin título'}*`,
                board: `*${imageData.board?.name || 'Tablero no disponible'}*`,
                link: imageData.url || `https://pinterest.com/pin/${imageData.id}/`
            }
        }
        return {
            user: '*Información no disponible*',
            title: '*Sin título*',
            board: '*Tablero no disponible*',
            link: '#'
        }
    } catch (error) {
        return {
            user: '*Información no disponible*',
            title: '*Sin título*',
            board: '*Tablero no disponible*',
            link: '#'
        }
    }
}

function formatViews(v) {
    if (!v) return "0"
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "B"
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"
    if (v >= 1e3) return (v / 1e3).toFixed(1) + "K"
    return v.toString()
}


async function dlPin(url) {
    try {
        let res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }).catch(e => e.response)
        let $ = cheerio.load(res.data)
        let tag = $('script[data-test-id="video-snippet"]')
        if (tag.length) {
            let result = JSON.parse(tag.text())
            return {
                title: result.name,
                download: result.contentUrl
            }
        } else {
            let json = JSON.parse($("script[data-relay-response='true']").eq(0).text())
            let result = json.response.data["v3GetPinQuery"].data
            return {
                title: result.title,
                download: result.imageLargeUrl
            }
        }
    } catch {
        return { msg: "Error" }
    }
}


const pins = async (judul) => {
    const link = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(judul)}%26rs%3Dtyped&data=%7B%22options%22%3A%7B%22applied_unified_filters%22%3Anull%2C%22appliedProductFilters%22%3A%22---%22%2C%22article%22%3Anull%2C%22auto_correction_disabled%22%3Afalse%2C%22corpus%22%3Anull%2C%22customized_rerank_type%22%3Anull%2C%22domains%22%3Anull%2C%22dynamicPageSizeExpGroup%22%3A%22control%22%2C%22filters%22%3Anull%2C%22journey_depth%22%3Anull%2C%22page_size%22%3Anull%2C%22price_max%22%3Anull%2C%22price_min%22%3Anull%2C%22query_pin_sigs%22%3Anull%2C%22query%22%3A%22${encodeURIComponent(judul)}%22%2C%22redux_normalize_feed%22%3Atrue%2C%22request_params%22%3Anull%2C%22rs%22%3A%22typed%22%2C%22scope%22%3A%22pins%22%2C%22selected_one_bar_modules%22%3Anull%2C%22seoDrawerEnabled%22%3Afalse%2C%22source_id%22%3Anull%2C%22source_module_id%22%3Anull%2C%22source_url%22%3A%22%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(judul)}%26rs%3Dtyped%22%2C%22top_pin_id%22%3Anull%2C%22top_pin_ids%22%3Anull%7D%2C%22context%22%3A%7B%7D%7D`
    
    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'priority': 'u=1, i',
        'referer': 'https://id.pinterest.com/',
        'screen-dpr': '1',
        'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133")',
        'sec-ch-ua-full-version-list': '"Not(A:Brand";v="99.0.0.0", "Google Chrome";v="133.0.6943.142", "Chromium";v="133.0.6943.142")',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-platform-version': '"10.0.0"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'x-app-version': 'c056fb7',
        'x-pinterest-appstate': 'active',
        'x-pinterest-pws-handler': 'www/index.js',
        'x-pinterest-source-url': '/',
        'x-requested-with': 'XMLHttpRequest'
    }
    
    try {
        const res = await axios.get(link, { headers })
        if (res.data && res.data.resource_response && res.data.resource_response.data && res.data.resource_response.data.results) {
            return res.data.resource_response.data.results.map(item => {
                if (item.images) {
                    return {
                        image_large_url: item.images.orig?.url || null,
                        pinner: item.pinner,
                        title: item.title,
                        board: item.board,
                        id: item.id,
                        url: item.url
                    }
                }
                return null
            }).filter(img => img !== null)
        }
        return []
    } catch (error) {
        console.error('Error:', error)
        return []
    }
}

const waitForGroupSync = async (conn, jid) => {
    return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
            try {
                await conn.groupMetadata(jid)
                clearInterval(checkInterval)
                resolve(true)
            } catch (e) {
            }
        }, 500)
        
        setTimeout(() => {
            clearInterval(checkInterval)
            resolve(false)
        }, 10000)
    })
}

}

startBot()