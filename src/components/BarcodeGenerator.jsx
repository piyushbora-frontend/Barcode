import React from 'react';
import Barcode from 'react-barcode';

const BarcodeGenerator = ({ onBack }) => {
  const barcodeValue = "830324017377630280006355303265";

  return (
    <div className="phone-container" style={{ background: 'linear-gradient(180deg, #d1fae5 0%, #ffffff 100%)', color: '#064e3b', border: '8px solid #1f2937' }}>
      <div className="app-header" style={{ padding: '20px', display: 'flex', alignItems: 'center' }}>
        <div className="back-btn" onClick={onBack} style={{ cursor: 'pointer', fontSize: '1.5rem', marginRight: '20px' }}>←</div>
        <div className="header-title" style={{ fontWeight: 700 }}>Barcode</div>
      </div>

      <div className="app-content" style={{ textAlign: 'center', padding: '20px' }}>
        <h2 className="main-title" style={{ color: '#000', fontSize: '1.5rem', fontWeight: 700, margin: '10px 0' }}>Store checkout code</h2>
        <p className="sub-title" style={{ color: '#1f2937', fontSize: '0.9rem', marginBottom: '20px' }}>
          Bring USD 21.00 in cash to Walmart. A clerk will scan the code below so we can credit your PayAiro wallet.
        </p>

        <div style={{ 
          background: '#ffffff', 
          padding: '25px', 
          borderRadius: '24px', 
          boxShadow: '0 15px 35px rgba(0,0,0,0.05)',
          marginBottom: '25px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <Barcode 
            value={barcodeValue} 
            width={1.4} 
            height={90} 
            displayValue={false}
            background="transparent"
            lineColor="#000"
          />
        </div>

        <div style={{ width: '100%', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Approx. BTC you'll receive</span>
            <span style={{ fontWeight: 700, color: '#000' }}>0.00025019 BTC</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Service fee</span>
            <span style={{ fontWeight: 700, color: '#000' }}>$0.84</span>
          </div>
          
          <p style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4, marginBottom: '15px' }}>
            Figures below assume a USD 21.00 cash add-on. Crypto shown is an estimate until the partner confirms the trade. Network or partner fees can change the final amount.
          </p>
          
          <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500, marginBottom: '25px' }}>
            600 Showers Dr, Mountain View, CA 94040
          </div>
        </div>

        <button 
          onClick={onBack}
          style={{ 
            width: '100%', 
            background: '#047857', 
            color: '#fff', 
            border: 'none', 
            padding: '16px', 
            borderRadius: '16px', 
            fontSize: '1.1rem', 
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 'auto'
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default BarcodeGenerator;
