import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import bgImage from '../assets/th.jpg';
import 'react-toastify/dist/ReactToastify.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    role: 'faculty'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(credentials);
      if (result.success) {
        // Redirect to the page they tried to visit or their dashboard
        const from = location.state?.from?.pathname || `/${credentials.role}-dashboard`;
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgb(15, 15, 15)',
          backdropFilter: 'blur(4px)',
          zIndex: 1,
        }}
      />
      <div
        className="relative z-10 flex flex-col items-center justify-center"
        style={{ minWidth: 350, maxWidth: 400, width: '100%' }}
      >
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl w-full p-10 border border-gray-700">
          <h2 className="text-3xl font-extrabold mb-8 text-center text-white tracking-wide drop-shadow">Sign in</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-200 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                className="shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-white bg-gray-900/80 leading-tight focus:outline-none focus:shadow-outline text-lg placeholder-gray-400"
                id="email"
                type="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="username"
                placeholder="Enter your email"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-200 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                className="shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-white bg-gray-900/80 leading-tight focus:outline-none focus:shadow-outline text-lg placeholder-gray-400"
                id="password"
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>
            <div className="mb-8">
              <label className="block text-gray-200 text-sm font-bold mb-2" htmlFor="role">
                Role
              </label>
              <select
                className="shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-white bg-gray-900/80 leading-tight focus:outline-none focus:shadow-outline text-lg"
                id="role"
                name="role"
                value={credentials.role}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="admin">Admin</option>
                <option value="faculty">Faculty</option>
                <option value="hod">HOD</option>
                <option value="coordinator">Timetable Coordinator</option>
              </select>
            </div>
            <div className="flex items-center justify-center">
              <button
                className={`bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold py-3 px-8 rounded-full focus:outline-none focus:shadow-outline w-full text-lg transition duration-200 ease-in-out shadow-lg ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-800'
                }`}
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
          <div className="mt-8 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Timetable Management &nbsp;|&nbsp;
            <a href="/about" className="text-blue-600 hover:underline">About Us</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;