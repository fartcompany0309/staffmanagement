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

app.http('reportSummary', {
    methods: ['GET'],
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
            const year = request.query.get('year');
            const month = request.query.get('month');

            if (!year || !month) {
                const summaryResult = await pool.request()
                    .input('userId', sql.Int, decoded.userId)
                    .query(`
                        SELECT
                            YEAR(date) AS year,
                            MONTH(date) AS month,
                            COUNT(*) AS reportedDays
                        FROM checkout_reports
                        WHERE user_id = @userId AND is_deleted = 0
                        GROUP BY YEAR(date), MONTH(date)
                        ORDER BY YEAR(date) DESC, MONTH(date) DESC
                    `);

                return { status: 200, jsonBody: { summaries: summaryResult.recordset } };
            }

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
                    SELECT
                        ri.name AS itemName,
                        ri.input_type AS inputType,
                        rig.name AS groupName,
                        SUM(crv.value) AS total
                    FROM checkout_report_values crv
                    JOIN checkout_reports cr ON crv.checkout_report_id = cr.id
                    JOIN report_items ri ON crv.report_item_id = ri.id
                    JOIN report_item_groups rig ON ri.group_id = rig.id
                    WHERE cr.user_id = @userId
                        AND cr.date BETWEEN @startDate AND @endDate
                        AND cr.is_deleted = 0
                    GROUP BY ri.name, ri.input_type, rig.name, rig.display_order, ri.display_order
                    ORDER BY rig.display_order ASC, ri.display_order ASC
                `);

            const dailyResult = await pool.request()
                .input('userId', sql.Int, decoded.userId)
                .input('startDate', sql.Date, startDate)
                .input('endDate', sql.Date, endDate)
                .query(`
                    SELECT
                        cr.date,
                        ri.name AS itemName,
                        rig.name AS groupName,
                        crv.value
                    FROM checkout_report_values crv
                    JOIN checkout_reports cr ON crv.checkout_report_id = cr.id
                    JOIN report_items ri ON crv.report_item_id = ri.id
                    JOIN report_item_groups rig ON ri.group_id = rig.id
                    WHERE cr.user_id = @userId
                        AND cr.date BETWEEN @startDate AND @endDate
                        AND cr.is_deleted = 0
                    ORDER BY cr.date ASC, rig.display_order ASC, ri.display_order ASC
                `);

            return {
                status: 200,
                jsonBody: {
                    monthly: result.recordset,
                    daily: dailyResult.recordset
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