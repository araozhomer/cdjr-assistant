const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false }));

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
  <Say voice="Polly.Joanna">You selected product cancellations. To cancel a warranty, G A P, or other product, we need your full name, phone number or email, and reason for cancelling such as sold the vehicle, total loss, or general cancellation. If there is a lien on the vehicle, proceeds go to the lender unless you provide proof of payoff. Cancellations take 6 to 8 weeks after paperwork is received. Please leave your information after the tone.</Say>
  <Record action="/message-received" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '2') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected registration, tags, or title. We handle most local registrations and issue metal plates in house. Out of state registrations take approximately two months. Please leave your information after the tone.</Say>
  <Record action="/message-received" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '3') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected paperwork copies. Please leave your name, phone number, and the documents you need after the tone.</Say>
  <Record action="/message-received" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  } else if (digit === '4') {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You selected general finance questions. Please leave your name and phone number after the tone and a finance specialist will return your call.</Say>
  <Record action="/message-received" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription"/>
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
  <Say voice="Polly.Joanna">Please leave your message after the tone.</Say>
  <Record action="/message-received" method="POST" maxLength="120" finishOnKey="#" transcribe="true" transcribeCallback="/transcription"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`);
  }
});

app.post('/message-received', (req, res) => {
  const caller = req.body.From || 'Unknown';
  const recording = req.body.RecordingUrl || 'none';
  console.log(`VOICEMAIL from ${caller} - Recording: ${recording}`);
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you. Your message has been received. A member of our finance team will return your call the next business day. Thank you for calling Cape Coral C D J R. Have a great day.</Say>
  <Hangup/>
</Response>`);
});

app.post('/transcription', (req, res) => {
  const text = req.body.TranscriptionText || '';
  const caller = req.body.From || 'Unknown';
  console.log(`TRANSCRIPTION from ${caller}: ${text}`);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CDJR Assistant running on port ${PORT}`));
