import { useState } from "react";
import { auth, db } from "../firebase/config";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";

export default function PerfilPage({ user, rol, onBack }) {
  const [nombre, setNombre] = useState(user.displayName || "");
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState(null);
  const [mensajePassword, setMensajePassword] = useState(null);

  const handleActualizarPerfil = async () => {
    if (!nombre.trim()) return;
    setLoadingPerfil(true);
    setMensajePerfil(null);
    try {
      await updateProfile(auth.currentUser, { displayName: nombre });
      await updateDoc(doc(db, "usuarios", user.uid), { nombre });
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
    <div className="min-h-screen bg-gray-900">
      <Navbar user={user} rol={rol} />
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition"
        >
          ← Volver al inicio
        </button>

        <h2 className="text-white text-2xl font-bold mb-8">👤 Mi Perfil</h2>

        {/* Datos personales */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-semibold text-lg mb-4">Datos personales</h3>

          <label className="text-gray-400 text-sm mb-1 block">Nombre completo</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="text-gray-400 text-sm mb-1 block">Correo electrónico</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full bg-gray-700/50 text-gray-400 px-4 py-3 rounded-lg mb-4 outline-none cursor-not-allowed"
          />

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

        {/* Cambiar contraseña */}
        {!esGoogleUser && (
          <div className="bg-gray-800 rounded-2xl p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Cambiar contraseña</h3>

            <input
              type="password"
              placeholder="Contraseña actual"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-gray-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm text-center">
              Tu cuenta está vinculada con Google, no puedes cambiar la contraseña desde aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}