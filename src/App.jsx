import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/LoginPage";
import InicioPage from "./pages/InicioPage";
import AppSelector from "./pages/AppSelector";
import AuditoriaPage from "./pages/AuditoriaPage";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase/config";

const SECCIONES_DEFAULT = ["Snack y Desayuno", "Acompañamientos", "Cuarto Frío", "Postres", "Sizzling"];

export default function App() {
  const { user, rol, loading } = useAuth();
  
  // State to manage which app is currently open: null | 'rincon' | 'auditoria'
  const [appSelected, setAppSelected] = useState(() => {
    return localStorage.getItem("appSelected") || null;
  });

  const handleAppSelect = (app) => {
    setAppSelected(app);
    if (app) {
      localStorage.setItem("appSelected", app);
    } else {
      localStorage.removeItem("appSelected");
    }
  };

  useEffect(() => {
    if (appSelected === "auditoria") {
      document.title = "Auditoria Jumbo.cl";
    } else {
      document.title = "Cetelio";
    }
  }, [appSelected]);

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

  const renderContent = () => {
    if (!user) return <LoginPage />;
    
    if (!appSelected) {
      return <AppSelector onSelectApp={handleAppSelect} />;
    }

    if (appSelected === "rincon") {
      return <InicioPage user={user} rol={rol} onBackToSelector={() => handleAppSelect(null)} />;
    }

    if (appSelected === "auditoria") {
      return <AuditoriaPage onBackToSelector={() => handleAppSelect(null)} />;
    }
  };

  return (
    <>
      {renderContent()}
      <Toaster 
        position="top-center" 
        containerStyle={{ 
          zIndex: 9999999,
          top: 30
        }} 
        toastOptions={{
          style: {
            zIndex: 9999999,
          }
        }}
      />
    </>
  );
}