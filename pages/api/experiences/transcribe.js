let formidableImportError = null;
let IncomingForm;
try {
  // Try both import styles for formidable v2 and v3+
  IncomingForm = require('formidable').IncomingForm;
} catch (e1) {
  try {
    IncomingForm = require('formidable');
  } catch (e2) {
    formidableImportError = e2;
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    if (formidableImportError) {
      return res.status(500).json({ message: 'formidable import failed', error: formidableImportError.message });
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }
    const form = new IncomingForm({ keepExtensions: true, allowEmptyFiles: true, minFileSize: 0 });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({ message: 'Form parse error', error: err.message, stack: err.stack });
      }
      // Debug log for all files
      console.log('[transcribe] files:', files);
      // Support files.audio as array or object
      const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
      if (!audioFile) {
        return res.status(400).json({ message: 'No audio file found in upload', files });
      }
      // Debug log for audioFile
      console.log('[transcribe] audioFile:', audioFile);
      try {
        const audioPath = audioFile.filepath || audioFile.path;
        if (!audioPath) {
          return res.status(400).json({
            message: 'Audio file path missing',
            fileObj: audioFile,
            files,
            note: 'Expected .filepath or .path on formidable file object',
          });
        }
        const audioStream = require('fs').createReadStream(audioPath);
        const { openai } = require('../../../lib/openai');
        const resp = await openai.audio.transcriptions.create({
          file: audioStream,
          model: 'whisper-1',
          response_format: 'text',
          language: 'en',
        });
        res.status(200).json({ transcript: resp });
      } catch (error) {
        res.status(500).json({ message: 'Transcription failed', error: error.message, stack: error.stack });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Unexpected error', error: error.message, stack: error.stack });
  }
} 