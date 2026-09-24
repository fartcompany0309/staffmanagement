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

app.http('announcementRead', {
    methods: ['POST'],
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
            const body = await request.json();
            const { announcementId } = body;

            if (!announcementId) {
                return {
                    status: 400,
                    jsonBody: { error: 'announcementIdが必要です', errorCode: 'NOTI-002' }
                };
            }

            // 既に既読でなければ登録
            const existing = await pool.request()
                .input('announcementId', sql.Int, announcementId)
                .input('userId', sql.Int, decoded.userId)
                .query('SELECT * FROM announcement_reads WHERE announcement_id = @announcementId AND user_id = @userId');

            if (existing.recordset.length === 0) {
                await pool.request()
                    .input('announcementId', sql.Int, announcementId)
                    .input('userId', sql.Int, decoded.userId)
                    .query(`
                        INSERT INTO announcement_reads (announcement_id, user_id)
                        VALUES (@announcementId, @userId)
                    `);
            }

            return { status: 200, jsonBody: { message: '既読にしました' } };
        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: { error: 'サーバーエラーが発生しました', errorCode: 'SYS-001' }
            };
        }
    }
});