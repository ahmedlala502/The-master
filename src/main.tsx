import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { LocalDataProvider } from './components/LocalDataContext';
import ErrorBoundary from './components/ErrorBoundary';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <LocalDataProvider>
        <App />
      </LocalDataProvider>
    </ErrorBoundary>
  </StrictMode>,
);
