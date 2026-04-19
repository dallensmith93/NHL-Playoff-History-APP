import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PersistenceProvider } from './app/persistence';
import './app/styles.css';
import App from './App';
import { PlayoffLiveProvider } from './features/playoffs/context/PlayoffLiveContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistenceProvider>
      <BrowserRouter>
        <PlayoffLiveProvider>
          <App />
        </PlayoffLiveProvider>
      </BrowserRouter>
    </PersistenceProvider>
  </StrictMode>,
);
