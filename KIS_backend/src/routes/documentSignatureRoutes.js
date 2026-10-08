const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { query, transaction } = require('../config/database');

// =====================================================
// ПОДПИСИ ДОКУМЕНТОВ (заглушка ЭЦП)
// =====================================================

/**
 * Считает SHA-256 хэш файла
 */
function calculateFileHash(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Проверка: может ли пользователь подписать документ
 * Условия:
 * - Документ в статусе 'on_approval'
 * - Активный шаг маршрута имеет type='signature'
 * - Пользователь = исполнитель этого шага, или супер-админ
 */
async function canSign(documentId, userId, isSuperAdmin = false) {
    const docResult = await query(
        `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId]
    );
    
    if (docResult.rows.length === 0) {
        return { allowed: false, reason: 'Документ не найден' };
    }
    
    const doc = docResult.rows[0];
    
    if (doc.status !== 'on_approval') {
        return { 
            allowed: false, 
            reason: `Подписание доступно только в статусе "На согласовании". Текущий статус: ${doc.status}` 
        };
    }
    
    const routeResult = await query(
        `SELECT * FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
        [documentId]
    );
    
    if (routeResult.rows.length === 0) {
        return { allowed: false, reason: 'Маршрут не найден' };
    }
    
    const steps = routeResult.rows[0].route_data?.steps || [];
    const currentStep = steps.find(s => s.status === 'pending');
    
    if (!currentStep) {
        return { allowed: false, reason: 'Нет активных шагов' };
    }
    
    if (currentStep.type !== 'signature') {
        return { 
            allowed: false, 
            reason: 'Текущий этап не является этапом подписания',
            current_step: currentStep
        };
    }
    
    if (currentStep.user_id !== userId && !isSuperAdmin) {
        return { 
            allowed: false, 
            reason: 'Вы не назначены на этот этап',
            current_step: currentStep
        };
    }
    
    return { allowed: true, currentStep, document: doc };
}

// =====================================================
// ПОДПИСАТЬ ДОКУМЕНТ
// =====================================================

router.post('/documents/:id/sign', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment = null } = req.body;
        
        // Проверка права на подпись
        const check = await canSign(id, req.userId, req.user?.is_super_admin);
        if (!check.allowed) {
            return res.status(403).json({ 
                error: check.reason,
                current_step: check.current_step 
            });
        }
        
        const result = await transaction(async (client) => {
            // Проверяем, нет ли уже подписи этого пользователя по этому документу
            const existingSig = await client.query(
                `SELECT id FROM document_signatures 
                 WHERE document_id = $1 AND user_id = $2
                 AND version_id IN (SELECT id FROM document_versions 
                                    WHERE document_id = $1 
                                    ORDER BY version_number DESC LIMIT 1)`,
                [id, req.userId]
            );
            
            if (existingSig.rows.length > 0) {
                throw new Error('Вы уже подписали этот документ');
            }
            
            // Получаем последнюю версию
            const versionResult = await client.query(
                `SELECT id, file_uri FROM document_versions 
                 WHERE document_id = $1 
                 ORDER BY version_number DESC LIMIT 1`,
                [id]
            );
            
            const versionId = versionResult.rows[0]?.id || null;
            
            // Считаем хэш файла
            let fileHash = null;
            if (versionResult.rows[0]?.file_uri) {
                const filePath = path.join(__dirname, '../../public', versionResult.rows[0].file_uri);
                fileHash = calculateFileHash(filePath);
            }
            
            // Создаём запись о подписи
            const sigResult = await client.query(
                `INSERT INTO document_signatures 
                 (document_id, version_id, user_id, signature_type, ip_address, user_agent, file_hash)
                 VALUES ($1, $2, $3, 'simple', $4, $5, $6)
                 RETURNING *`,
                [
                    id, 
                    versionId, 
                    req.userId,
                    req.ip || null,
                    req.headers['user-agent'] || null,
                    fileHash
                ]
            );
            
            // Обновляем шаг маршрута — помечаем как approved
            const routeResult = await client.query(
                `SELECT * FROM document_routes 
                 WHERE document_id = $1 
                 ORDER BY id DESC LIMIT 1 
                 FOR UPDATE`,
                [id]
            );
            
            const route = routeResult.rows[0];
            const steps = route.route_data.steps || [];
            const currentStepIndex = steps.findIndex(s => s.status === 'pending');
            
            if (currentStepIndex === -1) {
                throw new Error('Не найден активный шаг для обновления');
            }
            
            steps[currentStepIndex] = {
                ...steps[currentStepIndex],
                status: 'approved',
                comment: comment || 'Подписано',
                completed_at: new Date().toISOString()
            };
            
            const newRouteData = { ...route.route_data, steps };
            
            await client.query(
                `UPDATE document_routes SET route_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [JSON.stringify(newRouteData), route.id]
            );
            
            // Проверяем, есть ли следующий шаг
            const nextStep = steps[currentStepIndex + 1];
            const isFinished = !nextStep;
            
            // Обновляем статус документа
            let newStatus = 'on_approval';
            if (isFinished) {
                // Все шаги пройдены — документ подписан
                newStatus = 'signed';
            }
            
            const docUpdate = await client.query(
                `UPDATE documents SET status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 RETURNING *`,
                [newStatus, id]
            );
            
            return {
                signature: sigResult.rows[0],
                document: docUpdate.rows[0],
                nextStep,
                isFinished
            };
        });
        
        // Уведомления
        if (result.isFinished) {
            // Автору — документ подписан
            await query(
                `INSERT INTO notifications (user_id, category, priority, title, content, link_type, link_id)
                 VALUES ($1, 'document', 'normal', $2, $3, 'document', $4)`,
                [
                    result.document.created_by,
                    'Документ подписан',
                    `Документ "${result.document.title}" подписан всеми участниками`,
                    id
                ]
            );
        } else if (result.nextStep) {
            // Следующему исполнителю
            await query(
                `INSERT INTO notifications (user_id, category, priority, title, content, link_type, link_id)
                 VALUES ($1, 'document', 'normal', $2, $3, 'document', $4)`,
                [
                    result.nextStep.user_id,
                    `Документ "${result.document.title}" ждёт вашего действия`,
                    `Этап: ${result.nextStep.role || result.nextStep.type}`,
                    id
                ]
            );
        }
        
        res.status(201).json({
            success: true,
            signature: result.signature,
            document: result.document,
            next_step: result.nextStep,
            is_finished: result.isFinished
        });
    } catch (error) {
        console.error('Sign document error:', error);
        res.status(400).json({ error: error.message });
    }
});

// =====================================================
// СПИСОК ПОДПИСЕЙ ДОКУМЕНТА
// =====================================================

router.get('/documents/:id/signatures', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем доступ к документу
        const docResult = await query(
            `SELECT created_by FROM documents WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        
        const result = await query(
            `SELECT ds.*, 
                    u.surname, u.name, u.patronymic, u.avatar_uri,
                    p.name as post_name,
                    d.name as department_name,
                    dv.version_number
             FROM document_signatures ds
             LEFT JOIN users u ON ds.user_id = u.id
             LEFT JOIN posts p ON u.post_id = p.id
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN document_versions dv ON ds.version_id = dv.id
             WHERE ds.document_id = $1
             ORDER BY ds.signed_at ASC`,
            [id]
        );
        
        const signatures = result.rows.map(s => ({
            ...s,
            user_full_name: `${s.surname || ''} ${s.name || ''} ${s.patronymic || ''}`.trim(),
            is_current_user: s.user_id === req.userId
        }));
        
        res.json({ signatures });
    } catch (error) {
        console.error('Get signatures error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ОТОЗВАТЬ ПОДПИСЬ
// =====================================================

router.delete('/documents/:docId/signatures/:sigId', authMiddleware, async (req, res) => {
    try {
        const { docId, sigId } = req.params;
        
        const result = await transaction(async (client) => {
            // Получаем подпись
            const sigResult = await client.query(
                `SELECT * FROM document_signatures WHERE id = $1 AND document_id = $2`,
                [sigId, docId]
            );
            
            if (sigResult.rows.length === 0) {
                throw new Error('Подпись не найдена');
            }
            
            const sig = sigResult.rows[0];
            
            // Проверяем права: только сам подписавший или супер-админ
            if (sig.user_id !== req.userId && !req.user?.is_super_admin) {
                throw new Error('Нет прав на отзыв этой подписи');
            }
            
            // Проверяем статус документа
            const docResult = await client.query(
                `SELECT status FROM documents WHERE id = $1`,
                [docId]
            );
            
            if (docResult.rows[0].status === 'archived') {
                throw new Error('Нельзя отозвать подпись из архивного документа');
            }
            
            // Удаляем подпись
            await client.query(`DELETE FROM document_signatures WHERE id = $1`, [sigId]);
            
            // Откатываем шаг маршрута
            const routeResult = await client.query(
                `SELECT * FROM document_routes 
                 WHERE document_id = $1 
                 ORDER BY id DESC LIMIT 1 
                 FOR UPDATE`,
                [docId]
            );
            
            if (routeResult.rows.length > 0) {
                const route = routeResult.rows[0];
                const steps = route.route_data.steps || [];
                
                // Находим шаг этого пользователя, который был approved
                const stepIndex = steps.findIndex(s => 
                    s.user_id === sig.user_id && s.status === 'approved'
                );
                
                if (stepIndex !== -1) {
                    steps[stepIndex] = {
                        ...steps[stepIndex],
                        status: 'pending',
                        comment: null,
                        completed_at: null
                    };
                    
                    await client.query(
                        `UPDATE document_routes 
                         SET route_data = $1, updated_at = CURRENT_TIMESTAMP 
                         WHERE id = $2`,
                        [JSON.stringify({ ...route.route_data, steps }), route.id]
                    );
                    
                    // Документ снова в on_approval
                    await client.query(
                        `UPDATE documents SET status = 'on_approval', updated_at = CURRENT_TIMESTAMP 
                         WHERE id = $1`,
                        [docId]
                    );
                }
            }
            
            return sig;
        });
        
        res.json({ success: true, signature: result });
    } catch (error) {
        console.error('Revoke signature error:', error);
        res.status(400).json({ error: error.message });
    }
});

// =====================================================
// ПРОВЕРИТЬ ПОДПИСЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// =====================================================

router.get('/documents/:id/my-signature', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT ds.*, dv.version_number
             FROM document_signatures ds
             LEFT JOIN document_versions dv ON ds.version_id = dv.id
             WHERE ds.document_id = $1 AND ds.user_id = $2
             ORDER BY ds.signed_at DESC
             LIMIT 1`,
            [id, req.userId]
        );
        
        res.json({ 
            has_signature: result.rows.length > 0,
            signature: result.rows[0] || null
        });
    } catch (error) {
        console.error('Get my signature error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПРОВЕРИТЬ ПОДЛИННОСТЬ ПОДПИСИ (по хэшу)
// =====================================================

router.get('/documents/:docId/signatures/:sigId/verify', authMiddleware, async (req, res) => {
    try {
        const { docId, sigId } = req.params;
        
        const sigResult = await query(
            `SELECT ds.*, dv.file_uri as version_file_uri
             FROM document_signatures ds
             LEFT JOIN document_versions dv ON ds.version_id = dv.id
             WHERE ds.id = $1 AND ds.document_id = $2`,
            [sigId, docId]
        );
        
        if (sigResult.rows.length === 0) {
            return res.status(404).json({ error: 'Подпись не найдена' });
        }
        
        const sig = sigResult.rows[0];
        
        // Если нет хэша или файла — проверка невозможна
        if (!sig.file_hash || !sig.version_file_uri) {
            return res.json({ 
                verified: null, 
                message: 'Проверка невозможна: нет данных о файле или хэше' 
            });
        }
        
        // Считаем актуальный хэш
        const filePath = path.join(__dirname, '../../public', sig.version_file_uri);
        const currentHash = calculateFileHash(filePath);
        
        const verified = currentHash === sig.file_hash;
        
        res.json({ 
            verified,
            stored_hash: sig.file_hash,
            current_hash: currentHash,
            message: verified 
                ? 'Подпись действительна, файл не изменён' 
                : 'Подпись НЕдействительна: файл был изменён после подписания'
        });
    } catch (error) {
        console.error('Verify signature error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПРОВЕРИТЬ, МОЖЕТ ЛИ ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ПОДПИСАТЬ
// =====================================================

router.get('/documents/:id/can-sign', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const check = await canSign(id, req.userId, req.user?.is_super_admin);
        
        res.json({
            allowed: check.allowed,
            reason: check.reason || null,
            current_step: check.current_step || null
        });
    } catch (error) {
        console.error('Check can sign error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;