import React, { useState } from 'react';
import Camera from './components/Camera';
import BarcodeGenerator from './components/BarcodeGenerator';
import SimpleScanner from './components/SimpleScanner';
import './App.css';

function App() {
  const [view, setView] = useState('scanner'); // 'scanner', 'generator', or 'simple'

  return (
    <div className="App" style={{ width: '100vw', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {view === 'scanner' && (
        <Camera />
      )}

      {view === 'generator' && (
        <BarcodeGenerator onBack={() => setView('scanner')} />
      )}

      {view === 'simple' && (
        <SimpleScanner onBack={() => setView('scanner')} />
      )}
    </div>
  );
}

export default App;
