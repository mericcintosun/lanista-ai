import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingFlow from '../components/profile/OnboardingFlow';
import { API_URL } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';

export default function Onboarding() {
  const session = useAuthStore((s) => s.session);
  const isReady = useAuthStore((s) => s.isReady);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkOnboardingStatus = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.profile?.onboardingCompleted) {
        navigate('/profile');
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Status check failed', err);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      navigate('/');
      return;
    }
    checkOnboardingStatus(session.access_token);
  }, [isReady, session, navigate, checkOnboardingStatus]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <OnboardingFlow 
        session={session} 
        onComplete={() => navigate('/profile')} 
      />
    </div>
  );
}
