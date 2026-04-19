import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import InicioPage from "./pages/InicioPage";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase/config";

const SECCIONES_DEFAULT = ["Snack y Desayuno", "Acompañamientos", "Cuarto Frío", "Postres", "Sizzling"];

export default function App() {
  const { user, rol, loading } = useAuth();

  useEffect(() => {
    const inicializar = async () => {
      const snap = await getDocs(collection(db, "secciones"));
      if (snap.empty) {
        for (const nombre of SECCIONES_DEFAULT) {
          await addDoc(collection(db, "secciones"), { nombre });
        }
      }
    };
    inicializar();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  return user ? <InicioPage user={user} rol={rol} /> : <LoginPage />;
}