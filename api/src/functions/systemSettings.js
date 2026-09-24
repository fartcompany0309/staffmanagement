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

app.http('systemSettings', {
    methods: ['GET', 'PUT'],
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

            if (request.method === 'GET') {
                // 閲覧は全ロール可能(ダッシュボード側で使うため)
                const key = request.query.get('key');

                if (key) {
                    const result = await pool.request()
                        .input('key', sql.NVarChar, key)
                        .query('SELECT setting_value FROM system_settings WHERE setting_key = @key');

                    return {
                        status: 200,
                        jsonBody: { value: result.recordset[0]?.setting_value || null }
                    };
                }

                const result = await pool.request()
                    .query('SELECT * FROM system_settings');

                return { status: 200, jsonBody: { settings: result.recordset } };
            }

            if (request.method === 'PUT') {
                if (!isAdmin(decoded.role)) {
                    return {
                        status: 403,
                        jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
                    };
                }

                const body = await request.json();
                const { key, value } = body;

                if (!key || value === undefined) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'SET-001' }
                    };
                }

                await pool.request()
                    .input('key', sql.NVarChar, key)
                    .input('value', sql.NVarChar, String(value))
                    .query(`
                        UPDATE system_settings
                        SET setting_value = @value
                        WHERE setting_key = @key
                    `);

                return { status: 200, jsonBody: { message: '設定を更新しました' } };
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