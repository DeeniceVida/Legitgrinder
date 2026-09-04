
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker — what makes the site installable and lets a
// rider's phone receive a push when a package is assigned to them.
//
// After load, never during: registering while the page is still fetching
// competes with it for the connection, and on a slow phone that is the
// difference between a fast first paint and a spinner.
//
// Failure here is silent on purpose. A browser with service workers disabled
// (private mode, some corporate profiles) should get the normal website, not
// an error about a feature it was never going to use.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* site works fine without it */ });
  });
}
