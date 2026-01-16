import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import twemoji from 'twemoji';
import { promisify } from 'util';
const execPromise = promisify(exec);

// Función auxiliar para envolver texto respetando emojis
function wrapText(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = "";
    for (const word of words) {
        let testLine = currentLine ? currentLine + " " + word : word;
        // Medimos reemplazando visualmente emojis por una "m"
        let measureLine = testLine.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, "m");
        if (ctx.measureText(measureLine).width > maxWidth) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

// Función para dibujar texto y emojis centrados correctamente
async function drawTextWithEmoji(ctx, text, centerX, y, fontSize) {
    const parsed = twemoji.parse(text, { folder: "svg", ext: ".svg" });
    const parts = parsed.split(/(<img.*?>)/g).filter(Boolean);
    
    let totalWidth = 0;
    for (const part of parts) {
        if (part.startsWith("<img")) {
            totalWidth += fontSize;
        } else {
            totalWidth += ctx.measureText(part).width;
        }
    }

    let cursorX = centerX - totalWidth / 2;

    for (const part of parts) {
        if (part.startsWith("<img")) {
            const src = part.match(/src="([^"]+)"/)?.[1];
            if (src) {
                try {
                    const img = await loadImage(src);
                    ctx.drawImage(img, cursorX, y - fontSize / 2, fontSize, fontSize);
                } catch (e) {}
            }
            cursorX += fontSize;
        } else {
            ctx.textAlign = "left";
            ctx.fillText(part, cursorX, y);
            cursorX += ctx.measureText(part).width;
        }
    }
    ctx.textAlign = "center"; // Restaurar
}

async function createBratFrame(text, size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    
    // Fondo Blanco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";

    let fontSize = 200; // Tamaño inicial
    let lines = [];
    let lineHeight = 0;
    let totalHeight = 0;

    // Bucle para reducir el tamaño de letra hasta que todo quepa
    while (fontSize > 5) {
        ctx.font = `900 ${fontSize}px Arial`;
        lines = wrapText(ctx, text, size * 0.85);
        lineHeight = fontSize * 1.05;
        totalHeight = lines.length * lineHeight;

        let maxW = 0;
        for(let l of lines) {
            let measure = l.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, "m");
            let w = ctx.measureText(measure).width;
            if (w > maxW) maxW = w;
        }

        if (totalHeight > size * 0.85 || maxW > size * 0.85) {
            fontSize -= 5; // Reducción rápida para video
        } else {
            break;
        }
    }

    const startY = (size / 2) - (totalHeight / 2) + (lineHeight / 2);
    for (let i = 0; i < lines.length; i++) {
        await drawTextWithEmoji(ctx, lines[i], size / 2, startY + (i * lineHeight), fontSize);
    }
    return canvas.toBuffer();
}

export async function makeBratVid(text, id) {
    const size = 512;
    const workDir = path.join(process.cwd(), 'tmp', `bv_${id}`);
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });
    
    const words = text.split(/\s+/);
    let frame = 0;

    // Animación palabra por palabra
    for (let i = 1; i <= words.length; i++) {
        const frameText = words.slice(0, i).join(" ");
        const buffer = await createBratFrame(frameText, size);
        fs.writeFileSync(path.join(workDir, `f_${String(frame++).padStart(3, "0")}.png`), buffer);
    }
    
    // Frames finales estáticos (pausa al final)
    for (let i = 0; i < 6; i++) {
        const buffer = await createBratFrame(text, size);
        fs.writeFileSync(path.join(workDir, `f_${String(frame++).padStart(3, "0")}.png`), buffer);
    }

    const outputWebp = path.join(process.cwd(), 'tmp', `brat_${id}.webp`);
    // Usamos ajustes de FFmpeg para un WebP animado de calidad
    await execPromise(`ffmpeg -y -framerate 5 -i ${workDir}/f_%03d.png -vcodec libwebp -filter:v "scale=512:512" -lossless 0 -q:v 75 -loop 0 -an ${outputWebp}`);
    
    fs.rmSync(workDir, { recursive: true, force: true });
    return outputWebp;
}
