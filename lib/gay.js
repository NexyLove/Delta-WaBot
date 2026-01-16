import { createCanvas, loadImage } from 'canvas'

export async function makeGayPfp(avatarUrl) {
    try {
        const canvas = createCanvas(512, 512)
        const ctx = canvas.getContext('2d')
        
        const avatar = await loadImage(avatarUrl)
        ctx.drawImage(avatar, 0, 0, canvas.width, canvas.height)

        const colors = ["#FF0018", "#FFA52C", "#FFFF41", "#008018", "#0000F9", "#86007D"]
        const stripe = canvas.height / colors.length
        
        ctx.globalAlpha = 0.45
        colors.forEach((c, i) => {
            ctx.fillStyle = c
            ctx.fillRect(0, i * stripe, canvas.width, stripe)
        })
        
        ctx.globalAlpha = 1
        return canvas.toBuffer()
    } catch (e) {
        return null
    }
}
