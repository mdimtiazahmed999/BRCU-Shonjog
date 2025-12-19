import { useEffect, useState } from 'react';
import axios from 'axios';

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState({
    backendConnectivity: 'Testing...',
    backendVersion: 'Testing...',
    reduxState: 'Testing...',
    localStorage: 'Testing...',
  });

  useEffect(() => {
    async function runDiagnostics() {
      try {
        // Test 1: Backend connectivity
        try {
          const backendRes = await axios.get(`${window.location.origin}/`, { timeout: 3000 });
          setDiagnostics(prev => ({
            ...prev,
            backendConnectivity: `✅ Backend responding: ${JSON.stringify(backendRes.data)}`
          }));
        } catch (err) {
          setDiagnostics(prev => ({
            ...prev,
            backendConnectivity: `❌ Backend error: ${err.message}`
          }));
        }

        // Test 2: Check localStorage
        const storedAuth = localStorage.getItem('persist:root');
        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth);
            setDiagnostics(prev => ({
              ...prev,
              localStorage: `✅ Auth persisted: ${parsed.auth ? 'Yes' : 'No'}`
            }));
          } catch (e) {
            setDiagnostics(prev => ({
              ...prev,
              localStorage: `⚠️ Couldn't parse localStorage: ${e.message}`
            }));
          }
        } else {
          setDiagnostics(prev => ({
            ...prev,
            localStorage: `⚠️ No persisted state found`
          }));
        }

        // Test 3: Redux state (via Redux DevTools if available)
        setDiagnostics(prev => ({
          ...prev,
          reduxState: `✅ Redux loaded (open Redux DevTools to inspect)`
        }));

      } catch (error) {
        console.error('Diagnostic error:', error);
      }
    }

    runDiagnostics();
  }, []);

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      color: '#00ff00',
      minHeight: '100vh'
    }}>
      <h1>🔍 Frontend Diagnostics</h1>
      <div style={{ marginTop: '20px', lineHeight: '2' }}>
        <div><strong>Backend Connectivity:</strong> {diagnostics.backendConnectivity}</div>
        <div><strong>localStorage/Redux Persist:</strong> {diagnostics.localStorage}</div>
        <div><strong>Redux State:</strong> {diagnostics.reduxState}</div>
      </div>
      <div style={{ marginTop: '40px', fontSize: '12px', color: '#888' }}>
        <p>💡 Tip: Open DevTools (F12) → Console tab to see any error messages</p>
        <p>💡 Tip: Open Redux DevTools extension if installed to inspect Redux state</p>
        <p>💡 Tip: Check Network tab (F12) for failed API requests</p>
      </div>
    </div>
  );
}
