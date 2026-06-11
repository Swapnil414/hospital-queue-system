import { useState, useEffect } from "react";

const API = process.env.REACT_APP_API_URL;

const styles = `
* { box-sizing: border-box; }
.hqms-page { font-family: sans-serif; font-size: 14px; background: #f5f5f3; min-height: 100vh; }
.hqms-header { background: #085041; color: #fff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 500; }
.hqms-logout { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.hqms-logout:hover { background: rgba(255,255,255,0.25); }
.hqms-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.hqms-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.hqms-controls input[type=date] { font-size: 13px; padding: 6px 10px; border: 1px solid #d0cfc7; border-radius: 6px; background: #fff; color: #1a1a1a; }
.hqms-btn { padding: 6px 14px; border: 1px solid #d0cfc7; border-radius: 6px; background: #fff; color: #1a1a1a; cursor: pointer; font-size: 13px; }
.hqms-btn:hover { background: #f0efea; }
.hqms-btn.active { background: #085041; color: #fff; border-color: #085041; }
.hqms-btn.primary { background: #085041; color: #fff; border-color: #085041; }
.hqms-btn.primary:hover { background: #0f6e56; }
.hqms-spacer { flex: 1; }
.hqms-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.hqms-stat-card { background: #eae9e4; border-radius: 8px; padding: 12px 16px; }
.hqms-stat-label { font-size: 12px; color: #6b6b67; margin-bottom: 4px; }
.hqms-stat-value { font-size: 22px; font-weight: 500; }
.hqms-table-wrap { background: #fff; border: 1px solid #e5e4de; border-radius: 10px; overflow: hidden; }
.hqms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.hqms-table thead { background: #f5f5f3; }
.hqms-table th { padding: 10px 14px; text-align: left; font-weight: 500; color: #6b6b67; border-bottom: 1px solid #e5e4de; }
.hqms-table td { padding: 10px 14px; border-bottom: 1px solid #e5e4de; color: #1a1a1a; }
.hqms-table tr:last-child td { border-bottom: none; }
.hqms-table tbody tr:hover td { background: #f9f8f5; }
.hqms-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
.hqms-badge-waiting { background: #faeeda; color: #854f0b; }
.hqms-badge-serving { background: #e1f5ee; color: #085041; }
.hqms-badge-skipped { background: #fcebeb; color: #a32d2d; }
.hqms-badge-completed { background: #eaf3de; color: #3b6d11; }
.hqms-action-btn { padding: 3px 10px; border-radius: 6px; border: 1px solid #d0cfc7; background: #fff; color: #1a1a1a; cursor: pointer; font-size: 12px; }
.hqms-action-btn:hover { background: #f0efea; }
.hqms-toast { background: #085041; color: #fff; padding: 10px 16px; border-radius: 8px; font-size: 13px; }
.hqms-token { font-family: monospace; color: #6b6b67; font-size: 12px; }
.hqms-empty { color: #6b6b67; text-align: center; padding: 24px; }
.hqms-login-wrap { display: flex; justify-content: center; padding: 60px 20px; background: #f5f5f3; min-height: 100vh; }
.hqms-login-card { background: #fff; border: 1px solid #e5e4de; border-radius: 10px; padding: 32px; width: 320px; display: flex; flex-direction: column; gap: 14px; align-self: flex-start; margin-top: 40px; }
.hqms-login-title { font-size: 18px; font-weight: 500; margin-bottom: 4px; }
.hqms-login-label { font-size: 13px; color: #6b6b67; margin-bottom: 4px; display: block; }
.hqms-login-input { width: 100%; padding: 8px 10px; border: 1px solid #d0cfc7; border-radius: 6px; background: #fff; color: #1a1a1a; font-size: 14px; }
`;

function StatusBadge({ status }) {
  return <span className={`hqms-badge hqms-badge-${status}`}>{status}</span>;
}

export default function Admin() {
  const [patients, setPatients] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [tab, setTab] = useState("queue");
  const [toast, setToast] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (token) fetchData();
  }, [tab, date, token]);

  async function fetchData() {
    const endpoint = tab === "queue" ? "queue" : "patients";
    const res = await fetch(`${API}/${endpoint}?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      setToken("");
      return;
    }
    setPatients(await res.json());
  }

  async function handleLogin() {
    const res = await fetch(`${API}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } else {
      alert(data.message);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleNext() {
    const res = await fetch(`${API}/next?date=${date}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    showToast(res.ok ? `Now serving: ${data.patient.name}` : data.message);
    fetchData();
  }

  async function handleSkip(id) {
    const res = await fetch(`${API}/skip?date=${date}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    showToast((await res.json()).message);
    fetchData();
  }

  async function handleComplete(id) {
    const res = await fetch(`${API}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    showToast((await res.json()).message);
    fetchData();
  }

  async function handleRestore(id) {
    const res = await fetch(`${API}/restore?date=${date}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    showToast((await res.json()).message);
    fetchData();
  }

  const serving = patients.find((p) => p.status === "serving");
  const waiting = patients.filter((p) => p.status === "waiting").length;
  const skipped = patients.filter((p) => p.status === "skipped").length;
  const completed = patients.filter((p) => p.status === "completed").length;

  if (!token) {
    return (
      <>
        <style>{styles}</style>
        <div className="hqms-login-wrap">
          <div className="hqms-login-card">
            <div className="hqms-login-title">HQMS Admin</div>
            <div>
              <label className="hqms-login-label">Username</label>
              <input className="hqms-login-input" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="hqms-login-label">Password</label>
              <input className="hqms-login-input" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="hqms-btn primary" style={{ marginTop: 4 }} onClick={handleLogin}>Sign in</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="hqms-page">
        <div className="hqms-header">
          <span>HQMS Admin</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13, opacity: 0.75 }}>{date}</span>
            <button className="hqms-logout" onClick={() => { localStorage.removeItem("token"); setToken(""); }}>Logout</button>
          </div>
        </div>

        <div className="hqms-body">
          {toast && <div className="hqms-toast">{toast}</div>}

          <div className="hqms-controls">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className={`hqms-btn ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>Queue</button>
            <button className={`hqms-btn ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All patients</button>
            <div className="hqms-spacer" />
            <button className="hqms-btn" onClick={fetchData}>Refresh</button>
            {tab === "queue" && <button className="hqms-btn primary" onClick={handleNext}>Next patient</button>}
          </div>

          {tab === "queue" && (
            <div className="hqms-stats">
              <div className="hqms-stat-card"><div className="hqms-stat-label">Waiting</div><div className="hqms-stat-value">{waiting}</div></div>
              <div className="hqms-stat-card"><div className="hqms-stat-label">Serving</div><div className="hqms-stat-value">{serving ? 1 : 0}</div></div>
              <div className="hqms-stat-card"><div className="hqms-stat-label">Skipped</div><div className="hqms-stat-value">{skipped}</div></div>
              <div className="hqms-stat-card"><div className="hqms-stat-label">Completed</div><div className="hqms-stat-value">{completed}</div></div>
            </div>
          )}

          <div className="hqms-table-wrap">
            <table className="hqms-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Name</th>
                  <th>Slot</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan={6} className="hqms-empty">No patients found</td></tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id}>
                      <td><span className="hqms-token">#{p.token_number}</span></td>
                      <td>{p.name}</td>
                      <td>{p.slot_time}</td>
                      <td>{p.booking_type}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>
                        {p.status === "waiting" && <button className="hqms-action-btn" onClick={() => handleSkip(p.id)}>Skip</button>}
                        {p.status === "serving" && <button className="hqms-action-btn" onClick={() => handleComplete(p.id)}>Done</button>}
                        {p.status === "skipped" && <button className="hqms-action-btn" onClick={() => handleRestore(p.id)}>Restore</button>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}