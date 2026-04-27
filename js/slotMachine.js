/**
 * Módulo de la máquina tragaperras.
 * Refactorización completa: usa imágenes en vez de emojis.
 *
 * Patrones de refactorización aplicados:
 *  - Move (4.3.B): clase movida de script.js a js/slotMachine.js.
 *  - Rename (4.3.A): variables renombradas para mayor claridad.
 *  - Introduce Constant (4.3.E.b): números mágicos extraídos.
 *  - Introduce Parameter (4.3.E.d): configuración inyectada.
 *  - Change Method Parameters (4.3.H): girar() acepta config.
 *
 * @author Paco, Majemami, Polanco, Abraham
 * @version 3.0
 * @since 2026-04-22
 */

// ── Introduce Constant (4.3.E.b) ─────────────────────────────

/**
 * Definición de símbolos con imagen y nombre.
 * Cada símbolo tiene un id, nombre, y ruta a su imagen.
 * @constant {Object[]}
 */
const SIMBOLOS = [
    { id: "cherry",     nombre: "Cereza",   imagen: "assets/symbols/cherry.png" },
    { id: "lemon",      nombre: "Limón",    imagen: "assets/symbols/lemon.png" },
    { id: "watermelon", nombre: "Sandía",   imagen: "assets/symbols/watermelon.png" },
    { id: "star",       nombre: "Estrella", imagen: "assets/symbols/star.png" },
    { id: "diamond",    nombre: "Diamante", imagen: "assets/symbols/diamond.png" },
    { id: "bell",       nombre: "Campana",  imagen: "assets/symbols/bell.png" },
    { id: "clover",     nombre: "Trébol",   imagen: "assets/symbols/clover.png" },
];

/** Cuántas copias de la tira de símbolos se generan en el DOM. */
const COPIAS_TIRA_SIMBOLOS = 15;

/** Vueltas completas de inercia antes de frenar. */
const VUELTAS_INERCIA = 10;

/** Duración base de la animación de giro en segundos. */
const DURACION_BASE_GIRO = 3;

/** Milisegundos de margen para que CSS procese el reseteo. */
const MARGEN_RESETEO_MS = 50;

/** Curva de frenado realista. */
const CURVA_FRENADO = "cubic-bezier(0.15, 0.85, 0.15, 1)";


// ═══════════════════════════════════════════════════════════════
// CLASE Rodillo
// ═══════════════════════════════════════════════════════════════

/**
 * Representa un rodillo individual de la máquina tragaperras.
 * Usa imágenes para los símbolos en vez de emojis.
 *
 * @class Rodillo
 */
class Rodillo {

    /**
     * @param {string} idElemento - ID del elemento HTML del rodillo.
     * @param {number} retardoSegundos - Segundos extra de giro.
     */
    constructor(idElemento, retardoSegundos) {
        /** @type {HTMLElement} */
        this.elementoTira = document.getElementById(idElemento);
        /** @type {number} */
        this.retardoSegundos = retardoSegundos;
        /** @type {number} */
        this.indicePosicion = 0;

        this._inicializarDOM();
    }

    /**
     * Genera la tira de símbolos con imágenes en el DOM.
     * @private
     */
    _inicializarDOM() {
        this.elementoTira.innerHTML = "";

        for (let indiceCopia = 0; indiceCopia < COPIAS_TIRA_SIMBOLOS; indiceCopia++) {
            SIMBOLOS.forEach((simbolo) => {
                const divSimbolo = document.createElement("div");
                divSimbolo.className = "simbolo";

                const imgSimbolo = document.createElement("img");
                imgSimbolo.src = simbolo.imagen;
                imgSimbolo.alt = simbolo.nombre;
                imgSimbolo.className = "simbolo-img";
                imgSimbolo.draggable = false;

                divSimbolo.appendChild(imgSimbolo);
                this.elementoTira.appendChild(divSimbolo);
            });
        }

        // Reseteo silencioso al terminar animación
        this.elementoTira.addEventListener("transitionend", () => {
            this.elementoTira.style.transition = "none";
            const indiceRealEnTira = this.indicePosicion % SIMBOLOS.length;
            this.elementoTira.style.transform =
                `translateY(calc(var(--size) * -${indiceRealEnTira}))`;
            this.indicePosicion = indiceRealEnTira;
        });
    }

    /**
     * Hace girar el rodillo.
     *
     * @param {Object} [config={}] - Configuración del giro.
     * @param {number} [config.duracionBase] - Duración base en segundos.
     * @returns {Promise<string>} ID del símbolo ganador.
     */
    girar(config = {}) {
        const duracionBaseSegundos = config.duracionBase ?? DURACION_BASE_GIRO;

        return new Promise((resolve) => {
            const indiceSimboloDestino = Math.floor(Math.random() * SIMBOLOS.length);
            const vueltasCompletas = SIMBOLOS.length * VUELTAS_INERCIA;
            const diferenciaPosicion = indiceSimboloDestino - (this.indicePosicion % SIMBOLOS.length);
            const saltosTotales = vueltasCompletas + diferenciaPosicion;

            this.indicePosicion += saltosTotales;

            const duracionAnimacionSegundos = duracionBaseSegundos + this.retardoSegundos;

            setTimeout(() => {
                this.elementoTira.style.transition =
                    `transform ${duracionAnimacionSegundos}s ${CURVA_FRENADO}`;
                this.elementoTira.style.transform =
                    `translateY(calc(var(--size) * -${this.indicePosicion}))`;
            }, MARGEN_RESETEO_MS);

            setTimeout(() => {
                resolve(SIMBOLOS[indiceSimboloDestino].id);
            }, duracionAnimacionSegundos * 1000);
        });
    }
}
