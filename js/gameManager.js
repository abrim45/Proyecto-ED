/**
 * Controlador principal del juego Casino Clicker.
 * Orquesta todos los módulos: economía, rodillos, tienda, almacenamiento.
 *
 * Patrones de refactorización aplicados:
 *  - Extract Method (4.3.E.e): cada acción es un método separado.
 *  - Introduce Field (4.3.E.c): estado del juego como atributos.
 *  - Inline (4.3.I): métodos triviales integrados.
 *
 * @author Paco, Majemami, Polanco, Abraham
 * @version 2.0
 * @since 2026-04-22
 */

// ── Introduce Constant (4.3.E.b) ─────────────────────────────
const INTERVALO_GAME_LOOP_MS = 1000;
const INTERVALO_AUTOGUARDADO_MS = 30000;
const RETARDO_ENTRE_RODILLOS = 1;
const NUMERO_RODILLOS = 3;


// ═══════════════════════════════════════════════════════════════
class GameManager {

    constructor() {
        /** @type {Economy} */
        this.economia = new Economy();
        /** @type {Storage} */
        this.almacenamiento = new Storage();
        /** @type {Rodillo[]} */
        this.rodillos = [];
        /** @type {Shop|null} */
        this.tienda = null;
        /** @type {boolean} */
        this.girando = false;

        /** @type {number} Velocidad de giro ajustable por mejora. */
        this.velocidadGiro = 3;
        /** @type {number} Bonus de suerte (0-1). */
        this.bonusSuerte = 0;
        /** @type {number} Multiplicador extra para jackpot. */
        this.multiplicadorJackpot = 1;
        /** @type {number|null} ID del intervalo de auto-spin. */
        this._autoSpinId = null;

        /** @private */ this._gameLoopId = null;
        /** @private */ this._autoguardadoId = null;
        /** @private */ this._ultimoTick = Date.now();

        // Inicialización
        this._inicializarRodillos();
        this._cargarPartidaGuardada();
        this._inicializarTienda();
        this._bindearEventos();
        this._iniciarGameLoop();
        this._iniciarAutoguardado();
        this._actualizarUI();

        console.log("🎰 Casino Clicker iniciado.");
    }

    // ══════════════════════════════════════════════════════════
    // INICIALIZACIÓN
    // ══════════════════════════════════════════════════════════

    /** @private */
    _inicializarRodillos() {
        for (let i = 0; i < NUMERO_RODILLOS; i++) {
            this.rodillos.push(new Rodillo(`rodillo${i + 1}`, i * RETARDO_ENTRE_RODILLOS));
        }
    }

    /** @private */
    _inicializarTienda() {
        this.tienda = new Shop(this);

        // Cargar estado de tienda si hay partida guardada
        if (this.almacenamiento.existePartida()) {
            const estado = this.almacenamiento.cargarPartida();
            if (estado && estado.tienda) {
                this.tienda.importarEstado(estado.tienda);
            }
        }

        // Toggle de apertura/cierre de la tienda
        const header = document.getElementById("tienda-header");
        const items = document.getElementById("tienda-items");
        const toggle = document.getElementById("tienda-toggle");
        if (header && items && toggle) {
            header.addEventListener("click", () => {
                items.classList.toggle("cerrada");
                toggle.classList.toggle("abierta");
            });
        }
    }

    /** @private */
    _cargarPartidaGuardada() {
        if (this.almacenamiento.existePartida()) {
            const estado = this.almacenamiento.cargarPartida();
            if (estado && estado.economia) {
                this.economia.importarEstado(estado.economia);
                console.log("💾 Partida cargada.");
            }
        }
    }

    /** @private */
    _bindearEventos() {
        const botonGirar = document.getElementById("btn-girar");
        if (botonGirar) botonGirar.addEventListener("click", () => this.tirar());

        const botonSubir = document.getElementById("btn-subir-apuesta");
        const botonBajar = document.getElementById("btn-bajar-apuesta");
        if (botonSubir) botonSubir.addEventListener("click", () => this.cambiarApuesta(5));
        if (botonBajar) botonBajar.addEventListener("click", () => this.cambiarApuesta(-5));

        const botonReset = document.getElementById("btn-reset");
        if (botonReset) botonReset.addEventListener("click", () => this.resetearPartida());
    }

    // ══════════════════════════════════════════════════════════
    // GAME LOOP
    // ══════════════════════════════════════════════════════════

    /** @private */
    _iniciarGameLoop() {
        this._gameLoopId = setInterval(() => {
            const ahora = Date.now();
            const delta = (ahora - this._ultimoTick) / 1000;
            this._ultimoTick = ahora;

            const generadas = this.economia.generarMonedasPasivas(delta);
            if (generadas > 0) this._actualizarUI();

            // Actualizar disponibilidad de la tienda
            if (this.tienda) this.tienda.actualizarDisponibilidad();
        }, INTERVALO_GAME_LOOP_MS);
    }

    /** @private */
    _iniciarAutoguardado() {
        this._autoguardadoId = setInterval(() => this._guardarPartida(), INTERVALO_AUTOGUARDADO_MS);
    }

    /**
     * Configura el auto-spin (comprado en tienda).
     * @param {number} intervaloMs - Milisegundos entre tiradas automáticas.
     */
    configurarAutoSpin(intervaloMs) {
        if (this._autoSpinId) clearInterval(this._autoSpinId);
        if (intervaloMs <= 0) return;

        this._autoSpinId = setInterval(() => {
            if (!this.girando && this.economia.puedeTirar()) {
                this.tirar();
            }
        }, intervaloMs);
    }

    // ══════════════════════════════════════════════════════════
    // ACCIONES
    // ══════════════════════════════════════════════════════════

    async tirar() {
        if (this.girando) return;
        if (!this.economia.puedeTirar()) {
            this._mostrarMensaje("💸 Sin monedas!", "error");
            return;
        }

        this.girando = true;
        this._actualizarEstadoBoton(true);

        this.economia.realizarApuesta();
        this._actualizarUI();

        // Girar con velocidad configurable
        const config = { duracionBase: this.velocidadGiro };
        const resultados = await Promise.all(
            this.rodillos.map(rodillo => rodillo.girar(config))
        );

        // Calcular premio
        const resultado = this.economia.calcularPremio(resultados);

        // Aplicar multiplicador de jackpot si es jackpot
        if (resultado.coincidencias >= 3 && this.multiplicadorJackpot > 1) {
            resultado.premio = Math.floor(resultado.premio * this.multiplicadorJackpot);
        }

        this.economia.cobrarPremio(resultado.premio);
        this._mostrarResultadoTirada(resultado);
        this._actualizarUI();
        this._guardarPartida();

        if (this.tienda) this.tienda.actualizarDisponibilidad();

        this.girando = false;
        this._actualizarEstadoBoton(false);
    }

    cambiarApuesta(incremento) {
        try {
            this.economia.apuesta = Math.max(APUESTA_MINIMA, this.economia.apuesta + incremento);
            this._actualizarUI();
        } catch (e) { console.warn(e.message); }
    }

    resetearPartida() {
        if (confirm("¿Seguro que quieres empezar de nuevo?")) {
            this.almacenamiento.borrarPartida();
            if (this._autoSpinId) clearInterval(this._autoSpinId);
            this.economia = new Economy();
            this.velocidadGiro = 3;
            this.bonusSuerte = 0;
            this.multiplicadorJackpot = 1;
            this.tienda = new Shop(this);
            this._actualizarUI();
            this._mostrarMensaje("🔄 Nueva partida", "info");
        }
    }

    // ══════════════════════════════════════════════════════════
    // UI
    // ══════════════════════════════════════════════════════════

    _actualizarUI() {
        this._set("display-monedas", this._fmt(this.economia.monedas));
        this._set("display-apuesta", this.economia.apuesta);
        this._set("display-tiradas", this.economia.tiradas);
        this._set("display-racha", this.economia.rachaVictorias);
        this._set("display-mps", this.economia.monedasPorSegundo);

        // Medidor proporcional a las monedas (cap a 10000)
        const barra = document.getElementById("medidor-barra");
        if (barra) {
            const porcentaje = Math.min(100, (this.economia.monedas / 10000) * 100);
            barra.style.width = porcentaje + "%";
        }

        const btn = document.getElementById("btn-girar");
        if (btn && !this.girando) btn.disabled = !this.economia.puedeTirar();
    }

    /** @private */
    _set(id, valor) {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    }

    /** @private */
    _fmt(n) { return n.toLocaleString("es-ES"); }

    /** @private */
    _actualizarEstadoBoton(desactivado) {
        const btn = document.getElementById("btn-girar");
        if (btn) {
            btn.disabled = desactivado;
            btn.style.filter = desactivado ? "grayscale(0.5)" : "none";
        }
    }

    /** @private */
    _mostrarResultadoTirada(resultado) {
        const el = document.getElementById("resultado-tirada");
        if (!el) return;

        if (resultado.premio > 0) {
            el.textContent = `${resultado.nombre} +${this._fmt(resultado.premio)}`;
            el.className = "lcd-resultado lcd-resultado-premio";

            // Sacudir la máquina al ganar
            const maquina = document.getElementById("maquina-principal");
            if (maquina) {
                maquina.classList.remove("animar-sacudir");
                void maquina.offsetHeight;
                maquina.classList.add("animar-sacudir");
            }
        } else {
            el.textContent = "---";
            el.className = "lcd-resultado";
        }

        el.style.animation = "none";
        void el.offsetHeight;
        el.style.animation = "fadeInOut 2.5s ease forwards";
    }

    /** @private */
    _mostrarMensaje(msg, tipo) {
        const el = document.getElementById("mensaje-juego");
        if (!el) return;
        el.textContent = msg;
        el.className = `mensaje mensaje-${tipo}`;
        el.style.animation = "none";
        void el.offsetHeight;
        el.style.animation = "fadeInOut 3s ease forwards";
    }

    // ══════════════════════════════════════════════════════════
    // PERSISTENCIA
    // ══════════════════════════════════════════════════════════

    _guardarPartida() {
        const estado = {
            economia: this.economia.exportarEstado(),
            tienda: this.tienda ? this.tienda.exportarEstado() : null,
        };
        this.almacenamiento.guardarPartida(estado);
    }
}

// ══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    window.juego = new GameManager();
});
