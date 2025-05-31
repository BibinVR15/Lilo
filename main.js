const waveContainer = document.getElementById('waveContainer');
const wave1 = document.getElementById('wave1');
const wave2 = document.getElementById('wave2');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.continuous = true;
recognition.interimResults = true;

let listening = false;
let conversation = false;
let finalTranscript = '';
let timeoutId = null;
let conversationHistory = [];

function setWave(mode) {
  waveContainer.className = '';
  if (mode === 'listen') {
    waveContainer.classList.add('listening');
  } else if (mode === 'blast') {
    waveContainer.classList.add('blast');
    setTimeout(() => waveContainer.classList.remove('blast'), 1000);
  } else {
    waveContainer.classList.remove('listening');
  }
}

function startRecognition() {
  recognition.start();
  setWave('listen');
}

function stopRecognition() {
  recognition.stop();
  clearTimeout(timeoutId);
  setWave(null);
}

function reset() {
  conversation = false;
  conversationHistory = [];
  finalTranscript = '';
  startRecognition();
}

recognition.onresult = (event) => {
  let transcript = '';
  for (let i = event.resultIndex; i < event.results.length; ++i) {
    const spoken = event.results[i][0].transcript.toLowerCase();

    if (!conversation && spoken.includes('lilo')) {
      conversation = true;
      finalTranscript = '';
      return;
    }

    if (conversation && spoken.includes('bye')) {
      stopRecognition();
      const goodbye = new SpeechSynthesisUtterance("Goodbye");
      speechSynthesis.speak(goodbye);
      goodbye.onend = reset;
      return;
    }

    if (event.results[i].isFinal) {
      finalTranscript += spoken + ' ';
    } else {
      transcript += spoken;
    }
  }

  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (finalTranscript.trim() && conversation) {
      recognition.stop();
    }
  }, 3000);
};

recognition.onend = async () => {
  if (!conversation || finalTranscript.trim() === '') {
    startRecognition();
    return;
  }

  setWave(null);

  conversationHistory.push({ role: 'user', content: finalTranscript });

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: "You are a friendly and natural voice assistant named Lilo." },
          ...conversationHistory,
        ],
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I didn’t get that.";
    conversationHistory.push({ role: 'assistant', content: reply });

    const speak = new SpeechSynthesisUtterance(reply);
    speak.onstart = () => setWave('blast');
    speak.onend = () => startRecognition();
    speechSynthesis.speak(speak);
  } catch (e) {
    console.error("API error:", e);
    startRecognition();
  }

  finalTranscript = '';
};

recognition.onerror = (e) => {
  console.error("Recognition error:", e.error);
  startRecognition();
};

// Start
startRecognition();
