const express = require('express');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const nodemailer = require('nodemailer');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const CONFIG = {
  twilioNumber: '+12397666445',
  financeEmail: 'homer.araoz@capecoralcdjr.com',
  financeCell: '+19545545411',
  dealership: {
    name: 'Cape Coral CDJR',
    address: '2200 NE Pine Island Road, Cape Coral, Florida 33909',
    phone: '239-500-0000',
    website: 'capecoralcdjr.com',
    hours: {
      weekday: '9:00 AM to 9:00 PM Monday through Friday',
      saturday: '9:00 AM to 8:00 PM on Saturday',
      sunday: '10:00 AM to 7:00 PM on Sunday'
    }
  }
};

// ─── BUSINESS HOURS CHECK ─────────────────────────────────────────────────────
function isBusinessHours() {
  const now = new Date();
  const ET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = ET.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const hour = ET.getHours();
  const minute = ET.getMinutes();
  const time = hour + minute / 60;

  if (day >= 1 && day <= 5) return time >= 9 && time < 21;   // Mon-Fri 9am-9pm
  if (day === 6) return time >= 9 && time < 20;               // Sat 9am-8pm
  if (day === 0) return time >= 10 && time < 19;              // Sun 10am-7pm
  return false;
}

// ─── EMAIL HELPER ─────────────────────────────────────────────────────────────
async function sendEmail(subject, body) {
  // Configure with your email provider credentials via environment variables
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: CONFIG.financeEmail,
    subject: subject,
    text: body
  });
}

// ─── MAIN CALL HANDLER ────────────────────────────────────────────────────────
app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();
  const inHours = isBusinessHours();

  twiml.say({
    voice: 'Polly.Joanna',
    language: 'en-US'
  }, 'Thank you for calling Cape Coral C D J R Finance Department. How may I assist you today?');

  const gather = twiml.gather({
    numDigits: 1,
    action: '/menu',
    timeout: 10,
    method: 'POST'
  });

  gather.say({
    voice: 'Polly.Joanna'
  },
    'Please select from the following options. ' +
    'Press 1 for product cancellations, such as warranty or G A P. ' +
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
    twiml.redirect('/leave-message');
  } else {
    twiml.redirect('/leave-message');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── MENU HANDLER ────────────────────────────────────────────────────────────
app.post('/menu', (req, res) => {
  const digit = req.body.Digits;
  const twiml = new VoiceResponse();
  const inHours = isBusinessHours();

  switch (digit) {

    case '1': // Cancellations
      twiml.say({ voice: 'Polly.Joanna' },
        'You have selected product cancellations. ' +
        'To process a cancellation for a warranty, G A P, or any other finance product, ' +
        'we will need your full name, a phone number or email address, and your reason for cancelling. ' +
        'Common reasons include: sold the vehicle, total loss, or a general cancellation request. ' +
        'Please be aware that if there is an existing lien or loan on the vehicle, ' +
        'any cancellation proceeds will be sent directly to your lender unless you can provide proof of payoff. ' +
        'Cancellations typically take 6 to 8 weeks to process after all required paperwork has been received. ' +
        'Please stay on the line to leave your information and a member of our finance team will contact you.'
      );
      twiml.redirect('/leave-message?category=Cancellation');
      break;

    case '2': // Registration / Tags / Title
      twiml.say({ voice: 'Polly.Joanna' },
        'You have selected registration, tags, or title questions. ' +
        'Cape Coral C D J R handles most local registrations and issues metal plates in house. ' +
        'Out of state registrations can take approximately two months to complete. ' +
        'Please stay on the line to leave your information and describe your issue, ' +
        'and a member of our team will follow up with you promptly.'
      );
      twiml.redirect('/leave-message?category=Registration-Tags-Title');
      break;

    case '3': // Paperwork copies
      twiml.say({ voice: 'Polly.Joanna' },
        'You have selected finance paperwork copies. ' +
        'Please stay on the line to leave your name, phone number, and the documents you need, ' +
        'and our finance team will process your request as soon as possible.'
      );
      twiml.redirect('/leave-message?category=Paperwork-Copy-Request');
      break;

    case '4': // General finance questions
      twiml.say({ voice: 'Polly.Joanna' },
        'You have selected general finance questions. ' +
        'Our finance team handles all financing questions related to your vehicle purchase. ' +
        'Please note that we are unable to quote specific rates or account balances over the phone. ' +
        'Please leave your name and number and a finance specialist will return your call.'
      );
      twiml.redirect('/leave-message?category=General-Finance-Question');
      break;

    case '5': // Hours and location
      twiml.say({ voice: 'Polly.Joanna' },
        `Cape Coral C D J R is located at 2200 Northeast Pine Island Road, Cape Coral, Florida, 3 3 9 0 9. ` +
        `Our finance department hours are: Monday through Friday, 9 A M to 9 P M. ` +
        `Saturday, 9 A M to 8 P M. ` +
        `Sunday, 10 A M to 7 P M. ` +
        `You can also visit us online at cape coral c d j r dot com. ` +
        `Is there anything else I can help you with?`
      );
      const gather = twiml.gather({
        numDigits: 1,
        action: '/menu',
        timeout: 8
      });
      gather.say({ voice: 'Polly.Joanna' },
        'Press 1 through 4 to return to the main menu, or press 0 to leave a message.'
      );
      twiml.hangup();
      break;

    case '0': // Leave a message
      twiml.redirect('/leave-message?category=General-Message');
      break;

    default:
      twiml.say({ voice: 'Polly.Joanna' }, 'I did not receive a valid selection. Please try again.');
      twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── VOICEMAIL / MESSAGE RECORDING ───────────────────────────────────────────
app.post('/leave-message', (req, res) => {
  const category = req.query.category || 'General';
  const twiml = new VoiceResponse();

  twiml.say({ voice: 'Polly.Joanna' },
    'Please leave your full name, phone number, and a brief message after the tone. ' +
    'Press the pound key when you are finished.'
  );

  twiml.record({
    action: `/message-received?category=${category}`,
    method: 'POST',
    maxLength: 120,
    finishOnKey: '#',
    transcribe: true,
    transcribeCallback: `/transcription-ready?category=${category}`
  });

  twiml.say({ voice: 'Polly.Joanna' }, 'We did not receive a recording. Please call back and try again. Goodbye.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── MESSAGE RECEIVED ─────────────────────────────────────────────────────────
app.post('/message-received', async (req, res) => {
  const category = req.query.category || 'General';
  const callerNumber = req.body.From || 'Unknown';
  const recordingUrl = req.body.RecordingUrl || 'No recording URL';
  const twiml = new VoiceResponse();

  twiml.say({ voice: 'Polly.Joanna' },
    'Thank you. Your message has been received. ' +
    'A member of our finance team will return your call the next business day. ' +
    'Thank you for calling Cape Coral C D J R. Have a great day.'
  );
  twiml.hangup();

  // Send immediate email notification
  try {
    const subject = `📞 New Finance Call — ${category} — ${callerNumber}`;
    const body =
      `New voicemail received at Cape Coral CDJR Finance Department\n\n` +
      `Category: ${category}\n` +
      `Caller Number: ${callerNumber}\n` +
      `Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}\n` +
      `Recording: ${recordingUrl}\n\n` +
      `Transcription will follow in a separate email once processed.\n\n` +
      `Please return this call the next business day.`;

    await sendEmail(subject, body);
  } catch (err) {
    console.error('Email error:', err.message);
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── TRANSCRIPTION READY ─────────────────────────────────────────────────────
app.post('/transcription-ready', async (req, res) => {
  const category = req.query.category || 'General';
  const callerNumber = req.body.From || 'Unknown';
  const transcription = req.body.TranscriptionText || 'Transcription not available.';

  try {
    const subject = `📝 Transcription Ready — ${category} — ${callerNumber}`;
    const body =
      `Voicemail Transcription — Cape Coral CDJR Finance\n\n` +
      `Category: ${category}\n` +
      `Caller Number: ${callerNumber}\n` +
      `Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}\n\n` +
      `Transcription:\n"${transcription}"\n\n` +
      `Please return this call the next business day.`;

    await sendEmail(subject, body);
  } catch (err) {
    console.error('Transcription email error:', err.message);
  }

  res.sendStatus(200);
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cape Coral CDJR AI Assistant running on port ${PORT}`);
});
