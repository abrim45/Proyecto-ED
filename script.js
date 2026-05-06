let fichas = 0;
let exp = 0;
let nivel = 1;
let expParaNivel = 5000;
let enMovimiento = false;
let intervaloHucha = null;

const mejoras = {
  suerte: { nivel: 0, costeBase: 150, mult: 1.5, actual: 150 },
  jackpot: { nivel: 0, costeBase: 300, mult: 2.0, actual: 300 },
  mini: { nivel: 0, costeBase: 200, mult: 1.8, actual: 200 },
  passive: { nivel: 0, costeBase: 400, mult: 2.2, actual: 400 },
  base: { nivel: 0, costeBase: 1000, mult: 3.5, actual: 1000 },
};

const datosNivel = {
  1: {
    nombre: "Tasca de Barrio",
    simbolos: ["🍒", "🍋", "🍇", "🍉", "🔔", "🍺"],
  },
  2: {
    nombre: "Casino de Las Vegas",
    simbolos: ["🔔", "💎", "💰", "🎰", "🍀", "7️⃣"],
  },
  3: {
    nombre: "Neo-Tokyo Ciberpunk",
    simbolos: ["🔋", "💾", "🌐", "🤖", "⚡", "🧬"],
  },
};

const domElements = {
  fichas: document.getElementById("fichas-display"),
  progreso: document.getElementById("progress-fill"),
  nivelNombre: document.getElementById("level-name"),
  mensaje: document.getElementById("message"),
  modal: document.getElementById("shop-modal"),
  btnSpin: document.getElementById("btn-spin"),
  btnShop: document.getElementById("btn-open-shop"),
  closeShop: document.getElementById("close-shop"),
  badge: document.getElementById("shop-badge"), // Elemento de notificación
};

function actualizarInterfaz() {
  domElements.fichas.innerText = Math.floor(fichas);
  let porcentaje = Math.min((exp / expParaNivel) * 100, 100);
  domElements.progreso.style.width = porcentaje + "%";

  document.getElementById("lvl-luck").innerText = `nv.${mejoras.suerte.nivel}`;
  document.getElementById("cost-luck").innerText = Math.floor(
    mejoras.suerte.actual,
  );
  document.getElementById("btn-buy-luck").disabled =
    fichas < mejoras.suerte.actual;

  document.getElementById("lvl-jackpot").innerText =
    `nv.${mejoras.jackpot.nivel}`;
  document.getElementById("cost-jackpot").innerText = Math.floor(
    mejoras.jackpot.actual,
  );
  document.getElementById("btn-buy-jackpot").disabled =
    fichas < mejoras.jackpot.actual;

  document.getElementById("lvl-mini").innerText = `nv.${mejoras.mini.nivel}`;
  document.getElementById("cost-mini").innerText = Math.floor(
    mejoras.mini.actual,
  );
  document.getElementById("btn-buy-mini").disabled =
    fichas < mejoras.mini.actual;

  document.getElementById("lvl-passive").innerText =
    `nv.${mejoras.passive.nivel}`;
  document.getElementById("cost-passive").innerText = Math.floor(
    mejoras.passive.actual,
  );
  document.getElementById("btn-buy-passive").disabled =
    fichas < mejoras.passive.actual;

  document.getElementById("lvl-base").innerText = `nv.${mejoras.base.nivel}`;
  document.getElementById("cost-base").innerText = Math.floor(
    mejoras.base.actual,
  );
  document.getElementById("btn-buy-base").disabled =
    fichas < mejoras.base.actual;

  // Lógica para mostrar/ocultar la notificación roja
  let puedeComprarAlgo = false;
  for (let key in mejoras) {
    if (fichas >= mejoras[key].actual) {
      puedeComprarAlgo = true;
      break;
    }
  }
  domElements.badge.style.display = puedeComprarAlgo ? "flex" : "none";
}

function comprarMejora(tipo) {
  let m = mejoras[tipo];
  if (fichas >= m.actual) {
    fichas -= m.actual;
    m.nivel++;
    m.actual = m.costeBase * Math.pow(m.mult, m.nivel);

    if (tipo === "passive" && m.nivel === 1 && !intervaloHucha) {
      intervaloHucha = setInterval(generarPasivo, 1000);
    }
    actualizarInterfaz();
  }
}

function generarPasivo() {
  let ganancia =
    mejoras.passive.nivel * nivel * 5 * (1 + mejoras.base.nivel * 0.5);
  fichas += ganancia;
  exp += ganancia;
  verificarSubidaNivel();
  actualizarInterfaz();
}

function verificarSubidaNivel() {
  if (exp >= expParaNivel && nivel < 3) {
    nivel++;
    exp = 0;
    expParaNivel *= 5;

    for (let key in mejoras) {
      mejoras[key].nivel = 0;
      mejoras[key].actual = mejoras[key].costeBase;
    }

    if (intervaloHucha) {
      clearInterval(intervaloHucha);
      intervaloHucha = null;
    }

    document.body.className = `nivel-${nivel}`;
    domElements.nivelNombre.innerText = datosNivel[nivel].nombre;
    domElements.mensaje.innerText = `¡NUEVO NIVEL DESBLOQUEADO!`;

    domElements.modal.style.display = "none";
    actualizarInterfaz();
  }
}

function animarRodillo(id, duracion, simboloFinal) {
  return new Promise((resolve) => {
    const rodillo = document.getElementById(id);
    const simbolos = datosNivel[nivel].simbolos;
    rodillo.classList.add("spinning");

    // El intervalo baja a 50ms para que se vea más rápido el giro
    let cambiador = setInterval(() => {
      rodillo.innerText = simbolos[Math.floor(Math.random() * simbolos.length)];
    }, 50);

    setTimeout(() => {
      clearInterval(cambiador);
      rodillo.classList.remove("spinning");
      rodillo.innerText = simboloFinal;
      resolve();
    }, duracion);
  });
}

async function iniciarTirada() {
  if (enMovimiento) return;
  enMovimiento = true;
  domElements.btnSpin.disabled = true;
  domElements.mensaje.innerText = "Girando...";

  const simbolos = datosNivel[nivel].simbolos;
  let s1 = simbolos[Math.floor(Math.random() * simbolos.length)];
  let s2 = simbolos[Math.floor(Math.random() * simbolos.length)];
  let s3 = simbolos[Math.floor(Math.random() * simbolos.length)];

  let chanceMejora = mejoras.suerte.nivel * 0.08;
  if (Math.random() < chanceMejora) s2 = s1;
  if (s1 === s2 && Math.random() < chanceMejora * 0.5) s3 = s1;

  // Tiempos reducidos para un dinamismo mayor (400ms, 800ms, 1200ms)
  await animarRodillo("reel1", 400, s1);
  await animarRodillo("reel2", 800, s2);
  await animarRodillo("reel3", 1200, s3);

  calcularPremios(s1, s2, s3);
}

function calcularPremios(s1, s2, s3) {
  let base = 50 * nivel * (1 + mejoras.base.nivel * 1.5);
  let ganancias = 0;

  if (s1 === s2 && s2 === s3) {
    let multiJackpot = 10 * (1 + mejoras.jackpot.nivel * 0.8);
    ganancias = base * multiJackpot;
    domElements.mensaje.innerText = `¡GRAN JACKPOT! +${Math.floor(ganancias)}`;
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    let multiMini = 2 * (1 + mejoras.mini.nivel * 0.5);
    ganancias = base * multiMini;
    domElements.mensaje.innerText = `¡Mini Premio! +${Math.floor(ganancias)}`;
  } else {
    domElements.mensaje.innerText = "Mala suerte...";
  }

  fichas += ganancias;
  exp += ganancias;
  enMovimiento = false;
  domElements.btnSpin.disabled = false;

  verificarSubidaNivel();
  actualizarInterfaz();
}

domElements.btnSpin.addEventListener("click", iniciarTirada);
domElements.btnShop.addEventListener(
  "click",
  () => (domElements.modal.style.display = "flex"),
);
domElements.closeShop.addEventListener(
  "click",
  () => (domElements.modal.style.display = "none"),
);
window.onclick = (e) => {
  if (e.target === domElements.modal) domElements.modal.style.display = "none";
};

document
  .getElementById("btn-buy-luck")
  .addEventListener("click", () => comprarMejora("suerte"));
document
  .getElementById("btn-buy-jackpot")
  .addEventListener("click", () => comprarMejora("jackpot"));
document
  .getElementById("btn-buy-mini")
  .addEventListener("click", () => comprarMejora("mini"));
document
  .getElementById("btn-buy-passive")
  .addEventListener("click", () => comprarMejora("passive"));
document
  .getElementById("btn-buy-base")
  .addEventListener("click", () => comprarMejora("base"));

actualizarInterfaz();
