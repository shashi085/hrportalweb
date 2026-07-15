/* ============================================================
   HR Portal — Interactive Chat Simulator
   Simulates a dynamic RAG and AI workflow with streaming output.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatSuggestions = document.getElementById("chat-suggestions");

  if (!chatMessages || !chatForm || !chatInput) return;

  // Simple markdown compiler
  function parseMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-200 italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded font-mono text-brand-300 text-[10px]">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-brand-400 hover:underline" target="_blank">$1</a>')
      .replace(/\n/g, '<br>');
  }

  // Auto-scroll helper
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Create typing indicator element
  function createTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "chat-typing-indicator";
    indicator.className = "flex gap-2 items-center";
    indicator.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-brand-600/80 border border-white/20 flex items-center justify-center flex-shrink-0">
        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div class="bg-white/12 rounded-2xl rounded-tl-sm px-3.5 py-2 flex items-center justify-center">
        <div class="flex gap-1 items-center h-2">
          <div class="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style="animation-delay: 0ms; margin-top: -1px;"></div>
          <div class="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style="animation-delay: 150ms; margin-top: -1px;"></div>
          <div class="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style="animation-delay: 300ms; margin-top: -1px;"></div>
        </div>
      </div>
    `;
    return indicator;
  }

  // Stream text writer
  function streamMessage(text, container) {
    const bubbleWrapper = document.createElement("div");
    bubbleWrapper.className = "flex gap-2 items-start";
    
    const icon = `
      <div class="w-6 h-6 rounded-full bg-brand-600/80 border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
    `;
    
    const bubble = document.createElement("div");
    bubble.className = "bg-white/12 text-white/90 text-[11px] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[78%] leading-relaxed";
    
    bubbleWrapper.innerHTML = icon;
    bubbleWrapper.appendChild(bubble);
    container.appendChild(bubbleWrapper);
    
    let currentLength = 0;
    const speed = 12; // ms per character
    
    return new Promise((resolve) => {
      function type() {
        if (currentLength < text.length) {
          currentLength++;
          const slicedText = text.slice(0, currentLength);
          bubble.innerHTML = parseMarkdown(slicedText);
          scrollToBottom();
          setTimeout(type, speed);
        } else {
          bubble.innerHTML = parseMarkdown(text);
          resolve();
        }
      }
      type();
    });
  }

  // Add User message
  function addUserMessage(text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "flex justify-end";
    msgDiv.innerHTML = `
      <div class="bg-brand-500/90 text-white text-[11px] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[78%] leading-relaxed shadow-sm">
        ${text}
      </div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  // Get simulated response
  function getSimulatedReply(input) {
    const q = input.toLowerCase();
    
    if (q.includes("leave") || q.includes("days") || q.includes("vacation") || q.includes("off")) {
      if (q.includes("apply") || q.includes("submit") || q.includes("request")) {
        return "I've prepared your leave application for **3 days** starting next Monday.\n\nSince you report to **Mike Johnson**, this request will be securely routed to his dashboard for approval. Would you like me to submit it?";
      }
      return "You have **8 days** of annual leave remaining for the current calendar cycle, plus **2 medical leave days**.\n\nYou can apply directly by typing `apply 3 days leave next week`.";
    }
    
    if (q.includes("contract") || q.includes("employment") || q.includes("agreement")) {
      return "I've retrieved your **Employment Agreement (Revision 4)**.\n\nTo ensure privacy, this view is strictly scoped to your authentic user profile and has been registered in the system **Audit Logs**.\n\nIs there a specific clause (like probation or benefits) you want me to search?";
    }
    
    if (q.includes("notice") || q.includes("resign") || q.includes("period")) {
      return "According to the corporate **Notice Period Guidelines**, the standard resignation notice period is **30 days** for full-time employees.\n\nYou can view full procedures under Section 4 of the guidelines.";
    }
    
    return "Hello! I am your **AI HR Assistant**.\n\nI can help you:\n• Check your **leave balances**\n• Request **time off**\n• Search **company policies**\n• Retrieve **audited contract files**\n\nWhat would you like to do?";
  }

  // Send message handler
  async function sendMessage(text) {
    if (!text.trim()) return;
    
    // Clear input
    chatInput.value = "";
    
    // Add user message
    addUserMessage(text);
    
    // Add typing indicator
    const typingIndicator = createTypingIndicator();
    chatMessages.appendChild(typingIndicator);
    scrollToBottom();
    
    // Generate reply text
    const replyText = getSimulatedReply(text);
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    // Remove typing indicator
    typingIndicator.remove();
    
    // Stream response
    await streamMessage(replyText, chatMessages);
  }

  // Form submission
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  // Suggestion click listener
  if (chatSuggestions) {
    chatSuggestions.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn) {
        sendMessage(btn.textContent.trim());
      }
    });
  }
});
