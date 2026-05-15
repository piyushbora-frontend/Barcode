import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import dns from 'dns';
import https from 'https';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const distPath = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distPath, 'index.html');

// Serve static files from React build
app.use(express.static(distPath));

const COINME_AUTH_URL = process.env.COINME_AUTH_URL || 'https://caas-staging.coinme.com/services/authorize';
const GREENDOT_BASE_URL = process.env.GREENDOT_BASE_URL || 'https://caas-staging.coinme.com/greendot/ws';
const BASIC_AUTH = process.env.BASIC_AUTH;

// Custom DNS Resolver for high availability
const customLookup = (hostname, options, callback) => {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'object' ? options : {};

  dns.lookup(hostname, opts, (err, address, family) => {
    if (!err) return cb(null, address, family);

    console.log(`[DNS] Local lookup failed for ${hostname}. Trying Google DNS...`);
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);

    resolver.resolve4(hostname, (err2, addresses) => {
      if (err2 || !addresses.length) return cb(err || err2);
      if (opts.all) return cb(null, addresses.map(a => ({ address: a, family: 4 })));
      cb(null, addresses[0], 4);
    });
  });
};

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ lookup: customLookup })
});

const generateRequestId = () => `Test006${Date.now()}`.slice(0, 26);

// --- API ROUTES ---

app.post('/api/authorize', async (req, res) => {
  try {
    if (!BASIC_AUTH) return res.status(500).json({ error: 'BASIC_AUTH missing in .env' });
    const response = await axiosInstance.post(COINME_AUTH_URL, {}, {
      headers: { accept: 'application/json', authorization: BASIC_AUTH }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/greendot-auth', async (req, res) => {
  const { amount, barcode, token } = req.body;
  if (!amount || !barcode || !token) return res.status(400).json({ error: 'Missing fields' });

  const requestId = generateRequestId();
  const correlationId = crypto.randomUUID();
  const soapBody = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://greendotcorp.com/WebServices/Corporate/GDNPartnerAPI/IGDNPartnerAPI/Auth</Action>
    <ActivityId CorrelationId="${correlationId}" xmlns="http://schemas.microsoft.com/2004/09/ServiceModel/Diagnostics">00000000-0000-0000-0000-000000000000</ActivityId>
  </s:Header>
  <s:Body>
    <Auth xmlns="http://greendotcorp.com/WebServices/Corporate/GDNPartnerAPI/">
      <request xmlns:d4p1="https://partners.greendotcorp.com/GDCPartners/GDCWS_GDNPartnerAPI/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <d4p1:Authentication>
          <d4p1:PartnerCode>GreenDot</d4p1:PartnerCode>
          <d4p1:UserName>coinme-gd-soap-client</d4p1:UserName>
          <d4p1:Password>${process.env.GREENDOT_PASSWORD || 'oTa1vSOZEq81mRQ3gI4pdOKE9IZE9aJS'}</d4p1:Password>
        </d4p1:Authentication>
        <d4p1:Channel>5</d4p1:Channel>
        <d4p1:RequestDateTime>${new Date().toISOString()}</d4p1:RequestDateTime>
        <d4p1:RequestID>${requestId}</d4p1:RequestID>
        <d4p1:Version>2.0.0</d4p1:Version>
        <d4p1:Amount>${amount}</d4p1:Amount>
        <d4p1:ProgramNumber>Coinme-bc395</d4p1:ProgramNumber>
        <d4p1:SourceAccount><d4p1:AccountNumber>${barcode}</d4p1:AccountNumber><d4p1:AccountType>7</d4p1:AccountType></d4p1:SourceAccount>
        <d4p1:TargetAccount><d4p1:AccountNumber>${barcode}</d4p1:AccountNumber><d4p1:AccountType>3</d4p1:AccountType></d4p1:TargetAccount>
      </request>
    </Auth>
  </s:Body></s:Envelope>`;

  try {
    const response = await axiosInstance.post(GREENDOT_BASE_URL, soapBody, {
      headers: { 'Content-Type': 'text/xml', Authorization: `Bearer ${token}` }
    });
    res.send(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).send(error.response?.data || error.message);
  }
});

// Catch-all for React Frontend
app.use((req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath);
  } else {
    res.status(404).send("Frontend not built. Run 'npm run build' first.");
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Barcode Scanner Live!`);
  console.log(`URL: http://localhost:${PORT}`);
});