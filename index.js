const express = require('express');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── BUSINESS HOURS CHECK ─────────────────────────────────────────────────────
function isBusinessHours() {
  const now = new Date();
  const ET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = ET.getDay();
  const hour = ET.getHours();
  const minute = ET.getMinutes();
  const time = hour + minute / 60;
  if (day >= 1 && day <= 5) return time >= 9 && time < 21;
  if (day === 6) return time >= 9 && time < 20;
  if (day === 0) return time >= 10 && time < 19;
  return false;
}

// ─── MAIN CALL HANDLER ────────────────────────────────────────────────────────
app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();
  const inHours = isBusinessHours();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/menu',
    timeout: 10,
    method: 'POST'
  });

  gather.say({ voice: 'Polly.Joanna', language: 'en-US' },
    'Thank you for calling Cape Coral C D J R Finance Department. How may I assist you today? ' +
    'Press 1 for product cancellations such as warranty or G A P. ' +
    'Press 2 for registration, tags, or title questions. ' +
    'Press 3 to request a copy of your finance paperwork. ' +
    'Press 4 for general finance questions. ' +
    'Press 5 for our hours and location. ' +
    'Press 0 to leave a message for our finance team.'
  );

  if (!inHours) {
    twiml.say({ voice: 'Polly.Joanna' },
      'Our finance office is currently closed. Please stay on the line to leave a message and we will return your call the next business day.'
    );
    twiml.redirect('/leave-message?category=After-Hours');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── MENU HANDLER ────────────────────────────────────────────────────────────
app.post('/menu', (req, res) => {
  const digit = req.body.Digits;
  const twiml = new VoiceResponse();

  switch (digit) {
    case '1':
      twiml.say({ voice: 'Polly.Joanna' },
        'You have selected product cancellations. ' +
        'To process a cancellation for a warranty, G A P, or any other finance product, ' +
        'we will need your full name, a phone number or email address, and your reason for cancelling. ' +
        'Common reasons include sold the vehicle, total loss, or a general cancellation request. ' +
        'Please be aware that if there is an existing lien or loan on the vehicle, ' +
        'any cancellation proceeds will be sent directly to your lender unless you can provide proof of payoff. ' +
        'Cancellations typically take 6 to 8 weeks after all required paperwork has been received. ' +
        'Please stay on the line to leave your information.'
      );
      twiml.redirect('/leave-message?category=Cancellation');
      break;

    case '2':
      twiml.say({ voice: 'Polly.Joanna' },
        'You have selected registration, tags, or title questions. ' +
        'Cape Coral C D J R handles most local registrations and issues metal plates in house. ' +
        'Out of state registrations can take approximately two months to complete. ' +
        'Please stay on the line to leave your information and describe your issue.'
      );
      twiml.redirect('/leave-message?category=Registration-Tags-Title');
      break;

    case '3':
      twiml.say({ voice: 'Polly.Joanna' },
        'You have selected finance paperwork copies. ' +
        'Please stay on the line to leave your name, phone number, and the documents you need.'
      );
      twiml.redirect('/leave-message?category=Paperwork-Copy');
      break;

    case '4':
      twiml.say({ voice: 'Polly.Joanna' },
        'You have selected general finance questions. ' +
        'Our finance team handles all financing questions related to your vehicle purchase. ' +
        'Please leave your name and number and a finance specialist will return your call.'
      );
      twiml.redirect('/leave-message?category=General-Finance');
      break;

    case '5':
      twiml.say({ voice: 'Polly.Joanna' },
        'Cape Coral C D J R is located at 2200 Northeast Pine Island Road, Cape Coral, Florida, 3 3 9 0 9. ' +
        'Our finance department hours are Monday through Friday 9 A M to 9 P M, ' +
        'Saturday 9 A M to 8 P M, and Sunday 10 A M to 7 P M. ' +
        'You can also visit us online at cape coral c d j r dot com. ' +
        'Thank you for calling Cape Coral C D J R. Goodbye.'
      );
      twiml.hangup();
      break;

    case '0':
      twiml.redirect('/leave-message?category=General-Message');
      break;

    default:
      twiml.say({ voice: 'Polly.Joanna' }, 'I did not receive a valid selection. Please try again.');
      twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── LEAVE MESSAGE ────────────────────────────────────────────────────────────
app.post('/leave-message', (req, res) => {
  const category = req.query.category || 'General';
  const twiml = new VoiceResponse();

  twiml.say({ voice: 'Polly.Joanna' },
    'Please leave your full name, phone number, and a brief message after the tone. Press pound when finished.'
  );

  twiml.record({
    action: `/message-received?category=${category}`,
    method: 'POST',
    maxLength: 120,
    finishOnKey: '#',
    transcribe: true,
    transcribeCallback: `/transcription?category=${category}`
  });

  twiml.say({ voice: 'Polly.Joanna' }, 'We did not receive a recording. Please call back. Goodbye.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── MESSAGE RECEIVED ─────────────────────────────────────────────────────────
app.post('/message-received', (req, res) => {
  const category = req.query.category || 'General';
  const callerNumber = req.body.From || 'Unknown';
  const recordingUrl = req.body.RecordingUrl || 'No recording';
  const twiml = new VoiceResponse();

  twiml.say({ voice: 'Polly.Joanna' },
    'Thank you. Your message has been received. ' +
    'A member of our finance team will return your call the next business day. ' +
    'Thank you for calling Cape Coral C D J R. Have a great day.'
  );
  twiml.hangup();

  // Send email via fetch to avoid nodemailer dependency issues
  const emailData = {
    category,
    callerNumber,
    recordingUrl,
    time: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  };
  console.log('New voicemail:', JSON.stringify(emailData));

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── TRANSCRIPTION ────────────────────────────────────────────────────────────
app.post('/transcription', (req, res) => {
  const category = req.query.category || 'General';
  const callerNumber = req.body.From || 'Unknown';
  const transcription = req.body.TranscriptionText || 'Not available';
  console.log(`Transcription [${category}] from ${callerNumber}: ${transcription}`);
  res.sendStatus(200);
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cape Coral CDJR AI Assistant running on port ${PORT}`);
});
