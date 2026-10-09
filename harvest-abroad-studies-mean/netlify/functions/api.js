const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json({ limit: '30kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const destinations = ['Europe', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'Ireland', 'Other'];
const packages = [
  { id: 'explore', name: 'Explore', summary: 'For students at the beginning of their search.', inclusions: ['Initial profile discussion', 'Destination and course exploration', 'Next-step guidance'], price: 'Custom quote' },
  { id: 'plan', name: 'Plan', summary: 'For students ready to shortlist courses and institutions.', inclusions: ['Profile and shortlist discussion', 'Application planning support', 'Document checklist guidance'], price: 'Custom quote' },
  { id: 'prepare', name: 'Prepare', summary: 'For students who want structured support through key steps.', inclusions: ['Application process guidance', 'Interview and preparation tips', 'Pre-departure checklist'], price: 'Custom quote' }
];

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  destination: { type: String, required: true, enum: destinations },
  studyLevel: { type: String, trim: true, maxlength: 80, default: '' },
  message: { type: String, trim: true, maxlength: 3000, default: '' }
}, { timestamps: true });
const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);

let connectionPromise;
async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
      .catch((err) => { connectionPromise = null; throw err; });
  }
  await connectionPromise;
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !process.env.JWT_SECRET) return res.status(401).json({ message: 'Authorisation required.' });
  try { req.admin = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: 'Session expired or invalid token.' }); }
}

const router = express.Router();
router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Harvest Abroad Studies API' }));
router.get('/destinations', (_req, res) => res.json({ destinations }));
router.get('/packages', (_req, res) => res.json({ packages }));

router.post('/enquiries', async (req, res) => {
  try {
    const { name, email, phone, destination, studyLevel = '', message = '' } = req.body || {};
    if (!name || String(name).trim().length < 2) return res.status(400).json({ message: 'Please enter your full name.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (!phone || String(phone).trim().length < 7) return res.status(400).json({ message: 'Please enter a valid contact number.' });
    if (!destinations.includes(destination)) return res.status(400).json({ message: 'Please select a valid destination.' });
    await connectDatabase();
    const enquiry = await Enquiry.create({ name, email, phone, destination, studyLevel, message });
    return res.status(201).json({ message: 'Thanks! Your enquiry has been received.', id: enquiry._id });
  } catch (err) {
    console.error('Enquiry submission failed:', err.message);
    if (err.message === 'MONGO_URI is not configured') return res.status(503).json({ message: 'Enquiry storage is not configured yet. Please contact the team directly.' });
    return res.status(500).json({ message: 'We could not save your enquiry right now. Please try again later.' });
  }
});

router.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 2000) : '';
  if (!message) return res.status(400).json({ reply: 'Please type a question first.' });
  const fallback = localAnswer(message);
  if (!process.env.OPENAI_API_KEY) return res.json({ reply: fallback, mode: 'faq' });
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: 'You are the Harvest Abroad Studies student guidance assistant. Provide concise, supportive, general information about study-abroad planning, choosing destinations, application preparation, document checklists and counselling packages. Do not invent Harvest company phone numbers, prices, partnerships, admissions, or current visa rules. Do not guarantee admission, scholarships, employment, or visa approval. For current legal/immigration details, direct the student to official government and university websites. For personalised advice, invite them to submit the website enquiry form. Never ask for passport numbers or sensitive identity data.',
        input: message,
        max_output_tokens: 300
      })
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const data = await response.json();
    const reply = (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
    return res.json({ reply: reply || fallback, mode: 'ai' });
  } catch (err) {
    console.error('Chat provider fallback:', err.message);
    return res.json({ reply: fallback, mode: 'faq' });
  }
});

router.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Admin access is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and JWT_SECRET in the deployment environment.' });
  }
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }
  const token = jwt.sign({ sub: String(username), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token, expiresIn: 28800 });
});

router.get('/admin/enquiries', auth, async (_req, res) => {
  try {
    await connectDatabase();
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ enquiries });
  } catch (err) {
    console.error('Admin enquiry list failed:', err.message);
    return res.status(503).json({ message: 'Database unavailable or not configured.' });
  }
});

function localAnswer(message) {
  const q = message.toLowerCase();
  if (/cost|fee|budget|price/.test(q)) return 'Costs vary by country, course, institution and living expenses. Package prices should be confirmed directly with Harvest Abroad Studies. Share your destination and budget through the enquiry form for personalised guidance.';
  if (/visa|immigration/.test(q)) return 'Visa requirements depend on the destination and your circumstances. Please verify current rules on the official government immigration website. Our team can help you understand preparation steps, but visa outcomes cannot be guaranteed.';
  if (/document|paperwork/.test(q)) return 'Common documents may include academic transcripts, a passport, language-test results, a statement of purpose, recommendations and financial evidence. The exact list depends on the institution, course and visa category.';
  if (/europe|usa|united states|canada|uk|united kingdom|australia|germany|ireland/.test(q)) return 'The right destination depends on your academic background, subject, budget and goals. Explore the destination cards on our website and send an enquiry to discuss suitable options.';
  if (/admission|apply|application|deadline/.test(q)) return 'Start by shortlisting courses, checking entry requirements and deadlines, and preparing documents. Requirements differ by institution, so confirm them on the official university website.';
  if (/scholarship|funding/.test(q)) return 'Scholarship availability and eligibility vary by institution, programme and destination. Check university funding pages and official scholarship sources. Do not assume funding is guaranteed.';
  return 'I can help with general questions about destinations, applications, documents, budgets and planning. For personalised advice, use the enquiry form. For official requirements, confirm details with the relevant university or government website.';
}

// Support both Netlify's rewritten function paths and local /api routes.
app.use('/', router);
app.use('/api', router);
app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err.message);
  res.status(500).json({ message: 'Unexpected server error.' });
});

module.exports.handler = serverless(app);
