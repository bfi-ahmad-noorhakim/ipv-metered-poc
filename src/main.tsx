import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Note: no StrictMode — it double-invokes effects in dev, which would
// mount/unmount IPV twice and muddy the camera acquire/release logs.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
