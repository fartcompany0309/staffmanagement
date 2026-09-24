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

app.http('checkoutManage', {
    methods: ['GET', 'DELETE'],
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

            if (request.method === 'GET') {
                const year = request.query.get('year');
                const month = request.query.get('month');

                if (!year || !month) {
                    return {
                        status: 400,
                        jsonBody: { error: '年月の指定が必要です', errorCode: 'CHK-003' }
                    };
                }

                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const endDateObj = new Date(parseInt(year), parseInt(month), 0);
                const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

                const result = await pool.request()
                    .input('startDate', sql.Date, startDate)
                    .input('endDate', sql.Date, endDate)
                    .query(`
                        SELECT
                            cr.id, cr.date, cr.checkout_at,
                            u.last_name, u.first_name
                        FROM checkout_reports cr
                        JOIN users u ON cr.user_id = u.id
                        WHERE cr.date BETWEEN @startDate AND @endDate AND cr.is_deleted = 0
                        ORDER BY cr.date DESC, u.last_name_kana ASC
                    `);

                const reportIds = result.recordset.map((r) => r.id);
                let valuesMap = {};

                if (reportIds.length > 0) {
                    const valuesResult = await pool.request()
                        .query(`
                            SELECT
                                crv.checkout_report_id,
                                ri.name AS itemName,
                                rig.name AS groupName,
                                crv.value
                            FROM checkout_report_values crv
                            JOIN report_items ri ON crv.report_item_id = ri.id
                            JOIN report_item_groups rig ON ri.group_id = rig.id
                            WHERE crv.checkout_report_id IN (${reportIds.join(',')})
                        `);

                    valuesResult.recordset.forEach((v) => {
                        if (!valuesMap[v.checkout_report_id]) valuesMap[v.checkout_report_id] = [];
                        valuesMap[v.checkout_report_id].push(v);
                    });
                }

                const records = result.recordset.map((r) => ({
                    ...r,
                    values: valuesMap[r.id] || [],
                }));

                return { status: 200, jsonBody: { records } };
            }

            if (request.method === 'DELETE') {
                const body = await request.json();
                const { id } = body;

                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: 'IDが必要です', errorCode: 'CHK-004' }
                    };
                }

                await pool.request()
                    .input('id', sql.Int, id)
                    .query('DELETE FROM checkout_report_values WHERE checkout_report_id = @id');

                await pool.request()
                    .input('id', sql.Int, id)
                    .query('UPDATE checkout_reports SET is_deleted = 1 WHERE id = @id');

                await logActivity(pool, decoded.userId, 'checkout', 'delete', id, null);

                return { status: 200, jsonBody: { message: '退勤報告を削除しました' } };
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