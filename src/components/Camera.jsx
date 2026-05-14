import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import '../App.css';

const Camera = () => {
  const [error, setError] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState('100');
  const [manualBarcode, setManualBarcode] = useState('');
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [usedBarcodes, setUsedBarcodes] = useState(new Set());
  
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const fileInputRef = useRef(null);
  const isLockedRef = useRef(false);

  // Stop/Cleanup Logic
  const stopScanner = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
        console.log("Scanner stopped");
      } catch (e) {
        console.warn("Scanner stop error:", e);
      }
      controlsRef.current = null;
    }
    setIsActive(false);
  };

  // Advanced Scanner Setup
  const startScanner = async () => {
    setError(null);
    setScannedResult(null);
    setTransactionStatus(null);
    isLockedRef.current = false;
    
    try {
      console.log("Initializing high-performance 1D scanner...");
      
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
      ]);

      const codeReader = new BrowserMultiFormatReader(hints);
      
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      };

      setIsActive(true);

      // Start decoding
      const controls = await codeReader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (res, err) => {
          if (res && !isLockedRef.current) {
            const scannedValue = res.getText();
            console.log("Barcode detected:", scannedValue);
            
            // Immediate Lock & Stop
            isLockedRef.current = true;
            stopScanner();
            handleSuccess(scannedValue);
          }
          if (err && !(err.name === 'NotFoundException')) {
            // Optional logging for debugging
          }
        }
      );
      
      controlsRef.current = controls;
      console.log("1D Scanner active with 1080p target");

    } catch (err) {
      console.error("Scanner startup failed:", err);
      let msg = err.message;
      if (err.name === 'NotAllowedError') msg = "Camera access denied. Please allow camera permissions and use HTTPS.";
      if (err.name === 'NotFoundError') msg = "No camera found on this device.";
      setError(msg);
      setIsActive(false);
    }
  };

  const handleSuccess = async (code) => {
    if (usedBarcodes.has(code)) {
      setError("This barcode has already been processed. Please use a fresh one.");
      return;
    }
    setTransactionStatus("Initializing...");
    setScannedResult(code);
    if (navigator.vibrate) navigator.vibrate(200);
    await runSimulationFlow(code);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleSuccess(manualBarcode.trim());
    }
  };

  const runSimulationFlow = async (barcode) => {
    setError(null);
    setIsProcessing(true);
    setTransactionStatus("Authorizing...");
    try {
      const authResponse = await fetch('/api/authorize', { method: 'POST' });
      if (!authResponse.ok) throw new Error("Auth failed (500)");
      const authData = await authResponse.json();
      
      setTransactionStatus("Processing...");
      const gdRes = await fetch('/api/greendot-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, barcode, token: authData.access_token })
      });
      
      const resText = await gdRes.text();
      if (resText.includes('<ns2:ResponseCode>00</ns2:ResponseCode>') || resText.includes('<ResponseCode>00</ResponseCode>')) {
        setTransactionStatus("Approved!");
        setUsedBarcodes(prev => new Set(prev).add(barcode));
      } else {
        throw new Error("Invalid Response (01)");
      }
    } catch (err) {
      setError(err.message);
      setScannedResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    const imageUrl = URL.createObjectURL(file);
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
      ]);
      const codeReader = new BrowserMultiFormatReader(hints);
      const result = await codeReader.decodeFromImageUrl(imageUrl);
      handleSuccess(result.getText());
    } catch (e) {
      setError("No valid barcode found in image.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  return (
    <div className="phone-container">
      <div className="phone-notch"></div>
      
      <div className="app-wrapper">
        <div className="scanner-area">
          <video ref={videoRef} className="scanner-video" playsInline autoPlay muted />
          
          {isActive && (
            <div className="scan-overlay">
              <div className="scan-frame horizontal">
                <div className="scan-bar animating"></div>
                <div className="scan-guide">Align Horizontal Barcode Inside</div>
              </div>
            </div>
          )}

          {!isActive && !scannedResult && !error && !isProcessing && (
            <div className="scan-overlay" style={{ background: 'rgba(0,0,0,0.7)' }}>
              <div className="status-container">
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📱</div>
                <p style={{ color: 'white', fontWeight: 600 }}>Ready to Scan Barcode</p>
              </div>
            </div>
          )}
        </div>

        <div className="ui-layer">
          <div className="glass-card">
            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.5rem' }}>Checkout</h2>

            {!scannedResult && !error && !isProcessing && (
              <>
                <div className="amount-display">
                  <span>$</span>
                  <input 
                    className="amount-input"
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                  />
                </div>
                
                {!isActive ? (
                  <>
                    <button onClick={startScanner} className="main-btn">
                      Scan Barcode
                    </button>
                    
                    <div style={{ margin: '10px 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>— OR —</div>
                    
                    <form onSubmit={handleManualSubmit} style={{ width: '100%' }}>
                      <input 
                        type="text" 
                        placeholder="Manual Barcode Entry"
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        className="manual-input-field"
                      />
                      <button type="submit" className="secondary-btn" style={{ width: '100%', marginBottom: '10px' }}>
                        Submit Manual
                      </button>
                    </form>

                    <button onClick={() => fileInputRef.current.click()} className="secondary-btn" style={{ border: 'none', padding: '10px' }}>
                      Upload from Gallery
                    </button>
                  </>
                ) : (
                  <button onClick={stopScanner} className="main-btn" style={{ background: '#ef4444', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)' }}>
                    Cancel Scanning
                  </button>
                )}
              </>
            )}

            {isProcessing && (
              <div className="status-container">
                <div className="loader"></div>
                <p style={{ color: 'var(--primary)', fontWeight: 600 }}>{transactionStatus}</p>
              </div>
            )}

            {scannedResult && !isProcessing && !error && (
              <div className="status-container">
                <div className="success-icon">✅</div>
                <h3 style={{ margin: '5px 0', fontSize: '1.6rem', color: '#4ade80' }}>Payment Approved</h3>
                <div className="result-box">
                  <p className="label">TRANSACTION BARCODE</p>
                  <p className="value">{scannedResult}</p>
                </div>
                <button onClick={() => {
                  setScannedResult(null);
                  setManualBarcode('');
                }} className="main-btn" style={{ marginTop: '20px' }}>
                  New Transaction
                </button>
              </div>
            )}

            {error && (
              <div className="status-container">
                <div className="success-icon" style={{ filter: 'hue-rotate(300deg)' }}>❌</div>
                <h3 style={{ color: '#ef4444' }}>Scan Failed</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>{error}</p>
                <button onClick={() => {
                  setError(null);
                  setScannedResult(null);
                  setIsProcessing(false);
                }} className="main-btn" style={{ background: '#334155' }}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />
    </div>
  );
};

export default Camera;
