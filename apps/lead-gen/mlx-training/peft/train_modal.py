"""Modal launcher for the Mistral-7B email LoRA training run.

Usage:
    modal secret create hf-token HF_TOKEN=hf_xxx       # one-time (or via dashboard)
    modal run train_modal.py

Runs train_mistral_email_lora.py inside a Modal container with an A100-40GB
GPU. Training data is uploaded from the local repo; the trained adapter is
downloaded to ./out/adapter/final/ when the function returns.

Cost expectation: ~45 min wall-clock on A100-40GB @ ~$3.19/hr = ~$2.40 per run.
"""

from __future__ import annotations

from pathlib import Path

import modal

HERE = Path(__file__).parent
DATA_DIR = HERE.parent / "data" / "outreach-email"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install_from_requirements(str(HERE / "requirements.txt"))
)

app = modal.App("lead-gen-mistral-email-lora")

volume = modal.Volume.from_name("lead-gen-email-lora", create_if_missing=True)


@app.function(
    image=image,
    gpu="A100-40GB",
    timeout=60 * 90,
    secrets=[modal.Secret.from_name("hf-token")],
    volumes={"/out": volume},
    mounts=[
        modal.Mount.from_local_dir(str(HERE), remote_path="/peft"),
        modal.Mount.from_local_dir(str(DATA_DIR), remote_path="/data/outreach-email"),
    ],
)
def train() -> bytes:
    import shutil
    import subprocess
    import tarfile
    from io import BytesIO
    from pathlib import Path

    work = Path("/workspace")
    work.mkdir(exist_ok=True)

    # Stage data where convert_data.py expects it.
    data_dst = work / "mlx-training" / "data" / "outreach-email"
    data_dst.mkdir(parents=True, exist_ok=True)
    for f in Path("/data/outreach-email").iterdir():
        shutil.copy(f, data_dst / f.name)

    peft_dst = work / "mlx-training" / "peft"
    peft_dst.mkdir(parents=True, exist_ok=True)
    for f in Path("/peft").iterdir():
        if f.is_file():
            shutil.copy(f, peft_dst / f.name)

    subprocess.run(
        ["python", "convert_data.py", "--out", "/out/data"],
        cwd=str(peft_dst),
        check=True,
    )
    subprocess.run(
        [
            "python",
            "train_mistral_email_lora.py",
            "--data-dir",
            "/out/data",
            "--out",
            "/out/adapter",
        ],
        cwd=str(peft_dst),
        check=True,
    )
    subprocess.run(
        [
            "python",
            "postprocess_adapter.py",
            "/out/adapter/final",
            "--model-type",
            "mistral",
        ],
        cwd=str(peft_dst),
        check=True,
    )

    # Tar the cf-upload folder and return bytes so the local caller can unpack.
    buf = BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        tar.add("/out/adapter/final/cf-upload", arcname="cf-upload")
    return buf.getvalue()


@app.local_entrypoint()
def main() -> None:
    import tarfile
    from io import BytesIO

    payload = train.remote()
    out = HERE / "out" / "adapter" / "final"
    out.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=BytesIO(payload), mode="r:gz") as tar:
        tar.extractall(path=str(out))
    print(f"downloaded CF-ready adapter to {out / 'cf-upload'}")
    print(
        f"next: npx wrangler ai finetune create "
        f"@cf/mistral/mistral-7b-instruct-v0.2-lora email-lora-v1 "
        f"{out / 'cf-upload'}"
    )
