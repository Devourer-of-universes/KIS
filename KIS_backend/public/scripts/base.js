const btn_docs_last = document.querySelector('#top-menu-btn-docs-last');
const btn_docs_at_work = document.querySelector('#top-menu-btn-docs-at-work');
const btn_docs_new = document.querySelector('#top-menu-btn-docs-new');
const btn_docs_archive = document.querySelector('#top-menu-btn-docs-archive');
const btn_tasks_last = document.querySelector('#top-menu-btn-tasks-last');
const btn_tasks_at_work = document.querySelector('#top-menu-btn-tasks-at-work');
const btn_tasks_new = document.querySelector('#top-menu-btn-tasks-new');
const btn_tasks_archive = document.querySelector('#top-menu-btn-tasks-archive');
const btn_fav = document.querySelector('#top-menu-btn-favourites');
const btn_files = document.querySelector('#top-menu-btn-files');
const btn_workflows = document.querySelector('#top-menu-btn-workflows');
btn_workflows.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('workflow-section');
});
btn_docs_last.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-doc-last');
})

btn_docs_at_work.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-doc-at-work');
})

btn_docs_new.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-doc-new');
})

btn_docs_archive.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-doc-archive');
})
btn_tasks_last.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-task-last');
})

btn_tasks_at_work.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-task-at-work');
})

btn_tasks_new.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-task-new');
})

btn_tasks_archive.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-task-archive');
})
btn_fav.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-favourites');
})
btn_files.addEventListener('click', function(e){
    e.stopPropagation();
    openWindow('base-section-files');
})

function openWindow(windowId){
    console.log('Пытаемся открыть:', windowId);
    closeAllWindowsExcept(windowId);
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
        windowElement.style.display = 'block';
        windowElement.style.zIndex = '1000';
        windowElement.classList.add('active');
        console.log('Успешно открыто:', windowId);
    } else {
        console.error('Окно не найдено:', windowId);
    }
}

function closeAllWindowsExcept(exceptWindowId) {
    document.querySelectorAll('.base-section').forEach(window => {
        if (window.id !== exceptWindowId) {
            window.style.display = 'none';
            window.classList.remove('active');
        }
    });
}

function closeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
        windowElement.style.display = 'none';
        windowElement.classList.remove('active');
    }
}
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.sec-btn-close').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const section = this.closest('.base-section');
            if (section) {
                closeWindow(section.id);
                openWindow('base-section-docs-last');
            }
        });
    });
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('base-sec-dn-modal') || 
            e.target.classList.contains('base-sec-tn-modal')) {
            closeAllWindows();
            openWindow('base-section-docs-last');
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const defaultWindow = document.getElementById('base-section-files');
    if (defaultWindow) {
        defaultWindow.style.display = 'block';
        defaultWindow.classList.add('active');
    }
});

document.querySelectorAll('.type-list-elem').forEach(button => {
    button.addEventListener('click', function() {
        const parentSection = this.closest('.base-section');
        const sectionId = parentSection.id;
        
        console.log('Нажата кнопка в секции:', sectionId); 
        
        if (sectionId.includes('doc')) {
            console.log('Создаём документ');
            const docType = this.dataset.type; 
            createNewDocument(docType);
        } else if (sectionId.includes('task')) {
            console.log('Создаём задачу');
            const taskType = this.dataset.type;
            createNewTask(taskType);
        }
    });
});

function createNewDocument(docType) {
    console.log('Создание документа типа:', docType);
    closeWindow('base-section-doc-new');
    openWindow('base-section-doc-edit');
}

function createNewTask(taskType) {
    console.log('Создание задачи типа:', taskType);
    closeWindow('base-section-task-new');
    openWindow('base-section-task-edit');
}
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('addWorkflowBtn').addEventListener('click', function() {
        openWorkflowEditor();
    });
    document.querySelectorAll('.workflow-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.workflow-actions')) {
                const workflowId = this.dataset.workflowId;
                useWorkflow(workflowId);
            }
        });
    });
    document.querySelectorAll('.workflow-actions .btn-icon').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const workflowItem = this.closest('.workflow-item');
            const workflowId = workflowItem.dataset.workflowId;
            const action = this.title;
            
            switch(action) {
                case 'Использовать':
                    useWorkflow(workflowId);
                    break;
                case 'Редактировать':
                    editWorkflow(workflowId);
                    break;
                case 'Копировать':
                    duplicateWorkflow(workflowId);
                    break;
            }
        });
    });
});

function openWorkflowEditor() {
    console.log('Открываем редактор процесса');
    // Здесь будет открытие модального окна создания процесса
}

function useWorkflow(workflowId) {
    console.log('Используем процесс:', workflowId);
    // Здесь будет логика применения процесса
}

function editWorkflow(workflowId) {
    console.log('Редактируем процесс:', workflowId);
    // Здесь будет открытие редактора
}

function duplicateWorkflow(workflowId) {
    console.log('Копируем процесс:', workflowId);
    // Здесь будет логика копирования
}






class ApprovalFlowManager {
    constructor() {
        this.flowContainer = document.getElementById('approvalFlow');
        this.steps = [];
        this.init();
    }
    
    init() {
        this.loadSteps();
        this.initDragAndDrop();
        this.initEventListeners();
    }
    
    loadSteps() {
        this.steps = Array.from(this.flowContainer.querySelectorAll('.approval-step'));
        this.updateStepNumbers();
    }
    
    initDragAndDrop() {
        this.steps.forEach(step => {
            step.addEventListener('dragstart', this.handleDragStart.bind(this));
            step.addEventListener('dragend', this.handleDragEnd.bind(this));
            step.addEventListener('dragover', this.handleDragOver.bind(this));
            step.addEventListener('dragenter', this.handleDragEnter.bind(this));
            step.addEventListener('dragleave', this.handleDragLeave.bind(this));
            step.addEventListener('drop', this.handleDrop.bind(this));
        });
    }
    
    initEventListeners() {
        document.getElementById('addStepBtn').addEventListener('click', () => {
            this.addStep();
        });
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('step-remove')) {
                this.removeStep(e.target.closest('.approval-step'));
            }
        });
        document.getElementById('side-sec-head-btn-choose').addEventListener('click', () => {
            this.chooseTemplate();
        });
        document.getElementById('side-sec-head-btn-addPerson').addEventListener('click', () => {
            this.addPerson();
        });
    }
    
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.stepId);
        e.target.classList.add('dragging');
        setTimeout(() => e.target.style.display = 'none', 0);
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        e.target.style.display = 'flex';
        document.querySelectorAll('.approval-step.drag-over').forEach(step => {
            step.classList.remove('drag-over');
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
    }
    
    handleDragEnter(e) {
        e.preventDefault();
        const step = e.target.closest('.approval-step');
        if (step && !step.classList.contains('dragging')) {
            step.classList.add('drag-over');
        }
    }
    
    handleDragLeave(e) {
        const step = e.target.closest('.approval-step');
        if (step) {
            step.classList.remove('drag-over');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        const step = e.target.closest('.approval-step');
        if (step) {
            step.classList.remove('drag-over');
            
            const draggedStepId = e.dataTransfer.getData('text/plain');
            const draggedStep = this.flowContainer.querySelector(`[data-step-id="${draggedStepId}"]`);
            
            if (draggedStep && draggedStep !== step) {
                this.moveStep(draggedStep, step);
            }
        }
    }
    
    moveStep(draggedStep, targetStep) {
        const allSteps = Array.from(this.flowContainer.querySelectorAll('.approval-step'));
        const draggedIndex = allSteps.indexOf(draggedStep);
        const targetIndex = allSteps.indexOf(targetStep);
        
        if (draggedIndex < targetIndex) {
            targetStep.after(draggedStep);
        } else {
            targetStep.before(draggedStep);
        }
        
        this.updateStepNumbers();
        this.saveFlowState();
    }
    
    addStep() {
        const newStepId = Date.now();
        const newStep = document.createElement('div');
        newStep.className = 'approval-step';
        newStep.draggable = true;
        newStep.dataset.stepId = newStepId;
        newStep.innerHTML = `
            <span class="step-number">${this.steps.length + 1}</span>
            <div class="step-content">
                <span class="step-role">Новый участник</span>
                <span class="step-user">Не назначен</span>
            </div>
            <button class="step-remove" title="Удалить">×</button>
        `;
        this.initStepEventListeners(newStep);
        
        this.flowContainer.appendChild(newStep);
        this.steps.push(newStep);
        this.updateStepNumbers();
        this.saveFlowState();
        this.editStep(newStep);
    }
    
    removeStep(step) {
        if (this.steps.length <= 1) {
            alert('Должен остаться хотя бы один участник согласования');
            return;
        }
        
        if (confirm('Удалить этот этап согласования?')) {
            step.remove();
            this.steps = this.steps.filter(s => s !== step);
            this.updateStepNumbers();
            this.saveFlowState();
        }
    }
    
    updateStepNumbers() {
        const steps = Array.from(this.flowContainer.querySelectorAll('.approval-step'));
        steps.forEach((step, index) => {
            const numberElement = step.querySelector('.step-number');
            numberElement.textContent = index + 1;
        });
    }
    
    editStep(step) {
        const role = prompt('Введите роль участника:', step.querySelector('.step-role').textContent);
        const user = prompt('Введите ФИО участника:', step.querySelector('.step-user').textContent);
        
        if (role) step.querySelector('.step-role').textContent = role;
        if (user) step.querySelector('.step-user').textContent = user;
        
        this.saveFlowState();
    }
    
    initStepEventListeners(step) {
        step.addEventListener('dragstart', this.handleDragStart.bind(this));
        step.addEventListener('dragend', this.handleDragEnd.bind(this));
        step.addEventListener('dragover', this.handleDragOver.bind(this));
        step.addEventListener('dragenter', this.handleDragEnter.bind(this));
        step.addEventListener('dragleave', this.handleDragLeave.bind(this));
        step.addEventListener('drop', this.handleDrop.bind(this));
        step.addEventListener('dblclick', () => {
            this.editStep(step);
        });
    }
    
    chooseTemplate() {
        console.log('Выбор шаблона маршрута');
    }
    
    addPerson() {
        console.log('Добавление нового участника');
        this.addStep();
    }
    
    saveFlowState() {
        const flowData = Array.from(this.flowContainer.querySelectorAll('.approval-step')).map(step => ({
            role: step.querySelector('.step-role').textContent,
            user: step.querySelector('.step-user').textContent
        }));
        localStorage.setItem('approvalFlow', JSON.stringify(flowData));
        console.log('Маршрут сохранён:', flowData);
    }
    
    loadFlowState() {
        const savedFlow = localStorage.getItem('approvalFlow');
        if (savedFlow) {
            const flowData = JSON.parse(savedFlow);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const flowManager = new ApprovalFlowManager();
});