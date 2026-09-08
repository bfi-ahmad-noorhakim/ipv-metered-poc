import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import './index.css';

// No StrictMode — it double-invokes effects in dev, which would mount/unmount
// IPV twice and muddy the camera acquire/release logs.
const theme = createTheme({
  palette: {
    primary: { main: '#015DB0' }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
