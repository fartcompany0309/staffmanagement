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

app.http('reportAggregate', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const decoded = verifyToken(request);
        if (!decoded || !isAdmin(decoded.role)) {
            return {
                status: 403,
                jsonBody: { error: '管理者権限が必要です', errorCode: 'AUTH-010' }
            };
        }

        try {
            const pool = await sql.connect(dbConfig);
            const year = request.query.get('year');
            const month = request.query.get('month');
            const groupBy = request.query.get('groupBy') || 'user'; // user / store / company

            if (!year || !month) {
                return {
                    status: 400,
                    jsonBody: { error: '年月の指定が必要です', errorCode: 'AGG-001' }
                };
            }

            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDateObj = new Date(parseInt(year), parseInt(month), 0);
            const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

            let groupColumn, groupLabel;
            if (groupBy === 'store') {
                groupColumn = 's.id';
                groupLabel = 's.name';
            } else if (groupBy === 'company') {
                groupColumn = 'c.id';
                groupLabel = 'c.name';
            } else {
                groupColumn = 'u.id';
                groupLabel = "u.last_name + ' ' + u.first_name";
            }

            const result = await pool.request()
                .input('startDate', sql.Date, startDate)
                .input('endDate', sql.Date, endDate)
                .query(`
                    SELECT
                        ${groupColumn} AS groupId,
                        ${groupLabel} AS groupName,
                        ri.name AS itemName,
                        rig.name AS groupItemName,
                        ri.input_type AS inputType,
                        SUM(crv.value) AS total
                    FROM checkout_report_values crv
                    JOIN checkout_reports cr ON crv.checkout_report_id = cr.id
                    JOIN users u ON cr.user_id = u.id
                    LEFT JOIN companies c ON u.company_id = c.id
                    LEFT JOIN stores s ON u.store_id = s.id
                    JOIN report_items ri ON crv.report_item_id = ri.id
                    JOIN report_item_groups rig ON ri.group_id = rig.id
                    WHERE cr.date BETWEEN @startDate AND @endDate AND cr.is_deleted = 0
                    GROUP BY ${groupColumn}, ${groupLabel}, ri.name, rig.name, ri.input_type, rig.display_order, ri.display_order
                    ORDER BY ${groupLabel} ASC, rig.display_order ASC, ri.display_order ASC
                `);

            return { status: 200, jsonBody: { records: result.recordset } };
        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: { error: 'サーバーエラーが発生しました', errorCode: 'SYS-001' }
            };
        }
    }
});