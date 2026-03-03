import { useState } from "react";
import { auth, provider, db } from "../firebase/config";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Error al iniciar con Google");
    }
  };

  const handleEmailAuth = async () => {
    setError("");
    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }
    if (isRegister && (!nombre || !apellido)) {
      setError("Por favor ingresa tu nombre y apellido");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
          setError("Este correo ya está registrado");
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: `${nombre} ${apellido}` });
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          email,
          nombre: `${nombre} ${apellido}`,
          rol: "usuario",
          fechaRegistro: new Date(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
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

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Rincón Informaciones</h1>
        <p className="text-gray-400 text-center mb-8">
          {isRegister ? "Crea tu cuenta" : "Inicia sesión para continuar"}
        </p>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        {isRegister && (
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              placeholder="Nombre *"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Apellido *"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <input
          type="email"
          placeholder="Correo electrónico *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Contraseña *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        />

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
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            className="text-blue-400 cursor-pointer hover:underline"
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </span>
        </p>
      </div>
    </div>
  );
}