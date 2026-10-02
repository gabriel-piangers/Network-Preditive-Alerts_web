import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/tokens-base.css';
import './styles/tokens-brand.css';
import './styles/tokens-semantic.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
