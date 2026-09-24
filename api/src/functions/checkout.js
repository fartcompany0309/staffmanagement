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

app.http('checkout', {
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
            const today = new Date().toISOString().split('T')[0];

            if (request.method === 'GET') {
                const shiftResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .query('SELECT * FROM shifts WHERE user_id = @userId AND date = @date');

                const attendanceResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .query('SELECT * FROM attendance_reports WHERE user_id = @userId AND date = @date AND is_deleted = 0');

                const checkoutResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .query('SELECT * FROM checkout_reports WHERE user_id = @userId AND date = @date AND is_deleted = 0');

                // ユーザーの配属店舗に割り当てられた実績項目を取得
                const userResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .query('SELECT store_id FROM users WHERE id = @userId');

                const userStoreId = userResult.recordset[0]?.store_id;
                let reportItems = [];

                if (userStoreId) {
                    const itemsResult = await pool.request()
                     .input('storeId', sql.Int, userStoreId)
                    .query(`
                    SELECT ri.*, rig.name AS group_name, rig.display_order AS group_display_order
                        FROM report_items ri
                        JOIN report_item_groups rig ON ri.group_id = rig.id
                        JOIN store_report_item_groups srig ON ri.group_id = srig.group_id
                        WHERE srig.store_id = @storeId AND ri.is_active = 1
                        ORDER BY rig.display_order ASC, ri.display_order ASC
                    `);
                    reportItems = itemsResult.recordset;
                }

                return {
                    status: 200,
                    jsonBody: {
                        shift: shiftResult.recordset[0] || null,
                        attendance: attendanceResult.recordset[0] || null,
                        checkout: checkoutResult.recordset[0] || null,
                        reportItems
                    }
                };
            }

            if (request.method === 'POST') {
                const attendanceCheck = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .query('SELECT * FROM attendance_reports WHERE user_id = @userId AND date = @date AND is_deleted = 0');

                if (attendanceCheck.recordset.length === 0) {
                    return {
                        status: 400,
                        jsonBody: { error: '出勤報告がまだ行われていません', errorCode: 'CHK-001' }
                    };
                }

                const checkoutCheck = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .query('SELECT * FROM checkout_reports WHERE user_id = @userId AND date = @date AND is_deleted = 0');

                if (checkoutCheck.recordset.length > 0) {
                    return {
                        status: 400,
                        jsonBody: { error: '本日はすでに退勤報告済みです', errorCode: 'CHK-002' }
                    };
                }

                const body = await request.json();
                const values = body.values || [];

                const insertResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .input('date', sql.Date, today)
                    .query(`
                        INSERT INTO checkout_reports (user_id, date)
                        OUTPUT INSERTED.id
                        VALUES (@userId, @date)
                    `);

                const checkoutReportId = insertResult.recordset[0].id;

                for (const v of values) {
                    if (v.value === '' || v.value === null || v.value === undefined) continue;
                    await pool.request()
                        .input('checkoutReportId', sql.Int, checkoutReportId)
                        .input('reportItemId', sql.Int, v.reportItemId)
                        .input('value', sql.Decimal(12, 2), v.value)
                        .query(`
                            INSERT INTO checkout_report_values (checkout_report_id, report_item_id, value)
                            VALUES (@checkoutReportId, @reportItemId, @value)
                        `);
                }

                return {
                    status: 200,
                    jsonBody: { message: '退勤報告を受け付けました' }
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