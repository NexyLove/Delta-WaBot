import chalk from 'chalk'

const colors = {
    border: chalk.cyan,
    title: chalk.white.bold,
    label: chalk.cyan,
    text: chalk.white,
    footer: chalk.cyan
}

export default async function printLog(m, conn) {
    const botName = global.botName || "Delta"
    const devName = global.dev || "Arlette Xz "
    const pushName = m.pushName || 'Usuario'
    const sender = (m.key.participant || m.key.remoteJid || '').split('@')[0]
    const type = Object.keys(m.message || {})[0] || 'Desconocido'
    const me = (conn.user?.id || '').split(':')[0]
    const date = new Date().toLocaleDateString("es-ES", { timeZone: "America/Mexico_City", day: 'numeric', month: 'long', year: 'numeric' })

    console.log(`${colors.border('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')}
${colors.border('┃')}${colors.title(botName.toUpperCase().padEnd(30).padStart(31))}${colors.border(' ┃')}
${colors.border('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫')}
${colors.border('┃')} ${colors.label('» Bot:')} ${colors.text(me + ' ~ ' + botName)}
${colors.border('┃')} ${colors.label('» Fecha:')} ${colors.text(date)}
${colors.border('┃')} ${colors.label('» Remitente:')} ${colors.text(pushName + ' (' + sender + ')')}
${colors.border('┃')} ${colors.label('» Tipo:')} ${colors.text(type.replace('Message', ''))}
${colors.border('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫')}
${colors.border('┃')}${colors.footer(`      Powered by ${devName}     `.padEnd(30).slice(0, 30))}${colors.border('  ┃')}
${colors.border('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')}`)
}
