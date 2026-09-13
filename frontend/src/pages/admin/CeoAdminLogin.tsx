import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const CeoAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Hardcoded owner credentials check
    if (email === 'krushalhirapra12@gmail.com' && password === 'Krushal@2807') {
      // Simulate successful admin authentication
      localStorage.setItem('gst_admin_authenticated', 'true');
      
      // Also ensure standard login token exists (so ProtectedRoute doesn't complain)
      localStorage.setItem('gst_token', 'admin_temp_token');
      localStorage.setItem('gst_user', JSON.stringify({
        name: 'Krushal Hirpara',
        email: 'krushalhirapra12@gmail.com',
        user_type: 'Admin',
        is_admin: 1
      }));

      setTimeout(() => {
        setLoading(false);
        navigate('/admin');
      }, 800);
    } else {
      setLoading(false);
      setError('Invalid Owner credentials. Access Denied.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#111111] select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black text-white shadow-lg mb-4">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#111111]">
          CEO Admin Console
        </h2>
        <p className="mt-2 text-sm text-[#666666] font-mono">
          Authorised Platform Owners Only
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-[#E5E5E5] shadow sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Input
                label="Owner Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                className="bg-[#FAFAFA] border-[#E5E5E5] text-black focus:border-black focus:ring-black rounded-xl"
              />
            </div>

            <div>
              <Input
                label="Owner Secure Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="bg-[#FAFAFA] border-[#E5E5E5] text-black focus:border-black focus:ring-black rounded-xl"
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full bg-black text-white hover:bg-neutral-900 py-3 font-bold rounded-xl"
                isLoading={loading}
              >
                Access Control Panel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
