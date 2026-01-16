import { createCanvas, loadImage } from 'canvas';
import twemoji from 'twemoji';

// Función para limpiar etiquetas de emoji y medir ancho real aproximado
function getLineWidth(ctx, text, fontSize) {
    const parts = text.split(/(<img.*?>)/g);
    let width = 0;
    for (const part of parts) {
        if (part.startsWith("<img")) {
            width += fontSize;
        } else if (part) {
            width += ctx.measureText(part).width;
        }
    }
    return width;
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = "";

    for (const word of words) {
        let testLine = currentLine ? currentLine + " " + word : word;
        // Medimos reemplazando emojis por un carácter ancho para el cálculo de envoltura
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

async function drawTextWithEmoji(ctx, text, centerX, y, fontSize) {
    const parsed = twemoji.parse(text, { folder: "svg", ext: ".svg" });
    const parts = parsed.split(/(<img.*?>)/g).filter(Boolean);
    
    // Calculamos el ancho total de esta línea específica
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
                    // El emoji se dibuja un poco más arriba para alinearse con el texto
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
}

export async function makeBrat(text) {
    const size = 512;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Fondo Blanco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";

    // Empezamos con un tamaño grande, pero el bucle lo bajará rápido
    let fontSize = 200; 
    let lines = [];
    let lineHeight = 0;
    let totalHeight = 0;

    // BUCLE DE AJUSTE DINÁMICO
    // Bajamos la fuente hasta que el alto y el ancho quepan en el 85% del canvas
    while (fontSize > 5) {
        ctx.font = `900 ${fontSize}px Arial`;
        lines = wrapText(ctx, text, size * 0.85);
        lineHeight = fontSize * 1.05; // Espaciado entre líneas
        totalHeight = lines.length * lineHeight;

        let maxW = 0;
        for(let l of lines) {
            let w = ctx.measureText(l.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, "m")).width;
            if (w > maxW) maxW = w;
        }

        if (totalHeight > size * 0.85 || maxW > size * 0.85) {
            fontSize -= 2;
        } else {
            break;
        }
    }

    // Dibujar cada línea centrada vertical y horizontalmente
    const startY = (size / 2) - (totalHeight / 2) + (lineHeight / 2);

    for (let i = 0; i < lines.length; i++) {
        await drawTextWithEmoji(
            ctx, 
            lines[i], 
            size / 2, 
            startY + (i * lineHeight), 
            fontSize
        );
    }

    return canvas.toBuffer("image/png");
}
