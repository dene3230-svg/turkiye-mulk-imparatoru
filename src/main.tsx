import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StartupErrorBoundary } from './components/StartupErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StartupErrorBoundary>
    <App />
  </StartupErrorBoundary>
);
