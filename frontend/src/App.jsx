import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "./hooks/useAuth";

const App = () => {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-accent-500 text-white">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide">Loading Notes...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={authenticated ? <HomePage /> : <Navigate to={"/auth"} replace />} />
      <Route path="/auth" element={!authenticated ? <AuthPage /> : <Navigate to={"/"} replace />} />
      <Route path="*" element={authenticated ? <Navigate to={"/"} replace /> : <Navigate to={"/auth"} replace />} />
    </Routes>
  );
};

export default App;