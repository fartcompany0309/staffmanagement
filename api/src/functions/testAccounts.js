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

app.http('testAccounts', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const decoded = verifyToken(request);
        if (!decoded || decoded.role !== 'system_admin') {
            return {
                status: 403,
                jsonBody: { error: 'この操作にはシステム管理者権限が必要です', errorCode: 'AUTH-010' }
            };
        }

        try {
            const pool = await sql.connect(dbConfig);

            if (request.method === 'GET') {
                const result = await pool.request()
                    .query(`
                        SELECT id, last_name, first_name, code1, code2, role
                        FROM users
                        WHERE is_test_account = 1
                        ORDER BY id DESC
                    `);

                return { status: 200, jsonBody: { accounts: result.recordset } };
            }

            if (request.method === 'POST') {
                const body = await request.json();
                const { lastName, firstName, code1, password, role } = body;

                if (!lastName || !firstName || !code1 || !password || !role) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'TEST-001' }
                    };
                }

                const passwordHash = await bcrypt.hash(password, 10);

                await pool.request()
                    .input('lastName', sql.NVarChar, lastName)
                    .input('firstName', sql.NVarChar, firstName)
                    .input('lastNameKana', sql.NVarChar, 'ケンショウ')
                    .input('firstNameKana', sql.NVarChar, 'ヨウ')
                    .input('code1', sql.NVarChar, code1)
                    .input('passwordHash', sql.NVarChar, passwordHash)
                    .input('role', sql.NVarChar, role)
                    .query(`
                        INSERT INTO users (last_name, first_name, last_name_kana, first_name_kana, code1, password_hash, role, is_test_account)
                        VALUES (@lastName, @firstName, @lastNameKana, @firstNameKana, @code1, @passwordHash, @role, 1)
                    `);

                return { status: 200, jsonBody: { message: '検証用アカウントを作成しました' } };
            }

            if (request.method === 'DELETE') {
                const body = await request.json();
                const { id } = body;

                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: 'IDが必要です', errorCode: 'TEST-002' }
                    };
                }

                // 念のため、is_test_account = 1のものだけ削除できるようにする(誤って本番アカウントを消さないため)
                await pool.request()
                    .input('id', sql.Int, id)
                    .query('DELETE FROM users WHERE id = @id AND is_test_account = 1');

                return { status: 200, jsonBody: { message: '検証用アカウントを削除しました' } };
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