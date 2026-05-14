import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function SimpleScanner({ onBack }) {
  const videoRef = useRef(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const controlsRef = useRef(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();

    async function startScanner() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        const backCamera =
          videoDevices.find((device) =>
            device.label.toLowerCase().includes("back") || 
            device.label.toLowerCase().includes("environment")
          ) || videoDevices[0];

        if (!backCamera) throw new Error("No camera found");

        const controls = await codeReader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current,
          (res, err) => {
            if (res) {
              const scannedValue = res.getText();
              setResult(scannedValue);
              console.log("Scanned Barcode:", scannedValue);
              // Vibration for feedback
              if (navigator.vibrate) navigator.vibrate(200);
            }
          }
        );
        controlsRef.current = controls;
      } catch (err) {
        console.error(err);
        setError("Camera open nahi ho raha. HTTPS ya localhost use karo.");
      }
    }

    startScanner();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', width: '100%' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: '#166534' }}>Scan Barcode</h2>

      <div style={{ position: 'relative', width: '100%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden', border: '4px solid #16a34a', background: '#000', height: '300px' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
          playsInline
        />
        {/* Red Scan Line */}
        <div style={{ position: 'absolute', left: '20px', right: '20px', top: '50%', height: '2px', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}></div>
      </div>

      <p style={{ marginTop: '20px', textAlign: 'center', color: '#374151' }}>
        Barcode ko camera ke center me rakho
      </p>

      {result && (
        <div style={{ marginTop: '20px', width: '100%', maxWidth: '400px', background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: '600', margin: 0 }}>Scanned Code:</p>
          <p style={{ wordBreak: 'break-all', color: '#15803d', marginTop: '5px' }}>{result}</p>
        </div>
      )}

      {error && <p style={{ marginTop: '20px', color: '#dc2626' }}>{error}</p>}
      
      <button 
        onClick={onBack}
        style={{ marginTop: '30px', padding: '12px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
      >
        Back to App
      </button>
    </div>
  );
}
