import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const SLOTS = ["9-10","10-11","11-12","12-1","1-2","2-3","3-4","4-5","5-6","6-7"];

export default function Patient() {
  // Form fields
  const [name, setName]       = useState("");
  const [age, setAge]         = useState("");
  const [phone, setPhone]     = useState("");
  const [problem, setProblem] = useState("");
  const [date, setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [slot, setSlot]       = useState("");

  // UI state
  const [slotCounts, setSlotCounts] = useState({});
  const [message, setMessage]       = useState("");
  const [ticket, setTicket]         = useState(null);
  const [loading, setLoading]       = useState(false);

  // Fetch how many patients are in each slot whenever date changes
  useEffect(() => {
    fetch(`${API}/slot-counts?date=${date}`)
      .then((res) => res.json())
      .then((data) => setSlotCounts(data))
      .catch(() => {});
    setSlot(""); // reset slot when date changes
  }, [date]);

  async function handleBook() {
    // Basic validation
    if (!name || !age || !phone || !problem || !date || !slot) {
      setMessage("Please fill in all fields and pick a slot.");
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch(`${API}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, age: parseInt(age), phone, problem,
        booking_type: "online", appointment_date: date, slot_time: slot,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.message || "Booking failed.");
      return;
    }

    setTicket({ ...data, name, date });
  }

  function handleReset() {
    setTicket(null);
    setName(""); setAge(""); setPhone(""); setProblem("");
    setDate(new Date().toISOString().split("T")[0]);
    setSlot(""); setMessage("");
  }

  // ── Ticket screen ──────────────────────────────
  if (ticket) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.ticket}>
            <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>YOUR TOKEN</p>
            <h1 style={{ margin: "8px 0", fontSize: 64 }}>{ticket.token_number}</h1>
            <hr style={styles.dashed} />
            <p><b>Name:</b> {ticket.name}</p>
            <p><b>Date:</b> {ticket.date}</p>
            <p><b>Slot:</b> {ticket.slot_time}</p>
            <p><b>Queue position:</b> #{ticket.queue_order} in slot</p>
          </div>
          <button style={styles.btn} onClick={handleReset}>Book another</button>
        </div>
      </div>
    );
  }

  // ── Booking form ───────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.heading}>⚕ Book Appointment</h2>

        {message && <p style={styles.error}>{message}</p>}

        <label style={styles.label}>Name</label>
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient name" />

        <label style={styles.label}>Age</label>
        <input style={styles.input} type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" />

        <label style={styles.label}>Phone</label>
        <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />

        <label style={styles.label}>Problem</label>
        <textarea style={{ ...styles.input, height: 70, resize: "vertical" }} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Describe the problem" />

        <label style={styles.label}>Date</label>
        <input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <label style={styles.label}>Time Slot</label>
        <div style={styles.slotGrid}>
          {SLOTS.map((s) => {
            const count = slotCounts[s] || 0;
            const full  = count >= 20;
            return (
              <button
                key={s}
                disabled={full}
                onClick={() => setSlot(s)}
                style={{
                  ...styles.slotBtn,
                  background: slot === s ? "#085041" : full ? "#eee" : "#fff",
                  color:      slot === s ? "#fff"    : full ? "#aaa" : "#333",
                  cursor:     full ? "not-allowed" : "pointer",
                }}
              >
                {s}<br />
                <small>{count}/20</small>
              </button>
            );
          })}
        </div>

        <button style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} onClick={handleBook} disabled={loading}>
          {loading ? "Booking…" : "Confirm Booking →"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page:     { minHeight: "100vh", background: "#f5f5f2", display: "flex", justifyContent: "center", padding: "30px 16px", fontFamily: "Georgia, serif" },
  card:     { background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 480, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", alignSelf: "flex-start" },
  heading:  { margin: "0 0 20px", color: "#085041", fontWeight: "normal", fontSize: 20 },
  label:    { display: "block", fontSize: 12, color: "#888", marginBottom: 4, marginTop: 12 },
  input:    { width: "100%", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  slotGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, margin: "8px 0 16px" },
  slotBtn:  { border: "1px solid #ddd", borderRadius: 6, padding: "6px 4px", fontSize: 11, fontFamily: "inherit", textAlign: "center" },
  btn:      { marginTop: 16, width: "100%", background: "#085041", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  error:    { background: "#fce8e8", color: "#b00", borderRadius: 6, padding: "8px 12px", fontSize: 13 },
  ticket:   { background: "#085041", color: "#fff", borderRadius: 10, padding: "24px", textAlign: "center", marginBottom: 20 },
  dashed:   { border: "none", borderTop: "1px dashed rgba(255,255,255,0.3)", margin: "12px 0" },
};