/**
 * Gestor de Efectos Visuales — Casino Clicker
 * Maneja las partículas, monedas saltando y textos flotantes en el DOM.
 *
 * @author Paco
 * @version 1.0
 * @since 2026-04-29
 */

class EffectsManager {
    constructor() {
        this.contenedor = document.body;
    }

    /**
     * Muestra un texto flotando desde el centro de la máquina
     * @param {string} texto El texto a mostrar (ej: "+500 🪙")
     * @param {HTMLElement} elementoOrigen El elemento desde donde sale el texto
     * @param {string} color Color opcional para el texto
     */
    mostrarTextoFlotante(texto, elementoOrigen, color = "var(--color-oro)") {
        if (!elementoOrigen) return;
        
        const rect = elementoOrigen.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        const span = document.createElement("span");
        span.className = "texto-flotante";
        span.textContent = texto;
        span.style.left = `${startX}px`;
        span.style.top = `${startY}px`;
        span.style.color = color;

        this.contenedor.appendChild(span);

        // Limpiar después de la animación
        setTimeout(() => {
            if (span.parentNode) span.parentNode.removeChild(span);
        }, 2000);
    }

    /**
     * Crea una explosión de monedas físicas usando CSS transitions
     * @param {number} cantidad Número de monedas a generar
     * @param {HTMLElement} elementoOrigen De dónde salen las monedas
     */
    explotarMonedas(cantidad, elementoOrigen) {
        if (!elementoOrigen || cantidad <= 0) return;

        // Limitar para no saturar el DOM
        const monedasMax = Math.min(cantidad, 30);
        
        const rect = elementoOrigen.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        for (let i = 0; i < monedasMax; i++) {
            const moneda = document.createElement("div");
            moneda.className = "moneda-particula";
            
            // Posición inicial
            moneda.style.left = `${startX - 15}px`;
            moneda.style.top = `${startY - 15}px`;
            
            // Variables iniciales para el transform (0,0)
            moneda.style.setProperty('--tx', '0px');
            moneda.style.setProperty('--ty', '0px');
            moneda.style.setProperty('--rot', '0deg');
            
            this.contenedor.appendChild(moneda);

            // Calcular trayectoria parabólica aleatoria
            // Hacia los lados (-150px a +150px) y siempre hacia abajo/arriba
            const endX = (Math.random() - 0.5) * 400;
            const endY = (Math.random() * 200) + 50; // Caer hacia abajo
            const rotation = (Math.random() - 0.5) * 720;

            // Trigger reflow para que la transition funcione
            void moneda.offsetWidth;

            // Aplicar la transformación física
            moneda.style.setProperty('--tx', `${endX}px`);
            moneda.style.setProperty('--ty', `${endY}px`);
            moneda.style.setProperty('--rot', `${rotation}deg`);

            // Añadir clase de caída para fade out
            setTimeout(() => {
                moneda.classList.add("caida");
            }, 1000);

            // Eliminar del DOM
            setTimeout(() => {
                if (moneda.parentNode) moneda.parentNode.removeChild(moneda);
            }, 1500);
        }
    }

    /**
     * Efecto de destello en toda la pantalla para Jackpots
     */
    flashPantalla(color = "rgba(255, 215, 0, 0.4)") {
        const flash = document.createElement("div");
        flash.style.position = "fixed";
        flash.style.inset = "0";
        flash.style.backgroundColor = color;
        flash.style.zIndex = "999";
        flash.style.pointerEvents = "none";
        flash.style.transition = "opacity 0.8s ease-out";
        flash.style.opacity = "1";
        
        this.contenedor.appendChild(flash);
        
        // Trigger reflow
        void flash.offsetWidth;
        flash.style.opacity = "0";
        
        setTimeout(() => {
            if (flash.parentNode) flash.parentNode.removeChild(flash);
        }, 800);
    }
}
