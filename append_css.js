const fs = require('fs');
const psychCSS = \
/* ==========================================================================
   PSYCHIATRIC SYMPTOMS EXPLORER
   ========================================================================== */

.psych-dim-tabs {
  display: flex;
  gap: 8px;
  background: var(--md-surface-container-low);
  padding: 8px;
  border-radius: var(--md-radius-lg);
  margin-bottom: 16px;
  overflow-x: auto;
}

.psych-tab {
  flex: 1 1 0;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 8px;
  background: transparent;
  border: none;
  border-radius: var(--md-radius-md);
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.psych-tab .ui-icon {
  width: 28px;
  height: 28px;
  margin-bottom: 4px;
  fill: currentColor;
}

.psych-tab[aria-selected='true'] {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  box-shadow: var(--md-shadow-sm);
}

.psych-symptoms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  padding-bottom: 16px;
}

.psych-symptom-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 8px;
  background: var(--md-surface-container);
  border: 2px solid transparent;
  border-radius: var(--md-radius-lg);
  cursor: pointer;
  text-align: center;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.psych-symptom-card:active {
  transform: scale(0.96);
  background: var(--md-surface-container-high);
}

.psych-symptom-card img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  pointer-events: none;
}

.psych-symptom-card span {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--md-on-surface);
  pointer-events: none;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.psych-frequency-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--md-surface-container-lowest);
  border-radius: var(--md-radius-lg);
  border: 2px solid var(--md-primary);
  margin-top: 16px;
  animation: fadeInDown 0.3s cubic-bezier(0.2, 0, 0, 1) forwards;
}

.psych-freq-prompt {
  font-size: 1.2rem;
  font-weight: 800;
  text-align: center;
  color: var(--md-on-surface);
  margin: 0;
}

.psych-frequency-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.psych-freq-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: inherit;
  font-size: 1.2rem;
  font-weight: 800;
  border: none;
  border-radius: var(--md-radius-md);
  color: var(--md-on-surface);
  cursor: pointer;
  box-shadow: var(--md-shadow-sm);
  transition: transform 0.15s, box-shadow 0.15s;
}

.psych-freq-btn:active {
  transform: scale(0.98);
}

/* Talking Mats colors */
.psych-freq-btn.freq-1 { background-color: #c3e2c0; } /* Poco / Verde claro */
.psych-freq-btn.freq-2 { background-color: #f6e7a8; } /* Medio / Amarillo claro */
.psych-freq-btn.freq-3 { background-color: #f5c5c1; } /* Mucho / Rojo claro */

.psych-freq-cancel {
  margin-top: 8px;
  align-self: center;
}
\;

let css = fs.readFileSync('styles.css', 'utf8');
if (!css.includes('.psych-dim-tabs')) {
  fs.writeFileSync('styles.css', css + '\n' + psychCSS);
  console.log('CSS appended.');
} else {
  console.log('CSS already exists.');
}
