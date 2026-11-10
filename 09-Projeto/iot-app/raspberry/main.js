const { execSync } = require('child_process');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const serviceAccount = require('./serviceAccountKey.json');

// ---------- Firebase ----------
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://projeto-27dae-default-rtdb.europe-west1.firebasedatabase.app'
});
const db = getDatabase();

// ---------- GPIO (via pinctrl) ----------
const LED_GPIO = 17;     // pino físico 11
const BUTTON_GPIO = 27;  // pino físico 13

execSync(`pinctrl set ${LED_GPIO} op dl`);      // LED: saída, começa apagado
execSync(`pinctrl set ${BUTTON_GPIO} ip pu`);   // botão: entrada com pull-up

function setLed(on) {
  execSync(`pinctrl set ${LED_GPIO} ${on ? 'dh' : 'dl'}`);
}
function readButton() {
  const out = execSync(`pinctrl get ${BUTTON_GPIO}`).toString();
  return out.includes('| lo') ? 1 : 0;           // pull-up: "lo" = premido
}

// ---------- Atuador: Firebase → LED ----------
db.ref('/actuators/led1/state').on('value', (snap) => {
  const on = snap.exists() && snap.val() === true;
  setLed(on);
  console.log('LED1:', on ? 'ON' : 'OFF');
});

// ---------- Sensor: botão → Firebase (só quando muda) ----------
let lastButton = -1;
setInterval(() => {
  const pressed = readButton();
  if (pressed !== lastButton) {
    lastButton = pressed;
    db.ref('/sensors/button1').set({
      value: pressed,
      dateTime: new Date().toISOString()
    })
      .then(() => console.log('Botão enviado:', pressed))
      .catch(console.error);
  }
}, 100); // lê a cada 100 ms

// ---------- Saída limpa ----------
process.on('SIGINT', () => {
  setLed(false);
  process.exit(0);
});