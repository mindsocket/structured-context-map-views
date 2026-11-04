import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'structured-context-map-views/styles.css';
import { App } from './App';
import './navigator.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
