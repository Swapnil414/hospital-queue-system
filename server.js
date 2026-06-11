require("dotenv").config();
console.log("Server loaded");

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(express.json());
app.use(cors());
const jwt = require("jsonwebtoken");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Not admin" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}


// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const VALID_SLOTS = [
  "9-10","10-11","11-12","12-1",
  "1-2","2-3","3-4","4-5","5-6","6-7",
];

function dateConditionSQL(date, alias = "") {
  const col = alias ? `${alias}.appointment_date` : "appointment_date";
  return date
    ? { clause: `AND ${col} = ?`, params: [date] }
    : { clause: `AND ${col} = CURDATE()`, params: [] };
}

// ─────────────────────────────────────────────
// GET /  — health check
// ─────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ message: "HQMS server is running" });
});

// ─────────────────────────────────────────────
// GET /queue  — active queue (waiting/serving/skipped)
// ─────────────────────────────────────────────

app.get("/queue", verifyAdmin, (req, res) => {
  const { date } = req.query;
  const { clause, params } = dateConditionSQL(date);

  const query = `
    SELECT id, name, age, phone, token_number, booking_type,
           priority, status, queue_order, slot_time, appointment_date, created_at
    FROM patients
    WHERE status IN ('waiting', 'serving', 'skipped')
    ${clause}
    ORDER BY
      FIELD(slot_time, '9-10','10-11','11-12','12-1','1-2','2-3','3-4','4-5','5-6','6-7'),
      queue_order ASC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("GET /queue error:", err);
      return res.status(500).json({ message: "Error fetching queue" });
    }
    res.json(results);
  });
});

// ─────────────────────────────────────────────
// GET /patients  — all patients (optional filters)
// ─────────────────────────────────────────────

app.get("/patients", verifyAdmin,(req, res) => {
  const { date, status } = req.query;
  let query = `
    SELECT id, name, age, phone, token_number, booking_type,
           priority, status, queue_order, slot_time, appointment_date, created_at
    FROM patients
    WHERE 1=1
  `;
  const params = [];

  if (date) {
    query += " AND appointment_date = ?";
    params.push(date);
  }
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  query += " ORDER BY created_at DESC";

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("GET /patients error:", err);
      return res.status(500).json({ message: "Error fetching patients" });
    }
    res.json(results);
  });
});

// ─────────────────────────────────────────────
// GET /slot-counts  — how many patients per slot on a date
// ─────────────────────────────────────────────

app.get("/slot-counts", (req, res) => {
  const { date } = req.query;
  const { clause, params } = dateConditionSQL(date);

  const query = `
    SELECT slot_time, COUNT(*) AS count
    FROM patients
    WHERE 1=1 ${clause}
    GROUP BY slot_time
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("GET /slot-counts error:", err);
      return res.status(500).json({ message: "Error fetching slot counts" });
    }

    const counts = {};
    VALID_SLOTS.forEach((s) => (counts[s] = 0));
    results.forEach((r) => (counts[r.slot_time] = r.count));
    res.json(counts);
  });
});

// ─────────────────────────────────────────────
// POST/login API
// ─────────────────────────────────────────────

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

  res.json({ token });
});

// ─────────────────────────────────────────────
// POST /add  — book a new patient
// ─────────────────────────────────────────────

app.post("/add", (req, res) => {
  const { name, age, problem, phone, booking_type, appointment_date, slot_time } = req.body;

  // Validation
  if (!name || !age || !phone || !appointment_date || !slot_time) {
    return res.status(400).json({ message: "name, age, phone, appointment_date, and slot_time are required" });
  }
  if (!VALID_SLOTS.includes(slot_time)) {
    return res.status(400).json({ message: "Invalid slot_time" });
  }
  if (isNaN(parseInt(age)) || parseInt(age) < 0 || parseInt(age) > 120) {
    return res.status(400).json({ message: "Invalid age" });
  }

  // Get next queue_order for this date+slot, and next token for this date
  const countQuery = `
    SELECT
      (SELECT COUNT(*) FROM patients WHERE appointment_date = ? AND slot_time = ?) AS slot_count,
      (SELECT COUNT(*) FROM patients WHERE appointment_date = ?) AS date_count
  `;

  db.query(countQuery, [appointment_date, slot_time, appointment_date], (err, result) => {
    if (err) {
      console.error("POST /add count error:", err);
      return res.status(500).json({ message: "DB error" });
    }

    const queueOrder = result[0].slot_count + 1;
    const tokenNumber = result[0].date_count + 1;
    const btype = booking_type || "online";

    const insertQuery = `
      INSERT INTO patients
        (name, age, problem, phone, token_number, booking_type, priority, status, queue_order, appointment_date, slot_time)
      VALUES (?, ?, ?, ?, ?, ?, 'normal', 'waiting', ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [name, parseInt(age), problem || "", phone, tokenNumber, btype, queueOrder, appointment_date, slot_time],
      (err, insertResult) => {
        if (err) {
          console.error("POST /add insert error:", err);
          return res.status(500).json({ message: "DB error" });
        }
        res.status(201).json({
          message: "Patient booked",
          id: insertResult.insertId,
          token_number: tokenNumber,
          queue_order: queueOrder,
          slot_time,
          appointment_date,
        });
      }
    );
  });
});

// ─────────────────────────────────────────────
// POST /next  — call the next waiting patient
// ─────────────────────────────────────────────

app.post("/next", verifyAdmin, (req, res) => {
  const { date } = req.query;
  const { clause, params } = dateConditionSQL(date);

  // Priority order: emergency first, then online over walk-in, then slot order, then queue_order
  const getNextQuery = `
    SELECT * FROM patients
    WHERE status = 'waiting'
    ${clause}
    ORDER BY
      priority = 'emergency' DESC,
      booking_type = 'online' DESC,
      FIELD(slot_time, '9-10','10-11','11-12','12-1','1-2','2-3','3-4','4-5','5-6','6-7'),
      queue_order ASC
    LIMIT 1
  `;

  db.query(getNextQuery, params, (err, rows) => {
    if (err) {
      console.error("POST /next select error:", err);
      return res.status(500).json({ message: "DB error" });
    }
    if (!rows.length) {
      return res.status(404).json({ message: "No patients waiting" });
    }

    const next = rows[0];

    db.beginTransaction((err) => {
      if (err) return res.status(500).json({ message: "Transaction error" });

      // Move current serving → waiting
      db.query(
        `UPDATE patients SET status = 'waiting' WHERE status = 'serving' ${clause}`,
        params,
        (err) => {
          if (err) return db.rollback(() => res.status(500).json({ message: "Error clearing serving" }));

          // Set next patient to serving
          db.query(
            `UPDATE patients SET status = 'serving' WHERE id = ?`,
            [next.id],
            (err) => {
              if (err) return db.rollback(() => res.status(500).json({ message: "Error setting serving" }));

              db.commit((err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: "Commit error" }));
                res.json({ message: "Now serving", patient: { ...next, status: "serving" } });
              });
            }
          );
        }
      );
    });
  });
});

// ─────────────────────────────────────────────
// POST /skip  — move patient +1 in queue (swap with next in same slot)
//
// Logic:
//   • Find the patient by id (must be 'waiting' or 'serving')
//   • Find the very next patient in the same slot by queue_order
//   • Swap queue_orders between the two (atomic transaction)
//   • Mark the skipped patient status = 'skipped'
//   • If no one is ahead, just mark as 'skipped' (already last)
//   • No infinite loop possible — 'skipped' patients are excluded from
//     future skip targets since we filter status = 'waiting'
// ─────────────────────────────────────────────

app.post("/skip",verifyAdmin, (req, res) => {
  const { id } = req.body;
  const { date } = req.query;

  if (!id) return res.status(400).json({ message: "id is required" });

  const { clause, params } = dateConditionSQL(date);

  // Fetch the patient to skip
  db.query(
    `SELECT * FROM patients WHERE id = ? AND status IN ('waiting', 'serving')`,
    [id],
    (err, rows) => {
      if (err) {
        console.error("POST /skip fetch error:", err);
        return res.status(500).json({ message: "DB error" });
      }
      if (!rows.length) {
        return res.status(404).json({ message: "Patient not found or not skippable" });
      }

      const patient = rows[0];

      // Find the next patient in the same slot with a higher queue_order
      db.query(
        `SELECT * FROM patients
         WHERE status = 'waiting'
         AND slot_time = ?
         AND queue_order > ?
         AND id != ?
         ${clause}
         ORDER BY queue_order ASC
         LIMIT 1`,
        [patient.slot_time, patient.queue_order, patient.id, ...params],
        (err, nextRows) => {
          if (err) {
            console.error("POST /skip next-find error:", err);
            return res.status(500).json({ message: "DB error" });
          }

          if (!nextRows.length) {
            // Patient is already last in their slot — just mark skipped
            db.query(
              `UPDATE patients SET status = 'skipped' WHERE id = ?`,
              [patient.id],
              (err) => {
                if (err) return res.status(500).json({ message: "DB error" });
                return res.json({
                  message: "Patient was already last in their slot, marked skipped",
                  skipped: patient.name,
                });
              }
            );
            return;
          }

          const nextPatient = nextRows[0];

          // Atomic swap using a transaction + temp negative value to avoid unique constraint collisions
          db.beginTransaction((err) => {
            if (err) return res.status(500).json({ message: "Transaction error" });

            const tempOrder = -(patient.id * 10000); // guaranteed unique negative

            // Step 1: patient → temp
            db.query(`UPDATE patients SET queue_order = ? WHERE id = ?`, [tempOrder, patient.id], (err) => {
              if (err) return db.rollback(() => res.status(500).json({ message: "Swap step 1 error" }));

              // Step 2: next → patient's old order
              db.query(`UPDATE patients SET queue_order = ? WHERE id = ?`, [patient.queue_order, nextPatient.id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: "Swap step 2 error" }));

                // Step 3: patient → next's old order + mark skipped
                db.query(
                  `UPDATE patients SET queue_order = ?, status = 'skipped' WHERE id = ?`,
                  [nextPatient.queue_order, patient.id],
                  (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ message: "Swap step 3 error" }));

                    db.commit((err) => {
                      if (err) return db.rollback(() => res.status(500).json({ message: "Commit error" }));
                      res.json({
                        message: "Patient skipped — moved +1 in queue",
                        skipped: patient.name,
                        moved_up: nextPatient.name,
                      });
                    });
                  }
                );
              });
            });
          });
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
// POST /complete  — mark serving patient as done
// ─────────────────────────────────────────────

app.post("/complete",verifyAdmin, (req, res) => {
  const { id } = req.body;

  if (!id) return res.status(400).json({ message: "id is required" });

  db.query(
    `UPDATE patients SET status = 'completed' WHERE id = ? AND status = 'serving'`,
    [id],
    (err, result) => {
      if (err) {
        console.error("POST /complete error:", err);
        return res.status(500).json({ message: "DB error" });
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: "Patient is not currently being served" });
      }
      res.json({ message: "Patient marked as completed" });
    }
  );
});

// ─────────────────────────────────────────────
// POST /restore  — re-admit a skipped patient back to waiting
// ─────────────────────────────────────────────

app.post("/restore",verifyAdmin, (req, res) => {
  const { id } = req.body;
  const { date } = req.query;

  if (!id) return res.status(400).json({ message: "id is required" });

  const { clause, params } = dateConditionSQL(date);

  // Give them a new queue_order at the end of their slot
  db.query(
    `SELECT MAX(queue_order) AS maxOrder FROM patients WHERE slot_time = (SELECT slot_time FROM patients WHERE id = ?) ${clause}`,
    [id, ...params],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });

      const newOrder = (result[0].maxOrder || 0) + 1;

      db.query(
        `UPDATE patients SET status = 'waiting', queue_order = ? WHERE id = ? AND status = 'skipped'`,
        [newOrder, id],
        (err, updateResult) => {
          if (err) return res.status(500).json({ message: "DB error" });
          if (updateResult.affectedRows === 0) {
            return res.status(400).json({ message: "Patient not found or not skipped" });
          }
          res.json({ message: "Patient restored to queue", queue_order: newOrder });
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`HQMS server running on port ${PORT}`);
});