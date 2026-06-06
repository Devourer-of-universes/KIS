// Маршруты для заметок
router.get('/notes/personal', authMiddleware, async (req, res) => {
    const result = await query(
        `SELECT * FROM notes WHERE user_id = $1 AND type = 'personal' ORDER BY created_at DESC`,
        [req.userId]
    );
    res.json({ notes: result.rows });
});

router.get('/notes/group', authMiddleware, async (req, res) => {
    // Получаем отдел пользователя
    const user = await query(`SELECT department_id FROM users WHERE id = $1`, [req.userId]);
    const departmentId = user.rows[0]?.department_id;
    
    const result = await query(
        `SELECT * FROM notes WHERE department_id = $1 AND type = 'group' ORDER BY created_at DESC`,
        [departmentId]
    );
    res.json({ notes: result.rows });
});

router.post('/notes', authMiddleware, async (req, res) => {
    const { type, content } = req.body;
    
    if (type === 'personal') {
        await query(
            `INSERT INTO notes (user_id, type, content) VALUES ($1, $2, $3)`,
            [req.userId, type, content]
        );
    } else {
        const user = await query(`SELECT department_id FROM users WHERE id = $1`, [req.userId]);
        await query(
            `INSERT INTO notes (user_id, department_id, type, content) VALUES ($1, $2, $3, $4)`,
            [req.userId, user.rows[0]?.department_id, type, content]
        );
    }
    res.json({ success: true });
});

router.delete('/notes/:id', authMiddleware, async (req, res) => {
    await query(`DELETE FROM notes WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    res.json({ success: true });
});