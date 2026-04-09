import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { auth, db } from "../firebase/config";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { useTheme } from "../context/ThemeContext";

const DIAS_LIMITE = 14;

export default function PerfilPage({ user, rol, onBack, onNavegar }) {
  const [nombre, setNombre] = useState(user.displayName || "");
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState(null);
  const [mensajePassword, setMensajePassword] = useState(null);
  const { t } = useTheme();

  const handleActualizarPerfil = async () => {
    if (!nombre.trim()) return;
    setLoadingPerfil(true);
    setMensajePerfil(null);
    try {
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      const data = snap.data();

      if (data?.ultimoCambioNombre) {
        const ultimoCambio = data.ultimoCambioNombre.toDate();
        const diasPasados = (new Date() - ultimoCambio) / (1000 * 60 * 60 * 24);
        if (diasPasados < DIAS_LIMITE) {
          const diasRestantes = Math.ceil(DIAS_LIMITE - diasPasados);
          setMensajePerfil({
            tipo: "error",
            texto: `⏳ Puedes cambiar tu nombre en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}`
          });
          setLoadingPerfil(false);
          return;
        }
      }

      await updateProfile(auth.currentUser, { displayName: nombre });
      await updateDoc(ref, {
        nombre,
        ultimoCambioNombre: new Date(),
      });
      setMensajePerfil({ tipo: "ok", texto: "✅ Perfil actualizado correctamente" });
    } catch (err) {
      setMensajePerfil({ tipo: "error", texto: "Error al actualizar el perfil" });
    }
    setLoadingPerfil(false);
  };

  const handleCambiarPassword = async () => {
    setMensajePassword(null);
    if (!passwordActual || !passwordNueva || !passwordConfirm) {
      setMensajePassword({ tipo: "error", texto: "Completa todos los campos" });
      return;
    }
    if (passwordNueva !== passwordConfirm) {
      setMensajePassword({ tipo: "error", texto: "Las contraseñas nuevas no coinciden" });
      return;
    }
    if (passwordNueva.length < 6) {
      setMensajePassword({ tipo: "error", texto: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    setLoadingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordActual);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordNueva);
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirm("");
      setMensajePassword({ tipo: "ok", texto: "✅ Contraseña actualizada correctamente" });
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setMensajePassword({ tipo: "error", texto: "La contraseña actual es incorrecta" });
      } else {
        setMensajePassword({ tipo: "error", texto: "Error al cambiar la contraseña" });
      }
    }
    setLoadingPassword(false);
  };

  const esGoogleUser = user.providerData[0]?.providerId === "google.com";

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <Navbar user={user} rol={rol} onNavegar={onNavegar} />
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 text-sm font-semibold px-4 py-2 rounded-full transition border border-teal-500/30 mb-6"
        >
          ← Volver
        </button>

        <h2 className={`${t.text} text-2xl font-bold mb-8`}>👤 Mi Perfil</h2>

        <div className={`${t.bgCard} rounded-2xl p-6 mb-6`}>
          <h3 className={`${t.text} font-semibold text-lg mb-4`}>Datos personales</h3>

          <label className={`${t.textSecondary} text-sm mb-1 block`}>Nombre completo</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={`w-full ${t.bgInput} ${t.text} px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500`}
          />

          <label className={`${t.textSecondary} text-sm mb-1 block`}>Correo electrónico</label>
          <input
            type="email"
            value={user.email}
            disabled
            className={`w-full ${t.bgInput} ${t.textSecondary} px-4 py-3 rounded-lg mb-1 outline-none cursor-not-allowed`}
          />
          <p className={`${t.textSecondary} text-xs mb-4`}>⏳ Solo puedes cambiar tu nombre una vez cada {DIAS_LIMITE} días</p>

          {mensajePerfil && (
            <p className={`text-sm mb-3 ${mensajePerfil.tipo === "ok" ? "text-green-400" : "text-red-400"}`}>
              {mensajePerfil.texto}
            </p>
          )}

          <button
            onClick={handleActualizarPerfil}
            disabled={loadingPerfil}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loadingPerfil ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        {!esGoogleUser && (
          <div className={`${t.bgCard} rounded-2xl p-6`}>
            <h3 className={`${t.text} font-semibold text-lg mb-4`}>Cambiar contraseña</h3>

            <input
              type="password"
              placeholder="Contraseña actual"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className={`w-full ${t.bgInput} ${t.text} px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              className={`w-full ${t.bgInput} ${t.text} px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={`w-full ${t.bgInput} ${t.text} px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500`}
            />

            {mensajePassword && (
              <p className={`text-sm mb-3 ${mensajePassword.tipo === "ok" ? "text-green-400" : "text-red-400"}`}>
                {mensajePassword.texto}
              </p>
            )}

            <button
              onClick={handleCambiarPassword}
              disabled={loadingPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loadingPassword ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </div>
        )}

        {esGoogleUser && (
          <div className={`${t.bgCard} rounded-2xl p-6`}>
            <p className={`${t.textSecondary} text-sm text-center`}>
              Tu cuenta está vinculada con Google, no puedes cambiar la contraseña desde aquí.
            </p>
          </div>
        )}
      </div>
    
      <BottomNav moduloActivo="perfil" onNavegar={onNavegar} />
    </div>
  );
}