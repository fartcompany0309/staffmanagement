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

const RESET_TARGETS = {
    attendance: { table: 'attendance_reports', label: '出勤報告' },
    checkout: { table: 'checkout_reports', label: '退勤報告' },
    shifts: { table: 'shifts', label: 'シフト' },
};

app.http('devReset', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const decoded = verifyToken(request);
        if (!decoded || decoded.role !== 'system_admin') {
            return {
                status: 403,
                jsonBody: { error: 'この操作にはシステム管理者権限が必要です', errorCode: 'AUTH-010' }
            };
        }

        try {
            const pool = await sql.connect(dbConfig);

            if (request.method === 'GET') {
                const target = request.query.get('target');

                if (!target) {
                    const items = Object.entries(RESET_TARGETS).map(([key, val]) => ({
                        key,
                        label: val.label,
                    }));
                    return { status: 200, jsonBody: { items } };
                }

                const targetInfo = RESET_TARGETS[target];
                if (!targetInfo) {
                    return {
                        status: 400,
                        jsonBody: { error: '不正なリクエストです', errorCode: 'SYS-003' }
                    };
                }

                const result = await pool.request()
                    .query(`SELECT * FROM ${targetInfo.table} ORDER BY id DESC`);

                return { status: 200, jsonBody: { records: result.recordset } };
            }

            if (request.method === 'DELETE') {
                const body = await request.json();
                const { target, id } = body;
                const targetInfo = RESET_TARGETS[target];

                if (!targetInfo || !id) {
                    return {
                        status: 400,
                        jsonBody: { error: '不正なリクエストです', errorCode: 'SYS-003' }
                    };
                }

                if (target === 'checkout') {
                    await pool.request()
                        .input('id', sql.Int, id)
                        .query('DELETE FROM checkout_report_values WHERE checkout_report_id = @id');
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .query(`DELETE FROM ${targetInfo.table} WHERE id = @id`);

                return {
                    status: 200,
                    jsonBody: { message: `${targetInfo.label}(ID: ${id})を削除しました` }
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