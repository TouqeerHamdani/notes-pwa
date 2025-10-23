import { SignInButton } from '@clerk/clerk-react';
import React from "react";

const LoginPage = () => {

  return (
    <div className='flex bg-white'>
      <div className='flex px-8 justify-between'>
        <div className='flex justify-center'>

          <h1 className="text-2xl font-bold mt-2">Welcome Back</h1>

            {/* GOOGLE SIGNIN BTN */}
            <SignInButton mode='modal' redirecturl="/home">
              <button className="flex-row items-center justify-center bg-white border border-gray-300 rounded-full py-3 px-6">
                Sign in
              </button>
            </SignInButton>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;