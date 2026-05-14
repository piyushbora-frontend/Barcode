import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import dns from 'dns';
import https from 'https';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const COINME_AUTH_URL = 'https://caas-staging.coinme.com/services/authorize';
const GREENDOT_BASE_URL = 'https://caas-staging.coinme.com/greendot/ws';
const BASIC_AUTH = 'Basic Mzk4Zjc1NjMtYTE4ZS00YjBjLWJjNDYtMGYwNjhkZTVkYzQ0OjEyNzU3MTU1LWM1ZTctNGViNS04MTc2LTdlNDdiYTExZGFlYQ==';

// Custom DNS Resolver for environments with shaky DNS
const customLookup = (hostname, options, callback) => {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'object' ? options : {};

  dns.lookup(hostname, opts, (err, address, family) => {
    if (!err) return cb(null, address, family);

    console.log(`[DNS] Local lookup failed for ${hostname}: ${err.message}. Trying Google DNS... (opts: ${JSON.stringify(opts)})`);
    
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);

    resolver.resolve4(hostname, (err2, addresses) => {
      if (err2 || !addresses.length) {
        console.error(`[DNS] Google DNS also failed for ${hostname}`);
        return cb(err || err2);
      }
      
      console.log(`[DNS] Google DNS resolved ${hostname} to ${addresses[0]}`);
      
      if (opts.all) {
        const results = addresses.map(a => ({ address: a, family: 4 }));
        return cb(null, results);
      }
      
      cb(null, addresses[0], 4);
    });
  });
};

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ lookup: customLookup })
});

// Helper to generate Unique Request ID
const generateRequestId = () => `Test006${Date.now()}`.slice(0, 26);

// Step 1: Authorize Proxy
app.post('/api/authorize', async (req, res) => {
  try {
    console.log('--- COINME AUTHORIZE ---');
    const response = await axiosInstance.post(COINME_AUTH_URL, {}, {
      headers: {
        'accept': 'application/json',
        'authorization': BASIC_AUTH
      }
    });
    console.log('Bearer Token Status: Received');
    res.json(response.data);
  } catch (error) {
    console.error('Authorize Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Step 2: GreenDot Auth Endpoint
app.post('/api/greendot-auth', async (req, res) => {
  const { amount, barcode, token } = req.body;
  const requestId = generateRequestId();
  const correlationId = crypto.randomUUID();

  console.log('--- GREENDOT AUTH START ---');
  console.log(`Amount: ${amount}`);
  console.log(`TransactionProviderRef (Barcode): ${barcode}`);
  console.log(`RequestID: ${requestId}`);

  const soapBody = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://greendotcorp.com/WebServices/Corporate/GDNPartnerAPI/IGDNPartnerAPI/Auth</Action>
    <ActivityId CorrelationId="${correlationId}" xmlns="http://schemas.microsoft.com/2004/09/ServiceModel/Diagnostics">00000000-0000-0000-0000-000000000000</ActivityId>
  </s:Header>
  <s:Body>
    <Auth xmlns="http://greendotcorp.com/WebServices/Corporate/GDNPartnerAPI/">
      <request xmlns:d4p1="https://partners.greendotcorp.com/GDCPartners/GDCWS_GDNPartnerAPI/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <d4p1:Audit i:nil="true"/>
        <d4p1:Authentication>
          <d4p1:PartnerCode>GreenDot</d4p1:PartnerCode>
          <d4p1:UserName>coinme-gd-soap-client</d4p1:UserName>
          <d4p1:Password>oTa1vSOZEq81mRQ3gI4pdOKE9IZE9aJS</d4p1:Password>
        </d4p1:Authentication>
        <d4p1:Channel>5</d4p1:Channel>
        <d4p1:Customer i:nil="true"/>
        <d4p1:RequestDateTime>${new Date().toISOString()}</d4p1:RequestDateTime>
        <d4p1:RequestID>${requestId}</d4p1:RequestID>
        <d4p1:Version>2.0.0</d4p1:Version>
        <d4p1:Amount>${amount}</d4p1:Amount>
        <d4p1:AuthLifeSpan>210</d4p1:AuthLifeSpan>
        <d4p1:Description>Coinme Checkout</d4p1:Description>
        <d4p1:DictionaryEntry xmlns:d5p1="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
          <d5p1:KeyValueOfstringstring>
            <d5p1:Key>Partner</d5p1:Key>
            <d5p1:Value>Walmart</d5p1:Value>
          </d5p1:KeyValueOfstringstring>
          <d5p1:KeyValueOfstringstring>
            <d5p1:Key>BarcodePartnerRequestId</d5p1:Key>
            <d5p1:Value>${barcode}</d5p1:Value>
          </d5p1:KeyValueOfstringstring>
        </d4p1:DictionaryEntry>
        <d4p1:PartialApproval>false</d4p1:PartialApproval>
        <d4p1:PaymentType>7</d4p1:PaymentType>
        <d4p1:ProgramNumber>Coinme-bc395</d4p1:ProgramNumber>
        <d4p1:SourceAccount>
          <d4p1:AccountNumber>${barcode}</d4p1:AccountNumber>
          <d4p1:AccountType>7</d4p1:AccountType>
        </d4p1:SourceAccount>
        <d4p1:TargetAccount>
          <d4p1:AccountNumber>${barcode}</d4p1:AccountNumber>
          <d4p1:AccountType>3</d4p1:AccountType>
        </d4p1:TargetAccount>
        <d4p1:TransactionReferenceNumber i:nil="true"/>
      </request>
    </Auth>
  </s:Body>
</s:Envelope>`;

  console.log('--- FINAL XML REQUEST ---');
  console.log(soapBody);

  try {
    const response = await axiosInstance.post(GREENDOT_BASE_URL, soapBody, {
      headers: {
        'Content-Type': 'text/xml',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('--- FULL SOAP RESPONSE ---');
    console.log(response.data);
    res.send(response.data);
  } catch (error) {
    console.error('GreenDot Auth Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).send(error.response?.data || error.message);
  }
});

// Step 3: GreenDot Commit Endpoint
app.post('/api/greendot-commit', async (req, res) => {
  const { amount, barcode, token } = req.body;
  const requestId = generateRequestId();
  const correlationId = crypto.randomUUID();

  console.log('--- GREENDOT COMMIT START ---');
  
  const soapBody = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://greendotcorp.com/WebServices/Corporate/GDNPartnerAPI/IGDNPartnerAPI/Commit</Action>
    <ActivityId CorrelationId="${correlationId}" xmlns="http://schemas.microsoft.com/2004/09/ServiceModel/Diagnostics">00000000-0000-0000-0000-000000000000</ActivityId>
  </s:Header>
  <s:Body>
    <Commit xmlns="http://greendotcorp.com/WebServices/Corporate/GDNPartnerAPI/">
      <request xmlns:d4p1="https://partners.greendotcorp.com/GDCPartners/GDCWS_GDNPartnerAPI/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <d4p1:Audit i:nil="true"/>
        <d4p1:Authentication>
          <d4p1:PartnerCode>GreenDot</d4p1:PartnerCode>
          <d4p1:UserName>coinme-gd-soap-client</d4p1:UserName>
          <d4p1:Password>oTa1vSOZEq81mRQ3gI4pdOKE9IZE9aJS</d4p1:Password>
        </d4p1:Authentication>
        <d4p1:Channel>5</d4p1:Channel>
        <d4p1:RequestDateTime>${new Date().toISOString()}</d4p1:RequestDateTime>
        <d4p1:RequestID>${requestId}</d4p1:RequestID>
        <d4p1:Version>2.0.0</d4p1:Version>
        <d4p1:Amount>${amount}</d4p1:Amount>
        <d4p1:Description>Coinme Checkout Commit</d4p1:Description>
        <d4p1:ProgramNumber>Coinme-bc395</d4p1:ProgramNumber>
        <d4p1:SourceAccount>
          <d4p1:AccountNumber>${barcode}</d4p1:AccountNumber>
          <d4p1:AccountType>7</d4p1:AccountType>
        </d4p1:SourceAccount>
        <d4p1:TargetAccount>
          <d4p1:AccountNumber>${barcode}</d4p1:AccountNumber>
          <d4p1:AccountType>3</d4p1:AccountType>
        </d4p1:TargetAccount>
      </request>
    </Commit>
  </s:Body>
</s:Envelope>`;

  console.log('--- FINAL COMMIT XML REQUEST ---');
  console.log(soapBody);

  try {
    const response = await axiosInstance.post(GREENDOT_BASE_URL, soapBody, {
      headers: {
        'Content-Type': 'text/xml',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('--- FULL COMMIT SOAP RESPONSE ---');
    console.log(response.data);
    res.send(response.data);
  } catch (error) {
    console.error('GreenDot Commit Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).send(error.response?.data || error.message);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend proxy running on http://localhost:${PORT}`);
});
