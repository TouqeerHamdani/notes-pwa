import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "./hooks/useAuth";

const App = () => {
  const { authenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/" element={authenticated ? <HomePage /> : <Navigate to={"/auth"} replace />} />
        <Route path="/auth" element={!authenticated ? <AuthPage /> : <Navigate to={"/"} replace />} />

        
        <Route path="*" element={authenticated ? <Navigate to={"/"} replace /> : <Navigate to={"/auth"} replace />} />
      </Routes>
    
    </>
  )
};

export default App;