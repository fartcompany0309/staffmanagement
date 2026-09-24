const { app } = require('@azure/functions');
const sql = require('mssql');
const bcrypt = require('bcrypt');
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

app.http('myPage', {
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
                const result = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .query(`
                        SELECT
                            u.id, u.last_name, u.first_name, u.last_name_kana, u.first_name_kana,
                            u.code1, u.code2, u.role,
                            c.name AS company_name,
                            s.name AS store_name
                        FROM users u
                        LEFT JOIN companies c ON u.company_id = c.id
                        LEFT JOIN stores s ON u.store_id = s.id
                        WHERE u.id = @userId
                    `);

                return { status: 200, jsonBody: { user: result.recordset[0] } };
            }

            if (request.method === 'PUT') {
                const body = await request.json();
                const { currentPassword, newPassword } = body;

                if (!currentPassword || !newPassword) {
                    return {
                        status: 400,
                        jsonBody: { error: '現在のパスワードと新しいパスワードが必要です', errorCode: 'MYP-001' }
                    };
                }

                const userResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .query('SELECT password_hash FROM users WHERE id = @userId');

                const isValid = await bcrypt.compare(currentPassword, userResult.recordset[0].password_hash);

                if (!isValid) {
                    return {
                        status: 400,
                        jsonBody: { error: '現在のパスワードが正しくありません', errorCode: 'MYP-002' }
                    };
                }

                const newHash = await bcrypt.hash(newPassword, 10);

                await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('newHash', sql.NVarChar, newHash)
                    .query('UPDATE users SET password_hash = @newHash WHERE id = @userId');

                return { status: 200, jsonBody: { message: 'パスワードを変更しました' } };
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