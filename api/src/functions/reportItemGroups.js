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

app.http('reportItemGroups', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
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
                    .query('SELECT * FROM report_item_groups ORDER BY display_order ASC, id ASC');

                return { status: 200, jsonBody: { groups: result.recordset } };
            }

            if (!isAdmin(decoded.role)) {
                return {
                    status: 403,
                    jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
                };
            }

            if (request.method === 'POST') {
                const body = await request.json();
                const { name } = body;

                if (!name) {
                    return {
                        status: 400,
                        jsonBody: { error: 'グループ名は必須です', errorCode: 'ITEM-001' }
                    };
                }

                await pool.request()
                    .input('name', sql.NVarChar, name)
                    .query('INSERT INTO report_item_groups (name) VALUES (@name)');

                return { status: 200, jsonBody: { message: 'グループを作成しました' } };
            }

            if (request.method === 'PUT') {
                const body = await request.json();
                const { id, displayOrder } = body;

                if (!id || displayOrder === undefined) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'ITEM-001' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .input('displayOrder', sql.Int, displayOrder)
                    .query('UPDATE report_item_groups SET display_order = @displayOrder WHERE id = @id');

                return { status: 200, jsonBody: { message: '並び順を更新しました' } };
            }

            if (request.method === 'DELETE') {
                const body = await request.json();
                const { id } = body;

                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: 'IDが必要です', errorCode: 'ITEM-002' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .query('DELETE FROM report_item_groups WHERE id = @id');

                return { status: 200, jsonBody: { message: 'グループを削除しました' } };
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