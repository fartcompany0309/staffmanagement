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

app.http('attendanceManage', {
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
                        jsonBody: { error: '年月の指定が必要です', errorCode: 'ATD-001' }
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
                            ar.*,
                            u.last_name, u.first_name,
                            st.name AS store_name
                        FROM attendance_reports ar
                        JOIN users u ON ar.user_id = u.id
                        LEFT JOIN stores st ON ar.store_id = st.id
                        WHERE ar.date BETWEEN @startDate AND @endDate AND ar.is_deleted = 0
                        ORDER BY ar.date DESC, u.last_name_kana ASC
                    `);

                return { status: 200, jsonBody: { records: result.recordset } };
            }

            if (request.method === 'PUT') {
                const body = await request.json();
                const { id, isLate, lateReason, status } = body;

                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: 'IDが必要です', errorCode: 'ATD-002' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .input('isLate', sql.Bit, isLate || false)
                    .input('lateReason', sql.NVarChar, lateReason || null)
                    .input('status', sql.NVarChar, status || 'reported')
                    .query(`
                        UPDATE attendance_reports
                        SET is_late = @isLate, late_reason = @lateReason, status = @status
                        WHERE id = @id
                    `);

                await logActivity(pool, decoded.userId, 'attendance', 'update', id, { isLate, status });

                return { status: 200, jsonBody: { message: '出勤報告を更新しました' } };
            }

            if (request.method === 'DELETE') {
                const body = await request.json();
                const { id } = body;

                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: 'IDが必要です', errorCode: 'ATD-003' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .query('UPDATE attendance_reports SET is_deleted = 1 WHERE id = @id');

                await logActivity(pool, decoded.userId, 'attendance', 'delete', id, null);

                return { status: 200, jsonBody: { message: '出勤報告を削除しました' } };
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