import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.owner = [
  ['819095203873'],
  ['9170443047164']
]

global.dev = 'Nexy 7z'
global.botName = 'STAR DELTA'
global.prefix = ['7']
global.packname = 'Delta Sticker By'

// --- CONFIGURACIÓN DE COMPRA ---
global.venta = 'https://cdn.russellxz.click/3566a751.jpg'
global.vlink = 'https://wa.link/3bben7'
// -------------------------------

// --- CONFIGURACIÓN DE ECONOMÍA GLOBAL ---
global.currency = 'Nekoins' 
// ----------------------------------------

global.banner = 'https://nexy-ar7z.b-cdn.net/storage/0e261f75.jpg'

global.wait = '*Aguarde un momento...*'
global.error = '*Ocurrió un error inesperado.*'
global.isOwnerMsg = '*✰ Este comando solo puede ser utilizado por el Dueño.*'
global.isAdminMsg = '✰ Este comando solo puede ser utilizado por los *administradores*.'
global.isBotAdminMsg = '✰ Necesito ser *administrador* para ejecutar esta acción.'
global.isGroupMsg = '✰ Este comando solo puede ser utilizado en *grupos*.'
global.ecoOffMsg = '*ꕤ La economía está desactivada en este grupo.*'
global.isModMsg = '✰ Solo moderadores y owners pueden usar este comando.'

const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.cyanBright("Configuración Actualizada"))
  import(`${file}?update=${Date.now()}`)
})
