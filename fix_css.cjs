const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'views', 'pages', 'onboarding.ejs');
let content = fs.readFileSync(file, 'utf8');

// The CSS starts with `<style>` and ends with `</style>` before `<script>`
// We want to replace all <style> blocks in onboarding.ejs with a unified one.
const newCss = `  <style>
    /* Ambient BG */
    .give-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
    .bg-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.05; filter: contrast(1.1); }
    .bg-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(247,250,248,1) 80%); }

    /* Container */
    .onboard-container { width: 100%; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
    
    .glass-fx { background: #ffffff; border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 40px; padding: 60px; box-shadow: 0 40px 100px rgba(34, 197, 94, 0.08); }

    /* Progress Tracker */
    .progress-tracker { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 60px; }
    .step-indicator { display: flex; flex-direction: column; align-items: center; gap: 10px; opacity: 0.4; transition: 0.4s; color: #1a1a1a; }
    .step-indicator.active { opacity: 1; color: var(--color_2, #25d366); }
    .step-num { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #1a1a1a; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
    .step-indicator.active .step-num { background: var(--color_2, #25d366); color: white; border-color: var(--color_2, #25d366); box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3); }
    .step-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; }
    .step-line { width: 120px; height: 2px; background: rgba(26,26,26,0.1); border-radius: 2px; }
    .step-line.active { background: var(--color_2, #25d366); }

    /* Avatar Step specific */
    .avatar-upload-container { display: flex; flex-direction: column; align-items: center; gap: 30px; margin-bottom: 40px; }
    .avatar-preview-box { width: 280px; height: 280px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; border: 4px solid var(--color_2, #25d366); background: #fafafa; }
    .placeholder-icon { opacity: 0.15; color: #1a1a1a; }
    .upload-btn { background: linear-gradient(135deg, var(--color_2, #25d366) 0%, #1eac52 100%); color: white; padding: 15px 35px; border-radius: 100px; font-weight: 800; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 10px; margin-top: 10px; border: none; box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3); }
    .upload-btn:hover { transform: scale(1.05); box-shadow: 0 15px 35px rgba(34, 197, 94, 0.4); }
    .upload-hint { font-size: 0.85rem; color: rgba(26,26,26,0.6); text-align: center; max-width: 300px; margin-top: 15px; }

    /* Gift Tags */
    .gift-tags-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; margin-top: 15px; }
    .gift-tag { 
      background: #fafafa; border: 1.5px solid rgba(26,26,26,0.1); border-radius: 50px; 
      padding: 10px 15px; text-align: center; cursor: pointer; transition: 0.3s; font-size: 13px; font-weight: 700; color: rgba(26,26,26,0.6);
    }
    .gift-tag:hover { background: #ffffff; box-shadow: 0 5px 15px rgba(0,0,0,0.05); color: #1a1a1a; }
    .gift-tag.selected { background: var(--color_2, #25d366); color: white; border-color: var(--color_2, #25d366); box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3); }

    /* Header */
    .onboard-header { text-align: center; margin-bottom: 50px; }
    .onboard-header h2 { font-family: 'Outfit', sans-serif; font-size: 2.8rem; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 12px; line-height: 1.1; color: #1a1a1a; }
    .onboard-header p { font-size: 1.1rem; color: rgba(26,26,26,0.6); line-height: 1.6; max-width: 500px; margin: 0 auto; }

    .ob-error { margin-top: 30px; padding: 18px 25px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; color: #ef4444; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 12px; }

    /* Form */
    .form-section { animation: fadeIn 0.6s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .form-group { margin-bottom: 30px; }
    .form-group label { display: block; font-size: 0.95rem; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
    .form-group label span { color: #ef4444; }
    .field-hint { font-size: 12px; color: rgba(26,26,26,0.5); margin-top: 8px; }

    .form-group input, .glass-input {
      width: 100%; background: #f8f9fa; border: 1px solid rgba(26,26,26,0.15); border-radius: 14px;
      padding: 18px 22px; color: #1a1a1a; font-size: 1rem; font-family: inherit;
      outline: none; transition: 0.3s;
    }
    .glass-input { min-height: 120px; resize: none; overflow-y: auto; }
    .form-group input:focus, .glass-input:focus { border-color: var(--color_2, #25d366); background: #ffffff; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1); }

    /* Custom Select */
    .custom-select-wrapper { position: relative; width: 100%; }
    .custom-select-trigger {
      width: 100%; background: #f8f9fa; border: 1px solid rgba(26,26,26,0.15); border-radius: 14px;
      padding: 18px 22px; color: #1a1a1a; cursor: pointer; transition: 0.3s;
      display: flex; justify-content: space-between; align-items: center;
      min-height: 60px;
    }
    .custom-select-trigger:after { content: ""; border: solid rgba(26,26,26,0.5); border-width: 0 2px 2px 0; display: inline-block; padding: 3px; transform: rotate(45deg); transition: 0.3s; margin-left: 10px; }
    .custom-select-wrapper.open .custom-select-trigger { border-color: var(--color_2, #25d366); background: #ffffff; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1); }
    .custom-select-wrapper.open .custom-select-trigger:after { transform: rotate(-135deg); border-color: var(--color_2, #25d366); }
    .custom-options {
      position: absolute; top: 110%; left: 0; right: 0; background: #ffffff; border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 16px; z-index: 100; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: 0.3s;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow-y: auto; max-height: 250px;
    }
    .custom-select-wrapper.open .custom-options { opacity: 1; visibility: visible; transform: translateY(0); }
    .custom-options .option { padding: 15px 20px; cursor: pointer; transition: 0.2s; font-size: 14px; font-weight: 600; color: #1a1a1a; }
    .custom-options .option:hover { background: rgba(34, 197, 94, 0.1); color: var(--color_2, #25d366); }

    /* Custom Checkbox */
    .checkbox-label { display: flex; align-items: flex-start; gap: 18px; cursor: pointer; user-select: none; }
    .checkbox-label input { position: absolute; opacity: 0; width: 0; height: 0; }
    .custom-check { flex-shrink: 0; height: 26px; width: 26px; background: #f8f9fa; border: 1.5px solid rgba(26,26,26,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: 0.3s; margin-top: 2px; }
    .checkbox-label:hover input ~ .custom-check { border-color: var(--color_2, #25d366); }
    .checkbox-label input:checked ~ .custom-check { background: var(--color_2, #25d366); border-color: var(--color_2, #25d366); box-shadow: 0 4px 10px rgba(34, 197, 94, 0.3); }
    .custom-check:after { content: ""; display: none; width: 6px; height: 12px; border: solid white; border-width: 0 2.5px 2.5px 0; transform: rotate(45deg); margin-bottom: 3px; }
    .checkbox-label input:checked ~ .custom-check:after { display: block; }
    
    .label-info strong { display: block; font-size: 1.05rem; margin-bottom: 4px; color: #1a1a1a; }
    .label-info p { font-size: 0.9rem; color: rgba(26, 26, 26, 0.6); margin: 0; }

    /* Ministry Grid */
    .ministry-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-top: 15px; }
    .min-card { 
      background: #fafafa; border: 1.5px solid rgba(26,26,26,0.1); border-radius: 16px; 
      padding: 15px; cursor: pointer; transition: 0.3s; color: #1a1a1a;
    }
    .min-card:hover { background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-color: rgba(34, 197, 94, 0.3); }
    .min-card.selected { border-color: var(--color_2, #25d366); background: rgba(34, 197, 94, 0.05); box-shadow: 0 5px 15px rgba(34, 197, 94, 0.1); }
    .min-card strong { display: block; font-size: 14px; margin-bottom: 5px; color: #1a1a1a; }
    .min-card p { font-size: 11px; color: rgba(26,26,26,0.6); line-height: 1.4; margin: 0; }

    /* Service Visuals / Dept Grid */
    .dept-selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .dept-tile { 
      background: #fafafa; border: 1.5px solid rgba(26, 26, 26, 0.1); border-radius: 20px; 
      padding: 20px; cursor: pointer; transition: 0.3s; border-left: 4px solid transparent; 
      position: relative; color: #1a1a1a; display: flex; flex-direction: column; 
    }
    .dept-tile:hover { background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-color: rgba(34, 197, 94, 0.3); }
    .dept-tile.selected { border-color: var(--color_2, #25d366); border-left-color: var(--color_2, #25d366); background: rgba(34, 197, 94, 0.05); }
    
    .tile-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(34,197,94,0.1); display: flex; align-items: center; justify-content: center; color: var(--color_2, #25d366); margin-bottom: 15px; }
    .tile-info strong { display: block; font-size: 15px; margin-bottom: 4px; color: #1a1a1a; }
    .tile-info p { font-size: 11px; color: rgba(26,26,26,0.6); line-height: 1.4; margin: 0; }
    .selection-indicator { position: absolute; top: 15px; right: 15px; color: var(--color_2, #25d366); opacity: 0; transform: scale(0.5); transition: 0.3s; }
    .dept-tile.selected .selection-indicator { opacity: 1; transform: scale(1); }

    .role-selector-wrap { margin-top: 30px; padding-top: 30px; border-top: 1px solid rgba(26,26,26,0.1); animation: fadeIn 0.4s ease-out; }
    .role-pills { display: flex; flex-wrap: wrap; gap: 10px; }
    .role-pill { 
      background: #fafafa; border: 1.5px solid rgba(26, 26, 26, 0.1); border-radius: 100px; padding: 10px 20px;
      font-size: 13px; font-weight: 700; color: rgba(26, 26, 26, 0.6); cursor: pointer; transition: 0.3s;
    }
    .role-pill:hover { background: #ffffff; color: #1a1a1a; border-color: rgba(34, 197, 94, 0.4); }
    .role-pill.active { background: var(--color_2, #25d366); color: white; border-color: var(--color_2, #25d366); box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3); }

    .card-group { background: #fafafa; padding: 25px; border-radius: 20px; border: 1px solid rgba(26,26,26,0.1); }
    .sub-label { font-size: 0.85rem; font-weight: 800; color: var(--color_2, #25d366); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; display: block; }
    .already-in-dept { display: flex; align-items: center; gap: 15px; padding: 15px 20px; background: rgba(34, 197, 94, 0.05); border: 1.5px solid rgba(34, 197, 94, 0.2); border-radius: 16px; color: #166534; font-size: 14px; margin-bottom: 25px; }
    .role-badge { background: #166534; color: white; padding: 2px 8px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-left: 8px; letter-spacing: 0.5px; }

    /* Actions */
    .form-actions { margin-top: 20px; }
    .form-actions.dual { display: flex; gap: 20px; align-items: center; }
    
    .submit-btn {
      width: 100%; padding: 20px; background: #f8f9fa; color: #1a1a1a; border-radius: 100px;
      border: 1px solid rgba(26,26,26,0.1); font-weight: 800; font-size: 1.05rem; cursor: pointer; transition: 0.3s;
      display: flex; align-items: center; justify-content: center; gap: 12px;
    }
    .submit-btn.highlight { background: linear-gradient(135deg, var(--color_2, #25d366) 0%, #1eac52 100%); color: white; border: none; box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3); }
    .submit-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(0,0,0,0.05); }
    .submit-btn.highlight:hover { box-shadow: 0 15px 35px rgba(34, 197, 94, 0.4); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    
    .back-btn { 
      background: transparent; border: 1.5px solid rgba(26, 26, 26, 0.15); padding: 18px 35px; 
      border-radius: 100px; color: rgba(26, 26, 26, 0.7); font-weight: 700; cursor: pointer; 
      transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.95rem; white-space: nowrap;
    }
    .back-btn:hover { background: #fafafa; color: #1a1a1a; border-color: rgba(26, 26, 26, 0.4); }

    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; gap: 0; }
      .glass-fx { padding: 40px 20px; border-radius: 0; border: none; box-shadow: none; }
      .onboarding-page { padding: 0; }
      .onboard-header h2 { font-size: 2.2rem; }
      .progress-tracker { gap: 8px; margin-bottom: 40px; overflow-x: auto; padding-bottom: 10px; padding-left: 10px; justify-content: flex-start; }
      .step-line { min-width: 30px; }
      .form-actions.dual { flex-direction: column-reverse; }
    }
  </style>`;

// Use regex to replace everything between the FIRST <style> and LAST </style>
const replaced = content.replace(/<style>[\s\S]*<\/style>/, newCss);

fs.writeFileSync(file, replaced, 'utf8');
console.log('Successfully updated CSS in onboarding.ejs');
