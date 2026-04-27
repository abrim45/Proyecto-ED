/**
 * Sistema de Niveles y Escenarios — Casino Clicker
 *
 * Cada 5 niveles el escenario cambia, dando sensación de progresión
 * desde una máquina cutre de callejón hasta un casino VIP de lujo.
 *
 * Patrones de refactorización aplicados:
 *  - Introduce Constant (4.3.E.b): escenarios como constante declarativa.
 *  - Extract Class (4.3.D): sistema de niveles separado del game loop.
 *  - Encapsulate Fields (4.3.G): XP y nivel privados con getters.
 *
 * @author Paco, Majemami, Polanco, Abraham
 * @version 1.0
 * @since 2026-04-27
 */

// ── Introduce Constant (4.3.E.b) ─────────────────────────────

/** XP base necesaria para subir al nivel 2. */
const XP_BASE = 50;

/** Factor de escalado exponencial de XP. */
const XP_FACTOR = 1.35;

/**
 * Definición de escenarios — cambian cada 5 niveles.
 * Cada escenario define la estética visual completa.
 *
 * @constant {Object[]}
 */
const ESCENARIOS = [
    {
        id: "callejon",
        nombre: "🗑️ Callejón Oscuro",
        descripcion: "Una máquina vieja y oxidada en un callejón sucio",
        nivelMin: 1,
        nivelMax: 4,
        clase: "escenario-callejon",
        colores: {
            fondo: "#0e0a06",
            fondoGrad: "radial-gradient(ellipse at 50% 40%, rgba(40, 25, 8, 0.5) 0%, transparent 70%)",
            maquinaPrimario: "#6b4c1e",
            maquinaSecundario: "#4a3312",
            maquinaBorde: "#2e1f0a",
            lcdFondo: "#0e2a1e",
            lcdTexto: "#22cc44",
        }
    },
    {
        id: "bar",
        nombre: "🍺 Bar de Carretera",
        descripcion: "Un bar oscuro con luces de neón parpadeantes",
        nivelMin: 5,
        nivelMax: 9,
        clase: "escenario-bar",
        colores: {
            fondo: "#0f0812",
            fondoGrad: "radial-gradient(ellipse at 50% 30%, rgba(80, 20, 60, 0.3) 0%, transparent 60%)",
            maquinaPrimario: "#7a4a2a",
            maquinaSecundario: "#5a3518",
            maquinaBorde: "#3a200c",
            lcdFondo: "#1a0e2a",
            lcdTexto: "#ff44aa",
        }
    },
    {
        id: "casino",
        nombre: "🎲 Casino Clásico",
        descripcion: "Terciopelo rojo, latón y luces brillantes",
        nivelMin: 10,
        nivelMax: 14,
        clase: "escenario-casino",
        colores: {
            fondo: "#120808",
            fondoGrad: "radial-gradient(ellipse at 50% 30%, rgba(120, 20, 20, 0.3) 0%, transparent 60%)",
            maquinaPrimario: "#8a2020",
            maquinaSecundario: "#6a1818",
            maquinaBorde: "#3a0e0e",
            lcdFondo: "#1a0a0a",
            lcdTexto: "#ff3333",
        }
    },
    {
        id: "vip",
        nombre: "👑 Sala VIP",
        descripcion: "Negro y oro, elegancia absoluta",
        nivelMin: 15,
        nivelMax: 19,
        clase: "escenario-vip",
        colores: {
            fondo: "#08080a",
            fondoGrad: "radial-gradient(ellipse at 50% 30%, rgba(180, 150, 50, 0.15) 0%, transparent 60%)",
            maquinaPrimario: "#2a2a30",
            maquinaSecundario: "#1a1a20",
            maquinaBorde: "#0e0e12",
            lcdFondo: "#0a0a10",
            lcdTexto: "#ffd700",
        }
    },
    {
        id: "highroller",
        nombre: "💎 High Roller",
        descripcion: "Diamantes, platino y cristal puro",
        nivelMin: 20,
        nivelMax: 999,
        clase: "escenario-highroller",
        colores: {
            fondo: "#040610",
            fondoGrad: "radial-gradient(ellipse at 50% 30%, rgba(100, 150, 255, 0.15) 0%, transparent 60%)",
            maquinaPrimario: "#1a2a4a",
            maquinaSecundario: "#0e1a30",
            maquinaBorde: "#060e1a",
            lcdFondo: "#040818",
            lcdTexto: "#66ccff",
        }
    },
];


// ═══════════════════════════════════════════════════════════════
// CLASE LevelSystem
// ═══════════════════════════════════════════════════════════════

class LevelSystem {

    constructor() {
        /** @private */
        this._xp = 0;
        /** @private */
        this._nivel = 1;
        /** @private */
        this._escenarioActual = ESCENARIOS[0];
    }

    // ── Getters — Encapsulate Fields (4.3.G) ──────────────────

    get xp() { return this._xp; }
    get nivel() { return this._nivel; }
    get escenario() { return this._escenarioActual; }

    /**
     * XP necesaria para el siguiente nivel.
     * @returns {number}
     */
    get xpParaSiguienteNivel() {
        return Math.floor(XP_BASE * Math.pow(XP_FACTOR, this._nivel - 1));
    }

    /**
     * XP acumulada dentro del nivel actual (para la barra de progreso).
     * @returns {number}
     */
    get xpEnNivelActual() {
        let xpAcumulada = 0;
        for (let n = 1; n < this._nivel; n++) {
            xpAcumulada += Math.floor(XP_BASE * Math.pow(XP_FACTOR, n - 1));
        }
        return this._xp - xpAcumulada;
    }

    /**
     * Progreso en el nivel actual como porcentaje (0-100).
     * @returns {number}
     */
    get progreso() {
        const xpEnNivel = this.xpEnNivelActual;
        const xpNecesaria = this.xpParaSiguienteNivel;
        return Math.min(100, (xpEnNivel / xpNecesaria) * 100);
    }

    // ══════════════════════════════════════════════════════════
    // MÉTODOS PRINCIPALES
    // ══════════════════════════════════════════════════════════

    /**
     * Añade XP y verifica si sube de nivel.
     * @param {number} cantidad - XP a añadir.
     * @returns {{ subioNivel: boolean, nuevoNivel: number, cambioEscenario: boolean }}
     */
    añadirXP(cantidad) {
        if (cantidad <= 0) return { subioNivel: false, nuevoNivel: this._nivel, cambioEscenario: false };

        this._xp += cantidad;
        const nivelAnterior = this._nivel;
        const escenarioAnterior = this._escenarioActual.id;

        // Recalcular nivel
        this._recalcularNivel();

        const subioNivel = this._nivel > nivelAnterior;
        const cambioEscenario = this._escenarioActual.id !== escenarioAnterior;

        return {
            subioNivel,
            nuevoNivel: this._nivel,
            cambioEscenario,
        };
    }

    /**
     * Recalcula el nivel basándose en la XP total.
     * @private
     */
    _recalcularNivel() {
        let xpRestante = this._xp;
        let nivel = 1;

        while (true) {
            const xpNecesaria = Math.floor(XP_BASE * Math.pow(XP_FACTOR, nivel - 1));
            if (xpRestante < xpNecesaria) break;
            xpRestante -= xpNecesaria;
            nivel++;
        }

        this._nivel = nivel;
        this._actualizarEscenario();
    }

    /**
     * Determina el escenario actual según el nivel.
     * @private
     */
    _actualizarEscenario() {
        for (const escenario of ESCENARIOS) {
            if (this._nivel >= escenario.nivelMin && this._nivel <= escenario.nivelMax) {
                this._escenarioActual = escenario;
                return;
            }
        }
        // Fallback al último escenario
        this._escenarioActual = ESCENARIOS[ESCENARIOS.length - 1];
    }

    /**
     * Aplica el escenario actual al DOM cambiando variables CSS.
     */
    aplicarEscenario() {
        const root = document.documentElement;
        const body = document.body;
        const c = this._escenarioActual.colores;

        // Cambiar variables CSS
        root.style.setProperty("--color-fondo", c.fondo);
        root.style.setProperty("--fondo-grad", c.fondoGrad);
        root.style.setProperty("--maquina-primario", c.maquinaPrimario);
        root.style.setProperty("--maquina-secundario", c.maquinaSecundario);
        root.style.setProperty("--maquina-borde", c.maquinaBorde);
        root.style.setProperty("--lcd-fondo", c.lcdFondo);
        root.style.setProperty("--lcd-texto", c.lcdTexto);

        // Quitar todas las clases de escenario y poner la nueva
        for (const esc of ESCENARIOS) {
            body.classList.remove(esc.clase);
        }
        body.classList.add(this._escenarioActual.clase);
    }

    // ══════════════════════════════════════════════════════════
    // SERIALIZACIÓN
    // ══════════════════════════════════════════════════════════

    exportarEstado() {
        return { xp: this._xp, nivel: this._nivel };
    }

    importarEstado(estado) {
        if (!estado) return;
        this._xp = estado.xp ?? 0;
        this._nivel = estado.nivel ?? 1;
        this._actualizarEscenario();
    }
}
