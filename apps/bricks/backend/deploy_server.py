"""
Pybricks BLE deploy server.

Runs on port 2026. Uses pybricksdev for reliable native BLE deployment
with proper .mpy compilation and download protocol.

Start: cd backend && uv run python deploy_server.py
"""

import asyncio
import io
import logging
import tempfile
import os
import traceback
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ── Global hub state ────────────────────────────────────────────

_hub = None
_hub_name: str | None = None
_hub_kind: str | None = None
_hub_output: list[str] = []
_hub_lock = asyncio.Lock()
_last_ble_name: str | None = None

_HUB_KIND_MAP = {
    0x40: "MoveHub",
    0x41: "CityHub",
    0x80: "TechnicHub",
    0x81: "PrimeHub",
    0x83: "EssentialHub",
    0x84: "TechnicHub",
}


def _is_connected() -> bool:
    """Check if the hub BLE connection is actually alive."""
    if _hub is None:
        return False
    try:
        return _hub._client.is_connected
    except Exception:
        return False


async def _get_hub(ble_name: str | None = None):
    """Connect to a hub. If ble_name is given, scan for that specific device."""
    global _hub, _hub_name, _hub_kind, _last_ble_name

    # Return existing hub only if it's actually connected
    if _hub is not None and _is_connected():
        return _hub

    # Clean up stale hub if any
    if _hub is not None:
        await _disconnect_hub()

    from pybricksdev.ble import find_device
    from pybricksdev.connections.pybricks import PybricksHubBLE

    # Use the last known BLE name for reconnect if none given
    scan_name = ble_name or _last_ble_name
    device = await find_device(name=scan_name or None, timeout=15)
    _hub_name = device.name or "Pybricks Hub"
    _last_ble_name = device.name
    hub = PybricksHubBLE(device)

    # Retry connection up to 3 times (BLE on macOS can be flaky)
    last_err = None
    for attempt in range(3):
        try:
            await hub.connect()
            last_err = None
            break
        except Exception as e:
            last_err = e
            if attempt < 2:
                await asyncio.sleep(1)
                # Recreate client for fresh connection
                hub = PybricksHubBLE(device)
    if last_err:
        raise last_err

    _hub_kind = _HUB_KIND_MAP.get(int(hub.hub_kind), None)

    hub.stdout_observable.subscribe(
        lambda data: _hub_output.append(data.decode("utf-8", errors="replace"))
    )

    _hub = hub
    return hub


async def _reconnect_hub() -> bool:
    """Try to reconnect to the last known hub. Returns True on success."""
    global _hub
    if _hub is not None:
        await _disconnect_hub()
    try:
        await _get_hub()
        return True
    except Exception:
        return False


async def _disconnect_hub():
    global _hub, _hub_name, _hub_kind
    if _hub is not None:
        try:
            await _hub.stop_user_program()
        except Exception:
            pass
        try:
            await _hub.disconnect()
        except Exception:
            pass
    _hub = None
    _hub_name = None
    _hub_kind = None


def _friendly_error(e: Exception) -> str:
    """Turn raw exceptions into actionable user messages."""
    msg = str(e)
    name = type(e).__name__

    if isinstance(e, asyncio.TimeoutError) or "timeout" in msg.lower():
        return (
            "No hub found within 15 seconds.\n"
            "Make sure the hub is powered on and showing a flashing blue light.\n"
            "Press the hub button to enter pairing mode."
        )
    if "disconnect" in msg.lower() or "not connected" in msg.lower():
        return (
            "Hub disconnected unexpectedly.\n"
            "Move closer to the hub and try reconnecting."
        )
    if "ENODEV" in msg or "Errno 19" in msg:
        return (
            "A device is not connected to the expected port.\n"
            "Use 'Detect Ports' to auto-detect what's plugged in."
        )
    if "ImportError" in msg or "can't import" in msg:
        return (
            f"{msg.strip()}\n"
            "The hub type in your code doesn't match the physical hub.\n"
            "Use 'Detect Ports' to fix this automatically."
        )
    if "compile" in msg.lower() or "mpy" in msg.lower():
        return f"Code compilation failed:\n{msg}"
    if name == "BleakError" or "bleak" in msg.lower():
        return (
            "Bluetooth error. Make sure Bluetooth is enabled and the terminal "
            "has Bluetooth permission (System Settings > Privacy > Bluetooth)."
        )
    if "protocol" in msg.lower():
        return (
            "Unsupported Pybricks firmware version.\n"
            "Update your hub firmware at https://code.pybricks.com"
        )
    return msg


# ── FastAPI app ─────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await _disconnect_hub()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3008", "http://127.0.0.1:3008"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectRequest(BaseModel):
    ble_name: str | None = None


class DeployRequest(BaseModel):
    code: str


class DeployResponse(BaseModel):
    success: bool
    error: str | None = None
    output: str = ""


class StatusResponse(BaseModel):
    connected: bool
    hub_name: str | None = None
    hub_kind: str | None = None
    output: str = ""


# ── Endpoints ───────────────────────────────────────────────────

@app.get("/status")
async def status() -> StatusResponse:
    connected = _is_connected()
    return StatusResponse(
        connected=connected,
        hub_name=_hub_name if connected else None,
        hub_kind=_hub_kind if connected else None,
        output="".join(_hub_output[-100:]),
    )


@app.post("/connect")
async def connect(req: ConnectRequest = ConnectRequest()) -> StatusResponse:
    async with _hub_lock:
        # Disconnect existing hub first
        if _hub is not None:
            await _disconnect_hub()

        try:
            await _get_hub(ble_name=req.ble_name)
            return StatusResponse(
                connected=True,
                hub_name=_hub_name,
                hub_kind=_hub_kind,
            )
        except Exception as e:
            return StatusResponse(
                connected=False,
                output=_friendly_error(e),
            )


@app.post("/disconnect")
async def disconnect() -> StatusResponse:
    async with _hub_lock:
        await _disconnect_hub()
    return StatusResponse(connected=False)


@app.post("/deploy")
async def deploy(req: DeployRequest) -> DeployResponse:
    async with _hub_lock:
        _hub_output.clear()

        try:
            hub = await _get_hub()
        except Exception as e:
            return DeployResponse(success=False, error=_friendly_error(e))

        fd, path = tempfile.mkstemp(suffix=".py")
        try:
            with os.fdopen(fd, "w") as f:
                f.write(req.code)

            await hub.run(path, wait=False, print_output=False)
            # Give the hub a moment to start and report any immediate errors
            await asyncio.sleep(1.5)
            output = "".join(_hub_output)

            # Check if output contains a traceback (hub-side error)
            if "Traceback" in output:
                return DeployResponse(
                    success=False,
                    error=_friendly_error(Exception(output.strip())),
                    output=output,
                )

            return DeployResponse(success=True, output=output)

        except Exception as e:
            err_msg = str(e)
            hub_output = "".join(_hub_output)

            if "disconnect" in err_msg.lower() or "not connected" in err_msg.lower():
                # Auto-reconnect and retry once
                if await _reconnect_hub():
                    try:
                        _hub_output.clear()
                        await _hub.run(path, wait=False, print_output=False)
                        await asyncio.sleep(1.5)
                        output = "".join(_hub_output)
                        if "Traceback" in output:
                            return DeployResponse(
                                success=False,
                                error=_friendly_error(Exception(output.strip())),
                                output=output,
                            )
                        return DeployResponse(success=True, output=output)
                    except Exception as retry_err:
                        await _disconnect_hub()
                        return DeployResponse(
                            success=False,
                            error=_friendly_error(retry_err),
                            output="".join(_hub_output),
                        )
                else:
                    return DeployResponse(
                        success=False,
                        error=(
                            "Hub disconnected and auto-reconnect failed.\n"
                            "Make sure the hub is on and nearby, then reconnect."
                        ),
                        output=hub_output,
                    )

            # Prefer hub output if it has a traceback
            if hub_output and "Traceback" in hub_output:
                return DeployResponse(
                    success=False,
                    error=_friendly_error(Exception(hub_output.strip())),
                    output=hub_output,
                )

            return DeployResponse(
                success=False,
                error=_friendly_error(e),
                output=hub_output,
            )
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass


@app.post("/stop")
async def stop() -> DeployResponse:
    if _hub is None or not _is_connected():
        return DeployResponse(success=False, error="No hub connected. Press 'Connect Hub' first.")
    try:
        await _hub.stop_user_program()
        return DeployResponse(success=True)
    except Exception as e:
        err_msg = str(e)
        if "disconnect" in err_msg.lower() or "not connected" in err_msg.lower():
            await _disconnect_hub()
        return DeployResponse(success=False, error=_friendly_error(e))


# ── Firmware flash ─────────────────────────────────────────────

_FIRMWARE_REPO = "pybricks/pybricks-micropython"

# Maps our hub type names to (GitHub asset slug, pybricksdev HubKind value)
_FIRMWARE_HUB_MAP = {
    "CityHub": "cityhub",
    "TechnicHub": "technichub",
    "MoveHub": "movehub",
    "PrimeHub": "primehub",
    "EssentialHub": "essentialhub",
}

# Flash progress state
_flash_status: str = "idle"  # idle | downloading | flashing | done | error
_flash_output: list[str] = []
_flash_error: str | None = None


class FlashRequest(BaseModel):
    hub_type: str


class FlashStatusResponse(BaseModel):
    status: str
    output: str = ""
    error: str | None = None


async def _download_firmware_zip(hub_slug: str) -> bytes:
    """Download the latest firmware zip from GitHub releases."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Get latest release tag
        resp = await client.get(
            f"https://api.github.com/repos/{_FIRMWARE_REPO}/releases/latest",
            headers={"Accept": "application/vnd.github.v3+json"},
        )
        resp.raise_for_status()
        tag = resp.json()["tag_name"]

        # Download the firmware zip
        url = (
            f"https://github.com/{_FIRMWARE_REPO}/releases/download/"
            f"{tag}/pybricks-{hub_slug}-{tag}.zip"
        )
        _flash_output.append(f"Downloading pybricks-{hub_slug}-{tag}.zip ...\n")
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


async def _run_flash(hub_type: str):
    """Background task: download firmware and flash via BLE."""
    global _flash_status, _flash_error

    hub_slug = _FIRMWARE_HUB_MAP.get(hub_type)
    if not hub_slug:
        _flash_error = f"Unknown hub type: {hub_type}"
        _flash_status = "error"
        return

    try:
        # Disconnect the running hub first so BLE is free
        async with _hub_lock:
            await _disconnect_hub()

        _flash_status = "downloading"
        _flash_output.append(f"Preparing to flash {hub_type}...\n")
        firmware_zip_bytes = await _download_firmware_zip(hub_slug)
        _flash_output.append("Download complete. Starting flash...\n")

        _flash_status = "flashing"
        from pybricksdev.firmware import create_firmware_blob
        from pybricksdev.cli.flash import flash_ble
        from pybricksdev.ble.lwp3.bytecodes import HubKind

        firmware_zip = io.BytesIO(firmware_zip_bytes)
        firmware, metadata, _license = await create_firmware_blob(firmware_zip)
        hub_kind = HubKind(metadata["device-id"])

        _flash_output.append(
            f"Firmware ready for {hub_kind.name}. Scanning for hub...\n"
            "Put hub in update mode: hold the button until the light blinks "
            "pink/purple, then release.\n"
        )

        # flash_ble prints to stdout — capture it
        import contextlib

        class OutputCapture(io.StringIO):
            def write(self, s):
                if s.strip():
                    _flash_output.append(s if s.endswith("\n") else s + "\n")
                return super().write(s)

        capture = OutputCapture()
        with contextlib.redirect_stdout(capture):
            await flash_ble(hub_kind, firmware, metadata)

        _flash_output.append("Flash complete! Hub is rebooting.\n")
        _flash_status = "done"

    except Exception as e:
        logger.exception("Firmware flash failed")
        _flash_error = _friendly_error(e)
        _flash_output.append(f"Error: {_flash_error}\n")
        _flash_status = "error"


@app.post("/firmware/flash")
async def firmware_flash(req: FlashRequest) -> FlashStatusResponse:
    global _flash_status, _flash_error
    _flash_output.clear()
    _flash_error = None

    if _flash_status in ("downloading", "flashing"):
        return FlashStatusResponse(
            status=_flash_status,
            output="".join(_flash_output),
            error="Flash already in progress.",
        )

    _flash_status = "downloading"
    asyncio.create_task(_run_flash(req.hub_type))
    return FlashStatusResponse(status="downloading", output="Starting...\n")


@app.get("/firmware/status")
async def firmware_status() -> FlashStatusResponse:
    return FlashStatusResponse(
        status=_flash_status,
        output="".join(_flash_output[-200:]),
        error=_flash_error,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=2026)
