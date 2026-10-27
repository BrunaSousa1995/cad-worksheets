import { database } from "./firebase.js";
import { ref, onValue, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";


// Estado atual de cada atuador (atualizado pelo listener dos atuadores)
const actuatorStates = { fan: "OFF", irrigation: "OFF" };

// Converte o timestamp do Firebase em hora legível (ex.: 19:45:10)
function formatTime(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleTimeString("pt-PT") : "--:--:--";
}

// Ouvir greenhouse/sensors: corre agora e sempre que o Node.js escreve novos valores
onValue(ref(database, "greenhouse/sensors"), (snapshot) => {
  const s = snapshot.val();
  if (!s) return;

  // Valor de cada sensor
  document.getElementById("temperature-value").textContent = Number(s.temperature).toFixed(1);
  document.getElementById("humidity-value").textContent = Number(s.humidity).toFixed(1);
  document.getElementById("luminosity-value").textContent = Number(s.luminosity).toLocaleString("en-US");

  // Hora da última leitura
  const text = `Last reading at ${formatTime(s.updatedAt)}`;
  document.getElementById("temperature-time").textContent = text;
  document.getElementById("humidity-time").textContent = text;
  document.getElementById("luminosity-time").textContent = text;
}, (error) => console.error("Sensors read failed:", error));


// Ouvir greenhouse/actuators: corre agora e sempre que um atuador muda de estado
onValue(ref(database, "greenhouse/actuators"), (snapshot) => {
  const data = snapshot.val() || {};

  for (const name of ["fan", "irrigation"]) {
    const state = data[name] && data[name].state === "ON" ? "ON" : "OFF";
    actuatorStates[name] = state;

    // Badge ON (verde) / OFF (cinzento)
    const badge = document.getElementById(`${name}-badge`);
    badge.textContent = state;
    badge.className = `badge ms-1 ${state === "ON" ? "bg-success" : "bg-secondary"}`;

    // Texto do botão de acordo com o estado
    const button = document.getElementById(`${name}-button`);
    button.textContent = state === "ON" ? "Turn off" : "Turn on";
    button.disabled = false;

    // Hora da última mudança
    document.getElementById(`${name}-time`).textContent =
      `Last change at ${formatTime(data[name] && data[name].updatedAt)}`;
  }
}, (error) => console.error("Actuators read failed:", error));


// Clique nos botões: OFF → ON ou ON → OFF no Firebase
for (const name of ["fan", "irrigation"]) {
  const button = document.getElementById(`${name}-button`);

  button.addEventListener("click", async () => {
    const newState = actuatorStates[name] === "ON" ? "OFF" : "ON";
    button.disabled = true;   // evita cliques duplos enquanto grava

    try {
      await update(ref(database, `greenhouse/actuators/${name}`), {
        state: newState,
        updatedAt: serverTimestamp()
      });
      // Não mexemos no badge aqui: o onValue dos atuadores atualiza a página
    } catch (error) {
      console.error(`Could not change ${name}:`, error);
      button.disabled = false;
    }
  });
}