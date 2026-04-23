/**
 * Módulo de la máquina tragaperras.
 * Refactorización completa del script.js original.
 *
 * Patrones de refactorización aplicados:
 *  - Move (4.3.B): clase movida de script.js a js/slotMachine.js.
 *  - Rename (4.3.A): variables renombradas para mayor claridad.
 *  - Introduce Constant (4.3.E.b): números mágicos extraídos a constantes.
 *  - Introduce Parameter (4.3.E.d): configuración inyectada en constructor.
 *  - Variables Autoexplicativas (4.3.F): nombres descriptivos.
 *  - Change Method Parameters (4.3.H): girar() ahora acepta config.
 *
 * @author Paco, Majemami, Polanco, Abraham
 * @version 2.0
 * @since 2026-04-22
 * @see Economy
 */

// ── Introduce Constant (4.3.E.b) ─────────────────────────────
// Antes: números mágicos 15, 10, 3, 50 sueltos en el código.

/** Lista de símbolos disponibles en los rodillos. */
const SIMBOLOS = ["🍒", "🍋", "🍉", "⭐", "💎", "🔔", "🍀"];

/** Cuántas copias de la tira de símbolos se generan en el DOM. */
const COPIAS_TIRA_SIMBOLOS = 15;

/** Vueltas completas de inercia antes de frenar. */
const VUELTAS_INERCIA = 10;

/** Duración base de la animación de giro en segundos. */
const DURACION_BASE_GIRO = 3;

/** Milisegundos de margen para que CSS procese el reseteo. */
const MARGEN_RESETEO_MS = 50;

/** Curva de frenado realista (cubic-bezier). */
const CURVA_FRENADO = "cubic-bezier(0.15, 0.85, 0.15, 1)";


// ═══════════════════════════════════════════════════════════════
// CLASE Rodillo — Rename (4.3.A) de variables internas
// ═══════════════════════════════════════════════════════════════

/**
 * Representa un rodillo individual de la máquina tragaperras.
 *
 * Aplica el patrón Extract Class (ya existente en el original):
 * cada rodillo encapsula su propio estado, DOM y animación.
 *
 * @class Rodillo
 */
class Rodillo {

    /**
     * Crea un rodillo vinculado a un elemento del DOM.
     *
     * Introduce Parameter (4.3.E.d):
     * Antes el tiempoExtra estaba hardcodeado; ahora es un parámetro
     * configurable que permite ajustar el retardo entre rodillos.
     *
     * @param {string} idElemento - ID del elemento HTML del rodillo.
     * @param {number} retardoSegundos - Segundos extra de giro respecto al primero.
     */
    constructor(idElemento, retardoSegundos) {
        // ── Rename (4.3.A): nombres más descriptivos ──────────
        // Antes: this.elemento, this.tiempoExtra, this.posicionActual
        // Ahora: nombres que explican claramente su propósito.

        /** @type {HTMLElement} Elemento DOM de la tira de símbolos. */
        this.elementoTira = document.getElementById(idElemento);

        /** @type {number} Retardo adicional en segundos. */
        this.retardoSegundos = retardoSegundos;

        /**
         * Índice actual de la posición del rodillo.
         * Se usa para calcular el desplazamiento CSS.
         * @type {number}
         */
        this.indicePosicion = 0;

        this._inicializarDOM();
    }

    /**
     * Genera la tira de símbolos en el DOM y configura
     * el reseteo silencioso al terminar la animación.
     * @private
     */
    _inicializarDOM() {
        this.elementoTira.innerHTML = "";

        // Inyectamos COPIAS_TIRA_SIMBOLOS copias enteras de la lista
        // para que el rodillo pueda dar muchas vueltas sin quedarse sin tira.
        // Total de divs: COPIAS_TIRA_SIMBOLOS × SIMBOLOS.length
        for (let indiceCopia = 0; indiceCopia < COPIAS_TIRA_SIMBOLOS; indiceCopia++) {
            SIMBOLOS.forEach((simbolo) => {
                const divSimbolo = document.createElement("div");
                divSimbolo.className = "simbolo";
                divSimbolo.textContent = simbolo;
                this.elementoTira.appendChild(divSimbolo);
            });
        }

        // ── Reseteo silencioso ────────────────────────────────
        // Cuando termina la animación, mapeamos la posición al primer
        // bloque de símbolos sin que el jugador lo note.
        this.elementoTira.addEventListener("transitionend", () => {
            this.elementoTira.style.transition = "none";
            const indiceRealEnTira = this.indicePosicion % SIMBOLOS.length;
            this.elementoTira.style.transform =
                `translateY(calc(var(--size) * -${indiceRealEnTira}))`;
            this.indicePosicion = indiceRealEnTira;
        });
    }

    /**
     * Hace girar el rodillo con animación CSS.
     *
     * Change Method Parameters (4.3.H):
     * Ahora acepta un objeto de configuración opcional para poder
     * modificar la velocidad desde las mejoras de la tienda.
     *
     * @param {Object} [config={}] - Configuración del giro.
     * @param {number} [config.duracionBase=DURACION_BASE_GIRO] - Duración base en segundos.
     * @returns {Promise<string>} Promesa que resuelve con el símbolo ganador.
     */
    girar(config = {}) {
        // ── Variables Autoexplicativas (4.3.F) ────────────────
        const duracionBaseSegundos = config.duracionBase ?? DURACION_BASE_GIRO;

        return new Promise((resolve) => {
            // 1. Elegimos símbolo destino aleatorio
            const indiceSimboloDestino = Math.floor(Math.random() * SIMBOLOS.length);

            // 2. Calculamos saltos totales:
            //    vueltas de inercia + diferencia hasta el destino
            const vueltasCompletas = SIMBOLOS.length * VUELTAS_INERCIA;
            const diferenciaPosicion = indiceSimboloDestino - (this.indicePosicion % SIMBOLOS.length);
            const saltosTotales = vueltasCompletas + diferenciaPosicion;

            // 3. Actualizamos la posición acumulada
            this.indicePosicion += saltosTotales;

            // 4. Duración total = base + retardo escalonado
            const duracionAnimacionSegundos = duracionBaseSegundos + this.retardoSegundos;

            // 5. Aplicamos la animación CSS
            setTimeout(() => {
                this.elementoTira.style.transition =
                    `transform ${duracionAnimacionSegundos}s ${CURVA_FRENADO}`;
                this.elementoTira.style.transform =
                    `translateY(calc(var(--size) * -${this.indicePosicion}))`;
            }, MARGEN_RESETEO_MS);

            // 6. Resolvemos cuando termine la animación
            setTimeout(() => {
                resolve(SIMBOLOS[indiceSimboloDestino]);
            }, duracionAnimacionSegundos * 1000);
        });
    }
}
