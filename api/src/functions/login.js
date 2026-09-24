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

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { code, password } = body;

            if (!code || !password) {
                return {
                    status: 400,
                    jsonBody: { error: 'コードとパスワードを入力してください', errorCode: 'AUTH-001' }
                };
            }

            const pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('code', sql.NVarChar, code)
                .query('SELECT * FROM users WHERE code1 = @code OR code2 = @code');

            if (result.recordset.length === 0) {
                return {
                    status: 401,
                    jsonBody: { error: 'コードまたはパスワードが正しくありません', errorCode: 'AUTH-002' }
                };
            }

            const user = result.recordset[0];
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                return {
                    status: 401,
                    jsonBody: { error: 'コードまたはパスワードが正しくありません', errorCode: 'AUTH-002' }
                };
            }

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return {
                status: 200,
                jsonBody: {
                    token,
                    user: {
                        id: user.id,
                        lastName: user.last_name,
                        firstName: user.first_name,
                        role: user.role
                    }
                }
            };
        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: { error: 'サーバーエラーが発生しました', errorCode: 'SYS-001' }
            };
        }
    }
});