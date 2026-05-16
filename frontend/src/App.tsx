import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Landing from './pages/Landing';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProfilePage from './pages/employee/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Navigate to={
              localStorage.getItem('role') === 'admin' ? '/admin/dashboard' :
              localStorage.getItem('role') === 'manager' ? '/manager/dashboard' :
              '/employee/dashboard'
            } replace />} />
            
            <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
              <Route path="employee/dashboard" element={<ErrorBoundary><EmployeeDashboard /></ErrorBoundary>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
              <Route path="manager/dashboard" element={<ErrorBoundary><ManagerDashboard /></ErrorBoundary>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="admin/dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
            </Route>

            <Route path="profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
