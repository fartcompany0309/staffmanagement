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

// 担当範囲の設定自体は super_admin 以上のみ操作可能
function isSuperAdmin(role) {
    return ['super_admin', 'system_admin'].includes(role);
}

app.http('adminScopes', {
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
                // 特定の管理者の担当範囲一覧を取得(自分自身の担当範囲を見る場合はadmin本人でも可)
                const userId = request.query.get('userId');

                if (!userId) {
                    return {
                        status: 400,
                        jsonBody: { error: 'userIdが必要です', errorCode: 'SCOPE-001' }
                    };
                }

                // 自分自身の担当範囲を見る場合以外はsuper_admin以上が必要
                if (parseInt(userId) !== decoded.userId && !isSuperAdmin(decoded.role)) {
                    return {
                        status: 403,
                        jsonBody: { error: '統括管理者権限が必要です', errorCode: 'AUTH-011' }
                    };
                }

                const result = await pool.request()
                    .input('userId', sql.Int, userId)
                    .query(`
                        SELECT
                            s.*,
                            CASE WHEN s.scope_type = 'company' THEN c.name ELSE st.name END AS scope_name
                        FROM admin_scopes s
                        LEFT JOIN companies c ON s.scope_type = 'company' AND s.scope_id = c.id
                        LEFT JOIN stores st ON s.scope_type = 'store' AND s.scope_id = st.id
                        WHERE s.user_id = @userId
                    `);

                return { status: 200, jsonBody: { scopes: result.recordset } };
            }

            if (!isSuperAdmin(decoded.role)) {
                return {
                    status: 403,
                    jsonBody: { error: '統括管理者権限が必要です', errorCode: 'AUTH-011' }
                };
            }

            if (request.method === 'POST') {
                const body = await request.json();
                const { userId, scopeType, scopeId, permissionLevel } = body;

                if (!userId || !scopeType || !scopeId) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'SCOPE-002' }
                    };
                }

                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('scopeType', sql.NVarChar, scopeType)
                    .input('scopeId', sql.Int, scopeId)
                    .input('permissionLevel', sql.NVarChar, permissionLevel || 'view')
                    .query(`
                        INSERT INTO admin_scopes (user_id, scope_type, scope_id, permission_level)
                        VALUES (@userId, @scopeType, @scopeId, @permissionLevel)
                    `);

                return { status: 200, jsonBody: { message: '担当範囲を追加しました' } };
            }

            if (request.method === 'DELETE') {
                const body = await request.json();
                const { id } = body;

                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: 'IDが必要です', errorCode: 'SCOPE-003' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .query('DELETE FROM admin_scopes WHERE id = @id');

                return { status: 200, jsonBody: { message: '担当範囲を削除しました' } };
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