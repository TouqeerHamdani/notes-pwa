import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { useAuth } from "./hooks/useAuth";

const App = () => {
  const { authenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/" element={authenticated ? <HomePage /> : <Navigate to={"/login"} replace />} />
        <Route path="/login" element={!authenticated ? <LoginPage /> : <Navigate to={"/"} replace />} />
        <Route path="/signup" element={<SignUpPage />} />

        <Route path="*" element={authenticated ? <Navigate to={"/"} replace /> : <Navigate to={"/login"} replace />} />
      </Routes>
    
    </>
  )
};

export default App;