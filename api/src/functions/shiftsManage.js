const { app } = require('@azure/functions');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../../shared/logger');

const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
};

function verifyToken(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
}

function isAdmin(role) {
    return ['admin', 'super_admin', 'system_admin'].includes(role);
}

app.http('shiftsManage', {
    methods: ['GET', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const decoded = verifyToken(request);
        if (!decoded || !isAdmin(decoded.role)) {
            return {
                status: 403,
                jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
            };
        }

        try {
            const pool = await sql.connect(dbConfig);

            if (request.method === 'GET') {
                const year = request.query.get('year');
                const month = request.query.get('month');

                if (!year || !month) {
                    return {
                        status: 400,
                        jsonBody: { error: '年月の指定が必要です', errorCode: 'SHIFT-001' }
                    };
                }

                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const endDateObj = new Date(parseInt(year), parseInt(month), 0);
                const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

                const result = await pool.request()
                    .input('startDate', sql.Date, startDate)
                    .input('endDate', sql.Date, endDate)
                    .query(`
                        SELECT
                            s.*,
                            u.last_name, u.first_name, u.store_id AS user_store_id,
                            st.name AS store_name
                        FROM shifts s
                        JOIN users u ON s.user_id = u.id
                        LEFT JOIN stores st ON s.store_id = st.id
                        WHERE s.date BETWEEN @startDate AND @endDate AND s.is_deleted = 0
                        ORDER BY u.last_name_kana ASC, s.date ASC
                    `);

                return { status: 200, jsonBody: { shifts: result.recordset } };
            }

            if (request.method === 'PUT') {
                const body = await request.json();
                const { id, type, storeId } = body;

                if (!id || !type) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'SHIFT-002' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .input('type', sql.NVarChar, type)
                    .input('storeId', sql.Int, type === 'work' ? storeId : null)
                    .query(`
                        UPDATE shifts
                        SET type = @type, store_id = @storeId
                        WHERE id = @id
                    `);

                await logActivity(pool, decoded.userId, 'shift', 'update', id, { type, storeId });

                return { status: 200, jsonBody: { message: 'シフトを更新しました' } };
            }

            if (request.method === 'DELETE') {
                const body = await request.json();
                const { id } = body;

                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: 'IDが必要です', errorCode: 'SHIFT-004' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .query('UPDATE shifts SET is_deleted = 1 WHERE id = @id');

                await logActivity(pool, decoded.userId, 'shift', 'delete', id, null);

                return { status: 200, jsonBody: { message: 'シフトを削除しました' } };
            }
        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: { error: 'サーバーエラーが発生しました', errorCode: 'SYS-001' }
            };
        }
    }
});