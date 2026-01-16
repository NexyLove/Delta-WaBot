import { createCanvas, loadImage } from 'canvas'

export async function createWelcome(username, guild_name, member_count, avatarUrl) {
    try {
        const backgrounds = [
            'https://cdn.russellxz.click/24bfd0bf.jpg',
            'https://cdn.russellxz.click/6d5c0fd1.jpg',
            'https://cdn.russellxz.click/966b720d.jpg',
            'https://cdn.russellxz.click/57c28eb6.jpg',
            'https://cdn.russellxz.click/42178d6e.gif',
            'https://cdn.russellxz.click/e506f8e9.jpg',
            'https://cdn.russellxz.click/18013603.jpg'
        ]
        const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)]
        const canvas = createCanvas(1024, 500)
        const ctx = canvas.getContext('2d')
        const background = await loadImage(randomBg)
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const x = 512, y = 180, radius = 130
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.clip()
        const avatar = await loadImage(avatarUrl)
        ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2)
        ctx.restore()
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2, true)
        ctx.lineWidth = 12
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 15
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.font = 'bold 90px sans-serif'
        ctx.fillText('WELCOME', 512, 430)
        ctx.font = 'bold 45px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`#${member_count}`, 980, 460)
        return canvas.toBuffer()
    } catch (e) {
        return null
    }
}
