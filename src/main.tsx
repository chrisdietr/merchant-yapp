import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { isInIframe } from './lib/utils'

// Set up iframe message handling if in iframe
if (isInIframe()) {
  // Listen for messages from parent frame
  window.addEventListener('message', (event) => {
    // Handle resize events from parent
    if (event.data && event.data.type === 'RESIZE') {
      // Apply any resize instructions from parent
      if (event.data.height) {
        document.documentElement.style.height = `${event.data.height}px`;
      }
    }
  });

  // Notify parent when we're ready
  window.addEventListener('load', () => {
    try {
      // Calculate additional height needed for navbar
      const navbarHeight = document.querySelector('header')?.clientHeight || 0;
      
      // Send ready message to parent with height including navbar
      window.parent.postMessage({ 
        type: 'IFRAME_READY', 
        height: document.documentElement.scrollHeight,
        navbarHeight: navbarHeight 
      }, '*');
      
      // Set up mutation observer to detect height changes
      const observer = new MutationObserver(() => {
        const currentNavbarHeight = document.querySelector('header')?.clientHeight || 0;
        window.parent.postMessage({ 
          type: 'RESIZE', 
          height: document.documentElement.scrollHeight,
          navbarHeight: currentNavbarHeight
        }, '*');
      });
      
      // Start observing the body for size changes
      observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        characterData: true 
      });
    } catch (e) {
      console.error('Failed to communicate with parent frame:', e);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
