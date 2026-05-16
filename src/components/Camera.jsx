import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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

  const scannerRef = useRef(null); // Container for html5-qrcode
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const isLockedRef = useRef(false);

  // Stop/Cleanup Logic
  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        console.log("Scanner Stopped.");
      } catch (err) {
        console.error("Scanner band karne me error hui: ", err);
      }
    }
    setIsActive(false);
  };

  // Start Scanning with html5-qrcode
  const startScanning = async () => {
    setError(null);
    setScannedResult(null);
    setTransactionStatus(null);
    isLockedRef.current = false;
    setIsActive(true);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader");
      }

      const config = {
        fps: 20,
        qrbox: { width: 300, height: 150 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (!isLockedRef.current) {
            isLockedRef.current = true;
            console.log("Scanned Data: ", decodedText);
            stopScanning();
            handleSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Failure or background scan processing errors
        }
      );
      console.log("Scanner Started!");
    } catch (err) {
      console.error("Kamera shuru karne me error hui: ", err);
      setError(err.message || "Camera access failed");
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

    try {
      const html5QrCode = new Html5Qrcode("reader");
      const result = await html5QrCode.scanFile(file, true);
      handleSuccess(result);
    } catch (e) {
      setError("No valid barcode found in image.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="phone-container">
      <div className="phone-notch"></div>

      <div className="app-wrapper">
        <div className="scanner-area">
          {/* html5-qrcode needs a div container */}
          <div id="reader" style={{ width: '100%', height: '100%' }}></div>

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
                    <button onClick={startScanning} className="main-btn">
                      Scan Barcode

                      {/* Upload from Gallery */}
                    </button>
                  </>
                ) : (
                  <button onClick={stopScanning} className="main-btn" style={{ background: '#ef4444', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)' }}>
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
