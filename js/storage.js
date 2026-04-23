/**
 * Módulo de persistencia del juego.
 * Gestiona el guardado y la carga de la partida usando localStorage.
 *
 * Patrón de refactorización aplicado:
 *  - Encapsulate Fields (4.3.G): los datos se acceden solo mediante métodos públicos.
 *  - Introduce Constant (4.3.E.b): la clave de almacenamiento es una constante.
 *
 * @author Paco, Majemami, Polanco, Abraham
 * @version 1.0
 * @since 2026-04-22
 * @see GameManager
 */

// ── Introduce Constant (4.3.E.b) ──────────────────────────────
// Evitamos usar la cadena "casino_clicker_save" suelta por el código.
const CLAVE_GUARDADO = "casino_clicker_save";

/**
 * Versión del formato de guardado.
 * Si cambiamos la estructura, incrementamos esto para invalidar
 * partidas antiguas incompatibles.
 * @constant {number}
 */
const VERSION_GUARDADO = 1;

// ═══════════════════════════════════════════════════════════════
// CLASE Storage
// ═══════════════════════════════════════════════════════════════

class Storage {

    // ── Encapsulate Fields (4.3.G) ────────────────────────────
    // El campo _clave es privado; se expone solo por getter.
    /**
     * Crea una instancia del sistema de almacenamiento.
     *
     * @param {string} [clave=CLAVE_GUARDADO] - Clave de localStorage.
     */
    constructor(clave = CLAVE_GUARDADO) {
        /** @private */
        this._clave = clave;
    }

    // ── Getter — Encapsulate Fields (4.3.G) ───────────────────
    /**
     * Devuelve la clave de almacenamiento utilizada.
     * @returns {string} La clave de localStorage.
     */
    get clave() {
        return this._clave;
    }

    // ── guardarPartida ────────────────────────────────────────
    /**
     * Serializa el estado actual del juego y lo almacena en localStorage.
     *
     * @param {Object} estadoJuego - Objeto con el estado completo del juego.
     * @param {number} estadoJuego.monedas        - Monedas actuales del jugador.
     * @param {number} estadoJuego.monedasTotales  - Total de monedas ganadas en toda la partida.
     * @param {number} estadoJuego.apuesta         - Apuesta actual por tirada.
     * @param {number} estadoJuego.monedasPorSegundo - Generación pasiva.
     * @param {number} estadoJuego.tiradas         - Número total de tiradas realizadas.
     * @param {Object} estadoJuego.mejoras         - Mapa de mejoras compradas y sus niveles.
     * @param {string[]} estadoJuego.logros        - IDs de logros desbloqueados.
     * @returns {boolean} True si se guardó correctamente, false en caso de error.
     */
    guardarPartida(estadoJuego) {
        try {
            const datosGuardado = {
                version: VERSION_GUARDADO,
                timestamp: Date.now(),
                estado: estadoJuego
            };

            const datosSerializados = JSON.stringify(datosGuardado);
            localStorage.setItem(this._clave, datosSerializados);
            return true;
        } catch (error) {
            console.error("Error al guardar la partida:", error);
            return false;
        }
    }

    // ── cargarPartida ─────────────────────────────────────────
    /**
     * Recupera el estado del juego desde localStorage.
     *
     * @returns {Object|null} El estado del juego guardado, o null si no existe
     *                        o la versión es incompatible.
     */
    cargarPartida() {
        try {
            const datosSerializados = localStorage.getItem(this._clave);

            if (!datosSerializados) {
                console.log("No se encontró partida guardada.");
                return null;
            }

            const datosGuardado = JSON.parse(datosSerializados);

            // Verificamos la versión del formato
            if (datosGuardado.version !== VERSION_GUARDADO) {
                console.warn(
                    `Versión de guardado incompatible: ` +
                    `esperada ${VERSION_GUARDADO}, encontrada ${datosGuardado.version}`
                );
                return null;
            }

            return datosGuardado.estado;
        } catch (error) {
            console.error("Error al cargar la partida:", error);
            return null;
        }
    }

    // ── borrarPartida ─────────────────────────────────────────
    /**
     * Elimina la partida guardada de localStorage.
     * @returns {boolean} True si se borró correctamente.
     */
    borrarPartida() {
        try {
            localStorage.removeItem(this._clave);
            console.log("Partida borrada correctamente.");
            return true;
        } catch (error) {
            console.error("Error al borrar la partida:", error);
            return false;
        }
    }

    // ── existePartida ─────────────────────────────────────────
    /**
     * Comprueba si existe una partida guardada.
     * @returns {boolean} True si hay una partida almacenada.
     */
    existePartida() {
        return localStorage.getItem(this._clave) !== null;
    }
}
