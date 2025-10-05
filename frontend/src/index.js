import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';   // ✅ import Tailwind here (NOT App.css)

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
