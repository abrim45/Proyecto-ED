/**
 * Módulo de economía del juego.
 * Gestiona monedas, apuestas, cálculo de premios y generación pasiva.
 *
 * Patrones de refactorización aplicados:
 *  - Encapsulate Fields (4.3.G): acceso a monedas solo por getters/setters.
 *  - Introduce Constant (4.3.E.b): tabla de premios como constante.
 *  - Sustituir Algoritmo (4.3.C): premios con tabla declarativa.
 *  - Variables Autoexplicativas (4.3.F): nombres claros.
 *  - Extract Method (4.3.E.e): lógica separada en métodos cortos.
 *
 * @author Paco, Majemami, Polanco, Abraham
 * @version 1.0
 * @since 2026-04-22
 * @see GameManager
 */

// ── Introduce Constant (4.3.E.b) ─────────────────────────────
const MONEDAS_INICIALES = 100;
const APUESTA_MINIMA = 5;
const APUESTA_POR_DEFECTO = 10;

/**
 * Tabla de premios — Sustituir Algoritmo (4.3.C):
 * Estructura declarativa en vez de if/else anidados.
 * @constant {Object[]}
 */
const TABLA_PREMIOS = [
    { coincidencias: 3, multiplicador: 50, nombre: "💎 JACKPOT" },
    { coincidencias: 2, multiplicador: 5,  nombre: "✨ DOBLE" },
];

/** @constant {Object} Bonus extra según el símbolo ganador (por ID). */
const BONUS_SIMBOLOS = {
    "diamond": 2.0,
    "star":    1.5,
    "bell":    1.25,
};

// ═══════════════════════════════════════════════════════════════
class Economy {
    /**
     * @param {Object} [config={}] - Configuración inicial.
     * @param {number} [config.monedasIniciales] - Saldo inicial.
     * @param {number} [config.apuestaInicial] - Apuesta inicial.
     */
    constructor(config = {}) {
        /** @private */ this._monedas = config.monedasIniciales ?? MONEDAS_INICIALES;
        /** @private */ this._monedasTotales = this._monedas;
        /** @private */ this._apuesta = config.apuestaInicial ?? APUESTA_POR_DEFECTO;
        /** @private */ this._monedasPorSegundo = 0;
        /** @private */ this._multiplicadorGlobal = 1.0;
        /** @private */ this._tiradas = 0;
        /** @private */ this._rachaVictorias = 0;
    }

    // ── Getters — Encapsulate Fields (4.3.G) ──────────────────
    get monedas() { return this._monedas; }
    get monedasTotales() { return this._monedasTotales; }
    get apuesta() { return this._apuesta; }
    get monedasPorSegundo() { return this._monedasPorSegundo; }
    get multiplicadorGlobal() { return this._multiplicadorGlobal; }
    get tiradas() { return this._tiradas; }
    get rachaVictorias() { return this._rachaVictorias; }

    // ── Setters ───────────────────────────────────────────────
    /**
     * Establece la apuesta actual (mín: APUESTA_MINIMA).
     * @param {number} nuevaApuesta
     */
    set apuesta(nuevaApuesta) {
        if (nuevaApuesta < APUESTA_MINIMA) {
            throw new Error(`La apuesta mínima es ${APUESTA_MINIMA} monedas.`);
        }
        this._apuesta = Math.min(nuevaApuesta, this._monedas);
    }

    /** @param {number} valor */
    set monedasPorSegundo(valor) { this._monedasPorSegundo = Math.max(0, valor); }

    /** @param {number} valor */
    set multiplicadorGlobal(valor) { this._multiplicadorGlobal = Math.max(1.0, valor); }

    // ── Métodos principales ───────────────────────────────────

    /**
     * Descuenta la apuesta del saldo. Se llama antes de girar.
     * @returns {boolean} True si tenía saldo suficiente.
     */
    realizarApuesta() {
        if (this._monedas < this._apuesta) return false;
        this._monedas -= this._apuesta;
        this._tiradas++;
        return true;
    }

    /**
     * Calcula el premio según los símbolos obtenidos.
     * Usa TABLA_PREMIOS (Sustituir Algoritmo 4.3.C).
     *
     * @param {string[]} simbolosResultado - Símbolos de cada rodillo.
     * @returns {Object} { premio, nombre, coincidencias, simboloGanador }
     */
    calcularPremio(simbolosResultado) {
        const conteo = this._contarSimbolos(simbolosResultado);
        const { simboloMasFrecuente, maximaCoincidencia } = this._obtenerMejorCoincidencia(conteo);

        for (const entrada of TABLA_PREMIOS) {
            if (maximaCoincidencia >= entrada.coincidencias) {
                const bonusSimbolo = BONUS_SIMBOLOS[simboloMasFrecuente] ?? 1.0;
                const premioCalculado = Math.floor(
                    this._apuesta * entrada.multiplicador * this._multiplicadorGlobal * bonusSimbolo
                );
                return {
                    premio: premioCalculado,
                    nombre: entrada.nombre,
                    coincidencias: maximaCoincidencia,
                    simboloGanador: simboloMasFrecuente
                };
            }
        }
        return { premio: 0, nombre: null, coincidencias: maximaCoincidencia, simboloGanador: null };
    }

    /**
     * Añade el premio al saldo y actualiza racha.
     * @param {number} cantidadPremio - Monedas a añadir.
     */
    cobrarPremio(cantidadPremio) {
        if (cantidadPremio > 0) {
            this._monedas += cantidadPremio;
            this._monedasTotales += cantidadPremio;
            this._rachaVictorias++;
        } else {
            this._rachaVictorias = 0;
        }
    }

    /**
     * Genera monedas pasivas (idle). Se llama cada segundo.
     * @param {number} deltaSegundos - Tiempo transcurrido.
     * @returns {number} Monedas generadas.
     */
    generarMonedasPasivas(deltaSegundos) {
        const monedasGeneradas = Math.floor(this._monedasPorSegundo * deltaSegundos);
        if (monedasGeneradas > 0) {
            this._monedas += monedasGeneradas;
            this._monedasTotales += monedasGeneradas;
        }
        return monedasGeneradas;
    }

    /**
     * Gasta monedas (para compras de tienda).
     * @param {number} cantidad
     * @returns {boolean} True si se descontó.
     */
    gastarMonedas(cantidad) {
        if (cantidad <= 0 || this._monedas < cantidad) return false;
        this._monedas -= cantidad;
        return true;
    }

    /**
     * Añade monedas (bonificaciones, logros).
     * @param {number} cantidad
     */
    añadirMonedas(cantidad) {
        if (cantidad > 0) {
            this._monedas += cantidad;
            this._monedasTotales += cantidad;
        }
    }

    /** @returns {boolean} Si tiene saldo para tirar. */
    puedeTirar() { return this._monedas >= this._apuesta; }

    // ── Métodos privados — Extract Method (4.3.E.e) ───────────

    /**
     * Cuenta apariciones de cada símbolo.
     * @private
     * @param {string[]} simbolos
     * @returns {Object} Mapa símbolo → cantidad.
     */
    _contarSimbolos(simbolos) {
        const conteo = {};
        for (const simbolo of simbolos) {
            conteo[simbolo] = (conteo[simbolo] || 0) + 1;
        }
        return conteo;
    }

    /**
     * Encuentra el símbolo con más coincidencias.
     * @private
     * @param {Object} conteoSimbolos
     * @returns {{ simboloMasFrecuente: string, maximaCoincidencia: number }}
     */
    _obtenerMejorCoincidencia(conteoSimbolos) {
        let simboloMasFrecuente = "";
        let maximaCoincidencia = 0;
        for (const [simbolo, cantidad] of Object.entries(conteoSimbolos)) {
            if (cantidad > maximaCoincidencia) {
                maximaCoincidencia = cantidad;
                simboloMasFrecuente = simbolo;
            }
        }
        return { simboloMasFrecuente, maximaCoincidencia };
    }

    // ── Serialización (para Storage) ──────────────────────────

    /** @returns {Object} Estado serializable. */
    exportarEstado() {
        return {
            monedas: this._monedas,
            monedasTotales: this._monedasTotales,
            apuesta: this._apuesta,
            monedasPorSegundo: this._monedasPorSegundo,
            multiplicadorGlobal: this._multiplicadorGlobal,
            tiradas: this._tiradas,
            rachaVictorias: this._rachaVictorias
        };
    }

    /**
     * Restaura estado desde partida guardada.
     * @param {Object} estado
     */
    importarEstado(estado) {
        if (!estado) return;
        this._monedas = estado.monedas ?? MONEDAS_INICIALES;
        this._monedasTotales = estado.monedasTotales ?? this._monedas;
        this._apuesta = estado.apuesta ?? APUESTA_POR_DEFECTO;
        this._monedasPorSegundo = estado.monedasPorSegundo ?? 0;
        this._multiplicadorGlobal = estado.multiplicadorGlobal ?? 1.0;
        this._tiradas = estado.tiradas ?? 0;
        this._rachaVictorias = estado.rachaVictorias ?? 0;
    }
}
