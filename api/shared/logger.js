const sql = require('mssql');

async function logActivity(pool, userId, category, action, targetId, detail) {
    try {
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('category', sql.NVarChar, category)
            .input('action', sql.NVarChar, action)
            .input('targetId', sql.Int, targetId || null)
            .input('detail', sql.NVarChar, detail ? JSON.stringify(detail) : null)
            .query(`
                INSERT INTO activity_logs (user_id, category, action, target_id, detail)
                VALUES (@userId, @category, @action, @targetId, @detail)
            `);
    } catch (err) {
        // ログ記録失敗が本処理を止めないよう、エラーは握りつぶしてコンソールに出すだけにする
        console.error('ログ記録エラー:', err);
    }
}

module.exports = { logActivity };