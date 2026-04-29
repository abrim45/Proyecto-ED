/**
 * Controlador principal — Casino Clicker
 * @version 3.0 - Integra niveles y escenarios
 */

const INTERVALO_GAME_LOOP_MS = 1000;
const INTERVALO_AUTOGUARDADO_MS = 30000;
const RETARDO_ENTRE_RODILLOS = 1;
const NUMERO_RODILLOS = 3;

class GameManager {
    constructor() {
        this.economia = new Economy();
        this.almacenamiento = new Storage();
        this.niveles = new LevelSystem();
        this.efectos = new EffectsManager();
        this.rodillos = [];
        this.tienda = null;
        this.girando = false;
        this.velocidadGiro = 3;
        this.bonusSuerte = 0;
        this.multiplicadorJackpot = 1;
        this._autoSpinId = null;
        this._gameLoopId = null;
        this._autoguardadoId = null;
        this._ultimoTick = Date.now();

        this._inicializarRodillos();
        this._cargarPartidaGuardada();
        this._inicializarTienda();
        this._bindearEventos();
        this._iniciarGameLoop();
        this._iniciarAutoguardado();
        this.niveles.aplicarEscenario();
        this._actualizarUI();
        console.log("🎰 Casino Clicker v3 iniciado.");
    }

    _inicializarRodillos() {
        for (let i = 0; i < NUMERO_RODILLOS; i++)
            this.rodillos.push(new Rodillo(`rodillo${i+1}`, i * RETARDO_ENTRE_RODILLOS));
    }

    _inicializarTienda() {
        this.tienda = new Shop(this);
        if (this.almacenamiento.existePartida()) {
            const e = this.almacenamiento.cargarPartida();
            if (e && e.tienda) this.tienda.importarEstado(e.tienda);
        }
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

    _cargarPartidaGuardada() {
        if (!this.almacenamiento.existePartida()) return;
        const e = this.almacenamiento.cargarPartida();
        if (e) {
            if (e.economia) this.economia.importarEstado(e.economia);
            if (e.niveles) this.niveles.importarEstado(e.niveles);
        }
    }

    _bindearEventos() {
        const g = document.getElementById("btn-girar");
        if (g) g.addEventListener("click", () => this.tirar());
        const s = document.getElementById("btn-subir-apuesta");
        const b = document.getElementById("btn-bajar-apuesta");
        if (s) s.addEventListener("click", () => this.cambiarApuesta(5));
        if (b) b.addEventListener("click", () => this.cambiarApuesta(-5));
        const r = document.getElementById("btn-reset");
        if (r) r.addEventListener("click", () => this.resetearPartida());
    }

    _iniciarGameLoop() {
        this._gameLoopId = setInterval(() => {
            const d = (Date.now() - this._ultimoTick) / 1000;
            this._ultimoTick = Date.now();
            if (this.economia.generarMonedasPasivas(d) > 0) this._actualizarUI();
            if (this.tienda) this.tienda.actualizarDisponibilidad();
        }, INTERVALO_GAME_LOOP_MS);
    }

    _iniciarAutoguardado() {
        this._autoguardadoId = setInterval(() => this._guardarPartida(), INTERVALO_AUTOGUARDADO_MS);
    }

    configurarAutoSpin(ms) {
        if (this._autoSpinId) clearInterval(this._autoSpinId);
        if (ms <= 0) return;
        this._autoSpinId = setInterval(() => {
            if (!this.girando && this.economia.puedeTirar()) this.tirar();
        }, ms);
    }

    async tirar() {
        if (this.girando) return;
        if (!this.economia.puedeTirar()) { this._msg("💸 Sin monedas!", "error"); return; }

        this.girando = true;
        this._actualizarEstadoBoton(true);
        this.economia.realizarApuesta();
        this._actualizarUI();

        const res = await Promise.all(this.rodillos.map(r => r.girar({duracionBase: this.velocidadGiro})));
        const premio = this.economia.calcularPremio(res);

        if (premio.coincidencias >= 3 && this.multiplicadorJackpot > 1)
            premio.premio = Math.floor(premio.premio * this.multiplicadorJackpot);

        this.economia.cobrarPremio(premio.premio);

        // Disparar efectos visuales
        if (premio.premio > 0) {
            const maquina = document.getElementById("maquina-principal");
            // Mostrar texto flotante del premio
            this.efectos.mostrarTextoFlotante(`+${this._fmt(premio.premio)} 🪙`, maquina);
            
            // Si es un gran premio (más de 100 veces la apuesta) o un jackpot real, soltar más monedas
            const factorPremio = premio.premio / this.economia.apuesta;
            let numMonedas = Math.min(15, Math.floor(factorPremio));
            
            if (premio.coincidencias >= 3) {
                numMonedas = 30; // Jackpot visual
                if (this.multiplicadorJackpot > 1) {
                    this.efectos.flashPantalla();
                }
            }
            
            if (numMonedas > 0) {
                this.efectos.explotarMonedas(numMonedas, maquina);
            }
        }

        // XP = monedas ganadas (premio) + bonus por tirada
        const xpGanada = premio.premio > 0 ? premio.premio + 5 : 2;
        const resNivel = this.niveles.añadirXP(xpGanada);

        if (resNivel.subioNivel) {
            this._notificarNivel(resNivel.nuevoNivel);
            this.efectos.flashPantalla("rgba(68, 255, 136, 0.3)"); // Flash verde al subir de nivel
            if (resNivel.cambioEscenario) {
                this.niveles.aplicarEscenario();
                this._notificarEscenario();
            }
        }

        this._mostrarResultado(premio);
        this._actualizarUI();
        this._guardarPartida();
        if (this.tienda) this.tienda.actualizarDisponibilidad();

        this.girando = false;
        this._actualizarEstadoBoton(false);
    }

    cambiarApuesta(inc) {
        try {
            this.economia.apuesta = Math.max(APUESTA_MINIMA, this.economia.apuesta + inc);
            this._actualizarUI();
        } catch(e) {}
    }

    resetearPartida() {
        if (!confirm("¿Seguro que quieres empezar de nuevo?")) return;
        this.almacenamiento.borrarPartida();
        if (this._autoSpinId) clearInterval(this._autoSpinId);
        this.economia = new Economy();
        this.niveles = new LevelSystem();
        this.velocidadGiro = 3;
        this.bonusSuerte = 0;
        this.multiplicadorJackpot = 1;
        this.tienda = new Shop(this);
        this.niveles.aplicarEscenario();
        this._actualizarUI();
        this._msg("🔄 Nueva partida", "info");
    }

    // ═══ UI ═══

    _actualizarUI() {
        this._set("display-monedas", this._fmt(this.economia.monedas));
        this._set("display-lcd-monedas", this._fmt(this.economia.monedas));
        this._set("display-apuesta", this.economia.apuesta);
        this._set("display-tiradas", this.economia.tiradas);
        this._set("display-racha", this.economia.rachaVictorias);
        this._set("display-mps", this.economia.monedasPorSegundo + "/s");
        this._set("display-nivel", "Nv." + this.niveles.nivel);
        this._set("display-escenario", this.niveles.escenario.nombre);

        const xp = document.getElementById("xp-barra");
        if (xp) xp.style.width = this.niveles.progreso + "%";

        const med = document.getElementById("medidor-barra");
        if (med) med.style.width = Math.min(100, (this.economia.monedas / 10000) * 100) + "%";

        const btn = document.getElementById("btn-girar");
        if (btn && !this.girando) btn.disabled = !this.economia.puedeTirar();
    }

    _set(id, v) { const e = document.getElementById(id); if(e) e.textContent = v; }
    _fmt(n) { return n.toLocaleString("es-ES"); }

    _actualizarEstadoBoton(d) {
        const b = document.getElementById("btn-girar");
        if (b) { b.disabled = d; b.style.filter = d ? "grayscale(0.5)" : "none"; }
    }

    _mostrarResultado(r) {
        const el = document.getElementById("resultado-tirada");
        if (!el) return;
        el.textContent = r.premio > 0 ? `${r.nombre} +${this._fmt(r.premio)}` : "---";
        if (r.premio > 0) {
            const m = document.getElementById("maquina-principal");
            if (m) { m.classList.remove("animar-sacudir"); void m.offsetHeight; m.classList.add("animar-sacudir"); }
        }
        el.style.animation = "none"; void el.offsetHeight;
        el.style.animation = "fadeInOut 2.5s ease forwards";
    }

    _msg(t, tipo) {
        const el = document.getElementById("mensaje-juego");
        if (!el) return;
        el.textContent = t; el.className = `mensaje mensaje-${tipo}`;
        el.style.animation = "none"; void el.offsetHeight;
        el.style.animation = "fadeInOut 3s ease forwards";
    }

    _notificarNivel(nivel) {
        const el = document.getElementById("notificacion-nivel");
        if (!el) return;
        el.textContent = `⬆️ NIVEL ${nivel}`;
        el.style.animation = "none"; void el.offsetHeight;
        el.style.animation = "fadeInOut 2s ease forwards";
    }

    _notificarEscenario() {
        const el = document.getElementById("notificacion-nivel");
        if (!el) return;
        setTimeout(() => {
            el.textContent = `🎭 ${this.niveles.escenario.nombre}`;
            el.style.animation = "none"; void el.offsetHeight;
            el.style.animation = "fadeInOut 3s ease forwards";
        }, 2200);
    }

    _guardarPartida() {
        this.almacenamiento.guardarPartida({
            economia: this.economia.exportarEstado(),
            tienda: this.tienda ? this.tienda.exportarEstado() : null,
            niveles: this.niveles.exportarEstado(),
        });
    }
}

document.addEventListener("DOMContentLoaded", () => { window.juego = new GameManager(); });
