const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// =====================================================
// СОГЛАСОВАНИЕ ДОКУМЕНТОВ
// =====================================================

/**
 * Проверка: может ли пользователь управлять процессом документа
 * (автор, админ, или явное право register/archive)
 */
async function canManageWorkflow(documentId, userId, isSuperAdmin = false) {
    if (isSuperAdmin) return true;
    
    const result = await query(
        `SELECT created_by FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId]
    );
    
    if (result.rows.length === 0) return false;
    return result.rows[0].created_by === userId;
}

/**
 * Отправить уведомление о шаге
 */
async function notifyStep(step, document, message = null) {
    if (!step || !step.user_id) return;
    
    const title = message || `Документ "${document.title}" поступил на этап: ${step.role || step.type}`;
    
    await query(
        `INSERT INTO notifications (user_id, category, priority, title, content, link_type, link_id, sender_id)
         VALUES ($1, 'document', 'normal', $2, $3, 'document', $4, $5)`,
        [
            step.user_id,
            title,
            `Требуется действие по документу №${document.id}`,
            document.id,
            document.created_by
        ]
    );
}

// =====================================================
// ОТПРАВКА НА СОГЛАСОВАНИЕ
// =====================================================

router.post('/documents/:id/submit', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            workflow_template_id = null,
            route_data: customRouteData = null  // ← кастомный маршрут от пользователя
        } = req.body || {};
        const canManage = await canManageWorkflow(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на отправку' });
        }
        
        const result = await transaction(async (client) => {
            // Получаем документ
            const docResult = await client.query(
                `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
                [id]
            );
            
            if (docResult.rows.length === 0) {
                throw new Error('Документ не найден');
            }
            
            const doc = docResult.rows[0];
            
            // Проверяем статус
            if (!['draft', 'revision'].includes(doc.status)) {
                throw new Error(`Нельзя отправить документ со статусом "${doc.status}"`);
            }
            
            // Проверяем маршрут
                        // Проверяем маршрут
            let routeResult = await client.query(
                `SELECT * FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
                [id]
            );
            
            let route;
            
            // ==========================================================
            // ПРИОРИТЕТ: кастомный route_data > шаблон процесса
            // ==========================================================
            
            // Собираем steps из кастомного маршрута, если он передан
            let incomingSteps = null;
            
            if (customRouteData && Array.isArray(customRouteData.steps) && customRouteData.steps.length > 0) {
                incomingSteps = customRouteData.steps;
            }
            
            // Если маршрута нет — создаём его (из кастомного route_data или из шаблона)
            if (routeResult.rows.length === 0) {
                let stepsToUse = incomingSteps;
                
                // Если кастомного нет — берём из шаблона
                if (!stepsToUse) {
                    if (!workflow_template_id) {
                        throw new Error('У документа нет маршрута согласования. Укажите шаблон процесса или задайте маршрут вручную.');
                    }
                    
                    // Проверяем шаблон процесса
                    const wtResult = await client.query(
                        `SELECT * FROM workflow_templates 
                         WHERE id = $1 AND deleted_at IS NULL AND is_active = true`,
                        [workflow_template_id]
                    );
                    
                    if (wtResult.rows.length === 0) {
                        throw new Error('Шаблон процесса не найден');
                    }
                    
                    const wt = wtResult.rows[0];
                    stepsToUse = wt.steps || [];
                    
                    if (stepsToUse.length === 0) {
                        throw new Error('Шаблон процесса пуст');
                    }
                    
                    // Увеличиваем счётчик использования
                    await client.query(
                        `UPDATE workflow_templates SET usage_count = usage_count + 1 WHERE id = $1`,
                        [workflow_template_id]
                    );
                }
                
                // Резолвим исполнителей
                const { resolveAllSteps } = require('../services/assigneeResolver');
                
                const documentForResolve = {
                    created_by: doc.created_by,
                    department_id: doc.department_id
                };
                
                const resolvedSteps = await resolveAllSteps(stepsToUse, documentForResolve);
                
                const finalSteps = resolvedSteps.map((s, i) => ({
                    id: s.id || uuidv4(),
                    order: i + 1,
                    type: s.type || 'approval',
                    user_id: s.user_id,
                    role: s.role_label || s.role || '',
                    status: 'pending',
                    comment: null,
                    completed_at: null,
                    assignee_type: s.assignee_type || 'user',
                    assignee_user_id: s.assignee_user_id || null,
                    assignee_post_id: s.assignee_post_id || null,
                    assignee_department_id: s.assignee_department_id || null,
                    assignee_role_id: s.assignee_role_id || null,
                    unresolved: s.unresolved || false
                }));
                
                const unresolvedCount = finalSteps.filter(s => s.unresolved).length;
                if (unresolvedCount > 0) {
                    throw new Error(
                        `Не удалось определить исполнителей для ${unresolvedCount} этапов. ` +
                        `Проверьте оргструктуру и настройки маршрута.`
                    );
                }
                
                const routeData = {
                    steps: finalSteps,
                    allow_parallel: customRouteData?.allow_parallel || false,
                    auto_start: true
                };
                
                // Создаём маршрут
                const createRouteResult = await client.query(
                    `INSERT INTO document_routes 
                     (document_id, workflow_template_id, route_data, created_by)
                     VALUES ($1, $2, $3, $4)
                     RETURNING *`,
                    [id, workflow_template_id || null, JSON.stringify(routeData), doc.created_by]
                );
                
                route = createRouteResult.rows[0];
            } else {
                route = routeResult.rows[0];
                
                // Если маршрут есть, но передан кастомный route_data — обновляем его
                if (incomingSteps) {
                    const routeData = {
                        ...route.route_data,
                        steps: incomingSteps,
                        allow_parallel: customRouteData?.allow_parallel || route.route_data?.allow_parallel || false
                    };
                    
                    const updateRouteResult = await client.query(
                        `UPDATE document_routes 
                         SET route_data = $1, updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2
                         RETURNING *`,
                        [JSON.stringify(routeData), route.id]
                    );
                    
                    route = updateRouteResult.rows[0];
                }
            }
            
                        const steps = route.route_data?.steps || [];
            
            if (steps.length === 0) {
                throw new Error('Маршрут пуст');
            }
            
            // Проверяем, что у каждого шага есть исполнитель
            const invalidSteps = steps.filter(s => !s.user_id);
            if (invalidSteps.length > 0) {
                throw new Error('В маршруте есть шаги без исполнителя');
            }
            
            // Помечаем маршрут запущенным
            const newRouteData = {
                ...route.route_data,
                steps
            };
            
            await client.query(
                `UPDATE document_routes 
                 SET route_data = $1, is_started = true, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [JSON.stringify(newRouteData), route.id]
            );
            
            // Обновляем статус документа
            const updateDoc = await client.query(
                `UPDATE documents SET status = 'on_approval', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 RETURNING *`,
                [id]
            );
            
            return { document: updateDoc.rows[0], route: { ...route, route_data: newRouteData } };
        });        
        // Уведомляем первого исполнителя (вне транзакции)
        const firstStep = result.route.route_data.steps[0];
        await notifyStep(firstStep, result.document);
        
        res.json({ 
            success: true, 
            document: result.document,
            current_step: firstStep
        });
    } catch (error) {
        console.error('Submit document error:', error);
        res.status(400).json({ error: error.message });
    }
});

// =====================================================
// ОДОБРЕНИЕ ЭТАПА
// =====================================================

router.post('/documents/:id/approve', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment = null } = req.body;
        
        const result = await transaction(async (client) => {
            // Получаем документ и маршрут
            const docResult = await client.query(
                `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
                [id]
            );
            
            if (docResult.rows.length === 0) throw new Error('Документ не найден');
            const doc = docResult.rows[0];
            
            if (doc.status !== 'on_approval') {
                throw new Error('Документ не на согласовании');
            }
            
            const routeResult = await client.query(
                `SELECT * FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
                [id]
            );
            
            if (routeResult.rows.length === 0) throw new Error('Маршрут не найден');
            const route = routeResult.rows[0];
            
            const steps = route.route_data.steps || [];
            
            // Находим текущий активный шаг (первый pending)
            const currentStepIndex = steps.findIndex(s => s.status === 'pending');
            
            if (currentStepIndex === -1) {
                throw new Error('Нет активных шагов');
            }
            
            const currentStep = steps[currentStepIndex];
            
            // Проверяем права: только назначенный пользователь или админ
            if (currentStep.user_id !== req.userId && !req.user?.is_super_admin) {
                throw new Error('Вы не назначены на этот этап');
            }
            
            // Обновляем шаг
            steps[currentStepIndex] = {
                ...currentStep,
                status: 'approved',
                comment: comment,
                completed_at: new Date().toISOString()
            };
            
            // Определяем, есть ли следующий шаг
            const nextStep = steps[currentStepIndex + 1];
            const isFinished = !nextStep;
            
            const newRouteData = { ...route.route_data, steps };
            
            await client.query(
                `UPDATE document_routes SET route_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [JSON.stringify(newRouteData), route.id]
            );
            
            // Обновляем статус документа
            let newStatus = doc.status;
            if (isFinished) {
                // Проверяем: если последний шаг был signature — статус signed
                const hasSignatureSteps = steps.some(s => s.type === 'signature');
                newStatus = hasSignatureSteps ? 'signed' : 'approved';
            }
            
            const updateDoc = await client.query(
                `UPDATE documents SET status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 RETURNING *`,
                [newStatus, id]
            );
            
            return { 
                document: updateDoc.rows[0], 
                nextStep,
                isFinished,
                currentStep: steps[currentStepIndex]
            };
        });
        
        // Уведомления вне транзакции
        if (result.isFinished) {
            // Автору — документ согласован
            await query(
                `INSERT INTO notifications (user_id, category, priority, title, content, link_type, link_id)
                 VALUES ($1, 'document', 'normal', $2, $3, 'document', $4)`,
                [
                    result.document.created_by,
                    'Документ согласован',
                    `Документ "${result.document.title}" успешно прошёл согласование`,
                    id
                ]
            );
        } else if (result.nextStep) {
            // Следующему исполнителю
            await notifyStep(result.nextStep, result.document);
        }
        
        res.json({
            success: true,
            document: result.document,
            next_step: result.nextStep,
            is_finished: result.isFinished
        });
    } catch (error) {
        console.error('Approve document error:', error);
        res.status(400).json({ error: error.message });
    }
});

// =====================================================
// ОТКЛОНЕНИЕ (ВОЗВРАТ НА ДОРАБОТКУ)
// =====================================================

router.post('/documents/:id/reject', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        
        if (!comment || comment.trim() === '') {
            return res.status(400).json({ error: 'Укажите причину отклонения' });
        }
        
        const result = await transaction(async (client) => {
            const docResult = await client.query(
                `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
                [id]
            );
            
            if (docResult.rows.length === 0) throw new Error('Документ не найден');
            const doc = docResult.rows[0];
            
            if (doc.status !== 'on_approval') {
                throw new Error('Документ не на согласовании');
            }
            
            const routeResult = await client.query(
                `SELECT * FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
                [id]
            );
            
            if (routeResult.rows.length === 0) throw new Error('Маршрут не найден');
            const route = routeResult.rows[0];
            
            const steps = route.route_data.steps || [];
            const currentStepIndex = steps.findIndex(s => s.status === 'pending');
            
            if (currentStepIndex === -1) throw new Error('Нет активных шагов');
            
            const currentStep = steps[currentStepIndex];
            
            if (currentStep.user_id !== req.userId && !req.user?.is_super_admin) {
                throw new Error('Вы не назначены на этот этап');
            }
            
            // Обновляем текущий шаг
            steps[currentStepIndex] = {
                ...currentStep,
                status: 'rejected',
                comment: comment,
                completed_at: new Date().toISOString()
            };
            
            const newRouteData = { ...route.route_data, steps };
            
            await client.query(
                `UPDATE document_routes 
                 SET route_data = $1, is_started = false, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [JSON.stringify(newRouteData), route.id]
            );
            
            // Возвращаем документ в revision
            const updateDoc = await client.query(
                `UPDATE documents SET status = 'revision', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 RETURNING *`,
                [id]
            );
            
            return { document: updateDoc.rows[0], rejectedStep: steps[currentStepIndex] };
        });
        
        // Уведомление автору
        await query(
            `INSERT INTO notifications (user_id, category, priority, title, content, link_type, link_id)
             VALUES ($1, 'document', 'high', $2, $3, 'document', $4)`,
            [
                result.document.created_by,
                'Документ возвращён на доработку',
                `Документ "${result.document.title}" отклонён. Причина: ${comment}`,
                id
            ]
        );
        
        res.json({ success: true, document: result.document });
    } catch (error) {
        console.error('Reject document error:', error);
        res.status(400).json({ error: error.message });
    }
});

// =====================================================
// ОТМЕНА ПРОЦЕССА
// =====================================================

router.post('/documents/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment = null } = req.body;
        
        const canManage = await canManageWorkflow(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на отмену процесса' });
        }
        
        const result = await transaction(async (client) => {
            const docResult = await client.query(
                `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
                [id]
            );
            
            if (docResult.rows.length === 0) throw new Error('Документ не найден');
            const doc = docResult.rows[0];
            
            if (doc.status !== 'on_approval') {
                throw new Error('Документ не на согласовании');
            }
            
            const routeResult = await client.query(
                `SELECT * FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
                [id]
            );
            
            if (routeResult.rows.length === 0) throw new Error('Маршрут не найден');
            const route = routeResult.rows[0];
            
            // Помечаем все pending-шаги как cancelled
            const steps = (route.route_data.steps || []).map(s => 
                s.status === 'pending' 
                    ? { ...s, status: 'cancelled', comment, completed_at: new Date().toISOString() }
                    : s
            );
            
            const newRouteData = { ...route.route_data, steps };
            
            await client.query(
                `UPDATE document_routes 
                 SET route_data = $1, is_started = false, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [JSON.stringify(newRouteData), route.id]
            );
            
            const updateDoc = await client.query(
                `UPDATE documents SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 RETURNING *`,
                [id]
            );
            
            return updateDoc.rows[0];
        });
        
        res.json({ success: true, document: result });
    } catch (error) {
        console.error('Cancel document error:', error);
        res.status(400).json({ error: error.message });
    }
});

// =====================================================
// СОХРАНИТЬ МАРШРУТ КАК ШАБЛОН
// =====================================================

router.post('/documents/:id/save-route-as-template', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description = '' } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Укажите название шаблона' });
        }
        
        const canManage = await canManageWorkflow(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав' });
        }
        
        // Получаем маршрут документа
        const routeResult = await query(
            `SELECT route_data FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
            [id]
        );
        
        if (routeResult.rows.length === 0) {
            return res.status(400).json({ error: 'Маршрут не найден' });
        }
        
        const steps = routeResult.rows[0].route_data.steps || [];
        
        // Очищаем статусы и ID шагов для шаблона
        const templateSteps = steps.map((s, i) => ({
            order: i + 1,
            type: s.type || 'approval',
            user_id: s.user_id,
            role: s.role || ''
        }));
        
        // Создаём шаблон процесса
        const result = await query(
            `INSERT INTO workflow_templates (name, description, steps, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                name.trim(),
                description,
                JSON.stringify(templateSteps),
                req.userId
            ]
        );
        
        res.status(201).json({ template: result.rows[0] });
    } catch (error) {
        console.error('Save route as template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ИСТОРИЯ ПРОХОЖДЕНИЯ
// =====================================================

router.get('/documents/:id/route-history', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const routeResult = await query(
            `SELECT route_data, is_started, started_at, created_at, updated_at 
             FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
            [id]
        );
        
        if (routeResult.rows.length === 0) {
            return res.json({ history: [] });
        }
        
        const steps = routeResult.rows[0].route_data.steps || [];
        
        // Обогащаем данными о пользователях
        const userIds = [...new Set(steps.filter(s => s.user_id).map(s => s.user_id))];
        
        let usersMap = {};
        if (userIds.length > 0) {
            const usersResult = await query(
                `SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri,
                        p.name as post_name, d.name as department_name
                 FROM users u
                 LEFT JOIN posts p ON u.post_id = p.id
                 LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.id = ANY($1::int[])`,
                [userIds]
            );
            
            usersResult.rows.forEach(u => {
                usersMap[u.id] = {
                    ...u,
                    full_name: `${u.surname} ${u.name} ${u.patronymic || ''}`.trim()
                };
            });
        }
        
        const history = steps.map(s => ({
            ...s,
            user: s.user_id ? usersMap[s.user_id] : null
        }));
        
        res.json({ 
            history,
            route_info: {
                is_started: routeResult.rows[0].is_started,
                started_at: routeResult.rows[0].started_at
            }
        });
    } catch (error) {
        console.error('Get route history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПОЛУЧИТЬ ТЕКУЩИЙ ЭТАП
// =====================================================

router.get('/documents/:id/current-step', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const routeResult = await query(
            `SELECT route_data FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
            [id]
        );
        
        if (routeResult.rows.length === 0) {
            return res.json({ current_step: null, is_mine: false });
        }
        
        const steps = routeResult.rows[0].route_data.steps || [];
        const currentStep = steps.find(s => s.status === 'pending') || null;
        
        let user = null;
        if (currentStep?.user_id) {
            const userResult = await query(
                `SELECT id, surname, name, patronymic, avatar_uri FROM users WHERE id = $1`,
                [currentStep.user_id]
            );
            if (userResult.rows.length > 0) {
                const u = userResult.rows[0];
                user = {
                    ...u,
                    full_name: `${u.surname} ${u.name} ${u.patronymic || ''}`.trim()
                };
            }
        }
        
        res.json({ 
            current_step: currentStep ? { ...currentStep, user } : null,
            is_mine: currentStep?.user_id === req.userId
        });
    } catch (error) {
        console.error('Get current step error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// МОИ ЗАДАЧИ ПО СОГЛАСОВАНИЮ
// =====================================================

router.get('/documents/my-approvals', authMiddleware, async (req, res) => {
    try {
        // Находим все документы, где текущий пользователь — исполнитель активного шага (pending)
        const result = await query(
            `SELECT 
                d.id, d.title, d.status, d.reg_number, d.priority,
                dt.name as document_type_name,
                u.surname as created_by_surname, u.name as created_by_name,
                dr.route_data,
                dr.created_at as route_created_at
             FROM documents d
             JOIN document_routes dr ON dr.document_id = d.id
             LEFT JOIN document_types dt ON d.document_type_id = dt.id
             LEFT JOIN users u ON d.created_by = u.id
             WHERE d.deleted_at IS NULL
               AND d.status = 'on_approval'
               AND EXISTS (
                   SELECT 1 FROM jsonb_array_elements(dr.route_data->'steps') AS step
                   WHERE step->>'status' = 'pending'
                     AND (step->>'user_id')::int = $1
               )
             ORDER BY d.updated_at DESC`,
            [req.userId]
        );
        
        const documents = result.rows.map(d => {
            // Определяем, какой именно шаг сейчас у этого пользователя
            const steps = d.route_data?.steps || [];
            const myStep = steps.find(s => s.status === 'pending' && s.user_id === req.userId);
            
            return {
                ...d,
                created_by_name: d.created_by_surname 
                    ? `${d.created_by_surname} ${d.created_by_name || ''}`.trim() 
                    : null,
                current_step_type: myStep?.type || 'approval',
                current_step_role: myStep?.role || ''
            };
        });
        
        res.json({ documents });
    } catch (error) {
        console.error('Get my approvals error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;