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

app.http('activityLogs', {
    methods: ['GET'],
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
            const category = request.query.get('category');

            let query = `
                SELECT
                    al.*,
                    u.last_name, u.first_name
                FROM activity_logs al
                JOIN users u ON al.user_id = u.id
            `;

            const req = pool.request();
            if (category) {
                query += ' WHERE al.category = @category';
                req.input('category', sql.NVarChar, category);
            }
            query += ' ORDER BY al.created_at DESC';

            const result = await req.query(query);

            return { status: 200, jsonBody: { logs: result.recordset } };
        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: { error: 'サーバーエラーが発生しました', errorCode: 'SYS-001' }
            };
        }
    }
});