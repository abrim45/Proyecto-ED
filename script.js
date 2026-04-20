// He añadido más símbolos para que haya más combinaciones (Más difícil = más gambling)
const SIMBOLOS = ["🍒", "🍋", "🍉", "⭐", "💎", "🔔", "🍀"];

/**
 * Clase que representa un rodillo individual.
 * @class Rodillo
 * @description Aplica el patrón de refactorización "Extract Class" para evitar código duplicado.
 */
class Rodillo {
  constructor(idElemento, tiempoExtraGiro) {
    this.elemento = document.getElementById(idElemento);
    this.tiempoExtra = tiempoExtraGiro; // Para que paren uno detrás de otro
    this.posicionActual = 0; // Guarda en qué índice está actualmente
    this.inicializarDOM();
  }

  inicializarDOM() {
    this.elemento.innerHTML = "";
    // Inyectamos 15 copias enteras de la lista de símbolos para que pueda dar
    // muchas vueltas largas sin quedarse sin dibujos (15 * 7 = 105 divs)
    for (let i = 0; i < 15; i++) {
      SIMBOLOS.forEach((simbolo) => {
        const div = document.createElement("div");
        div.className = "simbolo";
        div.textContent = simbolo;
        this.elemento.appendChild(div);
      });
    }

    // EL TRUCO DEL ALMENDRUCO (Reseteo silencioso)
    // Cuando termina la animación, cambiamos la posición a su equivalente
    // en el primer bloque de símbolos sin que el jugador lo vea.
    // Así nunca nos quedamos sin tira y recordamos la posición.
    this.elemento.addEventListener("transitionend", () => {
      this.elemento.style.transition = "none";
      // Mapeamos la posición actual al índice real (0 al 6)
      const indiceReal = this.posicionActual % SIMBOLOS.length;
      this.elemento.style.transform = `translateY(calc(var(--size) * -${indiceReal}))`;
      this.posicionActual = indiceReal;
    });
  }

  /**
   * Hace girar el rodillo
   * @returns {Promise<string>} Promesa que devuelve el símbolo en el que ha parado
   */
  girar() {
    return new Promise((resolve) => {
      // 1. Elegimos símbolo ganador aleatorio
      const indiceDestino = Math.floor(Math.random() * SIMBOLOS.length);

      // 2. Calculamos cuántos saltos debe dar.
      // Damos 10 vueltas completas de inercia + la diferencia hasta el destino
      const saltos =
        SIMBOLOS.length * 10 +
        indiceDestino -
        (this.posicionActual % SIMBOLOS.length);

      // 3. Sumamos a la posición en la que ya estábamos (memoria de estado)
      this.posicionActual += saltos;

      // 4. Calculamos duración: 3 segundos base + el retraso escalonado
      const duracion = 3 + this.tiempoExtra;

      // Aplicamos animación con CSS puramente responsivo (var(--size))
      setTimeout(() => {
        // Curva de bezier exagerada para que frene como una tragaperras de verdad
        this.elemento.style.transition = `transform ${duracion}s cubic-bezier(0.15, 0.85, 0.15, 1)`;
        this.elemento.style.transform = `translateY(calc(var(--size) * -${this.posicionActual}))`;
      }, 50); // Pequeño margen para que CSS procese el reseteo previo

      // 5. Resolvemos la promesa cuando termine de girar este rodillo en concreto
      setTimeout(() => {
        resolve(SIMBOLOS[indiceDestino]);
      }, duracion * 1000);
    });
  }
}

// Inicializamos los 4 rodillos. Fíjate en el segundo número (0, 1, 2, 3).
// Ese es el tiempo extra. El rodillo 4 tardará 3 segundos más en parar que el primero.
const rodillos = [
  new Rodillo("rodillo1", 0),
  new Rodillo("rodillo2", 1),
  new Rodillo("rodillo3", 2),
  new Rodillo("rodillo4", 3),
];

const boton = document.getElementById("btn-girar");

boton.addEventListener("click", async function () {
  boton.disabled = true; // Desactivamos el botón mientras gira
  boton.style.filter = "grayscale(1)";

  // Hacemos girar los 4 a la vez y esperamos (await) a que el último termine
  const resultados = await Promise.all(rodillos.map((r) => r.girar()));

  console.log("Resultado de la tirada:", resultados);

  // Aquí puedes añadir en el futuro tu lógica de ganar dinero:
  // if (resultados[0] === resultados[1] && resultados[1] === resultados[2] && resultados[2] === resultados[3]) { alert("¡JACKPOT!"); }

  boton.disabled = false; // Reactivamos
  boton.style.filter = "none";
});
