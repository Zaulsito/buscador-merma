import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBVdar0H80xdLTKhBtFx2JzjZr5vg_rnuI",
  authDomain: "buscador-merma.firebaseapp.com",
  projectId: "buscador-merma",
  storageBucket: "buscador-merma.firebasestorage.app",
  messagingSenderId: "1061572148887",
  appId: "1:1061572148887:web:9647d31bb946df040433d2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCoords() {
  console.log("Fetching auditoria_sectores...");
  const snap = await getDocs(collection(db, "auditoria_sectores"));
  console.log(`Found ${snap.docs.length} documents.`);
  
  let cleared = 0;
  for (const d of snap.docs) {
    if (d.id === "_config_mapa_") continue;
    const data = d.data();
    if (data.mapCoords !== undefined && data.mapCoords !== null) {
      await updateDoc(doc(db, "auditoria_sectores", d.id), {
        mapCoords: null
      });
      console.log(`Cleared mapCoords for ${data.nombre} (${d.id})`);
      cleared++;
    }
  }
  console.log(`\nSUCCESS! Total sectors cleared of pin coordinates: ${cleared}`);
  process.exit(0);
}

clearCoords().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
