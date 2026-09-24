const { app } = require('@azure/functions');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../../shared/logger');

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

app.http('announcements', {
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
                const userResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .query('SELECT company_id, store_id FROM users WHERE id = @userId');

                const { company_id, store_id } = userResult.recordset[0];

                const result = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('companyId', sql.Int, company_id)
                    .input('storeId', sql.Int, store_id)
                    .query(`
                        SELECT a.*,
                            CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END AS is_read
                        FROM announcements a
                        LEFT JOIN announcement_reads ar
                            ON a.id = ar.announcement_id AND ar.user_id = @userId
                        WHERE
                            a.target_type = 'all'
                            OR (a.target_type = 'company' AND a.target_id = @companyId)
                            OR (a.target_type = 'store' AND a.target_id = @storeId)
                            OR (a.target_type = 'individual' AND a.target_id = @userId)
                        ORDER BY a.created_at DESC
                    `);

                return { status: 200, jsonBody: { announcements: result.recordset } };
            }

            if (request.method === 'POST') {
                if (!isAdmin(decoded.role)) {
                    return {
                        status: 403,
                        jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
                    };
                }

                const body = await request.json();
                const { title, body: content, targetType, targetId } = body;

                if (!title || !content || !targetType) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'NOTI-001' }
                    };
                }

                const insertResult = await pool.request()
                    .input('title', sql.NVarChar, title)
                    .input('body', sql.NVarChar, content)
                    .input('targetType', sql.NVarChar, targetType)
                    .input('targetId', sql.Int, targetType === 'all' ? null : targetId)
                    .input('createdBy', sql.Int, decoded.userId)
                    .query(`
                        INSERT INTO announcements (title, body, target_type, target_id, created_by)
                        OUTPUT INSERTED.id
                        VALUES (@title, @body, @targetType, @targetId, @createdBy)
                    `);

                const newId = insertResult.recordset[0].id;
                await logActivity(pool, decoded.userId, 'announcement', 'create', newId, { title, targetType });

                return { status: 200, jsonBody: { message: 'お知らせを配信しました' } };
            }

            if (request.method === 'PUT') {
                if (!isAdmin(decoded.role)) {
                    return {
                        status: 403,
                        jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
                    };
                }

                const body = await request.json();
                const { id, title, body: content, targetType, targetId } = body;

                if (!id || !title || !content || !targetType) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'NOTI-001' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .input('title', sql.NVarChar, title)
                    .input('body', sql.NVarChar, content)
                    .input('targetType', sql.NVarChar, targetType)
                    .input('targetId', sql.Int, targetType === 'all' ? null : targetId)
                    .query(`
                        UPDATE announcements
                        SET title = @title, body = @body, target_type = @targetType, target_id = @targetId
                        WHERE id = @id
                    `);

                await logActivity(pool, decoded.userId, 'announcement', 'update', id, { title, targetType });

                return { status: 200, jsonBody: { message: 'お知らせを更新しました' } };
            }

            if (request.method === 'DELETE') {
                if (!isAdmin(decoded.role)) {
                    return {
                        status: 403,
                        jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
                    };
                }

                const body = await request.json();
                const { id } = body;

                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: 'IDが必要です', errorCode: 'NOTI-003' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .query('DELETE FROM announcement_reads WHERE announcement_id = @id');

                await pool.request()
                    .input('id', sql.Int, id)
                    .query('DELETE FROM announcements WHERE id = @id');

                await logActivity(pool, decoded.userId, 'announcement', 'delete', id, null);

                return { status: 200, jsonBody: { message: 'お知らせを削除しました' } };
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