import { useState } from "react";
import { auth, provider, db } from "../firebase/config";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [emailReset, setEmailReset] = useState("");
  const [esperandoVerificacion, setEsperandoVerificacion] = useState(false);
  const [telefono, setTelefono] = useState("");

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Error al iniciar con Google");
    }
  };

  const handleEmailAuth = async () => {
    setError("");
    setMensaje("");
    if (!email || !password) { setError("Por favor completa todos los campos"); return; }
    if (isRegister && (!nombre || !apellido)) { setError("Por favor ingresa tu nombre y apellido"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }

    setLoading(true);
    try {
      if (isRegister) {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) { setError("Este correo ya está registrado"); setLoading(false); return; }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: `${nombre} ${apellido}` });
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          email,
          nombre: `${nombre} ${apellido}`,
          rol: "usuario",
          fechaRegistro: new Date(),
          telefono: telefono.trim() || "",
        });

        // Enviar correo de verificación
        await sendEmailVerification(cred.user);
        await signOut(auth);
        setEsperandoVerificacion(true);
        setMensaje("Te enviamos un correo de verificación. Revisa tu bandeja y haz clic en el enlace para activar tu cuenta.");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);

        // Verificar si el correo fue verificado
        if (!cred.user.emailVerified) {
          await signOut(auth);
          setError("Debes verificar tu correo antes de ingresar. Revisa tu bandeja de entrada.");
          setEsperandoVerificacion(true);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Correo o contraseña incorrectos");
      } else {
        setError("Ocurrió un error, intenta nuevamente");
      }
    }
    setLoading(false);
  };

  const handleReenviarVerificacion = async () => {
    setError("");
    setMensaje("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (cred.user.emailVerified) {
        setMensaje("Tu correo ya está verificado. Puedes iniciar sesión.");
        setEsperandoVerificacion(false);
      } else {
        await sendEmailVerification(cred.user);
        await signOut(auth);
        setMensaje("Correo de verificación reenviado. Revisa tu bandeja.");
      }
    } catch {
      setError("No se pudo reenviar el correo. Verifica tu email y contraseña.");
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    setError("");
    setMensaje("");
    if (!emailReset) { setError("Ingresa tu correo electrónico"); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailReset);
      setMensaje("Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja.");
    } catch {
      setError("No se encontró una cuenta con ese correo.");
    }
    setLoading(false);
  };

  const inputClass = "w-full bg-gray-700 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500";

  // Pantalla de recuperar contraseña
  if (showReset) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-2">🔑 Recuperar contraseña</h1>
        <p className="text-gray-400 text-center text-sm mb-6">Te enviaremos un enlace para restablecer tu contraseña</p>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
        {mensaje && <p className="text-green-400 text-sm text-center mb-4">{mensaje}</p>}

        <input
          type="email"
          placeholder="Correo electrónico *"
          value={emailReset}
          onChange={(e) => setEmailReset(e.target.value)}
          className={`${inputClass} mb-4`}
        />
        <button
          onClick={handleResetPassword}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg mb-3 transition disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar correo de recuperación"}
        </button>
        <button
          onClick={() => { setShowReset(false); setError(""); setMensaje(""); }}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
        >
          ← Volver al inicio de sesión
        </button>
      </div>
    </div>
  );

  // Pantalla esperando verificación
  if (esperandoVerificacion) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-white mb-2">Verifica tu correo</h1>
        {mensaje && <p className="text-green-400 text-sm mb-4">{mensaje}</p>}
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <p className="text-gray-400 text-sm mb-6">Una vez verificado, vuelve aquí e inicia sesión normalmente.</p>
        <button
          onClick={handleReenviarVerificacion}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg mb-3 transition disabled:opacity-50"
        >
          {loading ? "Enviando..." : "📨 Reenviar correo de verificación"}
        </button>
        <button
          onClick={() => { setEsperandoVerificacion(false); setIsRegister(false); setError(""); setMensaje(""); }}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
        >
          ← Volver al inicio de sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Rincón Informaciones</h1>
        <p className="text-gray-400 text-center mb-8">
          {isRegister ? "Crea tu cuenta" : "Inicia sesión para continuar"}
        </p>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
        {mensaje && <p className="text-green-400 text-sm text-center mb-4">{mensaje}</p>}

        {isRegister && (
          <>
            <div className="flex gap-3 mb-3">
              <input type="text" placeholder="Nombre *" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
              <input type="text" placeholder="Apellido *" value={apellido} onChange={(e) => setApellido(e.target.value)} className={inputClass} />
            </div>
            <input
              type="tel"
              placeholder="Teléfono (opcional)"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`${inputClass} mb-3`}
            />
          </>
        )}

        <input
          type="email"
          placeholder="Correo electrónico *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} mb-3`}
        />
        <input
          type="password"
          placeholder="Contraseña *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        {!isRegister && (
          <p className="text-right text-sm mb-4">
            <span
              onClick={() => { setShowReset(true); setEmailReset(email); setError(""); setMensaje(""); }}
              className="text-blue-400 cursor-pointer hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </span>
          </p>
        )}

        <button
          onClick={handleEmailAuth}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg mb-3 transition disabled:opacity-50"
        >
          {loading ? "Cargando..." : isRegister ? "Registrarse" : "Iniciar sesión"}
        </button>

        <button
          onClick={handleGoogle}
          className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 rounded-lg mb-4 transition flex items-center justify-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
          Continuar con Google
        </button>

        <p className="text-gray-400 text-center text-sm">
          {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <span
            onClick={() => { setIsRegister(!isRegister); setError(""); setMensaje(""); }}
            className="text-blue-400 cursor-pointer hover:underline"
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </span>
        </p>
      </div>
    </div>
  );
}