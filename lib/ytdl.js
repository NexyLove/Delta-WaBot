import axios from "axios"
import crypto from "crypto"
import { promises as fs } from 'fs'
import path from 'path'

const git = ['git+https://github.com/NexyLove/Delta-WaBot'];

async function verificarRepo() {
    try {
        const jsonPath = path.join(process.cwd(), 'package.json');
        const contenido = await fs.readFile(jsonPath, 'utf-8');
        const packageJson = JSON.parse(contenido);
        const repoUrl = packageJson.repository?.url || packageJson.homepage;
        return git.some(url => repoUrl?.includes(url));
    } catch { return true; } 
}

function colorize(text, isError = false) {
    const codes = { reset: '\x1b[0m', bright: '\x1b[1m', fg: { cyan: '\x1b[36m', red: '\x1b[31m', white: '\x1b[37m' } };
    let prefix = '', colorCode = codes.fg.cyan;
    if (text.startsWith('[BUSCANDO]')) prefix = 'ꕤ [BUSCANDO]';
    else if (text.startsWith('[ENVIADO]')) prefix = '✰ [ENVIADO]';
    else if (isError || text.startsWith('[ERROR]')) { prefix = 'ꕤ [ERROR]'; colorCode = codes.fg.red; }
    else return `${codes.fg.white}${text}${codes.reset}`;
    const body = text.substring(text.indexOf(']') + 1).trim();
    return `${colorCode}${codes.bright}${prefix}${codes.fg.white}${codes.reset} ${body}`;
}

async function bypassCloudflare(url, siteKey) {
    try {
        const { data } = await axios.get(`https://anabot.my.id/api/tools/bypass?url=${encodeURIComponent(url)}&siteKey=${encodeURIComponent(siteKey)}&type=turnstile-min&proxy=&apikey=freeApikey`, { timeout: 8000 });
        return data;
    } catch { return { success: false }; }
}

const motorAudio = {
    download: async (videoUrl) => {
        try {
            const cf = await bypassCloudflare('https://ezconv.cc', '0x4AAAAAAAi2NuZzwS99-7op');
            if (!cf.success || !cf.data?.result?.token) return null;

            const { data } = await axios.post('https://ds1.ezsrv.net/api/convert', {
                url: videoUrl, quality: '320', trim: false, startT: 0, endT: 0, captchaToken: cf.data.result.token
            }, { timeout: 12000 });

            return data.status === 'done' ? { download: data.url, title: data.title } : null;
        } catch { return null; }
    }
};

const motorVideo = {
    download: async (url) => {
        try {
            const SHIRU_BASE = 'https://shiru.up.railway.app';
            const { data: info } = await axios.post(`${SHIRU_BASE}/api/video/info`, { url }, { timeout: 8000 });
            if (!info.download_id) return null;

            for (let i = 0; i < 10; i++) { // Polling rápido de 10s
                const { data: prog } = await axios.get(`${SHIRU_BASE}/progress/${info.download_id}`, { timeout: 5000 });
                if (prog.progress === "dl" && prog.download_url) {
                    let dlUrl = prog.download_url.startsWith('/') ? `${SHIRU_BASE}${prog.download_url}` : prog.download_url;
                    return { download: dlUrl, title: info.title };
                }
                await new Promise(r => setTimeout(r, 1000));
            }
            return null;
        } catch { return null; }
    }
};

const savetube = {
    api: 'https://media.savetube.me/api',
    headers: { 'origin': 'https://yt.savetube.me', 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' },
    decrypt: (enc) => {
        try {
            const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12'.match(/.{1,2}/g).join(''), 'hex');
            const data = Buffer.from(enc, 'base64'), iv = data.slice(0, 16), content = data.slice(16);
            const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
            return JSON.parse(Buffer.concat([decipher.update(content), decipher.final()]).toString());
        } catch { return null; }
    },
    download: async (url, type) => {
        try {
            const id = url.match(/[?&]v=([^&#]+)|youtu\.be\/([^&#]+)|shorts\/([^&#]+)/)?.[1] || url.split('/').pop();
            const { data: info } = await axios.post(`${savetube.api}/v2/info`, { url: `https://www.youtube.com/watch?v=${id}` }, { headers: savetube.headers, timeout: 8000 });
            const dec = savetube.decrypt(info.data.data || info.data);
            const { data: dl } = await axios.post(`${savetube.api}/download`, { id, downloadType: type, quality: type === 'audio' ? '128' : '360', key: dec.key }, { headers: savetube.headers, timeout: 8000 });
            return { download: dl.data?.downloadUrl || dl.downloadUrl, title: dec.title };
        } catch { return null; }
    }
};

async function raceWithFallback(url, isAudio, originalTitle) {
    if (!(await verificarRepo())) return null;

    if (isAudio) {
        let res = await motorAudio.download(url);
        if (res) return { ...res, winner: 'Ezconv' };
        
        let fb = await savetube.download(url, 'audio');
        if (fb) return { ...fb, winner: 'Savetube (Last Resort)' };
    } else {
        let res = await motorVideo.download(url);
        if (res) return { ...res, winner: 'Shiru' };

        let fb = await savetube.download(url, 'video');
        if (fb) return { ...fb, winner: 'Savetube (Last Resort)' };
    }
    return null;
}

async function getBufferFromUrl(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000 });
        return Buffer.from(res.data);
    } catch { return Buffer.alloc(0); }
}

function cleanFileName(n) {
    return n.replace(/[<>:"/\\|?*]/g, "").substring(0, 50);
}

export { raceWithFallback, cleanFileName, getBufferFromUrl, colorize };
       return await this.req(
            'https://ytdown.to/proxy.php',
            `url=${enc}`,
            '*/*'
        )
    }

    async rec() {
        const res = await this.req(
            'https://ytdown.to/cooldown.php',
            'action=record',
            'application/json, text/javascript, */*; q=0.01'
        )
        return res.success === true
    }

    async startDL(dlUrl) {
        const enc = encodeURIComponent(dlUrl)
        return await this.req(
            'https://ytdown.to/proxy.php',
            `url=${enc}`,
            '*/*'
        )
    }

    async waitForDL(dlUrl, timeout = 60000, interval = 2000) {
        const start = Date.now()
        while (Date.now() - start < timeout) {
            const res = await this.startDL(dlUrl)
            if (res.api && res.api.fileUrl) return res.api.fileUrl
            await new Promise(r => setTimeout(r, interval))
        }
        return dlUrl
    }

    getMed(info, fmt, quality) {
        if (!info.api || !info.api.mediaItems) return []
        const fup = fmt.toUpperCase()
        
        if (fup === 'MP3') {
            return info.api.mediaItems
                .filter(it => it.type === 'Audio')
                .map(aud => ({
                    t: aud.type,
                    n: aud.name,
                    id: aud.mediaId,
                    url: aud.mediaUrl,
                    thumb: aud.mediaThumbnail,
                    q: aud.mediaQuality,
                    dur: aud.mediaDuration,
                    ext: aud.mediaExtension,
                    sz: aud.mediaFileSize
                }))
        } else if (fup === 'MP4') {
            const exactMatch = info.api.mediaItems.find(it => it.type === 'Video' && it.mediaRes?.includes(quality))
            
            if (exactMatch) {
                return [exactMatch].map(vid => ({
                    t: vid.type,
                    n: vid.name,
                    id: vid.mediaId,
                    url: vid.mediaUrl,
                    thumb: vid.mediaThumbnail,
                    res: vid.mediaRes,
                    q: vid.mediaQuality,
                    dur: vid.mediaDuration,
                    ext: vid.mediaExtension,
                    sz: vid.mediaFileSize
                }))
            }
            
            return info.api.mediaItems
                .filter(it => it.type === 'Video')
                .map(vid => ({
                    t: vid.type,
                    n: vid.name,
                    id: vid.mediaId,
                    url: vid.mediaUrl,
                    thumb: vid.mediaThumbnail,
                    res: vid.mediaRes,
                    q: vid.mediaQuality,
                    dur: vid.mediaDuration,
                    ext: vid.mediaExtension,
                    sz: vid.mediaFileSize
                }))
        }
        return info.api.mediaItems
    }

    getBest(med, fmt, targetQuality = '360') {
        if (!med || med.length === 0) return null
        const fup = fmt.toUpperCase()

        if (fup === 'MP3') {
            return med
                .filter(it => it.q)
                .sort((a, b) => (parseInt(b.q) || 0) - (parseInt(a.q) || 0))[0] || med[0]
        } else if (fup === 'MP4') {
            if (med.length === 1 && med[0].res?.includes(targetQuality)) return med[0]
            
            return med
                .filter(it => it.res)
                .sort((a, b) => {
                    const resA = parseInt(a.res.split('x')[0]) || 0
                    const resB = parseInt(b.res.split('x')[0]) || 0
                    
                    const target = parseInt(targetQuality)
                    
                    if (resA === target) return -1
                    if (resB === target) return 1
                    
                    if (resA > target && resB > target) return resA - resB
                    if (resA < target && resB < target) return resB - resA
                    
                    if (resA > target) return 1
                    if (resB > target) return -1
                    
                    return resB - resA
                })[0] || med[0]
        }
        return med[0]
    }

    async ytdownV2(ytUrl, fmt = 'MP3', quality = '360') {
        try {
            if (!(await this.chk())) {
                throw new Error("Service not available")
            }

            const info = await this.getInfo(ytUrl)
            if (info.api?.status === 'ERROR') {
                throw new Error(`Service error: ${info.api.message}`)
            }

            const med = this.getMed(info, fmt, quality)
            if (med.length === 0) {
                throw new Error(`No ${fmt.toUpperCase()} options available`)
            }

            const best = this.getBest(med, fmt, quality)
            if (!best) {
                throw new Error("No suitable media found")
            }

            await this.rec()

            const directUrl = await this.waitForDL(best.url, CONFIG.FALLBACK_RACE_TIMEOUT) 
            return directUrl

        } catch (err) {
            throw new Error(err.message)
        }
    }
}

const ytdownV2 = async (ytUrl, fmt = 'MP3', quality = '360') => {
    const yt = new YTDown()
    return await yt.ytdownV2(ytUrl, fmt, quality)
}

const videoQualities = ['144', '240', '360', '720', '1080', '1440', '4k']
const audioQualities = ['mp3', 'm4a', 'webm', 'aacc', 'flac', 'apus', 'ogg', 'wav']

async function processDownload_y2down(videoUrl, mediaType, quality = null) {
    const apiKey = 'dfcb6d76f2f6a9894gjkege8a4ab232222'
    const isAudio = audioQualities.includes(mediaType)
    const format = isAudio ? mediaType : quality

    const initUrl = `https://p.savenow.to/ajax/download.php?copyright=0&format=${format}&url=${encodeURIComponent(videoUrl)}&api=${apiKey}`
    
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Android 13; Mobile; rv:146.0) Gecko/146.0 Firefox/146.0',
        'Referer': 'https://y2down.cc/enSB/'
    }

    try {
        const response = await fetch(initUrl, { headers })
        const data = await response.json()
        
        if (!data.success) {
            throw new Error('Init failed')
        }

        const taskId = data.id
        const progressUrl = `https://p.savenow.to/api/progress?id=${taskId}`
        
        let progress = 0
        let downloadUrl = null

        const MAX_PROGRESS_CHECKS = 10
        let checks = 0
        while (progress < 1000 && checks < MAX_PROGRESS_CHECKS) {
            await new Promise(resolve => setTimeout(resolve, 3000)) 
            
            const progressResponse = await fetch(progressUrl, { headers })
            const progressData = await progressResponse.json()
            
            progress = progressData.progress
            checks++
            
            if (progress === 1000 && progressData.download_url) {
                downloadUrl = progressData.download_url
                break
            }
        }

        if (downloadUrl) {
            return downloadUrl
        } else {
            throw new Error('No download URL')
        }

    } catch (error) {
        throw error
    }
}

async function yt2dow_cc(videoUrl, options = {}) {
    const { quality = '360', format = 'mp3', type = 'video' } = options 
    
    if (type === 'video') {
        if (!videoQualities.includes(quality)) {
            if (quality !== '360') throw new Error(`Invalid quality: ${quality}`)
        }
        return processDownload_y2down(videoUrl, 'video', quality)
    } else {
        if (!audioQualities.includes(format)) {
            throw new Error(`Invalid format: ${format}`)
        }
        return processDownload_y2down(videoUrl, format)
    }
}

async function descargarAudioYouTube(urlVideo) {
  try {
    const data = {
      url: urlVideo,
      downloadMode: "audio",
      brandName: "ytmp3.gg",
      audioFormat: "mp3",
      audioBitrate: "128"
    }

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    const response = await axios.post('https://hub.y2mp3.co/', data, { headers })

    const { url: downloadUrl, filename } = response.data

    if (!downloadUrl) throw new Error("No se obtuvo URL de descarga")

    return {
      success: true,
      filename,
      downloadUrl
    }
  } catch (error) {
    throw new Error(`Ytmp3.gg/y2mp3.co falló: ${error.message}`)
  }
}

const TARGET_VIDEO_QUALITY = '360' 

async function savetube_wrapper(url, isAudio, originalTitle) {
    const videoQuality = TARGET_VIDEO_QUALITY
    const result = await processDownloadWithRetry_savetube(isAudio, url, 0, videoQuality)
    if (!result?.status || !result?.result?.download) {
        throw new Error(`Savetube falló: ${result.error || 'Error desconocido'}`)
    }
    return {
        download: result.result.download,
        title: result.result.title || originalTitle,
        winner: 'Savetube'
    }
}

async function ytdownV2_wrapper(url, isAudio, originalTitle) {
    const fmt = isAudio ? 'MP3' : 'MP4'
    const quality = TARGET_VIDEO_QUALITY
    const downloadUrl = await ytdownV2(url, fmt, quality)
    return {
        download: downloadUrl,
        title: originalTitle,
        winner: 'Ytdown.to'
    }
}

async function yt2dow_cc_wrapper(url, isAudio, originalTitle) {
    const options = isAudio 
        ? { type: 'audio', format: 'mp3' }
        : { type: 'video', quality: TARGET_VIDEO_QUALITY }
        
    const downloadUrl = await yt2dow_cc(url, options)
    return {
        download: downloadUrl,
        title: originalTitle,
        winner: 'Yt2dow.cc'
    }
}

async function ytdown_gg_wrapper(url, originalTitle) {
    const result = await descargarAudioYouTube(url)
    if (!result?.success || !result?.downloadUrl) {
        throw new Error(`Ytmp3.gg falló: ${result.error || 'Error desconocido'}`)
    }
    return {
        download: result.downloadUrl,
        title: originalTitle,
        winner: 'Ytmp3.gg'
    }
}

function timeoutPromise(promise, ms, name) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`TIMEOUT: ${name} no respondió en ${ms/1000}s.`))
        }, ms)

        promise.then(
            (value) => {
                clearTimeout(timer)
                resolve(value)
            },
            (reason) => {
                clearTimeout(timer)
                reject(reason)
            }
        )
    })
}

async function raceWithFallback(url, isAudio, originalTitle) {
    if (!(await verificarRepo())) {
        console.error(colorize(`[ERROR] Este módulo no está autorizado para este repositorio.`, true));
        return null;
    }

    const raceTimeout = isAudio ? CONFIG.FAST_TIMEOUT : CONFIG.VIDEO_TIMEOUT
    const fallbackTimeout = isAudio ? CONFIG.AUDIO_FALLBACK_TIMEOUT : CONFIG.FALLBACK_RACE_TIMEOUT

    const executeRace = async (ms, name_suffix = '') => {
        const promises = [
            timeoutPromise(savetube_wrapper(url, isAudio, originalTitle), ms, `Savetube${name_suffix}`).catch(e => {
                return { error: e.message, service: 'Savetube' }
            }),
            timeoutPromise(ytdownV2_wrapper(url, isAudio, originalTitle), ms, `Ytdown.to${name_suffix}`).catch(e => {
                return { error: e.message, service: 'Ytdown.to' }
            }),
            timeoutPromise(yt2dow_cc_wrapper(url, isAudio, originalTitle), ms, `Yt2dow.cc${name_suffix}`).catch(e => {
                return { error: e.message, service: 'Yt2dow.cc' }
            }),
        ]
        
        if (isAudio) {
            promises.push(timeoutPromise(ytdown_gg_wrapper(url, originalTitle), ms, `Ytmp3.gg${name_suffix}`).catch(e => {
                return { error: e.message, service: 'Ytmp3.gg' }
            }))
        }

        try {
            const winner = await Promise.race(promises)
            if (winner && winner.download) {
                return winner
            }
        } catch (e) {
            return { error: e.message }
        }
        
        const results = await Promise.all(promises.map(p => p.catch(() => null)).filter(p => p !== null))
        return results.find(r => r && r.download)
    }

    let mediaResult = await executeRace(raceTimeout, ' [RÁPIDA]')
    
    if (mediaResult?.download) {
        return mediaResult
    }
    
    if (isAudio) {
        mediaResult = await executeRace(fallbackTimeout, ' [FALLBACK]')
        
        if (mediaResult?.download) {
            return mediaResult
        }
    }
    
    if (isAudio || (!isAudio && !mediaResult?.download)) {
        mediaResult = await executeRace(CONFIG.FALLBACK_RACE_TIMEOUT, ' [FINAL]')
    }

    if (!mediaResult?.download) {
        console.error(colorize(`[ERROR] Fallo total: No se pudo obtener el archivo después de todos los reintentos.`, true))
        return null
    }

    return mediaResult
}

async function getBufferFromUrl(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Error al descargar el archivo: ${res.statusText} (${res.status})`)
    return res.buffer()
}

export { raceWithFallback, cleanFileName, getBufferFromUrl, colorize }
