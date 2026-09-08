import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Third page of the teacher flow. This is the only entry that loads the
// interactive activity, its styles, and its assets. Neither the warm-up
// (/) nor the follow-up (/classroom-activity.html) import this module,
// so their bundles stay free of activity code. The class reaches here only
// after completing the two warm-up pages, so this entry renders the
// activity menu straight away.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);