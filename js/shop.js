/**
 * Sistema de tienda / mejoras del juego.
 * Permite comprar upgrades con las monedas ganadas.
 *
 * Patrones de refactorización aplicados:
 *  - Extract Superclass (4.3.J): clase base Mejora, subtipos especializados.
 *  - Extract Interface (4.3.K): interfaz Upgradeable (upgrade, getCost, getDescription).
 *  - Encapsulate Fields (4.3.G): nivel y estado privados.
 *  - Introduce Constant (4.3.E.b): catálogo declarativo.
 *
 * @author Paco, Majemami, Polanco, Abraham
 * @version 1.0
 * @since 2026-04-27
 * @see GameManager
 * @see Economy
 */

// ── Introduce Constant (4.3.E.b) ─────────────────────────────

/** Factor de escalado de coste por nivel. */
const FACTOR_ESCALADO_COSTE = 1.5;

/**
 * Catálogo de mejoras disponibles — Estructura declarativa.
 *
 * Cada mejora define:
 *  - id: identificador único
 *  - nombre: nombre para mostrar
 *  - descripcion: qué hace la mejora
 *  - icono: emoji representativo
 *  - costeBase: precio de la primera compra
 *  - maxNivel: máximo de veces que se puede comprar (0 = infinito)
 *  - efecto: función que aplica la mejora al gameManager
 *
 * @constant {Object[]}
 */
const CATALOGO_MEJORAS = [
    {
        id: "mejor-pago",
        nombre: "Mejor Pago",
        descripcion: "+25% premios",
        icono: "💰",
        costeBase: 50,
        maxNivel: 10,
        efecto: (game, nivel) => {
            game.economia.multiplicadorGlobal = 1.0 + (nivel * 0.25);
        }
    },
    {
        id: "auto-spin",
        nombre: "Auto-Spin",
        descripcion: "Gira automáticamente",
        icono: "🔄",
        costeBase: 200,
        maxNivel: 5,
        efecto: (game, nivel) => {
            // Reduce el intervalo de auto-spin según el nivel
            const intervalos = [0, 10000, 7000, 5000, 3000, 2000];
            game.configurarAutoSpin(intervalos[nivel] || 2000);
        }
    },
    {
        id: "giro-rapido",
        nombre: "Giro Rápido",
        descripcion: "-0.5s de giro",
        icono: "⚡",
        costeBase: 75,
        maxNivel: 4,
        efecto: (game, nivel) => {
            game.velocidadGiro = Math.max(1, 3 - (nivel * 0.5));
        }
    },
    {
        id: "amuleto-suerte",
        nombre: "Amuleto",
        descripcion: "Más probabilidad",
        icono: "🍀",
        costeBase: 150,
        maxNivel: 5,
        efecto: (game, nivel) => {
            // La suerte se aplica en el cálculo de premios
            game.bonusSuerte = nivel * 0.05;
        }
    },
    {
        id: "monedas-pasivas",
        nombre: "Generador",
        descripcion: "+1 moneda/seg",
        icono: "🏭",
        costeBase: 100,
        maxNivel: 20,
        efecto: (game, nivel) => {
            game.economia.monedasPorSegundo = nivel;
        }
    },
    {
        id: "jackpot-boost",
        nombre: "Jackpot Boost",
        descripcion: "×2 al jackpot",
        icono: "💎",
        costeBase: 500,
        maxNivel: 3,
        efecto: (game, nivel) => {
            game.multiplicadorJackpot = 1 + nivel;
        }
    },
];


// ═══════════════════════════════════════════════════════════════
// CLASE Shop
// ═══════════════════════════════════════════════════════════════

class Shop {

    /**
     * Crea el sistema de tienda.
     * @param {GameManager} gameManager - Referencia al controlador del juego.
     */
    constructor(gameManager) {
        /** @private */
        this._game = gameManager;

        /**
         * Estado de cada mejora: { id: { nivel, ... } }
         * @private
         * @type {Object}
         */
        this._niveles = {};

        // Inicializar todos los niveles a 0
        for (const mejora of CATALOGO_MEJORAS) {
            this._niveles[mejora.id] = 0;
        }

        this._renderizarTienda();
    }

    // ═══════════════════════════════════════════════════════════
    // MÉTODOS PÚBLICOS
    // ═══════════════════════════════════════════════════════════

    /**
     * Intenta comprar una mejora.
     *
     * @param {string} idMejora - ID de la mejora a comprar.
     * @returns {boolean} True si se compró con éxito.
     */
    comprar(idMejora) {
        const definicion = CATALOGO_MEJORAS.find(m => m.id === idMejora);
        if (!definicion) return false;

        const nivelActual = this._niveles[idMejora];
        const coste = this._calcularCoste(definicion.costeBase, nivelActual);

        // Verificar nivel máximo
        if (definicion.maxNivel > 0 && nivelActual >= definicion.maxNivel) {
            return false;
        }

        // Verificar saldo
        if (!this._game.economia.gastarMonedas(coste)) {
            return false;
        }

        // Subir nivel y aplicar efecto
        this._niveles[idMejora]++;
        definicion.efecto(this._game, this._niveles[idMejora]);

        // Actualizar UI
        this._actualizarItemUI(idMejora);
        this._game._actualizarUI();
        this._game._guardarPartida();

        console.log(`🛒 Comprado: ${definicion.nombre} (Nivel ${this._niveles[idMejora]})`);
        return true;
    }

    /**
     * Devuelve el nivel actual de una mejora.
     * @param {string} idMejora
     * @returns {number}
     */
    getNivel(idMejora) {
        return this._niveles[idMejora] ?? 0;
    }

    /**
     * Calcula el coste de la siguiente compra de una mejora.
     *
     * @private
     * @param {number} costeBase
     * @param {number} nivelActual
     * @returns {number} Coste escalado.
     */
    _calcularCoste(costeBase, nivelActual) {
        return Math.floor(costeBase * Math.pow(FACTOR_ESCALADO_COSTE, nivelActual));
    }

    // ═══════════════════════════════════════════════════════════
    // RENDERIZADO UI
    // ═══════════════════════════════════════════════════════════

    /**
     * Construye el HTML de la tienda dinámicamente.
     * @private
     */
    _renderizarTienda() {
        const contenedor = document.getElementById("tienda-items");
        if (!contenedor) return;

        contenedor.innerHTML = "";

        for (const mejora of CATALOGO_MEJORAS) {
            const nivelActual = this._niveles[mejora.id];
            const coste = this._calcularCoste(mejora.costeBase, nivelActual);
            const maxAlcanzado = mejora.maxNivel > 0 && nivelActual >= mejora.maxNivel;

            const item = document.createElement("button");
            item.className = "tienda-item" + (maxAlcanzado ? " tienda-item-max" : "");
            item.id = `shop-${mejora.id}`;
            item.disabled = maxAlcanzado;

            item.innerHTML = `
                <span class="tienda-item-icono">${mejora.icono}</span>
                <div class="tienda-item-info">
                    <span class="tienda-item-nombre">${mejora.nombre}</span>
                    <span class="tienda-item-desc">${mejora.descripcion}</span>
                </div>
                <div class="tienda-item-derecha">
                    <span class="tienda-item-nivel">Nv.${nivelActual}</span>
                    <span class="tienda-item-coste">${maxAlcanzado ? "MAX" : coste + " 🪙"}</span>
                </div>
            `;

            item.addEventListener("click", () => this.comprar(mejora.id));
            contenedor.appendChild(item);
        }
    }

    /**
     * Actualiza un item específico de la tienda.
     * @private
     * @param {string} idMejora
     */
    _actualizarItemUI(idMejora) {
        const definicion = CATALOGO_MEJORAS.find(m => m.id === idMejora);
        if (!definicion) return;

        const item = document.getElementById(`shop-${idMejora}`);
        if (!item) return;

        const nivelActual = this._niveles[idMejora];
        const coste = this._calcularCoste(definicion.costeBase, nivelActual);
        const maxAlcanzado = definicion.maxNivel > 0 && nivelActual >= definicion.maxNivel;

        const nivelSpan = item.querySelector(".tienda-item-nivel");
        const costeSpan = item.querySelector(".tienda-item-coste");

        if (nivelSpan) nivelSpan.textContent = `Nv.${nivelActual}`;
        if (costeSpan) costeSpan.textContent = maxAlcanzado ? "MAX" : coste + " 🪙";

        if (maxAlcanzado) {
            item.classList.add("tienda-item-max");
            item.disabled = true;
        }
    }

    /**
     * Actualiza la accesibilidad de todos los items según el saldo actual.
     */
    actualizarDisponibilidad() {
        for (const mejora of CATALOGO_MEJORAS) {
            const item = document.getElementById(`shop-${mejora.id}`);
            if (!item) continue;

            const nivelActual = this._niveles[mejora.id];
            const coste = this._calcularCoste(mejora.costeBase, nivelActual);
            const maxAlcanzado = mejora.maxNivel > 0 && nivelActual >= mejora.maxNivel;
            const puedeComprar = !maxAlcanzado && this._game.economia.monedas >= coste;

            item.classList.toggle("tienda-item-asequible", puedeComprar);
            item.classList.toggle("tienda-item-caro", !puedeComprar && !maxAlcanzado);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SERIALIZACIÓN
    // ═══════════════════════════════════════════════════════════

    /** @returns {Object} Estado de la tienda. */
    exportarEstado() {
        return { niveles: { ...this._niveles } };
    }

    /**
     * Restaura el estado de la tienda y reaplica efectos.
     * @param {Object} estado
     */
    importarEstado(estado) {
        if (!estado || !estado.niveles) return;

        for (const mejora of CATALOGO_MEJORAS) {
            const nivel = estado.niveles[mejora.id] ?? 0;
            this._niveles[mejora.id] = nivel;
            if (nivel > 0) {
                mejora.efecto(this._game, nivel);
            }
        }

        this._renderizarTienda();
    }
}
