import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';
import CodeInput from '../components/ui/CodeInput';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [methodId, setMethodId] = useState('');
  const { loginWithEmail, verifyOtp, error: authError, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Set local error if auth context has an error
  React.useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSendCode = async () => {
    // Simple email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError('');
    // Use the loginWithEmail function from our updated AuthContext
    const success = await loginWithEmail(email);
    
    // Only set codeSent to true if the login request was successful
    if (success) {
      // Get the method ID from localStorage
      const storedMethodId = localStorage.getItem('methodId');
      if (storedMethodId) {
        setMethodId(storedMethodId);
      }
      setCodeSent(true);
    }
  };

  const handleVerifyCode = async (code: string) => {
    // Log that we're attempting to verify the code
    console.log(`Verifying OTP code: ${code} with method ID: ${methodId}`);
    
    // Use the verifyOtp function from our updated AuthContext
    const success = await verifyOtp(methodId, code);
    
    if (success) {
      // Navigate to dashboard on successful verification
      navigate('/dashboard');
    } else {
      // Only set error if not already set by auth context
      if (!authError) {
        setError('Invalid verification code. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent-600 to-accent-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-card w-full max-w-md overflow-hidden"
      >
        {/* Logo Header */}
        <div className="bg-accent-50 p-6">
          <div className="flex flex-col items-center justify-center">
            <div className="text-accent-600 font-bold text-3xl">
              Bodrum Luxury Travel
            </div>
            <div className="text-accent-600 text-xl mt-1">
              Partner Portal
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          {!codeSent ? (
            // Email Input Form
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <TextField
                label="Email Address"
                placeholder="company@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                error={error}
              />
              
              <Button 
                variant="primary" 
                fullWidth 
                onClick={handleSendCode}
                icon={<Mail className="w-4 h-4" />}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Code'}
              </Button>
            </motion.div>
          ) : (
            // Verification Code Input
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <p className="text-center text-neutral-700">
                Enter the verification code sent to <span className="font-medium">{email}</span>
              </p>
              
              <div className="flex justify-center py-2">
                <CodeInput length={6} onComplete={handleVerifyCode} />
              </div>
              
              {error && (
                <p className="text-error-600 text-sm text-center">{error}</p>
              )}
              
              <p className="text-xs text-neutral-500 text-center">
                Code valid for 10 minutes
              </p>
              
              <div className="pt-4 flex justify-center">
                <Button 
                  variant="secondary" 
                  onClick={() => setCodeSent(false)}
                >
                  Back to email
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;