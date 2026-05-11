import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LocalDataProvider } from './components/LocalDataContext';
import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LocalDataProvider>
        <App />
      </LocalDataProvider>
    </ErrorBoundary>
  </StrictMode>,
);
