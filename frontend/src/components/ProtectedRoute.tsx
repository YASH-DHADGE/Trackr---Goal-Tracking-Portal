import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const dashboard = role === 'admin' ? '/admin/dashboard' : role === 'manager' ? '/manager/dashboard' : '/employee/dashboard';
    return <Navigate to={dashboard} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
