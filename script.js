// ===== In-memory Data SDK =====
let emails = [];
window.dataSdk = {
  init: async (handler) => { emails = []; handler.onDataChanged(emails); return { isOk: true }; },
  create: async (email) => { email.__backendId = crypto.randomUUID(); emails.push(email); renderEmails(emails); return { isOk: true }; },
  update: async (email) => { const idx = emails.findIndex(e => e.__backendId === email.__backendId); if (idx>=0){ emails[idx]=email; renderEmails(emails); return {isOk:true}; } return {isOk:false}; },
  delete: async (email) => { emails = emails.filter(e=>e.__backendId!==email.__backendId); renderEmails(emails); return {isOk:true}; }
};

// ===== AI Analysis Simulation =====
function analyzeEmail(subject, content, sender) {
  const lower = (subject+' '+content).toLowerCase();
  let category='info', priority='normal';
  if(/(urgent|asap|emergency|critical|immediately|deadline today)/.test(lower)) { category='urgent'; priority='urgent'; }
  else if(/(action required|please confirm|need your|approval needed|review this|respond by|decision needed)/.test(lower)) category='action';
  else if(/(fyi|newsletter|notification|automated|no reply|unsubscribe)/.test(lower)) { category='archive'; priority='low'; }
  else if(/(important|meeting|deadline|budget|project|client|proposal)/.test(lower)) priority='high';
  let sentiment='neutral';
  if(/(thank|great|excellent|appreciate|wonderful|congratulations)/.test(lower)) sentiment='positive';
  if(/(issue|problem|concern|disappointed|complaint|error|failed)/.test(lower)) sentiment='negative';
  const words=(subject+' '+content).toLowerCase().replace(/[^\w\s]/g,'').split(/\s+/).filter(w=>w.length>4);
  const stopWords=['about','would','there','their','which','thank','please','email','write'];
  const topWords=[...new Set(words.filter(w=>!stopWords.includes(w)))].slice(0,3).join(', ') || 'general';
  const sentences = content.split(/[.!?]+/).filter(s=>s.trim().length>10);
  let summary = sentences.slice(0,2).join('. ').trim() || `Email from ${sender} regarding ${subject}. Key topics: ${topWords}.`;
  return { category, priority, compressed_summary: summary, sentiment, key_topics: topWords, suggested_response: '[Suggested reply here]' };
}

// ===== Rendering Functions =====
let currentFilter='all';
function renderEmails(data){
  const list=document.getElementById('email-list');
  const emptyState=document.getElementById('empty-state');
  const clearBtn=document.getElementById('clear-all-btn');
  const filtered=currentFilter==='all'?data:data.filter(e=>e.category===currentFilter);
  if(data.length===0){ emptyState.classList.remove('hidden'); clearBtn.classList.add('hidden'); list.querySelectorAll('.email-card').forEach(c=>c.remove()); return; }
  emptyState.classList.add('hidden'); clearBtn.classList.remove('hidden');
  list.querySelectorAll('.email-card').forEach(c=>c.remove());
  filtered.forEach(email=>{
    const card=document.createElement('div');
    card.className=`email-card p-4 cursor-pointer hover:bg-slate-700/30 transition-colors priority-${email.priority} slide-in`;
    card.dataset.id=email.__backendId;
    card.innerHTML=`<div class="flex items-start gap-4"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1"><span class="font-medium truncate">${email.subject}</span></div><p class="text-sm text-slate-400 truncate">${email.sender}</p><p class="text-sm text-slate-500 mt-2 line-clamp-2">${email.compressed_summary}</p></div><div class="flex flex-col items-end gap-2 flex-shrink-0"><span class="category-pill px-2 py-1 rounded-full text-xs font-medium">${email.category}</span><span class="text-xs text-slate-500">${email.threadCount} msg${email.threadCount>1?'s':''}</span></div></div>`;
    list.appendChild(card);
  });
  document.getElementById('total-count').textContent = data.length;
  document.getElementById('urgent-count').textContent = data.filter(e=>e.priority==='urgent').length;
}

function setFilter(f){ currentFilter=f; renderEmails(emails); }

// ===== Form Submission =====
document.getElementById('email-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const sender=document.getElementById('sender').value.trim();
  const subject=document.getElementById('subject').value.trim();
  const content=document.getElementById('content').value.trim();
  const threadCount=parseInt(document.getElementById('thread-count').value)||1;
  if(!sender||!subject||!content) return;
  const analysis=analyzeEmail(subject,content,sender);
  const emailData={subject,sender,full_content:content,category:analysis.category,priority:analysis.priority,status:'pending',timestamp:new Date().toISOString(),threadCount,compressed_summary:analysis.compressed_summary,suggested_response:analysis.suggested_response,sentiment:analysis.sentiment,key_topics:analysis.key_topics};
  await window.dataSdk.create(emailData);
  document.getElementById('sender').value=''; document.getElementById('subject').value=''; document.getElementById('content').value=''; document.getElementById('thread-count').value='1';
});

// ===== Filter Buttons =====
document.querySelectorAll('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>setFilter(btn.dataset.filter)));

// Initialize SDK
window.dataSdk.init({onDataChanged:(d)=>renderEmails(d)});
