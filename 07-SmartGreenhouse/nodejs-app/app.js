const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase, ServerValue } = require("firebase-admin/database");
const serviceAccount = require("./serviceAccountKey.json");

// 1. Inicializar o Admin SDK
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://cad-2022144728-greenhouse-default-rtdb.europe-west1.firebasedatabase.app/"
});

const db = getDatabase();
const sensorsRef = db.ref("greenhouse/sensors");
const actuatorsRef = db.ref("greenhouse/actuators");

const UPDATE_INTERVAL_MS = 5000;           // 3. de 5 em 5 segundos
const DAY_DURATION_MS = 10 * 60 * 1000;    // um "dia" simulado dura 10 minutos

const LIMITS = {
  temperature: { min: 10, max: 45 },
  humidity: { min: 20, max: 95 },
  luminosity: { min: 0, max: 50000 }
};

// Estado da simulação
const sensors = { temperature: 22, humidity: 60, luminosity: 0 };
const actuators = { fan: "OFF", irrigation: "OFF" };
const startTime = Date.now();

function clamp(value, { min, max }) { return Math.min(max, Math.max(min, value)); }
function noise(amplitude) { return (Math.random() * 2 - 1) * amplitude; }
function round1(value) { return Math.round(value * 10) / 10; }

// 2. Variações graduais dentro dos limites
function simulateStep() {
  // Luminosidade: ciclo dia/noite (metade do ciclo é noite = 0 lx)
  const phase = ((Date.now() - startTime) % DAY_DURATION_MS) / DAY_DURATION_MS;
  const sun = Math.max(0, Math.sin(2 * Math.PI * phase));
  sensors.luminosity = clamp(sun * LIMITS.luminosity.max + noise(1000) * sun, LIMITS.luminosity);

  // Temperatura: aproxima-se aos poucos de 18 °C (noite) a 32 °C (meio-dia)
  const targetTemperature = 18 + 14 * sun;
  sensors.temperature += (targetTemperature - sensors.temperature) * 0.1 + noise(0.2);
  if (actuators.fan === "ON") sensors.temperature -= 0.8;          // Desafio C
  sensors.temperature = clamp(sensors.temperature, LIMITS.temperature);

  // Humidade: desce devagar, sobretudo com sol
  sensors.humidity += noise(0.5) - 0.1 - 0.4 * sun;
  if (actuators.irrigation === "ON") sensors.humidity += 2;        // Desafio C
  sensors.humidity = clamp(sensors.humidity, LIMITS.humidity);
}

async function publishSensors() {
  simulateStep();
  const reading = {
    temperature: round1(sensors.temperature),
    humidity: round1(sensors.humidity),
    luminosity: Math.round(sensors.luminosity),
    updatedAt: ServerValue.TIMESTAMP
  };
  try {
    await sensorsRef.set(reading);
    console.log(`[${new Date().toLocaleTimeString()}] T=${reading.temperature} °C  H=${reading.humidity} %  L=${reading.luminosity} lx  | fan=${actuators.fan} irrigation=${actuators.irrigation}`);
  } catch (error) {
    console.error("Sensor write failed:", error.message);
  }
}

// Desafio C: ouvir as mudanças dos atuadores feitas na página
actuatorsRef.on("value", (snapshot) => {
  const data = snapshot.val() || {};
  for (const name of Object.keys(actuators)) {
    const state = data[name] && data[name].state;
    if (state === "ON" || state === "OFF") {
      if (state !== actuators[name]) console.log(`>>> ${name} changed to ${state}`);
      actuators[name] = state;
    } else {
      // Se ainda não existir na base de dados, cria-o como OFF
      actuatorsRef.child(name).set({ state: "OFF", updatedAt: ServerValue.TIMESTAMP })
        .catch((error) => console.error(`Init ${name} failed:`, error.message));
    }
  }
}, (error) => console.error("Actuator listener failed:", error.message));

publishSensors();
setInterval(publishSensors, UPDATE_INTERVAL_MS);