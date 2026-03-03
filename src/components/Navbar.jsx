import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";

export default function Navbar({ user }) {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <nav className="bg-gray-800 px-6 py-4 flex items-center justify-between shadow-lg">
      <h1 className="text-white font-bold text-xl">🔍 Rincon Informaciones</h1>
      <div className="flex items-center gap-4">
        <span className="text-gray-400 text-sm hidden sm:block">
          {user?.email}
        </span>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}