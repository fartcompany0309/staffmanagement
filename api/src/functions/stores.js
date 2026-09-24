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

app.http('stores', {
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

            if (request.method === 'GET') {
                const result = await pool.request()
                    .query('SELECT * FROM stores ORDER BY name_kana ASC');

                return { status: 200, jsonBody: { stores: result.recordset } };
            }

            if (!isAdmin(decoded.role)) {
                return {
                    status: 403,
                    jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
                };
            }

            if (request.method === 'POST') {
                const body = await request.json();
                const { name, nameKana } = body;

                if (!name || !nameKana) {
                    return {
                        status: 400,
                        jsonBody: { error: '店舗名・フリガナは必須です', errorCode: 'ITEM-001' }
                    };
                }

                await pool.request()
                    .input('name', sql.NVarChar, name)
                    .input('nameKana', sql.NVarChar, nameKana)
                    .query('INSERT INTO stores (name, name_kana) VALUES (@name, @nameKana)');

                return { status: 200, jsonBody: { message: '店舗を作成しました' } };
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