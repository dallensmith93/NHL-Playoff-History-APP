import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PersistenceProvider } from './app/persistence';
import './app/styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistenceProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistenceProvider>
  </StrictMode>,
);
