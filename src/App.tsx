import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SharedTransferPage from './pages/SharedTransferPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

// Applying rule: Always add debug logs & comments in the code for easier debug & readability

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          {/* Public route for shared transfer links */}
          <Route path="/shared-transfer" element={<SharedTransferPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;