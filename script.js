/**
 * @file script.js
 * @description Lógica de control para el juego Slot Clicker. Gestiona variables de estado,
 * lógica de negocio, animaciones de los rodillos, sistema de tienda y manipulación del DOM.
 */

// ==========================================
// VARIABLES DE ESTADO Y CONFIGURACIÓN
// ==========================================

/** @type {number} Saldo actual del jugador en fichas */
let fichas = 0;
/** @type {number} Puntos de experiencia acumulados en el nivel actual */
let exp = 0;
/** @type {number} Nivel actual temático del jugador (1, 2 o 3) */
let nivel = 1;
/** @type {boolean} Flag de bloqueo que indica si los rodillos están en movimiento */
let enMovimiento = false;
/** @type {number|null} Identificador del intervalo para la generación pasiva de fichas */
let intervaloHucha = null;
/** @type {number|null} Identificador del timeout para ocultar mensajes flotantes */
let timeoutMensaje = null;

/**
 * @constant {Object} expRequerida
 * @description Diccionario con los umbrales de experiencia para superar cada nivel.
 */
const expRequerida = {
  1: 5000,
  2: 10000,
  3: 15000,
};

/** @type {number} Límite de experiencia actual antes de subir de nivel */
let expParaNivel = expRequerida[nivel];

/**
 * @constant {Object} mejoras
 * @description Configuración central de la tienda. Almacena niveles, multiplicadores de coste y costes actuales de cada upgrade.
 */
const mejoras = {
  suerte: { nivel: 0, costeBase: 150, mult: 1.5, actual: 150 },
  jackpot: { nivel: 0, costeBase: 300, mult: 2.0, actual: 300 },
  mini: { nivel: 0, costeBase: 200, mult: 1.8, actual: 200 },
  passive: { nivel: 0, costeBase: 400, mult: 2.2, actual: 400 },
  base: { nivel: 0, costeBase: 1000, mult: 3.5, actual: 1000 },
};

/**
 * @constant {Object} datosNivel
 * @description Configuración de nombres y array de símbolos para cada nivel del juego.
 */
const datosNivel = {
  1: {
    nombre: "Tasca de Barrio",
    simbolos: ["🍒", "🍋", "🍇", "🍉", "🔫", "🍺"],
  },
  2: {
    nombre: "Casino de Las Vegas",
    simbolos: ["🔔", "💎", "💰", "🎰", "🍀", "7️⃣"],
  },
  3: {
    nombre: "Neo-Tokyo Ciberpunk",
    simbolos: ["🔋", "💾", "🌐", "🤖", "⚡", "🧬"],
  },
};

/**
 * @constant {Object} domElements
 * @description Cache de los elementos principales del DOM para optimizar el rendimiento y evitar llamadas repetitivas.
 */
const domElements = {
  fichas: document.getElementById("fichas-display"),
  progreso: document.getElementById("progress-fill"),
  nivelNombre: document.getElementById("level-name"),
  mensaje: document.getElementById("message"),
  modal: document.getElementById("shop-modal"),
  btnSpin: document.getElementById("btn-spin"),
  btnShop: document.getElementById("btn-open-shop"),
  closeShop: document.getElementById("close-shop"),
  badge: document.getElementById("shop-badge"),
};

// ==========================================
// FUNCIONES LÓGICAS Y DE INTERFAZ
// ==========================================

/**
 * @function actualizarInterfaz
 * @description Actualiza de forma reactiva el DOM en función de los cambios de estado interno
 * (fichas, experiencia, estado de botones de tienda y barra de progreso).
 * @returns {void}
 */
function actualizarInterfaz() {
  domElements.fichas.innerText = Math.floor(fichas);

  // Calcula el porcentaje visual de progreso con límite de 100%
  let porcentaje = Math.min((exp / expParaNivel) * 100, 100);
  domElements.progreso.style.width = porcentaje + "%";

  // Actualización de textos y estado de los botones de la tienda
  document.getElementById("lvl-luck").innerText = `nv.${mejoras.suerte.nivel}`;
  document.getElementById("cost-luck").innerText = Math.floor(mejoras.suerte.actual);
  document.getElementById("btn-buy-luck").disabled = fichas < mejoras.suerte.actual;

  document.getElementById("lvl-jackpot").innerText = `nv.${mejoras.jackpot.nivel}`;
  document.getElementById("cost-jackpot").innerText = Math.floor(mejoras.jackpot.actual);
  document.getElementById("btn-buy-jackpot").disabled = fichas < mejoras.jackpot.actual;

  document.getElementById("lvl-mini").innerText = `nv.${mejoras.mini.nivel}`;
  document.getElementById("cost-mini").innerText = Math.floor(mejoras.mini.actual);
  document.getElementById("btn-buy-mini").disabled = fichas < mejoras.mini.actual;

  document.getElementById("lvl-passive").innerText = `nv.${mejoras.passive.nivel}`;
  document.getElementById("cost-passive").innerText = Math.floor(mejoras.passive.actual);
  document.getElementById("btn-buy-passive").disabled = fichas < mejoras.passive.actual;

  document.getElementById("lvl-base").innerText = `nv.${mejoras.base.nivel}`;
  document.getElementById("cost-base").innerText = Math.floor(mejoras.base.actual);
  document.getElementById("btn-buy-base").disabled = fichas < mejoras.base.actual;

  // Lógica para mostrar la alerta visual (badge) si el usuario puede permitirse comprar algo
  let puedeComprarAlgo = false;
  for (let key in mejoras) {
    if (fichas >= mejoras[key].actual) {
      puedeComprarAlgo = true;
      break;
    }
  }
  domElements.badge.style.display = puedeComprarAlgo ? "flex" : "none";
}

/**
 * @function comprarMejora
 * @description Gestiona la transacción de compra en la tienda. Descuenta fondos, 
 * incrementa el nivel de la mejora adquirida y recalcula de forma geométrica el nuevo coste.
 * @param {string} tipo - Nombre clave de la mejora a comprar (ej: "suerte", "jackpot").
 * @returns {void}
 */
function comprarMejora(tipo) {
  let m = mejoras[tipo];
  if (fichas >= m.actual) {
    fichas -= m.actual;
    m.nivel++;
    // Fórmula de escalado de precios
    m.actual = m.costeBase * Math.pow(m.mult, m.nivel);

    // Iniciar generación pasiva si se compra el primer nivel de la hucha
    if (tipo === "passive" && m.nivel === 1 && !intervaloHucha) {
      intervaloHucha = setInterval(generarPasivo, 1000);
    }
    actualizarInterfaz();
  }
}

/**
 * @function generarPasivo
 * @description Ejecutada de forma periódica por setInterval. Suma fichas automáticamente al saldo del jugador.
 * @returns {void}
 */
function generarPasivo() {
  let ganancia = mejoras.passive.nivel * nivel * 5 * (1 + mejoras.base.nivel * 0.5);
  fichas += ganancia;
  actualizarInterfaz();
}

/**
 * @function verificarSubidaNivel
 * @description Comprueba si la experiencia alcanzó el máximo permitido. De ser así, resetea estado,
 * progresa al nivel siguiente, actualiza clases visuales y restablece los upgrades.
 * @returns {void}
 */
function verificarSubidaNivel() {
  if (exp >= expParaNivel) {
    if (nivel < 3) {
      nivel++;
      exp = 0;
      fichas = 0; // Se reinician los fondos
      expParaNivel = expRequerida[nivel];

      // Reinicio de tienda para la dificultad del nuevo nivel
      for (let key in mejoras) {
        mejoras[key].nivel = 0;
        mejoras[key].actual = mejoras[key].costeBase;
      }

      // Reinicio del farmeo pasivo
      if (intervaloHucha) {
        clearInterval(intervaloHucha);
        intervaloHucha = null;
      }

      // Aplicar nueva estética (cambio de clase en el Body)
      document.body.className = `nivel-${nivel}`;
      domElements.nivelNombre.innerText = datosNivel[nivel].nombre;
      mostrarMensajePremio(`¡NIVEL ${nivel}!`);

      domElements.modal.style.display = "none";
    } else {
      exp = expParaNivel; // Limita al máximo nivel posible
    }
    actualizarInterfaz();
  }
}

/**
 * @function animarRodillo
 * @description Ejecuta una animación asíncrona cambiando velozmente los símbolos mostrados,
 * simulando un giro y deteniéndolo en el símbolo determinado.
 * @param {string} id - Identificador del contenedor DOM del rodillo a animar.
 * @param {number} duracion - Duración en milisegundos de la animación.
 * @param {string} simboloFinal - El Emoji en el que debe detenerse el rodillo.
 * @returns {Promise} Una promesa que se resuelve cuando el rodillo se detiene.
 */
function animarRodillo(id, duracion, simboloFinal) {
  return new Promise((resolve) => {
    const rodillo = document.getElementById(id);
    const simbolos = datosNivel[nivel].simbolos;
    rodillo.classList.add("spinning");

    let cambiador = setInterval(() => {
      rodillo.innerText = simbolos[Math.floor(Math.random() * simbolos.length)];
    }, 50);

    setTimeout(() => {
      clearInterval(cambiador);
      rodillo.classList.remove("spinning");
      rodillo.innerText = simboloFinal;
      resolve();
    }, duracion);
  });
}

/**
 * @function iniciarTirada
 * @description Función asíncrona que gestiona el ciclo completo de tirada. Calcula aleatoriamente 
 * los símbolos basándose en probabilidad (modificada por mejoras) e invoca a las animaciones y el cálculo de premios.
 * @returns {Promise<void>}
 */
async function iniciarTirada() {
  if (enMovimiento) return;
  enMovimiento = true;
  domElements.btnSpin.disabled = true;

  domElements.mensaje.classList.remove("show");

  const simbolos = datosNivel[nivel].simbolos;
  let s1 = simbolos[Math.floor(Math.random() * simbolos.length)];
  let s2 = simbolos[Math.floor(Math.random() * simbolos.length)];
  let s3 = simbolos[Math.floor(Math.random() * simbolos.length)];

  // Factor probabilidad: Modifica resultados base dependiendo del nivel de Mejora 'suerte'
  let chanceMejora = mejoras.suerte.nivel * 0.08;
  if (Math.random() < chanceMejora) s2 = s1;
  if (s1 === s2 && Math.random() < chanceMejora * 0.5) s3 = s1;

  // Secuencia de detención progresiva de los rodillos
  await animarRodillo("reel1", 400, s1);
  await animarRodillo("reel2", 800, s2);
  await animarRodillo("reel3", 1200, s3);

  calcularPremios(s1, s2, s3);
}

/**
 * @function calcularPremios
 * @description Analiza la combinación extraída de los rodillos, calcula la matemática de los ingresos
 * según los multiplicadores y emite la orden de subida de experiencia.
 * @param {string} s1 - Símbolo de la ranura izquierda.
 * @param {string} s2 - Símbolo de la ranura central.
 * @param {string} s3 - Símbolo de la ranura derecha.
 * @returns {void}
 */
function calcularPremios(s1, s2, s3) {
  let base = 50 * nivel * (1 + mejoras.base.nivel * 1.5);
  let ganancias = 0;

  // Lógica de combinaciones
  if (s1 === s2 && s2 === s3) {
    let multiJackpot = 10 * (1 + mejoras.jackpot.nivel * 0.8);
    ganancias = base * multiJackpot;
    mostrarMensajePremio(`¡JACKPOT!\n+${Math.floor(ganancias)}`);
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    let multiMini = 2 * (1 + mejoras.mini.nivel * 0.5);
    ganancias = base * multiMini;
    mostrarMensajePremio(`¡Mini!\n+${Math.floor(ganancias)}`);
  } else {
    domElements.mensaje.classList.remove("show");
  }

  fichas += ganancias;

  // La experiencia sube con las tiradas, excepto al llegar al máximo.
  if (!(nivel === 3 && exp >= expParaNivel)) {
    exp += ganancias; 
  }

  enMovimiento = false;
  domElements.btnSpin.disabled = false;

  verificarSubidaNivel();
  actualizarInterfaz();
}

/**
 * @function mostrarMensajePremio
 * @description Utilidad que muestra temporalmente un mensaje flotante con CSS transition en la pantalla.
 * @param {string} texto - El String a visualizar en la interfaz.
 * @returns {void}
 */
function mostrarMensajePremio(texto) {
  domElements.mensaje.innerText = texto;
  domElements.mensaje.classList.add("show");

  if (timeoutMensaje) clearTimeout(timeoutMensaje);

  // Auto-oculta la notificación pasados 2 segundos
  timeoutMensaje = setTimeout(() => {
    domElements.mensaje.classList.remove("show");
  }, 2000);
}

// ==========================================
// ASIGNACIÓN DE EVENTOS DE INTERFAZ
// ==========================================

domElements.btnSpin.addEventListener("click", iniciarTirada);
domElements.btnShop.addEventListener("click", () => (domElements.modal.style.display = "flex"));
domElements.closeShop.addEventListener("click", () => (domElements.modal.style.display = "none"));

// Cierra la tienda al hacer clic fuera del recuadro
window.onclick = (e) => {
  if (e.target === domElements.modal) domElements.modal.style.display = "none";
};

// Binding (Enlace) para eventos de compra
document.getElementById("btn-buy-luck").addEventListener("click", () => comprarMejora("suerte"));
document.getElementById("btn-buy-jackpot").addEventListener("click", () => comprarMejora("jackpot"));
document.getElementById("btn-buy-mini").addEventListener("click", () => comprarMejora("mini"));
document.getElementById("btn-buy-passive").addEventListener("click", () => comprarMejora("passive"));
document.getElementById("btn-buy-base").addEventListener("click", () => comprarMejora("base"));

// ==========================================
// INICIALIZACIÓN
// ==========================================

// Configuración inicial del aspecto del juego
document.body.className = `nivel-${nivel}`;
domElements.nivelNombre.innerText = datosNivel[nivel].nombre;

// Primer render de variables al iniciar el documento
actualizarInterfaz();
