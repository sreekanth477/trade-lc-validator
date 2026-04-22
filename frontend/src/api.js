import axios from 'axios';

// Improvement #1 — token stored in memory (not localStorage) for security
let _token = null;

export function setToken(token) { _token = token; }
export function getToken() { return _token; }
export function clearToken() { _token = null; }

const api = axios.create({ baseURL: '/api' });

// Attach JWT to every request
api.interceptors.request.use(cfg => {
  if (_token) cfg.headers.Authorization = `Bearer ${_token}`;
  return cfg;
});

// Auto-logout on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) clearToken();
    return Promise.reject(err);
  }
);

export async function login(username, password) {
  const res = await api.post('/auth/login', { username, password });
  setToken(res.data.token);
  return res.data;
}

export async function validateDocuments(formData) {
  const res = await api.post('/validate', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function validateDemo() {
  const DEMO_DOCUMENTS = [
    {
      type: 'lc', filename: 'LC-2024-HBK-00847.txt', mediaType: 'text/plain',
      content: `LETTER OF CREDIT\nLC Number: LC-2024-HBK-00847\nIssuing Bank: Hyderabad Bank of Commerce\nApplicant: Global Tech Imports Pvt Ltd, Hyderabad, India\nBeneficiary: Shanghai Electronics Co. Ltd, Shanghai, China\nLC Amount: USD 285,000.00\nExpiry Date: 15 March 2025\nLatest Shipment Date: 28 February 2025\nPort of Loading: Shanghai, China\nPort of Discharge: Nhava Sheva, Mumbai, India\nPartial Shipments: NOT ALLOWED\nTransshipment: NOT ALLOWED\nGoods: Electronic Components and PCB Assemblies as per PI-2024-0091\nIncoterms: CIF Nhava Sheva\nDocuments: 3 Originals Invoice, Full Set Clean On Board BL, Insurance 110% ICC(A)`
    },
    {
      type: 'invoice', filename: 'INV-SE-20250215.txt', mediaType: 'text/plain',
      content: `COMMERCIAL INVOICE\nInvoice: INV-SE-20250215\nDate: 20 February 2025\nSeller: Shanghai Electronics Co. Ltd\nBuyer: Global Tech Imports Pvt Ltd, Hyderabad, India\nLC Ref: LC-2024-HBK-00847\nGoods: Electronic Components, PCB Assemblies, and Miscellaneous Hardware\nAmount: USD 284,500.00\nOriginals: 2`
    },
    {
      type: 'bl', filename: 'BL-COSCO-20250222.txt', mediaType: 'text/plain',
      content: `BILL OF LADING\nBL: BL-COSCO-20250222\nCarrier: COSCO SHIPPING Lines\nShipper: Shanghai Electronics Co. Ltd\nConsignee: TO ORDER OF HYDERABAD BANK OF COMMERCE\nVessel: COSCO PACIFIC / Voyage 024E\nPort of Loading: Shanghai, China\nPort of Discharge: Nhava Sheva, Mumbai, India\nTransshipment Port: Singapore\nOn Board: 22 February 2025\nClean on Board\nOriginals: 3/3\nNote: Will be transshipped at Singapore.`
    },
    {
      type: 'insurance', filename: 'IC-PICC-20250221.txt', mediaType: 'text/plain',
      content: `INSURANCE CERTIFICATE\nCertificate: IC-PICC-20250221\nIssued: 23 February 2025\nInsurer: PICC Property and Casualty\nInsured: Shanghai Electronics Co. Ltd\nCoverage: USD 313,500.00 (110% of 284,500)\nCurrency: USD\nType: Institute Cargo Clauses (A)\nGoods: Electronic Components and PCB Assemblies`
    }
  ];
  const res = await api.post('/validate/text', {
    documents: DEMO_DOCUMENTS,
    presented_date: new Date().toISOString().split('T')[0]
  });
  return res.data;
}

export async function submitFeedback(submissionId, discrepancyId, verdict, note = '') {
  const res = await api.post('/feedback', { submissionId, discrepancyId, verdict, note });
  return res.data;
}

export async function submitDecision(submissionId, decision, reason = '', noticeOfRefusal = null) {
  const res = await api.post('/decisions', { submissionId, decision, reason, noticeOfRefusal });
  return res.data;
}

export async function revalidateManual(extractedFields, presented_date) {
  const res = await api.post('/validate/manual-fields', { extractedFields, presented_date });
  return res.data;
}
