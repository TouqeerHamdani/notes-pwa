import supabase from '../lib/supabaseClient';

function LoginPage() {
  const handleGoogleSignIn = async () => {
  const { token, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: '/',
  },
  });
    if (error) {
      console.error('Error signing in with Google:', error.message);
    }
    if (token) {
      console.log('Successfully signed in with Google:', token);
    }
  };

  return (
    <div>
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
    </div>
  );
}

export default LoginPage;
