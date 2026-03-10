import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const ref = doc(db, "usuarios", currentUser.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await setDoc(ref, {
            email: currentUser.email,
            nombre: currentUser.displayName || "",
            rol: "usuario",
            fechaRegistro: new Date(),
          });
          setRol("usuario");
        } else {
          setRol(snap.data().rol);
        }

        // Bloquear acceso si el correo no está verificado (solo email/password)
        if (!currentUser.emailVerified && currentUser.providerData[0]?.providerId === "password") {
          await signOut(auth);
          setUser(null);
          setRol(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        setUser(currentUser);
      } else {
        setUser(null);
        setRol(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, rol, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}