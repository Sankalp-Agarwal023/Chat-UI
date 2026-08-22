//Chat UI —script.js(OpenRouter API+LocalStorage History)

const chatWindow   = document.getElementById('chatWindow');
const messageInput = document.getElementById('messageInput');
const sendBtn      = document.getElementById('sendBtn');
const newChatBtn   = document.getElementById('newChatBtn');
const historyList  = document.getElementById('historyList');
const chatTitle    = document.getElementById('chatTitle');
const menuToggle   = document.getElementById('menuToggle');
const sidebar      = document.querySelector('.sidebar');

const OPENROUTER_API_KEY = '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';

let conversationHistory = [];

let isNewChat = true;

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function createMessage(text, sender) {
  const isUser = sender === 'user';

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender);

  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('msg-avatar', isUser ? 'user-avatar' : 'bot-avatar');
  avatarDiv.innerHTML = isUser ? 'S' : '<i class="fa-solid fa-robot"></i>';

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('msg-content');

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.innerHTML = text;

  const timestamp = document.createElement('span');
  timestamp.classList.add('timestamp');
  timestamp.textContent = getTime();

  contentDiv.appendChild(bubble);
  contentDiv.appendChild(timestamp);

  if (isUser) {
    msgDiv.appendChild(contentDiv);
    msgDiv.appendChild(avatarDiv);
  } else {
    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentDiv);
  }

  return msgDiv;
}

function showTyping() {
  const typingDiv = document.createElement('div');
  typingDiv.classList.add('message', 'bot', 'typing-indicator');
  typingDiv.id = 'typingIndicator';

  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('msg-avatar', 'bot-avatar');
  avatarDiv.innerHTML = '<i class="fa-solid fa-robot"></i>';

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('msg-content');

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;

  contentDiv.appendChild(bubble);
  typingDiv.appendChild(avatarDiv);
  typingDiv.appendChild(contentDiv);
  chatWindow.appendChild(typingDiv);
  scrollToBottom();
}

function removeTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

async function getAIReply(userMessage) {

  conversationHistory.push({
    role: 'user',
    content: userMessage
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://127.0.0.1:5500',
      'X-Title': 'Chat UI'
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant in a chat UI. Keep responses clear and concise. Use emojis where suitable.'
        },
        ...conversationHistory
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'OpenRouter API call failed');
  }

  const data = await response.json();
  const replyText = data.choices[0].message.content;

  conversationHistory.push({
    role: 'assistant',
    content: replyText
  });

  return replyText;
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const userMsg = createMessage(text, 'user');
  chatWindow.appendChild(userMsg);
  scrollToBottom();

  if (isNewChat) {
    addToHistory(text);
    isNewChat = false;
  }

  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;

  showTyping();

  try {
    const reply = await getAIReply(text);
    removeTyping();

    const formatted = reply.replace(/\n/g, '<br>');
    const botMsg = createMessage(formatted, 'bot');
    chatWindow.appendChild(botMsg);
    scrollToBottom();

  } catch (error) {
    removeTyping();
    const errMsg = createMessage(
      `⚠️ Error: ${error.message}<br><small>API key check karo ya internet connection dekho.</small>`,
      'bot'
    );
    chatWindow.appendChild(errMsg);
    scrollToBottom();
    console.error('OpenRouter API Error:', error);
  }

  sendBtn.disabled = false;
}

//LOCALSTORAGE—History Save & Load

const STORAGE_KEY = 'chatbot_history';

function saveHistoryToStorage(histories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));
}

function loadHistoryFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function addHistoryEntry(text) {
  const histories = loadHistoryFromStorage();
  histories.unshift({ text, time: Date.now() }); // naye upar rahein
  saveHistoryToStorage(histories);
}

function deleteHistoryEntry(index) {
  const histories = loadHistoryFromStorage();
  histories.splice(index, 1);
  saveHistoryToStorage(histories);
}

function createHistoryItem(text, index, isActive = false) {
  const li = document.createElement('li');
  li.classList.add('history-item');
  if (isActive) li.classList.add('active');

  li.innerHTML = `
    <i class="fa-regular fa-message"></i>
    <span>${text.slice(0, 28)}${text.length > 28 ? '...' : ''}</span>
    <button class="delete-history-btn" title="Delete">
      <i class="fa-solid fa-trash-can"></i>
    </button>
  `;

  li.addEventListener('click', (e) => {
    if (e.target.closest('.delete-history-btn')) return; // delete button pe click ho to ignore
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    li.classList.add('active');
    chatTitle.textContent = text.slice(0, 35);
    sidebar.classList.remove('open');
  });

  li.querySelector('.delete-history-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteHistoryEntry(index);
    renderHistory();
  });

  return li;
}

function renderHistory() {
  historyList.innerHTML = '';
  const histories = loadHistoryFromStorage();
  if (histories.length === 0) {
    historyList.innerHTML = '<li class="history-empty">Koi history nahi</li>';
    return;
  }
  histories.forEach((entry, i) => {
    const li = createHistoryItem(entry.text, i, i === 0);
    historyList.appendChild(li);
  });
}

function addToHistory(text) {
  document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
  addHistoryEntry(text);       // localStorage mein save
  renderHistory();             // sidebar refresh
  chatTitle.textContent = text.slice(0, 35);
}

newChatBtn.addEventListener('click', () => {
  conversationHistory = [];
  isNewChat = true;

  chatWindow.innerHTML = `
    <div class="date-divider"><span>New Chat</span></div>
    <div class="message bot">
      <div class="msg-avatar bot-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="msg-content">
        <div class="bubble">Hello! 👋 I'm your AI assistant. Ask me anything!</div>
        <span class="timestamp">${getTime()}</span>
      </div>
    </div>
  `;
  chatTitle.textContent = 'New Chat';
  document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
  messageInput.focus();
  sidebar.classList.remove('open');
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  sendBtn.disabled = messageInput.value.trim() === '';
});

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (
    sidebar.classList.contains('open') &&
    !sidebar.contains(e.target) &&
    !menuToggle.contains(e.target)
  ) {
    sidebar.classList.remove('open');
  }
});

sendBtn.disabled = true;
messageInput.focus();

renderHistory();