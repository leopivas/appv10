#!/usr/bin/env python3
"""
Creatools Server Agent
======================

Roda na sua VPS (Windows/Linux) e conecta no painel Creatools para:
  - reportar heartbeat + CPU/RAM
  - receber comandos (start/stop/restart/logs) dos "emuladores" (processos)
  - manter estado de rodando/parado

Uso:
  export CREATOOLS_AGENT_KEY="srvk_..."        # chave do servidor (copiada do painel)
  export CREATOOLS_PANEL_URL="https://seu-painel.com"
  python3 agent.py

Dependências: requests, psutil
  pip3 install requests psutil
"""
import os, sys, time, json, subprocess, signal, socket, threading, collections, platform

try:
    import requests
except ImportError:
    print("Instale: pip3 install requests psutil"); sys.exit(1)

try:
    import psutil
except ImportError:
    psutil = None

AGENT_KEY = os.environ.get("CREATOOLS_AGENT_KEY", "").strip()
PANEL_URL = os.environ.get("CREATOOLS_PANEL_URL", "").strip().rstrip("/")
POLL_INTERVAL = int(os.environ.get("CREATOOLS_POLL_INTERVAL", "10"))
AGENT_VERSION = "1.0.0"

if not AGENT_KEY or not PANEL_URL:
    print("ERRO: defina CREATOOLS_AGENT_KEY e CREATOOLS_PANEL_URL")
    sys.exit(1)

# Estado local: emulator_id -> {proc, logs:deque, error:str, cmd, cwd}
STATE = {}
STATE_LOCK = threading.Lock()

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def get_system_stats():
    if not psutil:
        return {"cpu": 0, "memUsedMb": 0, "memTotalMb": 0}
    try:
        m = psutil.virtual_memory()
        return {
            "cpu": int(psutil.cpu_percent(interval=None)),
            "memUsedMb": int(m.used / (1024*1024)),
            "memTotalMb": int(m.total / (1024*1024)),
        }
    except Exception:
        return {"cpu": 0, "memUsedMb": 0, "memTotalMb": 0}

def spawn(emu_id, cmd, cwd):
    with STATE_LOCK:
        rec = STATE.get(emu_id)
        if rec and rec["proc"] and rec["proc"].poll() is None:
            return "already running"
        logs = collections.deque(maxlen=200)
        try:
            proc = subprocess.Popen(
                cmd, shell=True, cwd=cwd or None,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1, start_new_session=True,
            )
        except Exception as e:
            STATE[emu_id] = {"proc": None, "logs": logs, "error": str(e), "cmd": cmd, "cwd": cwd}
            return f"spawn error: {e}"
        STATE[emu_id] = {"proc": proc, "logs": logs, "error": None, "cmd": cmd, "cwd": cwd}
        def reader():
            try:
                for line in proc.stdout:
                    logs.append(line.rstrip())
            except Exception:
                pass
        threading.Thread(target=reader, daemon=True).start()
        return f"started pid={proc.pid}"

def kill(emu_id):
    with STATE_LOCK:
        rec = STATE.get(emu_id)
        if not rec or not rec["proc"]:
            return "not running"
        p = rec["proc"]
        if p.poll() is not None:
            return "already stopped"
    try:
        if os.name == "nt":
            p.terminate()
        else:
            os.killpg(os.getpgid(p.pid), signal.SIGTERM)
        try: p.wait(timeout=8)
        except Exception:
            if os.name != "nt":
                os.killpg(os.getpgid(p.pid), signal.SIGKILL)
        return "stopped"
    except Exception as e:
        return f"stop error: {e}"

def gather_statuses(server_emulators):
    out = []
    with STATE_LOCK:
        for emu in server_emulators:
            eid = emu["id"]
            rec = STATE.get(eid)
            if not rec or not rec["proc"]:
                out.append({"emulatorId": eid, "status": "stopped", "lastLogs": rec["logs"] and "\n".join(rec["logs"]) or "" if rec else ""})
                continue
            p = rec["proc"]
            alive = p.poll() is None
            out.append({
                "emulatorId": eid,
                "status": "running" if alive else "stopped",
                "pid": p.pid if alive else None,
                "lastError": rec.get("error"),
                "lastLogs": "\n".join(rec["logs"]),
            })
    return out

def report_result(cmd_id, status, result):
    try:
        requests.post(f"{PANEL_URL}/api/agent/commands/{cmd_id}/result",
                      headers={"X-Agent-Key": AGENT_KEY, "Content-Type": "application/json"},
                      data=json.dumps({"status": status, "result": result}), timeout=10)
    except Exception as e:
        log(f"result post failed: {e}")

def execute_cmd(c, emulators_by_id):
    action = c.get("action"); emu_id = c.get("emulatorId"); cmd_id = c["id"]
    emu = emulators_by_id.get(emu_id) if emu_id else None
    if action in ("start", "restart"):
        if not emu:
            report_result(cmd_id, "error", "unknown emulator"); return
        if action == "restart":
            kill(emu_id)
            time.sleep(1)
        r = spawn(emu_id, emu["processCmd"], emu.get("workingDir"))
        report_result(cmd_id, "done", r)
    elif action == "stop":
        if not emu_id: report_result(cmd_id, "error", "no emulator id"); return
        r = kill(emu_id)
        report_result(cmd_id, "done", r)
    elif action == "logs":
        with STATE_LOCK:
            rec = STATE.get(emu_id or "")
            logs = "\n".join(rec["logs"]) if rec else ""
        report_result(cmd_id, "done", logs[-4000:])
    else:
        report_result(cmd_id, "error", f"unsupported action: {action}")

def main():
    log(f"Agent starting → {PANEL_URL} (key {AGENT_KEY[:12]}…)")
    if psutil: psutil.cpu_percent(interval=None)  # prime

    while True:
        try:
            emulators = []
            # Fetch stats, gather statuses (need emu list — from prev poll)
            statuses = gather_statuses(emulators)  # empty first iteration, filled below
            body = {
                "hostname": socket.gethostname(),
                "os": f"{platform.system()} {platform.release()}",
                "agentVersion": AGENT_VERSION,
                **get_system_stats(),
                "statuses": statuses,
            }
            r = requests.post(f"{PANEL_URL}/api/agent/poll",
                              headers={"X-Agent-Key": AGENT_KEY, "Content-Type": "application/json"},
                              data=json.dumps(body), timeout=15)
            if r.status_code != 200:
                log(f"poll {r.status_code}: {r.text[:200]}")
                time.sleep(POLL_INTERVAL); continue
            data = r.json()
            emulators = data.get("emulators", [])
            emu_by_id = {e["id"]: e for e in emulators}
            # execute any pending commands
            for c in data.get("commands", []):
                try: execute_cmd(c, emu_by_id)
                except Exception as e: log(f"cmd fail: {e}")
            # send updated statuses next tick with the known emulator list
            # (already reported above; we re-report richer info now)
            body2 = {
                "hostname": socket.gethostname(),
                "os": f"{platform.system()} {platform.release()}",
                "agentVersion": AGENT_VERSION,
                **get_system_stats(),
                "statuses": gather_statuses(emulators),
            }
            requests.post(f"{PANEL_URL}/api/agent/poll",
                          headers={"X-Agent-Key": AGENT_KEY, "Content-Type": "application/json"},
                          data=json.dumps(body2), timeout=15)
        except Exception as e:
            log(f"loop error: {e}")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
