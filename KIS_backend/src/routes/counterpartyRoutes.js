const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkDocumentPermission } = require('../middleware/documentPermissions');
const { query } = require('../config/database');

// =====================================================
// СПРАВОЧНИК КОНТРАГЕНТОВ
// =====================================================

// Получение списка контрагентов (с поиском и пагинацией)
router.get('/counterparties', authMiddleware, async (req, res) => {
    try {
        const { 
            search = '', 
            active_only = 'true',
            limit = 50, 
            offset = 0,
            sort_by = 'name',
            sort_dir = 'asc'
        } = req.query;
        
        // Разрешённые поля для сортировки (защита от SQL-инъекций)
        const allowedSortFields = ['name', 'inn', 'created_at', 'updated_at'];
        const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'name';
        const safeSortDir = sort_dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        let sql = `
            SELECT 
                c.id, c.name, c.full_name, c.inn, c.kpp, c.ogrn,
                c.address, c.phone, c.email, c.contact_person, c.contact_position,
                c.is_active, c.created_at, c.updated_at,
                u.surname as created_by_surname,
                u.name as created_by_name
            FROM counterparties c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.deleted_at IS NULL
        `;
        
        const params = [];
        let idx = 1;
        
        if (active_only === 'true') {
            sql += ` AND c.is_active = true`;
        }
        
        if (search) {
            sql += ` AND (
                c.name ILIKE $${idx} OR 
                c.full_name ILIKE $${idx} OR 
                c.inn ILIKE $${idx} OR 
                c.contact_person ILIKE $${idx}
            )`;
            params.push(`%${search}%`);
            idx++;
        }
        
        sql += ` ORDER BY c.${safeSortBy} ${safeSortDir}`;
        sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(sql, params);
        
        // Общее количество
        let countSql = `SELECT COUNT(*) FROM counterparties WHERE deleted_at IS NULL`;
        const countParams = [];
        let countIdx = 1;
        
        if (active_only === 'true') {
            countSql += ` AND is_active = true`;
        }
        
        if (search) {
            countSql += ` AND (
                name ILIKE $${countIdx} OR 
                full_name ILIKE $${countIdx} OR 
                inn ILIKE $${countIdx} OR 
                contact_person ILIKE $${countIdx}
            )`;
            countParams.push(`%${search}%`);
        }
        
        const countResult = await query(countSql, countParams);
        
        const counterparties = result.rows.map(c => ({
            ...c,
            created_by_name: c.created_by_surname 
                ? `${c.created_by_surname} ${c.created_by_name || ''}`.trim() 
                : null
        }));
        
        res.json({ 
            counterparties, 
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get counterparties error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение одного контрагента
router.get('/counterparties/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT c.*, 
                    u.surname as created_by_surname,
                    u.name as created_by_name
             FROM counterparties c
             LEFT JOIN users u ON c.created_by = u.id
             WHERE c.id = $1 AND c.deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Контрагент не найден' });
        }
        
        const counterparty = result.rows[0];
        counterparty.created_by_name = counterparty.created_by_surname 
            ? `${counterparty.created_by_surname} ${counterparty.created_by_name || ''}`.trim() 
            : null;
        
        res.json({ counterparty });
    } catch (error) {
        console.error('Get counterparty error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание контрагента
router.post('/counterparties', 
    authMiddleware, 
    checkDocumentPermission('manage_counterparties'), 
    async (req, res) => {
    try {
        const {
            name,
            full_name = null,
            inn = null,
            kpp = null,
            ogrn = null,
            address = null,
            postal_address = null,
            phone = null,
            email = null,
            contact_person = null,
            contact_position = null
        } = req.body;
        
        // Валидация
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Укажите название контрагента' });
        }
        
        // Проверка ИНН (если указан)
        if (inn && !/^\d{10}$|^\d{12}$/.test(inn)) {
            return res.status(400).json({ error: 'ИНН должен содержать 10 или 12 цифр' });
        }
        
        // Проверка КПП (если указан)
        if (kpp && !/^\d{9}$/.test(kpp)) {
            return res.status(400).json({ error: 'КПП должен содержать 9 цифр' });
        }
        
        // Проверка ОГРН (если указан)
        if (ogrn && !/^\d{13}$|^\d{15}$/.test(ogrn)) {
            return res.status(400).json({ error: 'ОГРН должен содержать 13 или 15 цифр' });
        }
        
        // Проверка уникальности ИНН (если указан)
        if (inn) {
            const existing = await query(
                `SELECT id FROM counterparties WHERE inn = $1 AND deleted_at IS NULL`,
                [inn]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Контрагент с таким ИНН уже существует' 
                });
            }
        }
        
        const result = await query(
            `INSERT INTO counterparties (
                name, full_name, inn, kpp, ogrn,
                address, postal_address, phone, email,
                contact_person, contact_position, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                name.trim(), full_name, inn, kpp, ogrn,
                address, postal_address, phone, email,
                contact_person, contact_position, req.userId
            ]
        );
        
        res.status(201).json({ counterparty: result.rows[0] });
    } catch (error) {
        console.error('Create counterparty error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление контрагента
router.put('/counterparties/:id', 
    authMiddleware, 
    checkDocumentPermission('manage_counterparties'), 
    async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, full_name, inn, kpp, ogrn,
            address, postal_address, phone, email,
            contact_person, contact_position, is_active
        } = req.body;
        
        // Валидация ИНН
        if (inn && !/^\d{10}$|^\d{12}$/.test(inn)) {
            return res.status(400).json({ error: 'ИНН должен содержать 10 или 12 цифр' });
        }
        
        // Проверка уникальности ИНН (кроме самого себя)
        if (inn) {
            const existing = await query(
                `SELECT id FROM counterparties 
                 WHERE inn = $1 AND id != $2 AND deleted_at IS NULL`,
                [inn, id]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Контрагент с таким ИНН уже существует' 
                });
            }
        }
        
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
        if (full_name !== undefined) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
        if (inn !== undefined) { updates.push(`inn = $${idx++}`); values.push(inn); }
        if (kpp !== undefined) { updates.push(`kpp = $${idx++}`); values.push(kpp); }
        if (ogrn !== undefined) { updates.push(`ogrn = $${idx++}`); values.push(ogrn); }
        if (address !== undefined) { updates.push(`address = $${idx++}`); values.push(address); }
        if (postal_address !== undefined) { updates.push(`postal_address = $${idx++}`); values.push(postal_address); }
        if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone); }
        if (email !== undefined) { updates.push(`email = $${idx++}`); values.push(email); }
        if (contact_person !== undefined) { updates.push(`contact_person = $${idx++}`); values.push(contact_person); }
        if (contact_position !== undefined) { updates.push(`contact_position = $${idx++}`); values.push(contact_position); }
        if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active); }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        
        const result = await query(
            `UPDATE counterparties SET ${updates.join(', ')} 
             WHERE id = $${idx} AND deleted_at IS NULL 
             RETURNING *`,
            values
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Контрагент не найден' });
        }
        
        res.json({ counterparty: result.rows[0] });
    } catch (error) {
        console.error('Update counterparty error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Мягкое удаление контрагента
router.delete('/counterparties/:id', 
    authMiddleware, 
    checkDocumentPermission('manage_counterparties'), 
    async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, используется ли контрагент в документах
        const usageCheck = await query(
            `SELECT id FROM documents 
             WHERE field_values->>'counterparty_id' = $1::text 
               AND deleted_at IS NULL
             LIMIT 1`,
            [id]
        );
        
        if (usageCheck.rows.length > 0) {
            // Если используется — деактивируем
            await query(
                `UPDATE counterparties SET is_active = false, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [id]
            );
            return res.json({ 
                success: true, 
                message: 'Контрагент деактивирован (используется в документах)' 
            });
        }
        
        // Иначе — мягко удаляем
        await query(
            `UPDATE counterparties SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [id]
        );
        
        res.json({ success: true, message: 'Контрагент удалён' });
    } catch (error) {
        console.error('Delete counterparty error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Восстановление удалённого контрагента
router.post('/counterparties/:id/restore', 
    authMiddleware, 
    checkDocumentPermission('manage_counterparties'), 
    async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `UPDATE counterparties SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 RETURNING *`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Контрагент не найден' });
        }
        
        res.json({ counterparty: result.rows[0] });
    } catch (error) {
        console.error('Restore counterparty error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;