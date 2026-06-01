const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
app.use(express.urlencoded({ extended: false }));

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(subject, body) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'homer.araoz@capecoralcdjr.com',
      subject: subject,
      text: body
    });
    console.log('Email sent:', subject);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// Keep-alive ping
const https = require('https');
setInterval(() => {
  https.get('https://cdjr-assistant.onrender.com/ping', (res) => {
    console.log('Ping:', res.statusCode);
  }).on('error', (e) => console.log('Ping error:', e.message));
}, 840000);

app.get('/ping', (req, res) => res.send('ok'));

app.post('/voice', (req, res) => {
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/menu" method="POST" timeout="10">
    <Say voice="Polly.Joanna">Thank you for calling Cape Coral C D J R Finance Department. How may I assist you today? Press 1 for product cancellations. Press 2 for registration, tags, or title. Press 3 for paperwork copies. Press 4 for general finance questions. Press 5 for our hours and location. Press 0 to leave a message.</Say>
  </Gather>
  <Redirect>/voice</Redirect>
</Response>`);
});

app.post('/menu', (req, res) => {
  const digit = req.body.Digits;
  res.type('text/xml');

  if (digit === '1') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected product cancellations. To cancel a warranty, G A P, or other product, we need your full name, phone number or email, and reason for cancelling such as sold the vehicle, total loss, or general cancellation. If there is a lien on the vehicle, proceeds go to the lender unless you provide proof of payoff. Cancellations take 6 to 8 weeks after paperwork is received. Please leave your information after the tone. Press pound when finished.</Say>
  <Record action="/message-received?category=Cancellation" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=Cancellation"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '2') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected registration, tags, or title. We handle most local registrations and issue metal plates in house. Out of state registrations take approximately two months. Please leave your information after the tone. Press pound when finished.</Say>
  <Record action="/message-received?category=Registration-Tags-Title" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=Registration-Tags-Title"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '3') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected paperwork copies. Please leave your name, phone number, and the documents you need after the tone. Press pound when finished.</Say>
  <Record action="/message-received?category=Paperwork-Copy" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=Paperwork-Copy"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '4') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected general finance questions. Please leave your name and phone number after the tone and a finance specialist will return your call. Press pound when finished.</Say>
  <Record action="/message-received?category=General-Finance" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=General-Finance"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '5') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Cape Coral C D J R is located at 2200 Northeast Pine Island Road, Cape Coral, Florida 33909. Finance hours are Monday through Friday 9 A M to 9 P M, Saturday 9 A M to 8 P M, and Sunday 10 A M to 7 P M. Visit us at cape coral c d j r dot com. Thank you for calling. Goodbye.</Say>
  <Hangup/>
</Response>`);
  } else {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please leave your message after the tone. Press pound when finished.</Say>
  <Record action="/message-received?category=General" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=General"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  }
});

app.post('/message-received', async (req, res) => {
  const category = req.query.category || 'General';
  const caller = req.body.From || 'Unknown';
  const recording = req.body.RecordingUrl || 'No recording';
  const time = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  console.log(`VOICEMAIL [${category}] from ${caller}`);

  await sendEmail(
    `📞 New Voicemail — ${category} — ${caller}`,
    `New voicemail received at Cape Coral CDJR Finance\n\nCategory: ${category}\nCaller: ${caller}\nTime: ${time}\nRecording: ${recording}\n\nTranscription will follow in a separate email.\n\nPlease return this call next business day.`
  );

  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you. Your message has been received. A member of our finance team will return your call the next business day. Thank you for calling Cape Coral C D J R. Have a great day.</Say>
  <Hangup/>
</Response>`);
});

app.post('/transcription', async (req, res) => {
  const category = req.query.category || 'General';
  const caller = req.body.From || 'Unknown';
  const text = req.body.TranscriptionText || 'Transcription not available';
  const time = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  console.log(`TRANSCRIPTION [${category}] from ${caller}: ${text}`);

  await sendEmail(
    `📝 Transcription — ${category} — ${caller}`,
    `Voicemail Transcription — Cape Coral CDJR Finance\n\nCategory: ${category}\nCaller: ${caller}\nTime: ${time}\n\nTranscription:\n"${text}"\n\nPlease return this call next business day.`
  );

  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`CDJR Assistant running on port ${PORT}`));
