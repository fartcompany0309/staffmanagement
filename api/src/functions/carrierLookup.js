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

app.http('carrierLookup', {
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
                // 6桁の番号で検索(prefixとして完全一致)
                const prefix = request.query.get('prefix');

                if (!prefix || prefix.length !== 6) {
                    return {
                        status: 400,
                        jsonBody: { error: '6桁の番号を入力してください', errorCode: 'CARR-001' }
                    };
                }

                const result = await pool.request()
                    .input('prefix', sql.NVarChar, prefix)
                    .query('SELECT TOP 1 * FROM carrier_number_ranges WHERE prefix = @prefix');

                if (result.recordset.length === 0) {
                    return {
                        status: 404,
                        jsonBody: { error: '該当する発番元が見つかりませんでした', errorCode: 'CARR-002' }
                    };
                }

                return { status: 200, jsonBody: { result: result.recordset[0] } };
            }

            if (request.method === 'POST') {
                if (!isAdmin(decoded.role)) {
                    return {
                        status: 403,
                        jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
                    };
                }

                const body = await request.json();
                const { sourceFile, dataDate, records, isFirstBatch } = body;

                if (!sourceFile || !dataDate || !Array.isArray(records)) {
                    return {
                        status: 400,
                        jsonBody: { error: '必須項目が不足しています', errorCode: 'CARR-003' }
                    };
                }

                // 最初のバッチの時だけ、既存データを削除
                if (isFirstBatch) {
                    await pool.request()
                        .input('sourceFile', sql.NVarChar, sourceFile)
                        .query('DELETE FROM carrier_number_ranges WHERE source_file = @sourceFile');
                }

                for (const r of records) {
                    await pool.request()
                        .input('prefix', sql.NVarChar, r.prefix)
                        .input('carrierName', sql.NVarChar, r.carrierName)
                        .input('sourceFile', sql.NVarChar, sourceFile)
                        .input('dataDate', sql.Date, dataDate)
                        .query(`
                            INSERT INTO carrier_number_ranges (prefix, carrier_name, source_file, data_date)
                            VALUES (@prefix, @carrierName, @sourceFile, @dataDate)
                        `);
                }

                return { status: 200, jsonBody: { message: `${records.length}件を登録しました` } };
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