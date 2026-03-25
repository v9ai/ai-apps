"""Pybricks code generation server using deepseek-client.

Run:  python -m bricks_agent.codegen_server
Listens on :2027 by default.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from http import HTTPStatus
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

PORT = int(os.environ.get("CODEGEN_PORT", "2027"))
LLAMA_URL = os.environ.get("LLAMA_URL", "http://127.0.0.1:2028")

SYSTEM_PROMPT = """\
You are a Pybricks MicroPython expert. Generate complete, working Pybricks scripts
for LEGO Powered Up hubs. Follow these rules strictly:

1. ONLY use the Pybricks library. Never use standard CPython modules (no `time`, no `socket`, etc.).
2. Available hubs: CityHub, TechnicHub, MoveHub, PrimeHub, EssentialHub
3. Available devices: Motor, DCMotor, Light, ColorSensor, ColorLightMatrix, UltrasonicSensor, ForceSensor
4. Remote control: `from pybricks.pupdevices import Remote` — always use `Remote(timeout=None)` or `Remote(timeout=10000)`
5. Car API: `from pybricks.robotics import Car` — for Technic vehicles with steering motor
6. Always use `from pybricks.tools import wait` and call `wait(50)` or `wait(100)` in the main loop
7. Button constants: Button.LEFT_PLUS, Button.LEFT_MINUS, Button.RIGHT_PLUS, Button.RIGHT_MINUS, Button.CENTER, Button.LEFT, Button.RIGHT
8. Color constants: Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW, Color.ORANGE, Color.WHITE, Color.NONE
9. Motor methods: .dc(power), .run(speed), .run_target(speed, angle), .run_angle(speed, angle), .stop(), .reset_angle(0)
10. DCMotor methods: .dc(power), .stop(), .brake()
11. Hub light: hub.light.on(Color.X), hub.light.off(), hub.light.blink(Color.X, [on_ms, off_ms])
12. Battery: hub.battery.voltage() returns millivolts
13. For optional devices, wrap in try/except OSError
14. Always add a `wait()` call at the end of the main loop to prevent 100% CPU
15. Do NOT include markdown fences or explanations — output ONLY the Python code

Here are example scripts for reference:

--- Example: Remote-controlled car (MoveHub) ---
from pybricks.hubs import MoveHub
from pybricks.pupdevices import Motor, Remote
from pybricks.parameters import Port, Button, Color
from pybricks.tools import wait

hub = MoveHub()
motor_a = Motor(Port.A)
motor_b = Motor(Port.B)

hub.light.on(Color.ORANGE)
remote = Remote(timeout=None)
hub.light.on(Color.GREEN)

while True:
    pressed = remote.buttons.pressed()
    if Button.CENTER in pressed:
        motor_a.stop()
        motor_b.stop()
        hub.light.on(Color.RED)
        wait(50)
        continue
    if Button.LEFT_PLUS in pressed:
        motor_a.dc(100)
        motor_b.dc(-100)
    elif Button.LEFT_MINUS in pressed:
        motor_a.dc(-100)
        motor_b.dc(100)
    else:
        motor_a.stop()
        motor_b.stop()
    hub.light.on(Color.GREEN)
    wait(50)

--- Example: Train with lights (EssentialHub) ---
from pybricks.hubs import EssentialHub
from pybricks.pupdevices import DCMotor, Remote, Light
from pybricks.parameters import Port, Button, Color
from pybricks.tools import wait

hub = EssentialHub()
train_motor = DCMotor(Port.A)
light = Light(Port.B)
light.off()

hub.light.blink(Color.YELLOW, [500, 500])
remote = Remote(timeout=10000)
hub.light.on(Color.GREEN)

speed_step = 10
current_speed = 0
brightness_step = 10
current_brightness = 0
previous_buttons = set()

while True:
    pressed = remote.buttons.pressed()
    new_presses = pressed - previous_buttons
    if Button.CENTER in new_presses:
        current_speed = 0
        current_brightness = 0
        train_motor.stop()
        light.off()
    else:
        if Button.LEFT_PLUS in new_presses:
            current_speed = min(current_speed + speed_step, 100)
            train_motor.dc(current_speed)
        if Button.LEFT_MINUS in new_presses:
            current_speed = max(current_speed - speed_step, -100)
            if current_speed == 0:
                train_motor.stop()
            else:
                train_motor.dc(current_speed)
        if Button.RIGHT_PLUS in new_presses:
            current_brightness = min(current_brightness + brightness_step, 100)
            light.on(current_brightness)
        if Button.RIGHT_MINUS in new_presses:
            current_brightness = max(current_brightness - brightness_step, 0)
            if current_brightness == 0:
                light.off()
            else:
                light.on(current_brightness)
    previous_buttons = pressed
    wait(100)

--- Example: Color sensor bot (EssentialHub) ---
from pybricks.hubs import EssentialHub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Color
from pybricks.tools import wait

hub = EssentialHub()
motor = Motor(Port.A)
sensor = ColorSensor(Port.B)
sensor.detectable_colors([Color.GREEN, Color.RED, Color.NONE])

while True:
    color = sensor.color()
    if color == Color.GREEN:
        motor.dc(-100)
        hub.light.on(Color.GREEN)
    elif color == Color.RED:
        motor.stop()
        hub.light.on(Color.RED)
    wait(50)
"""


def _build_user_prompt(hub: str, devices: list[dict], has_remote: bool, instructions: str) -> str:
    parts = [f"Hub: {hub}"]
    if devices:
        dev_lines = []
        for d in devices:
            port = d.get("port", "?")
            device = d.get("device", "?")
            var = d.get("varName", "")
            dev_lines.append(f"  Port {port}: {device} (variable: {var})")
        parts.append("Devices:\n" + "\n".join(dev_lines))
    else:
        parts.append("Devices: none connected")
    if has_remote:
        parts.append("Remote: yes (Powered Up Remote)")
    else:
        parts.append("Remote: no")
    parts.append(f"\nInstructions:\n{instructions}")
    parts.append("\nGenerate the complete Pybricks MicroPython script. Output ONLY Python code, no markdown.")
    return "\n".join(parts)


async def generate_code(hub: str, devices: list[dict], has_remote: bool, instructions: str) -> str:
    payload = {
        "model": "qwen2.5-coder-3b-instruct",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(hub, devices, has_remote, instructions)},
        ],
        "temperature": 0.3,
        "max_tokens": 2048,
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{LLAMA_URL}/v1/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        code = data["choices"][0]["message"]["content"]
        # Strip markdown fences if the model includes them
        if code.startswith("```"):
            lines = code.split("\n")
            lines = lines[1:]  # drop ```python
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            code = "\n".join(lines)
        return code.strip()


# ── Simple async HTTP server (no framework dependency) ──────────────────────


async def _handle_request(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        request_line = await reader.readline()
        method, path, _ = request_line.decode().split(" ", 2)

        headers: dict[str, str] = {}
        while True:
            line = await reader.readline()
            if line in (b"\r\n", b"\n", b""):
                break
            key, val = line.decode().split(":", 1)
            headers[key.strip().lower()] = val.strip()

        body = b""
        if "content-length" in headers:
            body = await reader.readexactly(int(headers["content-length"]))

        # CORS preflight
        cors_headers = (
            "HTTP/1.1 200 OK\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: POST, OPTIONS\r\n"
            "Access-Control-Allow-Headers: Content-Type\r\n"
            "Content-Length: 0\r\n\r\n"
        )
        if method == "OPTIONS":
            writer.write(cors_headers.encode())
            await writer.drain()
            return

        if method == "POST" and path == "/generate":
            data = json.loads(body)
            hub = data.get("hub", "CityHub")
            devices = data.get("devices", [])
            has_remote = data.get("hasRemote", False)
            instructions = data.get("instructions", "")

            if not instructions.strip():
                _send_json(writer, {"error": "instructions is required"}, 400)
                return

            code = await generate_code(hub, devices, has_remote, instructions)
            _send_json(writer, {"code": code})
        elif method == "GET" and path == "/health":
            try:
                async with httpx.AsyncClient(timeout=5.0) as hc:
                    r = await hc.get(f"{LLAMA_URL}/health")
                    llama_ok = r.status_code == 200
            except Exception:
                llama_ok = False
            _send_json(writer, {"ok": True, "llama_server": llama_ok})
        else:
            _send_json(writer, {"error": "Not found"}, 404)
    except Exception as e:
        _send_json(writer, {"error": str(e)}, 500)
    finally:
        writer.close()
        await writer.wait_closed()


def _send_json(writer: asyncio.StreamWriter, data: dict, status: int = 200) -> None:
    body = json.dumps(data).encode()
    reason = HTTPStatus(status).phrase
    resp = (
        f"HTTP/1.1 {status} {reason}\r\n"
        f"Content-Type: application/json\r\n"
        f"Access-Control-Allow-Origin: *\r\n"
        f"Content-Length: {len(body)}\r\n"
        f"\r\n"
    ).encode() + body
    writer.write(resp)


async def main() -> None:
    server = await asyncio.start_server(_handle_request, "127.0.0.1", PORT)
    print(f"Codegen server listening on http://127.0.0.1:{PORT}")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
