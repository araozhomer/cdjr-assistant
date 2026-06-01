const express = require('express');
const https = require('https');
const app = express();
app.use(express.urlencoded({ extended: false }));

// Send email via SendGrid HTTP API
function sendEmail(subject, body) {
  const data = JSON.stringify({
    personalizations: [{ to: [{ email: 'homer.araoz@capecoralcdjr.com' }] }],
    from: { email: 'araozhomer@gmail.com', name: 'Cape Coral CDJR Finance' },
    subject: subject,
    content: [{ type: 'text/plain', value: body }]
  });

  const options = {
    hostname: 'api.sendgrid.com',
    path: '/v3/mail/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    console.log('Email status:', res.statusCode);
  });
  req.on('error', (e) => console.error('Email error:', e.message));
  req.write(data);
  req.end();
}

// Keep-alive ping
setInterval(() => {
  https.get('https://cdjr-assistant.onrender.com/ping', () => {}).on('error', () => {});
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
  <Say voice="Polly.Joanna">You selected product cancellations. To cancel a warranty, G A P, or other product, we need your full name, phone number or email, and reason for cancelling. If there is a lien on the vehicle, proceeds go to the lender unless you provide proof of payoff. Cancellations take 6 to 8 weeks after paperwork is received. Please leave your information after the tone. Press pound when finished.</Say>
  <Record action="/message-received?category=Cancellation" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=Cancellation"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '2') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected registration, tags, or title. We handle most local registrations and issue metal plates in house. Out of state registrations take approximately two months. Please leave your information after the tone. Press pound when finished.</Say>
  <Record action="/message-received?category=Registration" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=Registration"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '3') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected paperwork copies. Please leave your name, phone number, and documents needed after the tone. Press pound when finished.</Say>
  <Record action="/message-received?category=Paperwork" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=Paperwork"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '4') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected general finance questions. Please leave your name and phone number after the tone. Press pound when finished.</Say>
  <Record action="/message-received?category=Finance" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription?category=Finance"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '5') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Cape Coral C D J R is located at 2200 Northeast Pine Island Road, Cape Coral, Florida 33909. Finance hours are Monday through Friday 9 A M to 9 P M, Saturday 9 A M to 8 P M, and Sunday 10 A M to 7 P M. Visit us at cape coral c d j r dot com. Goodbye.</Say>
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

app.post('/message-received', (req, res) => {
  const category = req.query.category || 'General';
  const caller = req.body.From || 'Unknown';
  const recording = req.body.RecordingUrl || 'none';
  const time = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  console.log(`VOICEMAIL [${category}] from ${caller}`);

  sendEmail(
    `New Voicemail - ${category} - ${caller}`,
    `New voicemail at Cape Coral CDJR Finance\n\nCategory: ${category}\nCaller: ${caller}\nTime: ${time}\nRecording: ${recording}\n\nTranscription coming shortly.\n\nPlease return call next business day.`
  );

  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you. Your message has been received. A member of our finance team will return your call the next business day. Thank you for calling Cape Coral C D J R. Have a great day.</Say>
  <Hangup/>
</Response>`);
});

app.post('/transcription', (req, res) => {
  const category = req.query.category || 'General';
  const caller = req.body.From || 'Unknown';
  const text = req.body.TranscriptionText || 'Not available';
  const time = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  console.log(`TRANSCRIPTION [${category}] from ${caller}: ${text}`);

  sendEmail(
    `Transcription - ${category} - ${caller}`,
    `Voicemail Transcription - Cape Coral CDJR Finance\n\nCategory: ${category}\nCaller: ${caller}\nTime: ${time}\n\nMessage:\n"${text}"\n\nPlease return call next business day.`
  );

  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`CDJR Assistant running on port ${PORT}`));
