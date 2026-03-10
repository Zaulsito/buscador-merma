import { useState } from "react";
import { auth, provider, db } from "../firebase/config";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  // createUserWithEmailAndPassword,
  // updateProfile,
  // fetchSignInMethodsForEmail,
  // sendEmailVerification,
  // signOut,
} from "firebase/auth";
// import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // const [nombre, setNombre] = useState("");
  // const [apellido, setApellido] = useState("");
  // const [telefono, setTelefono] = useState("");
  // const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [emailReset, setEmailReset] = useState("");
  // const [esperandoVerificacion, setEsperandoVerificacion] = useState(false);

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Error al iniciar con Google");
    }
  };

  const handleLogin = async () => {
    setError("");
    setMensaje("");
    if (!email || !password) { setError("Por favor completa todos los campos"); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Correo o contraseña incorrectos");
      } else {
        setError("Ocurrió un error, intenta nuevamente");
      }
    }
    setLoading(false);
  };

  // const handleRegister = async () => {
  //   setError("");
  //   setMensaje("");
  //   if (!email || !password) { setError("Por favor completa todos los campos"); return; }
  //   if (!nombre || !apellido) { setError("Por favor ingresa tu nombre y apellido"); return; }
  //   if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
  //   setLoading(true);
  //   try {
  //     const methods = await fetchSignInMethodsForEmail(auth, email);
  //     if (methods.length > 0) { setError("Este correo ya está registrado"); setLoading(false); return; }
  //     const cred = await createUserWithEmailAndPassword(auth, email, password);
  //     await updateProfile(cred.user, { displayName: `${nombre} ${apellido}` });
  //     await setDoc(doc(db, "usuarios", cred.user.uid), {
  //       email,
  //       nombre: `${nombre} ${apellido}`,
  //       rol: "usuario",
  //       fechaRegistro: new Date(),
  //       telefono: telefono.trim() || "",
  //     });
  //     await sendEmailVerification(cred.user, {
  //       url: "https://rincon-manager.vercel.app",
  //       handleCodeInApp: false,
  //     });
  //     await signOut(auth);
  //     setEsperandoVerificacion(true);
  //     setMensaje("Te enviamos un correo de verificación. Revisa tu bandeja de entrada y también la carpeta de spam.");
  //   } catch (err) {
  //     setError("Ocurrió un error, intenta nuevamente");
  //   }
  //   setLoading(false);
  // };

  const handleResetPassword = async () => {
    setError("");
    setMensaje("");
    if (!emailReset) { setError("Ingresa tu correo electrónico"); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailReset);
      setMensaje("Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja y también la carpeta de spam.");
    } catch {
      setError("No se encontró una cuenta con ese correo.");
    }
    setLoading(false);
  };

  const inputClass = "w-full bg-gray-700 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500";

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

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Rincón Informaciones</h1>
        <p className="text-gray-400 text-center mb-8">Inicia sesión para continuar</p>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
        {mensaje && <p className="text-green-400 text-sm text-center mb-4">{mensaje}</p>}

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
          className={`${inputClass} mb-2`}
        />

        <p className="text-right text-sm mb-4">
          <span
            onClick={() => { setShowReset(true); setEmailReset(email); setError(""); setMensaje(""); }}
            className="text-blue-400 cursor-pointer hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </span>
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg mb-3 transition disabled:opacity-50"
        >
          {loading ? "Cargando..." : "Iniciar sesión"}
        </button>

        <button
          onClick={handleGoogle}
          className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
          Continuar con Google
        </button>

        {/* Registro deshabilitado - solo admins pueden crear usuarios
        <p className="text-gray-400 text-center text-sm mt-4">
          ¿No tienes cuenta?{" "}
          <span onClick={() => setIsRegister(true)} className="text-blue-400 cursor-pointer hover:underline">
            Regístrate
          </span>
        </p>
        */}
      </div>
    </div>
  );
}