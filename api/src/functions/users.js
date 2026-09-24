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

function isAdmin(role) {
    return ['admin', 'super_admin', 'system_admin'].includes(role);
}

app.http('users', {
    methods: ['GET'],
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

            const result = await pool.request()
                .query(`
                    SELECT
                        u.id, u.last_name, u.first_name, u.role,
                        c.name AS company_name,
                        s.name AS store_name
                    FROM users u
                    LEFT JOIN companies c ON u.company_id = c.id
                    LEFT JOIN stores s ON u.store_id = s.id
                    WHERE u.is_test_account = 0
                    ORDER BY u.last_name_kana ASC
                `);

            return { status: 200, jsonBody: { users: result.recordset } };
        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: { error: 'サーバーエラーが発生しました', errorCode: 'SYS-001' }
            };
        }
    }
});