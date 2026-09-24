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

app.http('reportItems', {
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
                const groupId = request.query.get('groupId');

                let query = `
                    SELECT ri.*, rig.name AS group_name
                    FROM report_items ri
                    JOIN report_item_groups rig ON ri.group_id = rig.id
                    WHERE ri.is_active = 1
                `;

                const req = pool.request();
                if (groupId) {
                    query += ' AND ri.group_id = @groupId';
                    req.input('groupId', sql.Int, groupId);
                }
                query += ' ORDER BY ri.display_order ASC, ri.id ASC';

                const result = await req.query(query);
                return { status: 200, jsonBody: { items: result.recordset } };
            }

            if (!isAdmin(decoded.role)) {
                return {
                    status: 403,
                    jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
                };
            }

            if (request.method === 'POST') {
                const body = await request.json();
                const { groupId, name, inputType, displayOrder } = body;

                if (!groupId || !name || !inputType) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'ITEM-001' }
                    };
                }

                await pool.request()
                    .input('groupId', sql.Int, groupId)
                    .input('name', sql.NVarChar, name)
                    .input('inputType', sql.NVarChar, inputType)
                    .input('displayOrder', sql.Int, displayOrder || 0)
                    .query(`
                        INSERT INTO report_items (group_id, name, input_type, display_order)
                        VALUES (@groupId, @name, @inputType, @displayOrder)
                    `);

                return { status: 200, jsonBody: { message: '項目を作成しました' } };
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
                    .query('UPDATE report_items SET display_order = @displayOrder WHERE id = @id');

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
                    .query('UPDATE report_items SET is_active = 0 WHERE id = @id');

                return { status: 200, jsonBody: { message: '項目を削除しました' } };
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