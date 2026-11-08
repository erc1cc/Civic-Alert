import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Faces are bundled with the app so a venue with no internet still gets the real type.
import '@fontsource-variable/inter-tight';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.jsx';
import Landing from './Landing.jsx';

// Two surfaces, no router: the landing page at /, the live map at /map.
// Old deep links (/#SD-101, /?layer=heat) still land on the map.
const { pathname, hash, search } = window.location;
const legacyMapLink = pathname === '/' && (/^#SD-\d+/.test(hash) || /layer=/.test(search));
if (legacyMapLink) window.history.replaceState(null, '', `/map${search}${hash}`);
const onMap = legacyMapLink || pathname.startsWith('/map');

createRoot(document.getElementById('root')).render(
  <StrictMode>{onMap ? <App /> : <Landing />}</StrictMode>,
);
