(function(){"use strict";const g={hotkey:"Alt",highlightColor:"#3b82f6",displayFormat:"class",copyFormat:"class"};function d(){return new Promise(s=>{chrome.storage.sync.get(g,t=>{s(t)})})}function h(s){return new Promise(t=>{chrome.storage.sync.set(s,()=>{t()})})}class p{constructor(){this.settings=null}async init(){this.settings=await d(),this.render(),this.setupEventListeners()}render(){if(!this.settings)return;const t=document.getElementById("settings-container");t&&(t.innerHTML=`
      <div class="setting-group">
        <label for="hotkey">Activation Hotkey:</label>
        <select id="hotkey">
          <option value="Alt" ${this.settings.hotkey==="Alt"?"selected":""}>Alt</option>
          <option value="Ctrl" ${this.settings.hotkey==="Ctrl"?"selected":""}>Ctrl</option>
          <option value="Meta" ${this.settings.hotkey==="Meta"?"selected":""}>Meta (Cmd)</option>
          <option value="Shift" ${this.settings.hotkey==="Shift"?"selected":""}>Shift</option>
        </select>
      </div>

      <div class="setting-group">
        <label for="highlightColor">Highlight Color:</label>
        <input type="color" id="highlightColor" value="${this.settings.highlightColor}">
      </div>

      <div class="setting-group">
        <label for="displayFormat">Display Format:</label>
        <select id="displayFormat">
          <option value="class" ${this.settings.displayFormat==="class"?"selected":""}>Class Name</option>
          <option value="selector" ${this.settings.displayFormat==="selector"?"selected":""}>CSS Selector</option>
          <option value="full" ${this.settings.displayFormat==="full"?"selected":""}>Full Info</option>
        </select>
      </div>

      <div class="setting-group">
        <label for="copyFormat">Copy Format:</label>
        <select id="copyFormat">
          <option value="class" ${this.settings.copyFormat==="class"?"selected":""}>Class Name</option>
          <option value="selector" ${this.settings.copyFormat==="selector"?"selected":""}>CSS Selector</option>
          <option value="full" ${this.settings.copyFormat==="full"?"selected":""}>Full Path</option>
        </select>
      </div>

      <div class="info">
        <p><strong>Usage:</strong></p>
        <p>Hold <strong>${this.settings.hotkey}</strong> and hover over elements to inspect them. Click to copy the selector.</p>
        <p>Press <strong>Escape</strong> to exit inspector mode.</p>
      </div>

      <div class="actions">
        <button id="saveBtn" class="btn-primary">Save Settings</button>
      </div>
    `)}setupEventListeners(){var t;(t=document.getElementById("saveBtn"))==null||t.addEventListener("click",()=>{this.saveSettings()}),["hotkey","highlightColor","displayFormat","copyFormat"].forEach(i=>{const o=document.getElementById(i);o&&o.addEventListener("change",()=>{this.saveSettings()})})}async saveSettings(){var l,a,r,c;const t=(l=document.getElementById("hotkey"))==null?void 0:l.value,i=(a=document.getElementById("highlightColor"))==null?void 0:a.value,o=(r=document.getElementById("displayFormat"))==null?void 0:r.value,u=(c=document.getElementById("copyFormat"))==null?void 0:c.value,n={hotkey:t,highlightColor:i,displayFormat:o,copyFormat:u};await h(n),this.settings={...this.settings,...n};const e=document.getElementById("saveBtn");if(e){const m=e.textContent;e.textContent="✓ Saved!",e.style.backgroundColor="#4ade80",setTimeout(()=>{e.textContent=m,e.style.backgroundColor=""},1e3)}}}document.addEventListener("DOMContentLoaded",()=>{new p().init()})})();
