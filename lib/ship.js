import { createCanvas, loadImage } from 'canvas'

function heartPath(ctx, x, y, size) {
    ctx.beginPath()
    ctx.moveTo(x, y + size / 4)
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4)
    ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size)
    ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4)
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4)
    ctx.closePath()
}

export async function makeShipCard(name1, name2, avatar1, avatar2, percent) {
    try {
        const W = 900, H = 500
        const canvas = createCanvas(W, H)
        const ctx = canvas.getContext("2d")

        const backgrounds = [
            'https://cdn.russellxz.click/24bfd0bf.jpg',
            'https://cdn.russellxz.click/6d5c0fd1.jpg',
            'https://cdn.russellxz.click/966b720d.jpg',
            'https://cdn.russellxz.click/57c28eb6.jpg',
            'https://cdn.russellxz.click/42178d6e.gif',
            'https://cdn.russellxz.click/e506f8e9.jpg',
            'https://cdn.russellxz.click/18013603.jpg'
        ]
        
        const bgImg = await loadImage(backgrounds[Math.floor(Math.random() * backgrounds.length)])
        ctx.drawImage(bgImg, 0, 0, W, H)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
        ctx.fillRect(0, 0, W, H)

        const img1 = await loadImage(avatar1)
        const img2 = await loadImage(avatar2)

        const radius = 100, centerY = 180
        const leftX = 200, rightX = 700, midX = W / 2

        const drawCircleAvatar = (img, x) => {
            ctx.save()
            ctx.beginPath()
            ctx.arc(x, centerY, radius, 0, Math.PI * 2)
            ctx.closePath()
            ctx.clip()
            ctx.drawImage(img, x - radius, centerY - radius, radius * 2, radius * 2)
            ctx.restore()
            ctx.strokeStyle = "#ffffff"
            ctx.lineWidth = 10
            ctx.stroke()
        }

        drawCircleAvatar(img1, leftX)
        drawCircleAvatar(img2, rightX)

        ctx.save()
        const heartSize = 180
        ctx.translate(midX, centerY - 50)
        heartPath(ctx, 0, 0, heartSize)
        ctx.fillStyle = "#ff2d95"
        ctx.shadowBlur = 30
        ctx.shadowColor = "#ff2d95"
        ctx.fill()
        
        ctx.textAlign = "center"
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 45px Arial"
        ctx.shadowBlur = 0
        ctx.fillText(`${percent}%`, 0, 65) 
        ctx.restore()

        let phrase = ""
        if (percent <= 20) phrase = "Corran, ¡ahí no es! 🚩"
        else if (percent <= 40) phrase = "Zona de amigos permanente 🚫"
        else if (percent <= 60) phrase = "Hay algo... pero falta chispa ⚡"
        else if (percent <= 80) phrase = "¡Qué buena química! ✨"
        else if (percent <= 100) phrase = "¡Almas gemelas! Destino inevitable 💍"

        ctx.textAlign = "center"
        ctx.font = "italic 32px Arial"
        ctx.fillStyle = "#ff8b8b"
        ctx.fillText(phrase, midX, H - 120)

        ctx.font = "bold 32px Arial"
        ctx.fillStyle = "#ffffff"
        ctx.fillText(name1.toUpperCase(), leftX, centerY + radius + 50)
        ctx.fillText(name2.toUpperCase(), rightX, centerY + radius + 50)

        ctx.font = "bold 20px Arial"
        ctx.textAlign = "right"
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.fillText(`By ${global.botName}`, W - 30, H - 30)

        return canvas.toBuffer()
    } catch (e) {
        return null
    }
}
