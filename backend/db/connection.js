const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host:              process.env.DB_HOST,
            port:              parseInt(process.env.DB_PORT, 10) || 3306,
            user:              process.env.DB_USER,
            password:          process.env.DB_PASSWORD,
            database:          process.env.DB_DATABASE,
            charset:           'utf8mb4',
            waitForConnections: true,
            connectionLimit:   10,
            queueLimit:        0,
            // Keep idle connections alive
            enableKeepAlive:   true,
            keepAliveInitialDelay: 10000
        });
    }
    return pool;
}

/**
 * Named-parameter query - keeps backward compatibility with all routes.
 * SQL uses @paramName style; values are substituted in positional order.
 *
 * Examples:
 *   query('SELECT * FROM Users WHERE Uid = @uid', { uid: '...' })
 *   query('INSERT INTO Users (Uid, Username) VALUES (@uid, @username)', { uid, username })
 */
async function query(sqlQuery, params = {}) {
    const values = [];
    const sql = sqlQuery.replace(/@(\w+)/g, (_, name) => {
        values.push(params[name] !== undefined ? params[name] : null);
        return '?';
    });

    const p = getPool();
    const [rows] = await p.execute(sql, values);
    // rows is an array for SELECT; ResultSetHeader for INSERT/UPDATE/DELETE
    if (Array.isArray(rows)) {
        return { recordset: rows };
    }
    return { recordset: [], affectedRows: rows.affectedRows ?? 0 };
}

async function close() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

module.exports = { getPool, query, close };
