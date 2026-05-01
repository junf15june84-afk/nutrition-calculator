import { PRODUCT_DB } from './data.js';

const CATEGORIES = {
    enteral: '経腸栄養剤',
    infant_formula: '乳児用ミルク',
    ppn: '末梢静脈栄養',
    tpn: '高カロリー輸液',
    amino_acid: 'アミノ酸製剤',
    fat_emulsion: '脂肪製剤',
    micronutrients: 'ビタミン・ミネラル',
    supplements: '栄養機能食品'
};

const state = {
    patient: { height: 0, weight: 0, age: null, gender: 'male', isPreterm: false },
    selections: {},
    visibility: {},
    customProducts: [],
    activeTab: 'calculator'
};

window.appState = state;
window.PRODUCT_DB = PRODUCT_DB;

Object.keys(CATEGORIES).forEach(key => {
    state.selections[key] = [];
});

state.selections['enteral'] = [
    { name: '', amount: 0 },
    { name: '白湯 (Water)', amount: 0 }
];

function init() {
    try {
        loadSettings();
        renderCategories();
        Object.keys(CATEGORIES).forEach(key => {
            renderItems(key);
        });
        renderSettings();
        attachGlobalListeners();
        calculate();
    } catch (e) {
        console.error('[Init] Failed:', e);
    }
}

function loadSettings() {
    try {
        const savedCustom = localStorage.getItem('customProducts');
        if (savedCustom) {
            state.customProducts = JSON.parse(savedCustom);
            state.customProducts.forEach(p => {
                const catList = PRODUCT_DB[p.category];
                if (catList && !catList.find(ep => ep.name === p.name)) {
                    catList.push(p);
                }
            });
        }
        const savedVis = localStorage.getItem('visibility');
        if (savedVis) {
            state.visibility = JSON.parse(savedVis);
        } else {
            Object.keys(CATEGORIES).forEach(cat => {
                PRODUCT_DB[cat].forEach(p => {
                    state.visibility[p.name] = true;
                });
            });
        }
    } catch (e) {
        console.error('[LoadSettings] Error:', e);
    }
}

function saveSettings() {
    localStorage.setItem('visibility', JSON.stringify(state.visibility));
    localStorage.setItem('customProducts', JSON.stringify(state.customProducts));
}

function saveSettingsManual() {
    saveSettings();
    alert('設定を保存しました。');
}

function deleteProduct(name) {
    if (!confirm(`${name} を削除してもよろしいですか？`)) return;
    state.customProducts = state.customProducts.filter(p => p.name !== name);
    Object.keys(CATEGORIES).forEach(cat => {
        const idx = PRODUCT_DB[cat].findIndex(p => p.name === name);
        if (idx !== -1) PRODUCT_DB[cat].splice(idx, 1);
    });
    delete state.visibility[name];
    saveSettings();
    renderSettings();
    renderCategories();
    calculate();
    alert(`${name} を削除しました。`);
}

function renderCategories() {
    const container = document.getElementById('nutrition-inputs');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(CATEGORIES).forEach(([key, label]) => {
        const section = document.createElement('div');
        section.className = 'glass-panel category-section';
        section.innerHTML = `
            <div class="category-header">
                <h3>${label}</h3>
                <button class="btn-add" data-category="${key}">+ 追加</button>
            </div>
            <div class="items-container" id="container-${key}"></div>
        `;
        container.appendChild(section);
    });
}

function renderSettings() {
    const container = document.getElementById('settings-product-list');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(CATEGORIES).forEach(([key, label]) => {
        const group = document.createElement('div');
        group.className = 'settings-group';
        let rows = '';
        PRODUCT_DB[key].forEach(p => {
            const isVisible = state.visibility[p.name] !== false;
            const isCustom = state.customProducts.some(cp => cp.name === p.name);
            rows += `
                <tr>
                    <td><input type="checkbox" class="visibility-toggle" data-name="${p.name}" ${isVisible ? 'checked' : ''}></td>
                    <td>${p.name} ${isCustom ? '(Custom)' : ''}</td>
                    <td>${p.kcal} kcal</td>
                    <td>P: ${p.protein}g</td>
                    <td>Na: ${p.na || 0}mg</td>
                    <td>${isCustom ? `<button class="btn-delete" data-name="${p.name}">削除</button>` : ''}</td>
                </tr>
            `;
        });
        group.innerHTML = `
            <h3>${label}</h3>
            <table class="settings-table">
                <thead><tr><th>表示</th><th>製剤名</th><th>Kcal</th><th>タンパク</th><th>Na</th><th>操作</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
        container.appendChild(group);
    });
}

function attachGlobalListeners() {
    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveSettingsManual);

    const btnAddCustom = document.getElementById('btn-add-custom');
    if (btnAddCustom) {
        btnAddCustom.addEventListener('click', () => {
            const name = document.getElementById('cust-name').value;
            if (!name) return alert('名前を入力してください');
            try {
                const category = document.getElementById('cust-cat').value;
                const newProduct = {
                    name: name, category: category, unit: document.getElementById('cust-unit').value || 'mL',
                    volume: parseFloat(document.getElementById('cust-vol').value) || 1.0,
                    kcal: parseFloat(document.getElementById('cust-kcal').value) || 0,
                    protein: parseFloat(document.getElementById('cust-pro').value) || 0,
                    na: parseFloat(document.getElementById('cust-na').value) || 0,
                    water: parseFloat(document.getElementById('cust-water').value) || 1.0,
                    fe: parseFloat(document.getElementById('cust-fe').value) || 0,
                    zn: parseFloat(document.getElementById('cust-zn').value) || 0,
                    cu: parseFloat(document.getElementById('cust-cu').value) || 0,
                    mn: parseFloat(document.getElementById('cust-mn').value) || 0,
                    i: parseFloat(document.getElementById('cust-i').value) || 0,
                    b1: parseFloat(document.getElementById('cust-b1').value) || 0,
                    carnitine: parseFloat(document.getElementById('cust-carnitine').value) || 0
                };
                state.customProducts.push(newProduct);
                PRODUCT_DB[newProduct.category].push(newProduct);
                state.visibility[newProduct.name] = true;
                saveSettings();
                renderSettings();
                renderCategories();
                document.getElementById('cust-name').value = '';
                alert('追加しました: ' + name);
            } catch (e) {
                alert('エラーが発生しました: ' + e.message);
            }
        });
    }

    const settingsList = document.getElementById('settings-product-list');
    if (settingsList) {
        settingsList.addEventListener('change', (e) => {
            if (e.target.classList.contains('visibility-toggle')) {
                const name = e.target.dataset.name;
                state.visibility[name] = e.target.checked;
                saveSettings(); // 即座にLocalStorageに保存
                renderItems();  // 計算機のドロップダウンをすべて更新
            }
        });
        settingsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) deleteProduct(e.target.dataset.name);
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-add')) addItem(e.target.dataset.category);
        if (e.target.classList.contains('btn-remove')) {
            const row = e.target.closest('.item-row');
            if (row) removeItem(row.dataset.category, parseInt(row.dataset.index));
        }
    });

    document.addEventListener('input', (e) => {
        if (e.target.matches('#pt-height, #pt-weight, #pt-age, #pt-gender, #is-preterm')) {
            state.patient.height = parseFloat(document.getElementById('pt-height').value) || 0;
            state.patient.weight = parseFloat(document.getElementById('pt-weight').value) || 0;
            const ageVal = document.getElementById('pt-age').value;
            state.patient.age = ageVal === '' ? null : parseFloat(ageVal);
            state.patient.gender = document.getElementById('pt-gender').value;
            state.patient.isPreterm = document.getElementById('is-preterm').checked;
            calculate();
        }
        if (e.target.matches('.item-select, .item-amount')) updateStateFromDOM();
    });

    const btnCopy = document.getElementById('btn-copy');
    if (btnCopy) {
        btnCopy.addEventListener('click', (e) => {
            const text = generateSummary();
            navigator.clipboard.writeText(text).then(() => {
                const originalText = e.target.textContent;
                e.target.textContent = 'コピーしました!';
                setTimeout(() => { e.target.textContent = originalText; }, 2000);
            });
        });
    }
}

function addItem(category) {
    state.selections[category].push({ name: '', amount: 0 });
    renderItems(category);
}

function removeItem(category, index) {
    state.selections[category].splice(index, 1);
    renderItems(category);
    calculate();
}

function renderItems(category) {
    if (!category) {
        Object.keys(CATEGORIES).forEach(renderItems);
        return;
    }
    const container = document.getElementById(`container-${category}`);
    if (!container) return;
    const items = state.selections[category];
    const visibleProducts = PRODUCT_DB[category].filter(p => state.visibility[p.name] !== false);
    const options = visibleProducts.map(p => `<option value="${p.name}">${p.name} (${p.kcal}kcal/${p.unit})</option>`).join('');
    
    container.innerHTML = items.map((item, index) => {
        let currentProduct = PRODUCT_DB[category].find(p => p.name === item.name);
        if (!item.name && visibleProducts.length > 0) {
            item.name = visibleProducts[0].name;
            currentProduct = visibleProducts[0];
        }
        const unit = currentProduct ? currentProduct.unit : 'mL';
        const k = currentProduct ? (currentProduct.kcal * item.amount) : 0;
        const p = currentProduct ? (currentProduct.protein * item.amount) : 0;
        return `
            <div class="item-row" data-category="${category}" data-index="${index}">
                <select class="item-select">${options}</select>
                <input type="number" class="item-amount" value="${item.amount || ''}" placeholder="0" step="any">
                <span class="unit-label">${unit}</span>
                <button class="btn-remove">×</button>
                <div class="item-details" style="width: 100%; font-size: 0.8em; color: #666; margin-top: 4px; text-align: right;">
                    ${item.amount > 0 ? `(${k.toFixed(0)}kcal, P:${p.toFixed(1)}g)` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.item-row').forEach((row, i) => {
        row.querySelector('.item-select').value = items[i].name;
    });
}

function updateStateFromDOM() {
    Object.keys(CATEGORIES).forEach(category => {
        const container = document.getElementById(`container-${category}`);
        if (!container) return;
        state.selections[category] = Array.from(container.querySelectorAll('.item-row')).map(row => ({
            name: row.querySelector('.item-select').value,
            amount: parseFloat(row.querySelector('.item-amount').value) || 0
        }));
    });
    calculate();
}

function calculateStandardWeight(height, gender, age) {
    const x = height;
    let weight = 0;
    let formula = '';
    if (age < 6) {
        if (gender === 'male') weight = 0.00206 * x * x - 0.1166 * x + 6.5273;
        else weight = 0.00249 * x * x - 0.1858 * x + 9.0360;
        formula = '幼児期(6歳未満)の計算式 (日本小児内分泌学会)';
    } else {
        if (gender === 'male') {
            if (x < 140) weight = 0.0000303882 * x**3 + 0.00571495 * x**2 + 0.508124 * x - 9.17791;
            else if (x < 149) weight = -0.000085013 * x**3 + 0.0370692 * x**2 - 4.6558 * x + 191.847;
            else weight = -0.000310205 * x**3 + 0.151159 * x**2 - 23.6303 * x + 1231.04;
        } else {
            if (x < 140) weight = 0.000127719 * x**3 - 0.0414712 * x**2 + 4.8575 * x - 184.492;
            else if (x < 149) weight = -0.00178766 * x**3 + 0.803922 * x**2 - 119.31 * x + 5885.03;
            else weight = 0.000956401 * x**3 - 0.462755 * x**2 + 75.3058 * x - 4068.31;
        }
        formula = '学童期(6歳以上)の計算式 (日本小児内分泌学会)';
    }
    return { weight, formula };
}

function calculateNutritionalReq(age, weight) {
    let fluid = 0; let energy = 0;
    let fFluid = ''; let fEnergy = '';
    if (age < 1) { fluid = weight * 150; fFluid = '乳児 (120-150 mL/kg)'; }
    else if (age < 6) { fluid = weight * 100; fFluid = '幼児 (90-100 mL/kg)'; }
    else { fluid = weight * 80; fFluid = '学童 (60-80 mL/kg)'; }

    if (age < 1) energy = weight * 100;
    else if (age <= 2) energy = weight * 80;
    else if (age <= 5) energy = weight * 70;
    else if (age <= 11) energy = weight * 60;
    else energy = weight * 45;
    fEnergy = '厚生労働省 食事摂取基準に基づく推定 (年齢・体重別)';
    return { fluid, energy, formulaFluid: fFluid, formulaEnergy: fEnergy };
}

function calculateSchofield(age, weight, gender) {
    let energy = 0;
    let formula = '';
    if (age < 3) {
        if (gender === 'male') { energy = 59.5 * weight - 30.4; formula = '0〜3歳 男児: 59.5 × 体重 - 30.4'; }
        else { energy = 58.3 * weight - 31.1; formula = '0〜3歳 女児: 58.3 × 体重 - 31.1'; }
    } else if (age < 10) {
        if (gender === 'male') { energy = 22.7 * weight + 504; formula = '3〜10歳 男児: 22.7 × 体重 + 504'; }
        else { energy = 20.3 * weight + 486; formula = '3〜10歳 女児: 20.3 × 体重 + 486'; }
    } else {
        if (gender === 'male') { energy = 17.7 * weight + 658; formula = '10〜18歳 男児: 17.7 × 体重 + 658'; }
        else { energy = 13.4 * weight + 693; formula = '10〜18歳 女児: 13.4 × 体重 + 693'; }
    }
    return { energy, formula };
}

function calculateWHO(age, weight, gender) {
    let energy = 0;
    let formula = '';
    if (age < 3) {
        if (gender === 'male') { energy = 60.9 * weight - 54; formula = '0〜3歳 男児: 60.9 × 体重 - 54'; }
        else { energy = 61.0 * weight - 51; formula = '0〜3歳 女児: 61.0 × 体重 - 51'; }
    } else if (age < 10) {
        if (gender === 'male') { energy = 22.7 * weight + 495; formula = '3〜10歳 男児: 22.7 × 体重 + 495'; }
        else { energy = 22.5 * weight + 499; formula = '3〜10歳 女児: 22.5 × 体重 + 499'; }
    } else {
        if (gender === 'male') { energy = 17.5 * weight + 651; formula = '10〜18歳 男児: 17.5 × 体重 + 651'; }
        else { energy = 12.2 * weight + 746; formula = '10〜18歳 女児: 12.2 × 体重 + 746'; }
    }
    return { energy, formula };
}

function getParenteralEnergyReq(age, weight, isPreterm) {
    let ranges = [];
    if (isPreterm) ranges = [{label: '急性期', min: 45, max: 55}, {label: '回復期', min: 90, max: 120}];
    else if (age < 1) ranges = [{label: '急性期', min: 45, max: 50}, {label: '安定期', min: 60, max: 65}, {label: '回復期', min: 75, max: 85}];
    else if (age < 7) ranges = [{label: '急性期', min: 40, max: 45}, {label: '安定期', min: 55, max: 60}, {label: '回復期', min: 65, max: 75}];
    else if (age < 12) ranges = [{label: '急性期', min: 30, max: 40}, {label: '安定期', min: 40, max: 55}, {label: '回復期', min: 55, max: 65}];
    else ranges = [{label: '急性期', min: 20, max: 30}, {label: '安定期', min: 25, max: 40}, {label: '回復期', min: 30, max: 55}];

    let baseRangeStr = ranges.map(r => `${r.label} ${r.min}-${r.max}`).join(' / ') + ' kcal/kg/day';
    let calcStr = ranges.map(r => `${r.label}: ${(r.min * weight).toFixed(0)}〜${(r.max * weight).toFixed(0)} kcal/day`).join('\n');
    
    return `${baseRangeStr}\n${calcStr}`;
}

function calculate() {
    let totals = { kcal: 0, protein: 0, water: 0, volume: 0, na: 0, fe: 0, zn: 0, cu: 0, mn: 0, i: 0, b1: 0, carnitine: 0 };
    let subEnteral = 0; let subPN = 0;

    Object.keys(CATEGORIES).forEach(cat => {
        state.selections[cat].forEach(sel => {
            const p = PRODUCT_DB[cat].find(x => x.name === sel.name);
            if (p && sel.amount > 0) {
                const f = sel.amount;
                totals.kcal += p.kcal * f;
                totals.protein += p.protein * f;
                totals.water += (p.water || 1.0) * f;
                totals.volume += (p.volume || 1.0) * f;
                totals.na += (p.na || 0) * f;
                totals.fe += (p.fe || 0) * f;
                totals.zn += (p.zn || 0) * f;
                totals.cu += (p.cu || 0) * f;
                totals.mn += (p.mn || 0) * f;
                totals.i += (p.i || 0) * f;
                totals.b1 += (p.b1 || 0) * f;
                totals.carnitine += (p.carnitine || 0) * f;
                if (['enteral', 'infant_formula', 'supplements'].includes(cat)) subEnteral += p.kcal * f;
                else subPN += p.kcal * f;
            }
        });
    });

    const { height, weight, age, gender } = state.patient;
    if (weight > 0 && height > 0) {
        let ibw = 0; let tKcalAct = 0; let tKcalIbw = 0; let bmi = weight / (height/100)**2;
        document.getElementById('disp-bmi').textContent = bmi.toFixed(1);

        if (age !== null && age >= 0 && age < 18) {
            const std = calculateStandardWeight(height, gender, age);
            ibw = std.weight;
            const req = calculateNutritionalReq(age, weight);
            tKcalAct = req.energy;
            tKcalIbw = ibw * (req.energy / weight);
            
            const schofield = calculateSchofield(age, weight, gender);
            const who = calculateWHO(age, weight, gender);
            const pnReq = getParenteralEnergyReq(age, weight, state.patient.isPreterm);

            const formulaContent = `[標準体重]\n${std.formula}\n\n[必要水分量]\n${req.formulaFluid}\n目安: ${req.fluid.toFixed(0)} mL/day\n\n[必要エネルギー (推定)]\n${req.formulaEnergy}\n目安: ${req.energy.toFixed(0)} kcal/day\n\n[Schofieldの式]\n${schofield.formula}\n結果: ${schofield.energy.toFixed(0)} kcal/day\n\n[WHOの式]\n${who.formula}\n結果: ${who.energy.toFixed(0)} kcal/day\n(出典: 日本版重症患者の栄養療法ガイドライン2024)\n\n[目標エネルギー量 (経静脈栄養)]\n${pnReq}\n(出典: ESPGHAN/ESPEN/ESPR/CSPEN guidelines 2018)`;
            
            // 設定画面側の表示
            const fDisplay = document.getElementById('pediatric-formulas');
            if (fDisplay) fDisplay.textContent = formulaContent;
            
            // 計算機タブ側の表示
            const fInfo = document.getElementById('pediatric-formula-info');
            const fText = document.getElementById('pediatric-formula-text');
            if (fInfo && fText) {
                fInfo.style.display = 'block';
                fText.textContent = formulaContent;
            }
            // ラベルの更新
            const kcalLabel = document.getElementById('target-kcal-label');
            if (kcalLabel) kcalLabel.textContent = '目標カロリー (小児基準):';
        } else {
            ibw = (height/100)**2 * 22;
            tKcalAct = weight * 25;
            tKcalIbw = ibw * 25;
            
            const kcalLabel = document.getElementById('target-kcal-label');
            if (kcalLabel) kcalLabel.textContent = '目標カロリー (25kcal/kg/day):';
            
            // 設定画面側の表示リセット
            const fDisplay = document.getElementById('pediatric-formulas');
            if (fDisplay) fDisplay.textContent = '成人 (18歳以上) または年齢未入力のため、小児用計算基準は適用されません。';
            
            // 計算機タブ側の表示を隠す
            const fInfo = document.getElementById('pediatric-formula-info');
            if (fInfo) fInfo.style.display = 'none';
        }
        document.getElementById('disp-ibw').textContent = ibw.toFixed(1);
        document.getElementById('target-kcal-act').textContent = tKcalAct.toFixed(0);
        document.getElementById('target-kcal-ibw').textContent = tKcalIbw.toFixed(0);
    }

    document.getElementById('total-kcal').textContent = totals.kcal.toFixed(1);
    document.getElementById('total-protein').textContent = totals.protein.toFixed(1);
    document.getElementById('total-water').textContent = totals.water.toFixed(1);
    document.getElementById('total-salt').textContent = (totals.na * 2.54 / 1000).toFixed(2);
    document.getElementById('total-volume').textContent = totals.volume.toFixed(1);
    
    if (weight > 0) {
        document.getElementById('kcal-per-kg').textContent = (totals.kcal / weight).toFixed(1) + ' kcal/kg';
        document.getElementById('protein-per-kg').textContent = (totals.protein / weight).toFixed(2) + ' g/kg';
    }

    const n = totals.protein / 6.25;
    document.getElementById('total-npcn').textContent = n > 0 ? ((totals.kcal - totals.protein * 4) / n).toFixed(0) : '0';
    
    document.getElementById('total-fe').textContent = totals.fe.toFixed(2);
    document.getElementById('total-zn').textContent = totals.zn.toFixed(2);
    document.getElementById('total-cu').textContent = totals.cu.toFixed(3);
    document.getElementById('total-mn').textContent = totals.mn.toFixed(3);
    document.getElementById('total-i').textContent = (totals.i * 1000).toFixed(0);
    document.getElementById('total-b1').textContent = totals.b1.toFixed(2);
    document.getElementById('total-carnitine').textContent = totals.carnitine.toFixed(1);
    document.getElementById('sub-enteral').textContent = subEnteral.toFixed(0) + ' kcal';
    document.getElementById('sub-pn').textContent = subPN.toFixed(0) + ' kcal';
}

function generateSummary() {
    const lines = ['【栄養管理・輸液計算結果】'];
    const { height, weight, age } = state.patient;
    if (age !== null) lines.push(`年齢: ${age}歳`);
    if (height > 0 || weight > 0) lines.push(`身長: ${height}cm / 体重: ${weight}kg (BMI: ${document.getElementById('disp-bmi').textContent})`);
    
    lines.push('\n[投与内容]');
    let hasProducts = false;
    Object.keys(CATEGORIES).forEach(cat => {
        const selected = state.selections[cat].filter(s => s.name && s.amount > 0);
        if (selected.length > 0) {
            hasProducts = true;
            lines.push(`-- ${CATEGORIES[cat]} --`);
            selected.forEach(s => {
                const p = PRODUCT_DB[cat].find(x => x.name === s.name);
                const unit = p ? p.unit : 'mL';
                lines.push(`・${s.name}: ${s.amount} ${unit}`);
            });
        }
    });
    if (!hasProducts) lines.push('（入力なし）');

    lines.push('\n[栄養サマリー]');
    lines.push(`総エネルギー: ${document.getElementById('total-kcal').textContent} kcal (${document.getElementById('kcal-per-kg').textContent})`);
    lines.push(`タンパク質: ${document.getElementById('total-protein').textContent} g (${document.getElementById('protein-per-kg').textContent})`);
    lines.push(`総水分量: ${document.getElementById('total-water').textContent} mL`);
    return lines.join('\n');
}

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${tabId}'`)) btn.classList.add('active');
    });
};

init();
