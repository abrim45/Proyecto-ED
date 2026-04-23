/**
 * Controlador principal del juego Casino Clicker.
 * Orquesta todos los módulos: economía, rodillos, almacenamiento.
 *
 * Patrones de refactorización aplicados:
 *  - Extract Method (4.3.E.e): cada acción del juego es un método separado.
 *  - Introduce Field (4.3.E.c): estado del juego como atributos de clase.
 *  - Inline (4.3.I): métodos triviales integrados donde corresponde.
 *
 * @author Paco, Majemami, Polanco, Abraham
 * @version 1.0
 * @since 2026-04-22
 */

// ── Introduce Constant (4.3.E.b) ─────────────────────────────
/** Intervalo en ms del game loop para generación pasiva. */
const INTERVALO_GAME_LOOP_MS = 1000;

/** Intervalo en ms del autoguardado. */
const INTERVALO_AUTOGUARDADO_MS = 30000;

/** Retardo en segundos entre cada rodillo al parar. */
const RETARDO_ENTRE_RODILLOS = 1;

/** Número de rodillos de la máquina (3 según diseño SLOT.png). */
const NUMERO_RODILLOS = 3;


// ═══════════════════════════════════════════════════════════════
// CLASE GameManager
// ═══════════════════════════════════════════════════════════════

class GameManager {

    /**
     * Inicializa el juego: crea módulos, carga partida, bindea eventos.
     */
    constructor() {
        // ── Introduce Field (4.3.E.c) ─────────────────────────
        /** @type {Economy} */
        this.economia = new Economy();

        /** @type {Storage} */
        this.almacenamiento = new Storage();

        /** @type {Rodillo[]} */
        this.rodillos = [];

        /** @type {boolean} True mientras los rodillos giran. */
        this.girando = false;

        /** @type {number|null} ID del intervalo del game loop. */
        this._gameLoopId = null;

        /** @type {number|null} ID del intervalo de autoguardado. */
        this._autoguardadoId = null;

        /** @type {number} Timestamp del último tick del game loop. */
        this._ultimoTick = Date.now();

        // Inicialización
        this._inicializarRodillos();
        this._cargarPartidaGuardada();
        this._bindearEventos();
        this._iniciarGameLoop();
        this._iniciarAutoguardado();
        this._actualizarUI();

        console.log("🎰 Casino Clicker iniciado.");
    }

    // ══════════════════════════════════════════════════════════
    // INICIALIZACIÓN — Extract Method (4.3.E.e)
    // ══════════════════════════════════════════════════════════

    /**
     * Crea las instancias de los rodillos con retardo escalonado.
     * @private
     */
    _inicializarRodillos() {
        for (let indice = 0; indice < NUMERO_RODILLOS; indice++) {
            const retardoEscalonado = indice * RETARDO_ENTRE_RODILLOS;
            const rodillo = new Rodillo(`rodillo${indice + 1}`, retardoEscalonado);
            this.rodillos.push(rodillo);
        }
    }

    /**
     * Intenta cargar la partida guardada desde localStorage.
     * @private
     */
    _cargarPartidaGuardada() {
        if (this.almacenamiento.existePartida()) {
            const estadoGuardado = this.almacenamiento.cargarPartida();
            if (estadoGuardado && estadoGuardado.economia) {
                this.economia.importarEstado(estadoGuardado.economia);
                console.log("💾 Partida cargada correctamente.");
            }
        }
    }

    /**
     * Vincula todos los event listeners del DOM.
     * @private
     */
    _bindearEventos() {
        // Botón de girar
        const botonGirar = document.getElementById("btn-girar");
        if (botonGirar) {
            botonGirar.addEventListener("click", () => this.tirar());
        }

        // Controles de apuesta
        const botonSubirApuesta = document.getElementById("btn-subir-apuesta");
        const botonBajarApuesta = document.getElementById("btn-bajar-apuesta");

        if (botonSubirApuesta) {
            botonSubirApuesta.addEventListener("click", () => this.cambiarApuesta(5));
        }
        if (botonBajarApuesta) {
            botonBajarApuesta.addEventListener("click", () => this.cambiarApuesta(-5));
        }

        // Botón reset (nueva partida)
        const botonReset = document.getElementById("btn-reset");
        if (botonReset) {
            botonReset.addEventListener("click", () => this.resetearPartida());
        }
    }

    // ══════════════════════════════════════════════════════════
    // GAME LOOP
    // ══════════════════════════════════════════════════════════

    /**
     * Inicia el bucle principal del juego para generación pasiva.
     * @private
     */
    _iniciarGameLoop() {
        this._gameLoopId = setInterval(() => {
            const ahora = Date.now();
            const deltaSegundos = (ahora - this._ultimoTick) / 1000;
            this._ultimoTick = ahora;

            // Generar monedas pasivas
            const monedasGeneradas = this.economia.generarMonedasPasivas(deltaSegundos);
            if (monedasGeneradas > 0) {
                this._actualizarUI();
            }
        }, INTERVALO_GAME_LOOP_MS);
    }

    /**
     * Inicia el autoguardado periódico.
     * @private
     */
    _iniciarAutoguardado() {
        this._autoguardadoId = setInterval(() => {
            this._guardarPartida();
        }, INTERVALO_AUTOGUARDADO_MS);
    }

    // ══════════════════════════════════════════════════════════
    // ACCIONES DEL JUGADOR
    // ══════════════════════════════════════════════════════════

    /**
     * Ejecuta una tirada completa:
     * 1. Cobra la apuesta
     * 2. Gira los rodillos
     * 3. Calcula y cobra el premio
     * 4. Actualiza la UI
     */
    async tirar() {
        if (this.girando) return;

        // ¿Tiene saldo suficiente?
        if (!this.economia.puedeTirar()) {
            this._mostrarMensaje("💸 ¡No tienes suficientes monedas!", "error");
            return;
        }

        this.girando = true;
        this._actualizarEstadoBoton(true);

        // 1. Cobrar apuesta
        this.economia.realizarApuesta();
        this._actualizarUI();

        // 2. Girar todos los rodillos en paralelo
        const simbolosResultado = await Promise.all(
            this.rodillos.map((rodillo) => rodillo.girar())
        );

        // 3. Calcular premio
        const resultado = this.economia.calcularPremio(simbolosResultado);

        // 4. Cobrar premio
        this.economia.cobrarPremio(resultado.premio);

        // 5. Mostrar resultado
        this._mostrarResultadoTirada(resultado);
        this._actualizarUI();

        // 6. Guardar partida
        this._guardarPartida();

        this.girando = false;
        this._actualizarEstadoBoton(false);
    }

    /**
     * Modifica la apuesta en la cantidad indicada.
     * @param {number} incremento - Cantidad a sumar (puede ser negativa).
     */
    cambiarApuesta(incremento) {
        try {
            const nuevaApuesta = this.economia.apuesta + incremento;
            this.economia.apuesta = Math.max(APUESTA_MINIMA, nuevaApuesta);
            this._actualizarUI();
        } catch (error) {
            console.warn(error.message);
        }
    }

    /**
     * Resetea la partida completamente.
     */
    resetearPartida() {
        if (confirm("¿Seguro que quieres empezar de nuevo? Se perderá todo el progreso.")) {
            this.almacenamiento.borrarPartida();
            this.economia = new Economy();
            this._actualizarUI();
            this._mostrarMensaje("🔄 Nueva partida iniciada.", "info");
        }
    }

    // ══════════════════════════════════════════════════════════
    // ACTUALIZACIÓN DE UI — Extract Method (4.3.E.e)
    // ══════════════════════════════════════════════════════════

    /**
     * Actualiza todos los elementos visuales de la interfaz.
     * @private
     */
    _actualizarUI() {
        this._actualizarElemento("display-monedas", this._formatearNumero(this.economia.monedas));
        this._actualizarElemento("display-apuesta", this.economia.apuesta);
        this._actualizarElemento("display-tiradas", this.economia.tiradas);
        this._actualizarElemento("display-racha", this.economia.rachaVictorias);
        this._actualizarElemento("display-mps", this.economia.monedasPorSegundo);

        // Desactivar botón si no puede tirar
        const botonGirar = document.getElementById("btn-girar");
        if (botonGirar && !this.girando) {
            botonGirar.disabled = !this.economia.puedeTirar();
        }
    }

    /**
     * Actualiza el texto de un elemento del DOM de forma segura.
     * @private
     * @param {string} idElemento - ID del elemento.
     * @param {string|number} valor - Nuevo contenido.
     */
    _actualizarElemento(idElemento, valor) {
        const elemento = document.getElementById(idElemento);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    /**
     * Formatea un número grande con separadores de miles.
     * @private
     * @param {number} numero
     * @returns {string} Número formateado.
     */
    _formatearNumero(numero) {
        return numero.toLocaleString("es-ES");
    }

    /**
     * Cambia el estado visual del botón de girar.
     * @private
     * @param {boolean} desactivado
     */
    _actualizarEstadoBoton(desactivado) {
        const botonGirar = document.getElementById("btn-girar");
        if (botonGirar) {
            botonGirar.disabled = desactivado;
            botonGirar.style.filter = desactivado ? "grayscale(1)" : "none";
        }
    }

    /**
     * Muestra el resultado de una tirada en la UI.
     * @private
     * @param {Object} resultado - Resultado del cálculo de premio.
     */
    _mostrarResultadoTirada(resultado) {
        const elementoResultado = document.getElementById("resultado-tirada");
        if (!elementoResultado) return;

        if (resultado.premio > 0) {
            elementoResultado.textContent = `${resultado.nombre} — +${this._formatearNumero(resultado.premio)} 🪙`;
            elementoResultado.className = "resultado resultado-premio";
        } else {
            elementoResultado.textContent = "Sin premio — ¡Inténtalo de nuevo!";
            elementoResultado.className = "resultado resultado-nada";
        }

        // Animación de fade
        elementoResultado.style.animation = "none";
        elementoResultado.offsetHeight; // Force reflow
        elementoResultado.style.animation = "fadeInOut 2.5s ease forwards";
    }

    /**
     * Muestra un mensaje temporal al jugador.
     * @private
     * @param {string} mensaje - Texto a mostrar.
     * @param {string} tipo - "info", "error", "exito".
     */
    _mostrarMensaje(mensaje, tipo) {
        const elementoMensaje = document.getElementById("mensaje-juego");
        if (!elementoMensaje) return;

        elementoMensaje.textContent = mensaje;
        elementoMensaje.className = `mensaje mensaje-${tipo}`;
        elementoMensaje.style.animation = "none";
        elementoMensaje.offsetHeight;
        elementoMensaje.style.animation = "fadeInOut 3s ease forwards";
    }

    // ══════════════════════════════════════════════════════════
    // PERSISTENCIA
    // ══════════════════════════════════════════════════════════

    /**
     * Guarda el estado actual de la partida.
     * @private
     */
    _guardarPartida() {
        const estadoCompleto = {
            economia: this.economia.exportarEstado(),
            // Aquí se añadirán más módulos: tienda, logros, etc.
        };
        this.almacenamiento.guardarPartida(estadoCompleto);
    }
}

// ══════════════════════════════════════════════════════════════
// INICIALIZACIÓN — El juego arranca cuando el DOM está listo
// ══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    window.juego = new GameManager();
});
