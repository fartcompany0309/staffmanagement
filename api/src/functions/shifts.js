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

app.http('shifts', {
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
    const year = request.query.get('year');
    const month = request.query.get('month');

    if (!year || !month) {
        // 月ごとのサマリー一覧を返す
        const summaryResult = await pool.request()
            .input('userId', sql.Int, decoded.userId)
            .query(`
                SELECT
                    YEAR(date) AS year,
                    MONTH(date) AS month,
                    COUNT(*) AS reportedDays,
                    MAX(created_at) AS lastUpdated
                FROM shifts
                WHERE user_id = @userId AND is_deleted = 0
                GROUP BY YEAR(date), MONTH(date)
                ORDER BY YEAR(date) DESC, MONTH(date) DESC
            `);

        return {
            status: 200,
            jsonBody: { summaries: summaryResult.recordset }
        };
    }

    // 特定の年月のシフト詳細を取得
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDateObj = new Date(yearNum, monthNum, 0);
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

    const result = await pool.request()
        .input('userId', sql.Int, decoded.userId)
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .query(`
            SELECT * FROM shifts
            WHERE user_id = @userId AND date BETWEEN @startDate AND @endDate AND is_deleted = 0
            ORDER BY date ASC
        `);

    return {
        status: 200,
        jsonBody: { shifts: result.recordset }
    };
}

            if (request.method === 'POST') {
                // 1日分のシフトを登録・更新
                const body = await request.json();
                const { date, type, storeId } = body;

                if (!date || !type) {
                    return {
                        status: 400,
                        jsonBody: { error: '日付と区分は必須です', errorCode: 'SHIFT-002' }
                    };
                }

                // 当日より前の日付は一般スタッフでは編集不可
                const today = new Date().toISOString().split('T')[0];
                if (date < today && decoded.role === 'staff') {
                    return {
                        status: 403,
                        jsonBody: { error: '過去の日付のシフトは編集できません', errorCode: 'SHIFT-003' }
                    };
                }

                // 既に同じ日のシフトがあるか確認
                const existing = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, date)
                    .query('SELECT * FROM shifts WHERE user_id = @userId AND date = @date');

                if (existing.recordset.length > 0) {
                    // 更新
                    await pool.request()
                        .input('userId', sql.Int, decoded.userId)
                        .input('date', sql.Date, date)
                        .input('type', sql.NVarChar, type)
                        .input('storeId', sql.Int, type === 'work' ? storeId : null)
                        .query(`
                            UPDATE shifts
                            SET type = @type, store_id = @storeId
                            WHERE user_id = @userId AND date = @date
                        `);
                } else {
                    // 新規登録
                    await pool.request()
                        .input('userId', sql.Int, decoded.userId)
                        .input('date', sql.Date, date)
                        .input('type', sql.NVarChar, type)
                        .input('storeId', sql.Int, type === 'work' ? storeId : null)
                        .query(`
                            INSERT INTO shifts (user_id, date, type, store_id)
                            VALUES (@userId, @date, @type, @storeId)
                        `);
                }

                return {
                    status: 200,
                    jsonBody: { message: 'シフトを保存しました' }
                };
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