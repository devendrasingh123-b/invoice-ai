const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = require('./supabase');
const { extractText } = require('./ocr');
const { parseInvoice } = require('./llmParser');
const { getAnalytics } = require('./analytics');

const app = express();
app.use(cors());
app.use(express.json());

// Temp folder for uploaded files
const uploadDir = 'temp_uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer config — accept images and PDFs
const upload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, PDF allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ─────────────────────────────────────
// Helper: Find similar format template
// ─────────────────────────────────────
async function findSimilarTemplate(rawText) {
  try {
    const crypto = require('crypto');
    const fingerprint = crypto
      .createHash('md5')
      .update(rawText.substring(0, 300).toLowerCase().replace(/\s+/g, ' '))
      .digest('hex');

    const { data } = await supabase
      .from('format_templates')
      .select('*')
      .eq('fingerprint', fingerprint)
      .limit(1);

    return data && data.length > 0 ? { template: data[0].template_data, fingerprint } : { template: null, fingerprint };
  } catch {
    return { template: null, fingerprint: null };
  }
}

// ─────────────────────────────────────
// Helper: Save format template
// ─────────────────────────────────────
async function saveTemplate(fingerprint, invoiceData) {
  try {
    await supabase.from('format_templates').upsert({
      fingerprint,
      vendor: invoiceData.vendor,
      template_data: invoiceData,
      created_at: new Date().toISOString()
    }, { onConflict: 'fingerprint' });
  } catch { }
}

// ─────────────────────────────────────
// ROUTE: Health check
// ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '⚡ Invoice AI API is running!' });
});

// ─────────────────────────────────────
// ROUTE: Upload invoices                
// ─────────────────────────────────────
app.post('/upload', upload.array('files', 10), async (req, res) => {
  const results = [];

  for (const file of req.files) {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const localPath = file.path;

    try {
      // 1. Upload to Supabase Storage
      const fileBuffer = fs.readFileSync(localPath);
      const storageFileName = `${fileId}${ext}`;

      await supabase.storage
        .from('invoice-files')
        .upload(storageFileName, fileBuffer, { contentType: file.mimetype });

      const { data: urlData } = supabase.storage
        .from('invoice-files')
        .getPublicUrl(storageFileName);

      const storageUrl = urlData.publicUrl;

      // 2. OCR
      const rawText = await extractText(localPath, file.mimetype);
      if (!rawText) throw new Error('No text extracted from file');

      // 3. Check for similar template
      const { template, fingerprint } = await findSimilarTemplate(rawText);

      // 4. Parse with OpenAI
      const { data: invoiceData, confidence } = await parseInvoice(rawText, template);

      // 5. Save template for future reuse
      if (fingerprint) await saveTemplate(fingerprint, invoiceData);

      // 6. Check for duplicate
      let isDuplicate = false;
      if (invoiceData.invoice_number && invoiceData.vendor) {
        const { data: existing } = await supabase
          .from('invoices')
          .select('id')
          .eq('invoice_number', invoiceData.invoice_number)
          .eq('vendor', invoiceData.vendor);
        isDuplicate = existing && existing.length > 0;
      }

      // 7. Save file metadata
      await supabase.from('invoice_files').insert({
        id: fileId,
        original_filename: file.originalname,
        storage_url: storageUrl,
        file_type: ext.replace('.', ''),
        uploaded_at: new Date().toISOString()
      });

      // 8. Save invoice data
      const { data: savedInvoice } = await supabase.from('invoices').insert({
        file_id: fileId,
        vendor: invoiceData.vendor,
        invoice_number: invoiceData.invoice_number,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        currency: invoiceData.currency || 'USD',
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.tax_amount,
        discount_amount: invoiceData.discount_amount,
        total_amount: invoiceData.total_amount,
        payment_terms: invoiceData.payment_terms,
        billing_address: invoiceData.billing_address,
        line_items: invoiceData.line_items || [],
        notes: invoiceData.notes,
        confidence_score: confidence,
        is_duplicate: isDuplicate,
        raw_text_snippet: rawText.substring(0, 500),
        created_at: new Date().toISOString()
      }).select();

      results.push({
        filename: file.originalname,
        status: 'success',
        file_id: fileId,
        data: invoiceData,
        confidence_score: confidence,
        is_duplicate: isDuplicate,
        reused_template: template !== null
      });

    } catch (err) {
      results.push({
        filename: file.originalname,
        status: 'error',
        error: err.message
      });
    } finally {
      // Delete temp file
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }
  }

  res.json({ results });
});

// ─────────────────────────────────────
// ROUTE: Get all invoices
// ─────────────────────────────────────
app.get('/invoices', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_files(original_filename, storage_url)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ invoices: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────
// ROUTE: Analytics
// ─────────────────────────────────────
app.get('/analytics', async (req, res) => {
  try {
    const analytics = await getAnalytics();
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────
// START SERVER
// ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});