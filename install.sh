cat > install.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# Colores
WHITE='\033[38;5;255m'
GREEN='\033[38;5;121m'
YELLOW='\033[38;5;223m'
RED='\033[38;5;204m'
CYAN='\033[38;5;87m'
PINK='\033[38;5;212m'
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

echo -e "${CYAN}"
echo "         STAR DELTA WABOT"
echo "           By: Nexy 7z"
echo -e "${RESET}"
echo ""

# =========================================
# MÉTODO 1: Instalación estándar
# =========================================
install_standard() {
    echo -e "${WHITE}[1/7] ${YELLOW}Configurando repositorios...${RESET}"
    termux-change-repo <<< "
1
Y
" > /dev/null 2>&1
    
    pkg update -y && pkg upgrade -y
    echo -e "${WHITE}✓ ${GREEN}Repositorios configurados${RESET}"
    echo ""

    echo -e "${WHITE}[2/7] ${YELLOW}Instalando Node.js 18...${RESET}"
    pkg install nodejs-18 -y
    echo -e "${WHITE}✓ ${GREEN}Node.js 18 instalado${RESET}"
    echo ""

    echo -e "${WHITE}[3/7] ${YELLOW}Instalando dependencias...${RESET}"
    pkg install git ffmpeg python build-essential pkg-config -y
    pkg install pango cairo libjpeg-turbo libpng giflib -y
    echo -e "${WHITE}✓ ${GREEN}Dependencias instaladas${RESET}"
    echo ""
}

# =========================================
# MÉTODO 2: Instalación simple (sin canvas)
# =========================================
install_simple() {
    echo -e "${WHITE}[1/4] ${YELLOW}Actualizando Termux...${RESET}"
    pkg update -y && pkg upgrade -y
    echo -e "${WHITE}✓ ${GREEN}Termux actualizado${RESET}"
    echo ""

    echo -e "${WHITE}[2/4] ${YELLOW}Instalando mínimo necesario...${RESET}"
    pkg install git nodejs ffmpeg -y
    echo -e "${WHITE}✓ ${GREEN}Paquetes instalados${RESET}"
    echo ""
}

# =========================================
# MÉTODO 3: Instalación forzada
# =========================================
install_force() {
    echo -e "${WHITE}[1/3] ${YELLOW}Instalando Node.js actual...${RESET}"
    pkg install nodejs git ffmpeg -y
    echo -e "${WHITE}✓ ${GREEN}Node.js instalado${RESET}"
    echo ""
}

# =========================================
# MENÚ PRINCIPAL
# =========================================
echo -e "${WHITE}Selecciona método de instalación:${RESET}"
echo -e "${CYAN}1. ${WHITE}Instalación estándar (recomendado)${RESET}"
echo -e "${CYAN}2. ${WHITE}Instalación simple (sin canvas)${RESET}"
echo -e "${CYAN}3. ${WHITE}Instalación forzada (si todo falla)${RESET}"
echo -e "${CYAN}4. ${WHITE}Salir${RESET}"
echo ""
echo -e "${WHITE}Opción [1-4]: ${RESET}"
read -r option

case $option in
    1)
        echo -e "${CYAN}Método seleccionado: Estándar${RESET}"
        echo ""
        install_standard
        METHOD="standard"
        ;;
    2)
        echo -e "${CYAN}Método seleccionado: Simple${RESET}"
        echo ""
        install_simple
        METHOD="simple"
        ;;
    3)
        echo -e "${CYAN}Método seleccionado: Forzado${RESET}"
        echo ""
        install_force
        METHOD="force"
        ;;
    4)
        echo -e "${RED}Saliendo...${RESET}"
        exit 0
        ;;
    *)
        echo -e "${RED}Opción inválida. Usando método estándar.${RESET}"
        echo ""
        install_standard
        METHOD="standard"
        ;;
esac

# =========================================
# CLONAR REPOSITORIO
# =========================================
echo -e "${WHITE}[+] ${YELLOW}Obteniendo Delta-WaBot...${RESET}"
cd ~
if [ -d "Delta-WaBot" ]; then
    echo -e "${WHITE}Eliminando instalación anterior...${RESET}"
    rm -rf Delta-WaBot
fi

git clone https://github.com/NexyLove/Delta-WaBot.git
cd Delta-WaBot
echo -e "${WHITE}✓ ${GREEN}Repositorio clonado${RESET}"
echo ""

# =========================================
# CONFIGURAR BOT
# =========================================
echo -e "${WHITE}[+] ${YELLOW}Configurando bot...${RESET}"
if [ -f "config.js" ]; then
    echo -e "${WHITE}✓ ${GREEN}config.js ya existe${RESET}"
else
    cat > config.js << 'CFG'
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

global.venta = 'https://cdn.russellxz.click/3566a751.jpg'
global.vlink = 'https://wa.link/3bben7'
global.currency = 'Nekoins'
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
CFG
    echo -e "${WHITE}✓ ${GREEN}config.js creado${RESET}"
fi
echo ""

# =========================================
# INSTALAR MÓDULOS (según método)
# =========================================
echo -e "${WHITE}[+] ${YELLOW}Instalando módulos Node.js...${RESET}"

case $METHOD in
    "standard")
        echo -e "${WHITE}Método: Instalación estándar con Canvas${RESET}"
        # Configurar pkg-config para Canvas
        mkdir -p $PREFIX/lib/pkgconfig
        cat > $PREFIX/lib/pkgconfig/pangocairo.pc << 'PC'
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
PC
        export PKG_CONFIG_PATH=$PREFIX/lib/pkgconfig
        
        # Intentar instalar Canvas
        npm install canvas@2.11.2 --build-from-source --legacy-peer-deps 2>/dev/null
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}Canvas falló, usando alternativa...${RESET}"
            npm install @napi-rs/canvas --legacy-peer-deps 2>/dev/null
        fi
        ;;
        
    "simple")
        echo -e "${WHITE}Método: Simple sin Canvas${RESET}"
        # Remover canvas del package.json si existe
        sed -i '/"canvas"/d' package.json 2>/dev/null || true
        ;;
        
    "force")
        echo -e "${WHITE}Método: Forzado${RESET}"
        # Solo módulos esenciales
        npm install @whiskeysockets/baileys axios chalk --no-optional --force 2>/dev/null
        ;;
esac

# Instalar dependencias comunes
echo -e "${WHITE}Instalando dependencias principales...${RESET}"
npm install @whiskeysockets/baileys axios chalk cheerio pino --no-optional --legacy-peer-deps 2>/dev/null

# Instalar dependencias adicionales si no hay error
if [ $? -eq 0 ]; then
    echo -e "${WHITE}Instalando módulos adicionales...${RESET}"
    npm install wa-sticker-formatter yt-search fluent-ffmpeg qrcode-terminal --no-optional --legacy-peer-deps 2>/dev/null
    npm install --legacy-peer-deps --no-optional 2>/dev/null
fi

echo -e "${WHITE}✓ ${GREEN}Módulos instalados${RESET}"
echo ""

# =========================================
# VERIFICACIÓN
# =========================================
echo -e "${WHITE}[+] ${YELLOW}Verificando instalación...${RESET}"

ERRORS=0
if [ -d "node_modules/@whiskeysockets/baileys" ]; then
    echo -e "${GREEN}✓ Baileys instalado${RESET}"
else
    echo -e "${RED}✗ Baileys NO instalado${RESET}"
    ERRORS=1
fi

if [ -d "node_modules/axios" ]; then
    echo -e "${GREEN}✓ Axios instalado${RESET}"
else
    echo -e "${YELLOW}⚠ Axios no instalado${RESET}"
fi

if [ -d "node_modules/canvas" ] || [ -d "node_modules/@napi-rs/canvas" ]; then
    echo -e "${GREEN}✓ Canvas instalado${RESET}"
else
    echo -e "${YELLOW}⚠ Canvas no instalado (algunas funciones limitadas)${RESET}"
fi

# =========================================
# CREAR SCRIPT DE INICIO
# =========================================
cat > start.sh << 'START'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/Delta-WaBot

# Configurar variables si Canvas está instalado
if [ -d "node_modules/canvas" ] || [ -d "node_modules/@napi-rs/canvas" ]; then
    export PKG_CONFIG_PATH=/data/data/com.termux/files/usr/lib/pkgconfig
    export LD_LIBRARY_PATH=/data/data/com.termux/files/usr/lib
fi

# Verificar módulos
if [ ! -d "node_modules/@whiskeysockets/baileys" ]; then
    echo "Instalando dependencias faltantes..."
    npm install @whiskeysockets/baileys axios chalk --no-optional
fi

echo "Iniciando STAR DELTA BOT..."
node index.js
START

chmod +x start.sh

# =========================================
# RESULTADO FINAL
# =========================================
echo ""
echo -e "${CYAN}════════════════════════════════════${RESET}"
echo -e "${CYAN}      INSTALACIÓN COMPLETADA       ${RESET}"
echo -e "${CYAN}════════════════════════════════════${RESET}"
echo ""
echo -e "${WHITE}Directorio: ${CYAN}~/Delta-WaBot${RESET}"
echo ""
echo -e "${WHITE}Para iniciar el bot:${RESET}"
echo -e "${WHITE}1. ${GREEN}cd ~/Delta-WaBot${RESET}"
echo -e "${WHITE}2. ${GREEN}./start.sh${RESET} ${WHITE}o${RESET} ${GREEN}node index.js${RESET}"
echo ""
echo -e "${WHITE}Soluciones si hay problemas:${RESET}"
echo -e "${WHITE}• Si falta algún módulo: ${YELLOW}npm install --force${RESET}"
echo -e "${WHITE}• Si Canvas da error: ${YELLOW}npm uninstall canvas && npm install @napi-rs/canvas${RESET}"
echo -e "${WHITE}• Para mantener activo: ${YELLOW}pkg install pm2 && pm2 start index.js${RESET}"
echo ""
echo -e "${WHITE}Conexión:${RESET}"
echo -e "${WHITE}1. Elige opción 1 (Código QR)${RESET}"
echo -e "${WHITE}2. Escanea con WhatsApp${RESET}"
echo -e "${WHITE}3. Usa ${CYAN}Ctrl+C${RESET} para detener${RESET}"
echo ""
echo -e "${CYAN}¡STAR DELTA está listo! 🚀${RESET}"
EOF

chmod +x install.sh
echo -e "${GREEN}Instalador creado exitosamente!${RESET}"
echo -e "${WHITE}Ejecuta: ${CYAN}./install.sh${RESET}"
