import { useState } from "react";
import { auth, provider } from "../firebase/config";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Error al iniciar con Google");
    }
  };

  const handleEmailAuth = async () => {
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError("Email o contraseña incorrectos");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Buscador de Merma</h1>
        <p className="text-gray-400 text-center mb-8">Inicia sesión para continuar</p>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleEmailAuth}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg mb-3 transition"
        >
          {isRegister ? "Registrarse" : "Iniciar sesión"}
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
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-400 cursor-pointer hover:underline"
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </span>
        </p>
      </div>
    </div>
  );
}