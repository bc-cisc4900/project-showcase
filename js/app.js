// CISC 4900 Showcase: shared script for every page.
// Home: stats. Explore: gallery + filters. Project Types: one panel per type. Advice: quote cards.
// Each block only runs when its elements are on the current page.
// PROJECTS and ADVICE are loaded from data/projects.js and data/advice.js
const SEM_ORDER = ["S2026","F2025","S2025","F2024","F2023"];
const ICON_GH = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';

// Each project type gets its own color (used for the card stripe and type badge)
const CAT_COLORS = {
  "Web App":"#3b82f6", "AI / Machine Learning":"#8b5cf6", "Game":"#f43f5e", "Data & Research":"#10b981",
  "Mobile":"#f59e0b", "Campus & Community":"#be185d", "Security":"#0ea5e9", "Video demo":"#f97316", "Other":"#64748b"
};
const STAT_COLORS = ["var(--brand)","#3b82f6","#8b5cf6","#f59e0b"];
const QUOTE_COLORS = ["#f43f5e","#3b82f6","#10b981","#f59e0b","#8b5cf6","#0ea5e9"];
const TECH_COLORS = ["#3b82f6","#8b5cf6","#f43f5e","#10b981","#f59e0b","#0ea5e9","#be185d","#f97316"];
const catColor = c => CAT_COLORS[c] || CAT_COLORS.Other;
const $ = id => document.getElementById(id);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const featured = PROJECTS.filter(p => p.title || p.video);
const semLabel = Object.fromEntries(PROJECTS.map(p => [p.semester, p.semester_label]));

// Stats
const students = PROJECTS.reduce((n,p)=>n+p.members.length,0);
if($("stats")) $("stats").innerHTML = [
  [SEM_ORDER.length,"semesters"],[students,"students"],[featured.length,"featured projects"],[ADVICE.length,"pieces of advice"]
].map(([n,l],i)=>`<div class="stat reveal" style="--c:${STAT_COLORS[i]}"><b data-count="${n}">0</b><span>${l}</span></div>`).join("");

// Count-up animation for the stat numbers
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.querySelectorAll("[data-count]").forEach(el=>{
  const target=+el.dataset.count;
  if(reduceMotion){ el.textContent=target; return; }
  const start=performance.now(), dur=1200;
  const tick=now=>{ const t=Math.min((now-start)/dur,1); el.textContent=Math.round(target*(1-Math.pow(1-t,3))); if(t<1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

// Filters (Explore page)
const state = {q:"",sem:"",cat:"",tech:new Set()};
const opt = (v,l)=>`<option value="${esc(v)}">${esc(l)}</option>`;
function setupFilters(){
document.getElementById("sem").innerHTML = opt("","All semesters") + SEM_ORDER.filter(s=>featured.some(p=>p.semester===s)).map(s=>opt(s,semLabel[s])).join("");
const cats = [...new Set(featured.map(p=>p.category))].sort();
document.getElementById("cat").innerHTML = opt("","All types") + cats.map(c=>opt(c,c)).join("");
const techCount = {};
featured.forEach(p=>p.languages.forEach(t=>techCount[t]=(techCount[t]||0)+1));
const topTech = Object.entries(techCount).sort((a,b)=>b[1]-a[1]).slice(0,14).map(e=>e[0]);
const techEl = document.getElementById("tech");
techEl.innerHTML = topTech.map((t,i)=>`<button class="chip" style="--c:${TECH_COLORS[i%TECH_COLORS.length]}" aria-pressed="false" data-t="${esc(t)}">${esc(t)}</button>`).join("");
techEl.addEventListener("click",e=>{
  const b=e.target.closest(".chip"); if(!b) return;
  const t=b.dataset.t, on=!state.tech.has(t);
  on?state.tech.add(t):state.tech.delete(t); b.setAttribute("aria-pressed",on); render();
});
["q","sem","cat"].forEach(id=>document.getElementById(id).addEventListener("input",e=>{state[id]=e.target.value.trim().toLowerCase(); if(id!=="q") state[id]=e.target.value; render();}));
  // Links like explore.html?cat=Game open with that type already selected
  const preCat = new URLSearchParams(location.search).get("cat");
  if(preCat && cats.includes(preCat)){ state.cat = preCat; document.getElementById("cat").value = preCat; }
}

// Fade elements in as they scroll into view
const revealer = ("IntersectionObserver" in window && !reduceMotion)
  ? new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); revealer.unobserve(e.target); } }),{rootMargin:"0px 0px -40px 0px"})
  : null;
function observeReveals(){
  document.querySelectorAll(".reveal:not(.in)").forEach((el,i)=>{
    if(!revealer){ el.classList.add("in"); return; }
    el.style.transitionDelay = `${Math.min(i%6,5)*50}ms`;
    revealer.observe(el);
  });
}

function card(p){
  const title = p.title || `${p.members[0]}${p.members.length>1?" & team":""}'s project`;
  return `<article class="card reveal" style="--c:${catColor(p.category)}">
    <div class="meta"><span class="pill">${esc(p.semester_label)}</span><span class="cat">${esc(p.category)}</span></div>
    <h3>${esc(title)}</h3>
    ${p.description?`<p>${esc(p.description)}</p>`:""}
    ${p.languages.length?`<div class="tags">${p.languages.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>`:""}
    <div class="team"><b>${p.members.length>1?"Team":"By"}:</b> ${esc(p.members.join(", "))}</div>
    <div class="links">
      ${p.repo?`<a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener">${ICON_GH} Code</a>`:""}
      ${p.video?`<a class="btn primary" href="${esc(p.video)}" target="_blank" rel="noopener">${ICON_PLAY} Demo</a>`:""}
    </div>
  </article>`;
}
function render(){
  const list = featured.filter(p=>{
    if(state.sem && p.semester!==state.sem) return false;
    if(state.cat && p.category!==state.cat) return false;
    for(const t of state.tech) if(!p.languages.includes(t)) return false;
    if(state.q){
      const hay=[p.title,p.description,p.members.join(" "),p.languages.join(" ")].join(" ").toLowerCase();
      if(!hay.includes(state.q)) return false;
    }
    return true;
  }).sort((a,b)=>SEM_ORDER.indexOf(a.semester)-SEM_ORDER.indexOf(b.semester) || (!!b.description - !!a.description));
  document.getElementById("count").textContent = `${list.length} of ${featured.length} projects`;
  document.getElementById("grid").innerHTML = list.length ? list.map(card).join("") : `<div class="empty">No projects match those filters.</div>`;
  observeReveals();
}
if($("grid")){ setupFilters(); render(); }

// Project Types page: one panel per project type, across all semesters
if($("typeList")){
  const byType = {};
  featured.forEach(p=>(byType[p.category] ||= []).push(p));
  const types = Object.keys(byType).sort((a,b)=>byType[b].length-byType[a].length || a.localeCompare(b));
  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  $("typeJump").innerHTML = types.map(t=>`<a class="chip" style="--c:${catColor(t)}" href="#${slug(t)}">${esc(t)} <small>${byType[t].length}</small></a>`).join("");
  $("typeList").innerHTML = types.map(t=>{
    const list = byType[t].sort((a,b)=>SEM_ORDER.indexOf(a.semester)-SEM_ORDER.indexOf(b.semester));
    return `<section class="type-panel" id="${slug(t)}" style="--c:${catColor(t)}">
      <div class="type-head"><h3>${esc(t)}</h3><span>${list.length} project${list.length>1?"s":""}</span>
      <a href="explore.html?cat=${encodeURIComponent(t)}">Filter in Explore →</a></div>
      <div class="grid">${list.map(card).join("")}</div>
    </section>`;
  }).join("");
  observeReveals();
}

// Advice page
if($("adviceGrid")){
  const majors=[...new Set(ADVICE.map(a=>a.major).filter(Boolean))].sort();
  const advSel=document.getElementById("advMajor");
  advSel.innerHTML=opt("","All majors")+majors.map(m=>opt(m,m)).join("");
  let advShown=9;
  function renderAdvice(){
    const list=ADVICE.filter(a=>!advSel.value||a.major===advSel.value);
    document.getElementById("adviceGrid").innerHTML=list.slice(0,advShown).map((a,i)=>`<blockquote class="reveal" style="--c:${QUOTE_COLORS[i%QUOTE_COLORS.length]}">${esc(a.text)}<footer>— ${esc(a.name||"A CISC 4900 student")}, ${esc(a.major||"")} · ${esc(a.semester)}</footer></blockquote>`).join("");
    observeReveals();
    document.getElementById("moreAdvice").style.display = list.length>advShown?"block":"none";
  }
  advSel.addEventListener("input",()=>{advShown=9;renderAdvice();});
  document.getElementById("moreAdvice").addEventListener("click",()=>{advShown+=9;renderAdvice();});
  renderAdvice();
}

observeReveals();
