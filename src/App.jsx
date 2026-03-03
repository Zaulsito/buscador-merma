import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const { user, rol, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  return user ? <DashboardPage user={user} rol={rol} /> : <LoginPage />;
}