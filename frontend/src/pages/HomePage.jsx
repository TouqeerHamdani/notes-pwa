import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";

function HomePage() {
  const navigate = useNavigate();

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      return;
    }
    navigate("/login");
  };

  return (
    <div>
      <h1>"Hello, you are logged in."</h1>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

export default HomePage;