// Department page (manager)
let _deptCharts = {};
let _deptLoaded = false;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '../html/login.html'; return; }
    await loadUserDataForMenu();
    bindDeptControls();
    await loadDepartmentPage();
});

function bindDeptControls() {
    const periodSel = document.getElementById('deptPeriodSelect');
    const from = document.getElementById('deptFromDate');
    const to = document.getElementById('deptToDate');
    if (periodSel) periodSel.addEventListener('change', () => {
        const custom = periodSel.value === 'custom';
        document.getElementById('deptFromWrap').style.display = custom ? '' : 'none';
        document.getElementById('deptToWrap').style.display = custom ? '' : 'none';
        if (!custom) loadDepartmentPage();
    });
    document.getElementById('deptRefreshBtn')?.addEventListener('click', loadDepartmentPage);
    document.getElementById('deptExportBtn')?.addEventListener('click', exportDeptCharts);
    [from,to].forEach(i => i?.addEventListener('change', () => {
        const ps = document.getElementById('deptPeriodSelect');
        if (ps?.value === 'custom' && from.value && to.value) loadDepartmentPage();
    }));
    document.getElementById('deptCollapseAll')?.addEventListener('click', () => toggleAllDeptNodes(false));
    document.getElementById('deptExpandAll')?.addEventListener('click', () => toggleAllDeptNodes(true));
}

function deptPeriodParams() {
    const val = document.getElementById('deptPeriodSelect')?.value || '30';
    if (val === 'custom') {
        const from = document.getElementById('deptFromDate')?.value;
        const to = document.getElementById('deptToDate')?.value;
        const p = new URLSearchParams();
        if (from) p.set('from', from); if (to) p.set('to', to);
        if (!from && !to) p.set('days', '30');
        return p.toString();
    }
    return 'days=' + encodeURIComponent(val);
}

async function apiGet(url) {
    const token = localStorage.getItem('token');
    const resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
}

async function loadDepartmentPage() {
    const loading = document.getElementById('deptLoading');
    const denied = document.getElementById('deptAccessDenied');
    const main = document.getElementById('deptMain');
    loading.style.display = ''; loading.textContent = 'Загрузка данных отдела...';
    denied.style.display = 'none'; main.style.display = 'none';
    try {
        const qs = deptPeriodParams();
        const [info, stats] = await Promise.all([
            apiGet('/api/admin/my-department'),
            apiGet('/api/admin/my-department/stats?' + qs)
        ]);
        if (!info.managed || !stats.managed) {
            loading.style.display = 'none'; denied.style.display = ''; return;
        }
        renderDeptHeader(info);
        renderDeptStructure(info.structure);
        renderDeptKpis(stats.kpis || {});
        renderDeptCharts(stats);
        loading.style.display = 'none'; main.style.display = '';
        _deptLoaded = true;
    } catch (e) {
        console.error('loadDepartmentPage error', e);
        loading.textContent = 'Ошибка загрузки: ' + (e.message || e);
    }
}

function renderDeptHeader(info) {
    const dept = info.department || {};
    document.getElementById('deptPageTitle').innerHTML = '<img src="../materials/icons8-отдел-96.png" class="ui-icon ui-icon-inline" alt=""> ' + escapeHtml(dept.name || 'Мой отдел');
    const sub = [];
    if (dept.manager_position) sub.push(escapeHtml(dept.manager_position));
    sub.push((info.employee_count || 0) + ' сотрудников');
    if (dept.description) sub.push(escapeHtml(dept.description));
    document.getElementById('deptPageSubtitle').innerHTML = sub.join(' · ');
}

function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

function renderDeptStructure(root) {
    const container = document.getElementById('deptStructureContent');
    if (!root) { container.innerHTML = '<div class="dept-state">Структура недоступна</div>'; return; }
    container.innerHTML = `<ul class="structure-tree">${renderDeptNode(root)}</ul>`;
}

function renderDeptNode(dept) {
    const hasChildren = dept.children && dept.children.length;
    const employees = (dept.employees || []).filter(e => e.id !== dept.manager_id);
    const manager = dept.manager || null;
    const managerName = manager ? `${escapeHtml(manager.surname||'')} ${escapeHtml(manager.name||'')} ${escapeHtml(manager.patronymic||'')}`.trim() : 'Не назначен';
    const managerPost = manager?.post_name ? escapeHtml(manager.post_name) : 'Руководитель';
    let html = `<li class="structure-group-item" data-dept-id="${dept.id}">
      <div class="structure-group-header">
        <button class="toggle-btn" onclick="toggleDeptNode(${dept.id})"><span class="toggle-icon">${(hasChildren||employees.length)?'▼':''}</span></button>
        <div class="group-info">
          <h3 class="structure-group-name">${escapeHtml(dept.name||'Отдел')}</h3>
          <span class="structure-group-number-employe">${(dept.employees||[]).length} сотрудников</span>
        </div>
        <div class="group-manager">
          <h4 class="structure-employe-post manager-post">${managerPost}</h4>
          <h5 class="structure-employe-person manager-name">${managerName}</h5>
          ${manager?.email ? `<div class="dept-employee-meta">${escapeHtml(manager.email)}</div>` : ''}
        </div>
      </div>`;
    if (employees.length) {
        html += `<ul class="structure-employees" id="dept-employees-${dept.id}">` + employees.map(emp => `
          <li class="structure-employee-item"><div class="employee-card">
            <div class="employee-avatar"><img src="${escapeHtml(emp.avatar_uri || '../materials/avatar_for_profile.png')}" alt="avatar"></div>
            <div class="employee-info">
              <h4 class="structure-employe-post">${escapeHtml(emp.post_name || '—')}</h4>
              <h5 class="structure-employe-role">${escapeHtml(emp.surname||'')} ${escapeHtml(emp.name||'')}</h5>
              <h5 class="structure-employe-person">${escapeHtml(emp.patronymic || '')}</h5>
              <span class="structure-employe-status status-${emp.status === 'active' ? 'active' : 'inactive'}">${emp.status === 'active' ? 'Активен' : 'Неактивен'}</span>
              ${emp.email ? `<div class="dept-employee-meta">${escapeHtml(emp.email)}</div>` : ''}
            </div>
          </div></li>`).join('') + `</ul>`;
    }
    if (hasChildren) {
        html += `<div class="structure-subgroups" id="dept-sub-${dept.id}"><ul class="structure-tree">` + dept.children.map(ch => renderDeptNode(ch)).join('') + `</ul></div>`;
    }
    html += `</li>`;
    return html;
}

function toggleDeptNode(id) {
    const sub = document.getElementById('dept-sub-' + id);
    const emp = document.getElementById('dept-employees-' + id);
    const icon = document.querySelector(`.structure-group-item[data-dept-id="${id}"] .toggle-icon`);
    const anyVisible = (sub && sub.style.display !== 'none') || (emp && emp.style.display !== 'none');
    if (sub) sub.style.display = anyVisible ? 'none' : 'block';
    if (emp) emp.style.display = anyVisible ? 'none' : 'block';
    if (icon) icon.textContent = anyVisible ? '▶' : '▼';
}
function toggleAllDeptNodes(expand) {
    document.querySelectorAll('#deptStructureContent .structure-subgroups, #deptStructureContent .structure-employees').forEach(el => el.style.display = expand ? 'block':'none');
    document.querySelectorAll('#deptStructureContent .toggle-icon').forEach(el => { if (el.textContent) el.textContent = expand ? '▼':'▶'; });
}

function renderDeptKpis(k) {
    const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    set('kpiEmployees', k.employees_total ?? 0);
    set('kpiActiveEmployees', k.employees_active ?? 0);
    set('kpiTasksPeriod', k.tasks_period ?? 0);
    set('kpiTasksOverdue', k.tasks_overdue ?? 0);
    set('kpiTasksDone', k.tasks_completed_period ?? 0);
    set('kpiDocsPeriod', k.documents_period ?? 0);
}

function _palette(n,a=0.85){ const base=['#4f8cff','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#64748b']; return Array.from({length:n},(_,i)=>{const h=base[i%base.length];const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}); }
function _statusLabel(s){ return ({draft:'Черновик',on_approval:'На согласовании',revision:'На доработке',approved:'Одобрен',signed:'Подписан',registered:'Зарегистрирован',archived:'В архиве',cancelled:'Отменён',pending:'Ожидает',in_progress:'В работе',completed:'Завершена',unknown:'Неизвестно'})[s]||s; }
function _destroyChart(id){ if(_deptCharts[id]){ try{_deptCharts[id].destroy();}catch{} delete _deptCharts[id]; } }
function _makeChart(id,cfg){ const c=document.getElementById(id); if(!c||typeof Chart==='undefined') return; _destroyChart(id); _deptCharts[id]=new Chart(c.getContext('2d'), cfg); }
function _fillSeries(rows,fromIso,toIso){ const map=new Map(); (rows||[]).forEach(r=>map.set(String(r.day).slice(0,10), Number(r.count)||0)); const labels=[],values=[]; const s=new Date(fromIso); s.setHours(0,0,0,0); const e=new Date(toIso); e.setHours(0,0,0,0); for(let d=new Date(s); d<=e; d.setDate(d.getDate()+1)){ const k=d.toISOString().slice(0,10); labels.push(k.slice(5)); values.push(map.get(k)||0);} return {labels,values}; }

function renderDeptCharts(data){
    const c=data.charts||{}, p=data.period||{};
    const text=getComputedStyle(document.documentElement).getPropertyValue('--c_text').trim()||'#333';
    const grid=getComputedStyle(document.documentElement).getPropertyValue('--c_border').trim()||'rgba(0,0,0,.1)';
    Chart.defaults.color=text; Chart.defaults.borderColor=grid;
    const ts=c.tasks_by_status||[]; _makeChart('deptChartTasksStatus',{type:'doughnut',data:{labels:ts.map(r=>_statusLabel(r.status)),datasets:[{data:ts.map(r=>r.count),backgroundColor:_palette(ts.length)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
    const ds=c.documents_by_status||[]; _makeChart('deptChartDocsStatus',{type:'doughnut',data:{labels:ds.map(r=>_statusLabel(r.status)),datasets:[{data:ds.map(r=>r.count),backgroundColor:_palette(ds.length)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
    const tt=_fillSeries(c.tasks_over_time,p.from,p.to); _makeChart('deptChartTasksTime',{type:'line',data:{labels:tt.labels,datasets:[{label:'Задачи',data:tt.values,borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.15)',fill:true,tension:.3}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0}}},plugins:{legend:{display:false}}}});
    const dt=_fillSeries(c.documents_over_time,p.from,p.to); _makeChart('deptChartDocsTime',{type:'line',data:{labels:dt.labels,datasets:[{label:'Документы',data:dt.values,borderColor:'#4f8cff',backgroundColor:'rgba(79,140,255,.15)',fill:true,tension:.3}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0}}},plugins:{legend:{display:false}}}});
}

function exportDeptCharts(){
    const ids=['deptChartTasksStatus','deptChartDocsStatus','deptChartTasksTime','deptChartDocsTime'];
    const names=['dept-tasks-status','dept-docs-status','dept-tasks-dynamics','dept-docs-dynamics'];
    const ts=new Date().toISOString().slice(0,10); let n=0;
    ids.forEach((id,i)=>{ const ch=_deptCharts[id]; if(!ch) return; const a=document.createElement('a'); a.href=ch.toBase64Image('image/png',1); a.download=`report-${names[i]}-${ts}.png`; document.body.appendChild(a); a.click(); a.remove(); n++; });
    if(!n) alert('Нет диаграмм для выгрузки');
}
