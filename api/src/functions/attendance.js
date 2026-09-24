const { app } = require('@azure/functions');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

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

app.http('attendance', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const decoded = verifyToken(request);
        if (!decoded) {
            return {
                status: 401,
                jsonBody: { error: '認証が必要です', errorCode: 'AUTH-003' }
            };
        }

        try {
            const pool = await sql.connect(dbConfig);
            const today = new Date().toISOString().split('T')[0];

            if (request.method === 'GET') {
                // 今日のシフトと出勤報告状況を取得
                const shiftResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .query('SELECT * FROM shifts WHERE user_id = @userId AND date = @date');

                const attendanceResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .query('SELECT * FROM attendance_reports WHERE user_id = @userId AND date = @date AND is_deleted = 0');

                return {
                    status: 200,
                    jsonBody: {
                        shift: shiftResult.recordset[0] || null,
                        attendance: attendanceResult.recordset[0] || null
                    }
                };
            }

            if (request.method === 'POST') {
                // 出勤報告を登録
                const body = await request.json();
                const { storeId, isLate, lateReason } = body;

                await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .input('storeId', sql.Int, storeId)
                    .input('isLate', sql.Bit, isLate || false)
                    .input('lateReason', sql.NVarChar, lateReason || null)
                    .query(`
                        INSERT INTO attendance_reports (user_id, date, store_id, is_late, late_reason, status)
                        VALUES (@userId, @date, @storeId, @isLate, @lateReason, 'reported')
                    `);

                return {
                    status: 200,
                    jsonBody: { message: '出勤報告を受け付けました' }
                };
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