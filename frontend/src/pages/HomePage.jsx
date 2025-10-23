import React from "react";
import { SignOutButton, UserButton } from '@clerk/clerk-react';
import { useClerk } from '@clerk/clerk-react';

const HomePage = () => {
  const { user } = useClerk();

  console.log(user);

  return (
    <div>
      <h1>Welcome to your dashboard {user.firstName}</h1>
      <UserButton />

      <SignOutButton  />
    </div>
  );
};

export default HomePage;