const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

router.post(
  '/analyze',
  upload.fields([{ name: 'mri', maxCount: 1 }, { name: 'voice', maxCount: 1 }]),
  async (req, res) => {
    const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:5001';

    const mriFile = req.files?.mri?.[0];
    const voiceFile = req.files?.voice?.[0];
    const quizScore = req.body?.quizScore ?? 0;

    try {
      if (!mriFile || !voiceFile) {
        return res.status(400).json({ msg: 'Both MRI and Voice files are required.' });
      }

      console.log('🧾 Incoming analyze request:');
      console.log(' - mri path:', mriFile.path, 'original:', mriFile.originalname);
      console.log(' - voice path:', voiceFile.path, 'original:', voiceFile.originalname);
      console.log(' - quizScore:', quizScore);
      console.log(' - forwarding to', `${ML_API_URL}/analyze`);

      const formData = new FormData();
      formData.append('mri', fs.createReadStream(mriFile.path), mriFile.originalname);
      formData.append('voice', fs.createReadStream(voiceFile.path), voiceFile.originalname);
      formData.append('quizScore', String(quizScore));

      const r = await axios.post(`${ML_API_URL}/analyze`, formData, {
        headers: formData.getHeaders(),
        timeout: 120000, // 120s in case model is heavy
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('✅ Flask responded:', r.status, r.data);

      // Cleanup temp files
      try { fs.unlinkSync(mriFile.path); } catch {}
      try { fs.unlinkSync(voiceFile.path); } catch {}

      if (r.data?.status === 'ok') {
        return res.json({ results: r.data.result });
      }
      return res.status(502).json({ msg: 'Unexpected response from ML API', details: r.data });

    } catch (err) {
      console.error('❌ Analysis route error:');
      if (err.response) {
        console.error(' - Flask status:', err.response.status);
        console.error(' - Flask data:', err.response.data);
      } else {
        console.error(' - Error message:', err.message);
      }
      // Cleanup even on error
      try { fs.unlinkSync(mriFile?.path); } catch {}
      try { fs.unlinkSync(voiceFile?.path); } catch {}

      return res.status(500).json({
        msg: 'Analysis failed. Please try again.',
        details: err.response?.data || err.message,
      });
    }
  }
);

module.exports = router;
