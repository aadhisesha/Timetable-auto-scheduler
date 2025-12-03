import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Create a wrapper component that provides all necessary contexts
const AppWithProviders = () => {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Render the app
root.render(<AppWithProviders />); 