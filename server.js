console.log("Server Loaded")
const express = require('express');
const db = require('./db');


const app = express();
app.use(express.json());

app.get('/',(req,res)=>{
    res.send("server is running");
})


app.get('/queue', (req, res) => {
    console.log("queue API HIT!");

    const date = req.query.date;

    let query = `
        SELECT name, token_number, booking_type, priority, status, queue_order
        FROM patients
        WHERE status = 'waiting'
    `;

    let params = [];

    if (date) {
        query += ` AND appointment_date = ?`;
        params.push(date);
    } else {
        query += ` AND appointment_date = CURDATE()`;
    }

    query += `
        ORDER BY 
            priority = 'emergency' DESC,
            booking_type DESC,
            queue_order ASC
    `;

    db.query(query, params, (err, result) => {
        if (err) {
            console.log("DB ERROR:", err);
            return res.status(500).json({ message: "Error fetching queue" });
        }
        res.json(result);
    });
});

app.get('/patients', (req, res) => {
    console.log("Patients API HIT!");

    const { date, status } = req.query;

    let query = `SELECT * FROM patients WHERE 1=1`;
    let params = [];

    if (date) {
        query += ` AND appointment_date = ?`;
        params.push(date);
    }

    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    db.query(query, params, (err, result) => {
        if (err) {
            return res.status(500).json({ message: "DB error" });
        }
        res.json(result);
    });
});

app.post('/next', (req, res) => {
    console.log("next api hit");

    const date = req.query.date;

    let params = [];
    let dateCondition = '';

    if (date) {
        dateCondition = 'AND appointment_date = ?';
        params.push(date);
    } else {
        dateCondition = 'AND appointment_date = CURDATE()';
    }

    // Step 1: get next patient
    const getNextQuery = `
        SELECT * FROM patients
        WHERE status = 'waiting'
        ${dateCondition}
        ORDER BY 
            priority = 'emergency' DESC,
            booking_type DESC,
            queue_order ASC
        LIMIT 1
    `;

    db.query(getNextQuery, params, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: "DB error" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "No patients in queue" });
        }

        const patient = result[0];

        // Step 2: clear existing 'serving' for that day
        const clearServingQuery = `
            UPDATE patients
            SET status = 'waiting'
            WHERE status = 'serving'
            ${dateCondition}
        `;

        db.query(clearServingQuery, params, (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Error clearing serving" });
            }

            // Step 3: set new patient as serving
            const updateQuery = `
                UPDATE patients
                SET status = 'serving'
                WHERE id = ?
            `;

            db.query(updateQuery, [patient.id], (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ message: "Error updating patient" });
                }

                res.status(200).json({
                    message: "Now Serving",
                    patient: {
                        ...patient,
                        status: "serving"
                    }
                });
            });
        });
    });
});

app.post('/add', (req, res) => {
    const { name, age, problem, phone, booking_type, appointment_date } = req.body;

   
    if (!appointment_date) {
        return res.send("appointment_date required");
    }

    // Step 1: get max queue_order for THAT DAY
    const getMaxQuery = `
        SELECT MAX(queue_order) AS maxOrder 
        FROM patients 
        WHERE appointment_date = ?
    `;

    db.query(getMaxQuery, [appointment_date], (err, result) => {
        if (err) return res.send(err);

        const nextOrder = (result[0].maxOrder || 0) + 1;

        // Step 2: insert patient
        const insertQuery = `
            INSERT INTO patients 
            (name, age, problem, phone, token_number, booking_type, queue_order, appointment_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            insertQuery,
            [name, age, problem, phone, nextOrder, booking_type, nextOrder, appointment_date],
            (err) => {
                if (err) return res.send(err);

                res.json({
                    message: "Patient added",
                    queue_order: nextOrder
                });
            }
        );
    });
});

app.post('/skip', (req, res) => {
    console.log("SKIP API HIT 🔥");

    const date = req.query.date;

    let params = [];
    let dateCondition = '';

    if (date) {
        dateCondition = 'AND appointment_date = ?';
        params.push(date);
    } else {
        dateCondition = 'AND appointment_date = CURDATE()';
    }

    // Step 1: get top waiting patient
    const topQ = `
        SELECT * FROM patients
        WHERE status = 'waiting'
        ${dateCondition}
        ORDER BY 
            priority = 'emergency' DESC,
            booking_type DESC,
            queue_order ASC
        LIMIT 1
    `;

    db.query(topQ, params, (err, rows) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: "DB error" });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "No patients to skip" });
        }

        const p = rows[0];

        // Step 2: get max queue_order for that day
        const maxQ = `
            SELECT MAX(queue_order) AS max
            FROM patients
            WHERE status = 'waiting'
            ${dateCondition}
        `;

        db.query(maxQ, params, (err, m) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "DB error" });
            }

            const newOrder = (m[0].max || 0) + 1;

            // Step 3: move patient to end
            const upd = `
                UPDATE patients
                SET queue_order = ?
                WHERE id = ? AND status = 'waiting'
            `;

            db.query(upd, [newOrder, p.id], (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ message: "Update failed" });
                }

                res.status(200).json({
                    message: "Patient moved to end",
                    skipped: p.name
                });
            });
        });
    });
});

app.post('/complete',(req,res)=>{
    console.log("Complete API HIT!");

    const{id} = req.body;

    const query = `UPDATE patients
    SET STATUS = 'completed'
    WHERE id = ? AND status = 'serving'
    `
    db.query(query,[id],(err,result)=>{
        if(err){
            return res.send(err);
        }
        res.json({
            message: "Patient marked as completed"
        });
    });
});

app.listen(8000,()=>{
    console.log("server is running on port 8000");
}) 