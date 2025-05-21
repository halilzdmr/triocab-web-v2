import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

/**
 * AuthContext.tsx - Authentication context using Stytch for secure login
 * 
 * This file implements the authentication system using Stytch B2B for passwordless authentication.
 * It provides one-time passcodes (OTP) for secure login within a business organization.
 * 
 * @version 1.1.0
 */

// Stytch API configuration
const STYTCH_API_URL = import.meta.env.PROD
  ? 'https://api.stytch.com/v1'
  : 'https://test-api.stytch.com/v1';

// Debug log
#console.log(`Stytch API URL: ${STYTCH_API_URL}`);

// Stytch configuration - replace these with your actual Stytch project credentials
// Using Vite's import.meta.env for environment variables
const STYTCH_PUBLIC_TOKEN = 'public-token-live-83ed4115-ed31-4b05-9634-2fdbc83ee813';

// Debug log for token initialization (without showing the actual token)
#console.log(`Stytch token initialized: ${STYTCH_PUBLIC_TOKEN ? '✓' : '✗'}`);

// Your backend API URL for user data and authentication
const AUTH_API_URL = import.meta.env.PROD 
  ? 'https://api.bodrumluxurytravel.com/stytch' 
  : 'http://localhost:5001/stytch';
// Debug log for API URL – ensuring production uses HTTPS custom domain
#console.log(`Using API URL: ${AUTH_API_URL}`);

/**
 * Helper function to make API calls
 * @param url API endpoint URL
 * @param options Fetch options
 * @returns Promise with response data
 */
const apiCall = async (url: string, options: RequestInit = {}) => {
  try {
    // Use the global fetch API if available
    // This should handle the "fetch is not defined" error
    const response = await window.fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
    
    // Parse JSON response
    const data = await response.json();
    
    // Check if response is not ok
    if (!response.ok) {
      console.error('API error:', data);
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (err) {
    console.error('API call error:', err);
    throw err;
  }
};

/**
 * User interface representing an authenticated member in an organization
 */
interface User {
  email: string;
  memberId: string;
  organizationId: string;
  token: string;
}

/**
 * Authentication context type definition
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithEmail: (email: string) => Promise<boolean>;
  verifyOtp: (emailId: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Create the auth context with default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider component
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const authContext = useProvideAuth();
  
  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook for providing auth functionality
 * @returns Authentication context with user state and methods
 */
const useProvideAuth = (): AuthContextType => {
  // Local state for user, loading, and error information
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
    
  const isAuthenticated = !!user?.token;
  
  // Add debug logs for easier debugging
  useEffect(() => {
    #console.log('Auth state:', { isAuthenticated, user });
  }, [isAuthenticated, user]);
  
  // Check for existing session on initial load
  useEffect(() => {
    const checkExistingSession = async () => {
      const sessionToken = localStorage.getItem('stytch_session');
      if (sessionToken && !isAuthenticated) {
        try {
          // Verify the session with your backend
          const response = await apiCall(`${AUTH_API_URL}/session`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          });
          
          // If successful, set user state
          if (response.status === 'success') {
            setUser({
              email: response.email,
              memberId: response.member_id,
              organizationId: response.organization_id,
              token: sessionToken
            });
            #console.log('Session restored from token');
          }
        } catch (err) {
          console.error('Failed to verify existing session:', err);
          // Clear invalid session data
          localStorage.removeItem('user');
          localStorage.removeItem('stytch_session');
        }
      }
    };
    
    checkExistingSession();
    return () => {}; // Return empty cleanup function
  }, [isAuthenticated]);
  
  /**
   * Request one-time passcode via email
   * @param email User's email address
   * @returns Promise resolving to success boolean
   */
  const loginWithEmail = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Debug log
      #console.log(`Requesting Stytch OTP for ${email}`);
      
      // Send request to your backend which will call Stytch API
      const data = await apiCall(`${AUTH_API_URL}/login`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      
      // Debug log success
      #console.log('Login API call successful:', data);
      
      // Save email for verification step
      localStorage.setItem('pendingAuth', email);
      localStorage.setItem('emailId', data.email_id); // Store email_id instead of method_id for B2B
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while sending the verification code');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify one-time passcode (OTP)
   * @param emailId Email ID received during login request
   * @param code OTP code entered by user
   * @returns Promise resolving to success boolean
   */
  const verifyOtp = async (emailId: string, code: string): Promise<boolean> => {
    const pendingEmail = localStorage.getItem('pendingAuth');
    if (!pendingEmail) {
      setError('No pending verification. Please request a verification code first.');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Debug log
      #console.log(`Verifying OTP for ${pendingEmail} with email ID: ${emailId}`);
      
      // Send verification request to your backend
      const data = await apiCall(`${AUTH_API_URL}/verify`, {
        method: 'POST',
        body: JSON.stringify({ 
          email_id: emailId,
          code: code,
          email: pendingEmail
        })
      });
      
      // Debug log
      #console.log('Authentication response:', data);
      
      // Get the session token and member data from the response
      const { token, member_id, organization_id } = data;
      
      // Debug log
      #console.log(`Authentication successful: Member ID ${member_id}, Organization ID: ${organization_id}`);
      
      // Create user object with authentication data
      const authenticatedUser = {
        email: pendingEmail,
        memberId: member_id,
        organizationId: organization_id,
        token: token,
      };
      
      // Save user to state and local storage
      setUser(authenticatedUser);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      localStorage.setItem('stytch_session', token);
      localStorage.removeItem('pendingAuth');
      localStorage.removeItem('emailId');
      return true;
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during verification');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log out the current user and revoke the Stytch session
   * @returns Promise resolving after logout completes
   */
  const logout = async (): Promise<void> => {
    try {
      #console.log('Logging out user and revoking Stytch session');
      
      // Call backend to revoke the Stytch session
      if (user?.token) {
        await apiCall(`${AUTH_API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
      }
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      // Always clear local state even if API call fails
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('stytch_session');
      localStorage.removeItem('pendingAuth');
      localStorage.removeItem('emailId');
    }
  };

  return {
    user, 
    isAuthenticated, 
    isLoading,
    error,
    loginWithEmail, 
    verifyOtp, 
    logout 
  };
};

/**
 * Custom hook to use the auth context
 * @returns Authentication context with user state and methods
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
