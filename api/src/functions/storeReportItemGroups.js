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

app.http('storeReportItemGroups', {
    methods: ['GET', 'POST', 'DELETE'],
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
                // storeIdを指定すると、その店舗に紐づくグループ一覧を取得
                const storeId = request.query.get('storeId');

                if (!storeId) {
                    return {
                        status: 400,
                        jsonBody: { error: 'storeIdが必要です', errorCode: 'ITEM-003' }
                    };
                }

                const result = await pool.request()
                    .input('storeId', sql.Int, storeId)
                    .query(`
                        SELECT srig.id, srig.group_id, rig.name AS group_name
                        FROM store_report_item_groups srig
                        JOIN report_item_groups rig ON srig.group_id = rig.id
                        WHERE srig.store_id = @storeId
                    `);

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
                const { storeId, groupId } = body;

                if (!storeId || !groupId) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'ITEM-001' }
                    };
                }

                await pool.request()
                    .input('storeId', sql.Int, storeId)
                    .input('groupId', sql.Int, groupId)
                    .query(`
                        INSERT INTO store_report_item_groups (store_id, group_id)
                        VALUES (@storeId, @groupId)
                    `);

                return { status: 200, jsonBody: { message: '割り当てました' } };
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
                    .query('DELETE FROM store_report_item_groups WHERE id = @id');

                return { status: 200, jsonBody: { message: '割り当てを解除しました' } };
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