cat > install.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

WHITE='\033[38;5;255m'
GREEN='\033[38;5;121m'
YELLOW='\033[38;5;223m'
RED='\033[38;5;204m'
CYAN='\033[38;5;87m'
MAGENTA='\033[38;5;212m'
RESET='\033[0m'

clear
echo -e "${WHITE}"
cat << "ART"
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⣿⣿⣿⣿⣿⣿⠟⠉⠀⠀⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⠙⢻⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⠃⠀⠀⠀⠀⣠⣄⠀⢻⣿⣿⣿⣿⣿⡿⠀⣠⣄⠀⠀⠀⢻⣿⣿⣏⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣾⣿⣿⣿⣿⠀⠀⠀⠀⠰⣿⣿⠀⢸⣿⣿⣿⣿⣿⡇⠀⣿⣿⡇⠀⠀⢸⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠙⠃⠀⣼⣿⣿⣿⣿⣿⣇⠀⠙⠛⠁⠀⠀⣼⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣷⣤⣄⣀⣠⣤⣾⣿⣿⣿⣿⣽⣿⣿⣦⣄⣀⣀⣤⣾⣿⣿⣿⣿⠃⠀⠀⢀⣀⠀⠀
⠰⡶⠶⠶⠶⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠛⠉⠉⠙⠛⠋⠀
⠀⠀⢀⣀⣠⣤⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠷⠶⠶⠶⢤⣤⣀⠀
⠀⠛⠋⠉⠁⠀⣀⣴⡿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⣤⣀⡀⠀⠀⠀⠀⠘⠃
⠀⠀⢀⣤⡶⠟⠉⠁⠀⠀⠉⠛⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠟⠉⠀⠀⠀⠉⠙⠳⠶⣄⡀⠀⠀
⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
ART

echo -e "${MAGENTA}"
echo "          ╔══════════════════════╗"
echo "          ║   STAR DELTA WABOT   ║"
echo "          ║     By: Nexy 7z      ║"
echo "          ╚══════════════════════╝"
echo -e "${RESET}"
echo ""

# Función para mostrar progreso
show_progress() {
    echo -e "${WHITE}[${1}/9] ${YELLOW}${2}...${RESET}"
}

# ============================
# PASO 1: Actualizar Termux
# ============================
show_progress "1" "Actualizando Termux"
pkg update -y && pkg upgrade -y
echo -e "${WHITE}✓ ${GREEN}Termux actualizado${RESET}"
echo ""

# ============================
# PASO 2: Instalar dependencias básicas
# ============================
show_progress "2" "Instalando dependencias básicas"
pkg install -y nodejs-lts git ffmpeg python build-essential pkg-config
echo -e "${WHITE}✓ ${GREEN}Dependencias básicas instaladas${RESET}"
echo ""

# ============================
# PASO 3: Instalar librerías gráficas
# ============================
show_progress "3" "Instalando librerías gráficas"
pkg install -y libcairo libpango libjpeg-turbo libpng giflib freetype fontconfig harfbuzz
echo -e "${WHITE}✓ ${GREEN}Librerías gráficas instaladas${RESET}"
echo ""

# ============================
# PASO 4: Configurar Canvas para Termux
# ============================
show_progress "4" "Configurando Canvas"
mkdir -p $PREFIX/lib/pkgconfig
cat > $PREFIX/lib/pkgconfig/pangocairo.pc << 'PCEOF'
prefix=/data/data/com.termux/files/usr
exec_prefix=${prefix}
libdir=${exec_prefix}/lib
includedir=${prefix}/include

Name: pangocairo
Description: Pango Cairo integration
Version: 1.50.14
Requires: pango cairo
Libs: -L${libdir} -lpangocairo-1.0 -lpango-1.0 -lgobject-2.0 -lglib-2.0 -lcairo
Cflags: -I${includedir}/pango-1.0 -I${includedir}/cairo
PCEOF

# Configurar variables de entorno
export PKG_CONFIG_PATH=$PREFIX/lib/pkgconfig:$PKG_CONFIG_PATH
export LD_LIBRARY_PATH=$PREFIX/lib:$LD_LIBRARY_PATH

echo -e "${WHITE}✓ ${GREEN}Canvas configurado para Termux${RESET}"
echo ""

# ============================
# PASO 5: Clonar repositorio
# ============================
show_progress "5" "Obteniendo Star Delta Bot"
if [ -d "Delta-WaBot" ]; then
    echo -e "${WHITE}Eliminando instalación anterior...${RESET}"
    rm -rf Delta-WaBot
fi

git clone https://github.com/NexyLove/Delta-WaBot.git
cd Delta-WaBot
echo -e "${WHITE}✓ ${GREEN}Repositorio clonado${RESET}"
echo ""

# ============================
# PASO 6: Usar TU config.js
# ============================
show_progress "6" "Configurando con tu archivo config.js"
if [ -f "config.js" ]; then
    echo -e "${WHITE}✓ ${GREEN}Tu config.js ya está presente${RESET}"
    echo -e "${WHITE}  Dueños: ${CYAN}${global.owner}${RESET}"
    echo -e "${WHITE}  Nombre: ${CYAN}STAR DELTA${RESET}"
    echo -e "${WHITE}  Prefijo: ${CYAN}7${RESET}"
else
    # Crear config.js con TU configuración
    cat > config.js << 'CFGEOF'
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
CFGEOF
    echo -e "${WHITE}✓ ${GREEN}config.js creado con tu configuración${RESET}"
fi
echo ""

# ============================
# PASO 7: Instalar módulos Node.js
# ============================
show_progress "7" "Instalando módulos Node.js"

# Estrategia de instalación por capas
echo -e "${WHITE}Estrategia de instalación inteligente...${RESET}"

# Capa 1: Instalar dependencias críticas sin canvas
echo -e "${WHITE}Capa 1: Instalando dependencias críticas...${RESET}"
npm install @whiskeysockets/baileys@7.0.0-rc.9 axios chalk cheerio pino --no-optional

# Capa 2: Intentar canvas con build-from-source
echo -e "${WHITE}Capa 2: Intentando instalar Canvas...${RESET}"
npm install canvas@2.11.2 --build-from-source --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo -e "${WHITE}⚠ ${YELLOW}Canvas falló, intentando alternativa...${RESET}"
    npm uninstall canvas 2>/dev/null
    npm install @napi-rs/canvas --legacy-peer-deps
fi

# Capa 3: Instalar resto de dependencias
echo -e "${WHITE}Capa 3: Instalando resto de módulos...${RESET}"
npm install wa-sticker-formatter yt-search fluent-ffmpeg qrcode-terminal --legacy-peer-deps

# Capa 4: Instalar todo lo demás
echo -e "${WHITE}Capa 4: Instalación final...${RESET}"
npm install --legacy-peer-deps --no-optional

echo -e "${WHITE}✓ ${GREEN}Módulos instalados${RESET}"
echo ""

# ============================
# PASO 8: Verificar instalación
# ============================
show_progress "8" "Verificando instalación"

ERRORS=0
echo -e "${WHITE}Verificando módulos críticos:${RESET}"

# Verificar Baileys
if [ -d "node_modules/@whiskeysockets/baileys" ]; then
    echo -e "  ${GREEN}✓${RESET} @whiskeysockets/baileys"
else
    echo -e "  ${RED}✗${RESET} @whiskeysockets/baileys ${RED}(CRÍTICO)${RESET}"
    ERRORS=1
fi

# Verificar Canvas o alternativa
if [ -d "node_modules/canvas" ] || [ -d "node_modules/@napi-rs/canvas" ]; then
    echo -e "  ${GREEN}✓${RESET} Canvas (o alternativa)"
else
    echo -e "  ${YELLOW}⚠${RESET} Canvas no instalado ${YELLOW}(Funciones limitadas)${RESET}"
fi

# Verificar otros módulos importantes
for module in axios chalk cheerio; do
    if [ -d "node_modules/$module" ]; then
        echo -e "  ${GREEN}✓${RESET} $module"
    else
        echo -e "  ${YELLOW}⚠${RESET} $module"
    fi
done

MOD_COUNT=$(find node_modules -type d 2>/dev/null | wc -l)
echo -e "${WHITE}Total de módulos: ${CYAN}${MOD_COUNT}${RESET}"
echo ""

# ============================
# PASO 9: Crear script de inicio
# ============================
show_progress "9" "Creando script de inicio"

# Crear script start.sh
cat > start.sh << 'STARTEOF'
#!/data/data/com.termux/files/usr/bin/bash

WHITE='\033[38;5;255m'
GREEN='\033[38;5;121m'
CYAN='\033[38;5;87m'
RESET='\033[0m'

echo -e "${WHITE}════════════════════════════════════${RESET}"
echo -e "${CYAN}      INICIANDO STAR DELTA BOT      ${RESET}"
echo -e "${WHITE}════════════════════════════════════${RESET}"
echo ""

# Configurar variables para Canvas
export PKG_CONFIG_PATH=/data/data/com.termux/files/usr/lib/pkgconfig
export LD_LIBRARY_PATH=/data/data/com.termux/files/usr/lib

# Verificar node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${WHITE}✗ ${RED}node_modules no encontrado${RESET}"
    echo -e "${WHITE}Ejecuta: npm install${RESET}"
    exit 1
fi

echo -e "${WHITE}Verificando módulos...${RESET}"
if [ ! -d "node_modules/@whiskeysockets/baileys" ]; then
    echo -e "${WHITE}✗ ${RED}Baileys no encontrado${RESET}"
    echo -e "${WHITE}Instalando dependencias críticas...${RESET}"
    npm install @whiskeysockets/baileys@7.0.0-rc.9 --no-optional
fi

echo -e "${WHITE}✓ ${GREEN}Todo listo${RESET}"
echo -e "${WHITE}Iniciando bot...${RESET}"
echo ""

# Iniciar el bot
node index.js
STARTEOF

chmod +x start.sh

echo -e "${WHITE}✓ ${GREEN}Script de inicio creado${RESET}"
echo ""

# ============================
# RESULTADO FINAL
# ============================
echo -e "${WHITE}════════════════════════════════════${RESET}"
echo -e "${MAGENTA}     INSTALACIÓN COMPLETADA!     ${RESET}"
echo -e "${WHITE}════════════════════════════════════${RESET}"
echo ""
echo -e "${CYAN}╔══════════════════════════════════╗${RESET}"
echo -e "${CYAN}║        STAR DELTA BOT           ║${RESET}"
echo -e "${CYAN}║      By: ${WHITE}Nexy 7z${CYAN}              ║${RESET}"
echo -e "${CYAN}║      Prefijo: ${WHITE}7${CYAN}                 ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════╝${RESET}"
echo ""
echo -e "${WHITE}PARA INICIAR EL BOT:${RESET}"
echo -e "${WHITE}1. ${GREEN}cd ~/Delta-WaBot${RESET}"
echo -e "${WHITE}2. ${GREEN}./start.sh${RESET} ${CYAN}o${RESET} ${GREEN}node index.js${RESET}"
echo ""
echo -e "${WHITE}SOLUCIÓN DE PROBLEMAS:${RESET}"
echo -e "${WHITE}• Si Canvas falla: ${YELLOW}npm install @napi-rs/canvas${RESET}"
echo -e "${WHITE}• Si faltan módulos: ${YELLOW}npm install --force${RESET}"
echo -e "${WHITE}• Para mantener activo: ${YELLOW}pkg install pm2 && pm2 start index.js${RESET}"
echo ""
echo -e "${WHITE}CONEXIÓN:${RESET}"
echo -e "${WHITE}1. Escanea el código QR${RESET}"
echo -e "${WHITE}2. Elige opción ${CYAN}1${RESET} (Código QR)${RESET}"
echo -e "${WHITE}3. Usa ${CYAN}Ctrl+C${RESET} para detener${RESET}"
echo ""
echo -e "${WHITE}¡Tu bot ${MAGENTA}STAR DELTA${WHITE} está listo! 🚀${RESET}"
EOF

chmod +x install.sh
echo -e "${GREEN}✅ Instalador creado exitosamente!${RESET}"
echo -e "${WHITE}Ejecuta: ${CYAN}./install.sh${RESET}"
