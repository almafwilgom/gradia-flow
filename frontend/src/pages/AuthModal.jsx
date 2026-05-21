import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import RegistrationModal from '../components/RegistrationModal';
import { supabase } from '../lib/supabaseClient';
import { API_URL } from '../lib/api';

export default function AuthModal() {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const apiBaseUrl = API_URL;

  const handleLogin = async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        throw new Error(signInError.message || 'Login failed');
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        navigate('/dashboard', { replace: true });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        navigate('/dashboard', { replace: true });
      } else {
        // Role-based navigation
        const role = profile?.role;
        if (role === 'school_admin') navigate('/admin/dashboard', { replace: true });
        else if (role === 'super_admin') navigate('/super-admin/dashboard', { replace: true });
        else if (role === 'student') navigate('/portal/home', { replace: true });
        else if (role === 'parent') navigate('/portal/home', { replace: true });
        else if (role === 'teacher') navigate('/dashboard', { replace: true });
        else navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Send confirmation email
      const emailRes = await fetch(`${apiBaseUrl}/api/public/auth/send-confirmation-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.fullName,
          user_type: formData.userType,
        }),
      });

      const emailData = await emailRes.json();

      if (!emailRes.ok) {
        throw new Error(emailData.error || 'Failed to send confirmation email');
      }

      // Registration successful, user will see confirmation modal
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {authMode === 'login' ? (
        <LoginModal
          onSubmit={handleLogin}
          isLoading={isLoading}
          error={error}
          onRegisterClick={() => {
            setAuthMode('register');
            setError(null);
          }}
        />
      ) : (
        <RegistrationModal
          onSubmit={handleRegister}
          isLoading={isLoading}
          error={error}
          onLoginClick={() => {
            setAuthMode('login');
            setError(null);
          }}
        />
      )}
    </div>
  );
}
