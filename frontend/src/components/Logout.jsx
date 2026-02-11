import React from 'react'
import supabase from "../lib/supabaseClient";
import { logout } from "../lib/api";

const Logout = () => {

    const handleLogout = async () => {
        try {
            
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Error signing out:", error.message);
            } else {
                console.log("Sign out successful!");
            }

            const response = await logout();
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

  return (
    <div>
        <button onClick={() => { handleLogout() }}>Logout</button>
    </div>
  )
}

export default Logout