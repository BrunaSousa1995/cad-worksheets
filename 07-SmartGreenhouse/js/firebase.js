import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHpyWM8ejni50CriifI2QwfUStKy3_IHc",
  authDomain: "cad-2022144728-greenhouse.firebaseapp.com",
  databaseURL: "https://cad-2022144728-greenhouse-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cad-2022144728-greenhouse",
  storageBucket: "cad-2022144728-greenhouse.firebasestorage.app",
  messagingSenderId: "925738695418",
  appId: "1:925738695418:web:cc0635f0550e6c90826743"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);