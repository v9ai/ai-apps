"""Local email verification via DNS MX + SMTP probe + syntax + typo-correction.

Native Python port of ``crates/email-verifier`` (Rust). Stateless, async.

Pipeline: syntax -> typo -> disposable -> role -> DNS MX -> catch-all probe -> SMTP probe.

Public API:
    verify_email(email)              -> VerificationResult
    verify_batch(emails, concurrency)-> list[VerificationResult]

CLI:
    python -m leadgen_agent.email_verifier user@example.com
    python -m leadgen_agent.email_verifier --batch < emails.txt

Requires: dnspython, aiosmtplib
"""

# Requires: dnspython, aiosmtplib

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import Any

import aiosmtplib
import dns.asyncresolver
import dns.exception
import dns.rdatatype
import dns.resolver

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Static data (disposable domains, role prefixes, typo map)
# ---------------------------------------------------------------------------

DISPOSABLE_DOMAINS: frozenset[str] = frozenset(
    {
        # Mailinator family
        "mailinator.com",
        "mailinator.net",
        "mailinator.org",
        # Guerrilla Mail family
        "guerrillamail.com",
        "guerrillamail.info",
        "guerrillamail.biz",
        "guerrillamail.de",
        "guerrillamail.net",
        "guerrillamail.org",
        "sharklasers.com",
        "guerrillamailblock.com",
        "spam4.me",
        # 10 Minute Mail
        "10minutemail.com",
        "10minutemail.net",
        "10minutemail.org",
        "10minemail.com",
        # Trash Mail
        "trashmail.com",
        "trashmail.at",
        "trashmail.io",
        "trashmail.me",
        "trashmail.net",
        "trashmail.org",
        "trashmail.xyz",
        "trashmail.live",
        # Yopmail family
        "yopmail.com",
        "yopmail.fr",
        "cool.fr.nf",
        "jetable.fr.nf",
        "nospam.ze.tc",
        "nomail.xl.cx",
        "mega.zik.dj",
        "speed.1s.fr",
        "courriel.fr.nf",
        "moncourrier.fr.nf",
        "monemail.fr.nf",
        "monmail.fr.nf",
        # Maildrop / Discard
        "maildrop.cc",
        "discard.email",
        "discardmail.com",
        "discardmail.de",
        # Fakeinbox / Spamgourmet
        "fakeinbox.com",
        "spamgourmet.com",
        "spamgourmet.net",
        "spamgourmet.org",
        # TempMail
        "tempmail.com",
        "tempmail.net",
        "tempmail.org",
        "temp-mail.org",
        "temp-mail.io",
        "tempr.email",
        "tempinbox.com",
        "tempinbox.co.uk",
        # Throwaway
        "throwaway.email",
        "throwam.com",
        "throwam.net",
        # Mailnesia
        "mailnesia.com",
        "mailnull.com",
        # Getairmail / Filzmail
        "getairmail.com",
        "filzmail.com",
        "trbvm.com",
        # Owlpic / Pookmail / Sofimail
        "owlpic.com",
        "pookmail.com",
        "sofimail.com",
        # Mailzilla
        "mailzilla.com",
        "mailzilla.org",
        # Spamgraphic / Lovemeleaveme
        "spamgraphic.com",
        "lovemeleaveme.com",
        "giantmail.de",
        "no-spam.ws",
        # Dispostable
        "dispostable.com",
        # Nada / Inboxkitten
        "nada.email",
        "inboxkitten.com",
        # Mailsac
        "mailsac.com",
        # Others
        "spamhereplease.com",
        "spamherelots.com",
        "mailtome.de",
        "mailme.lv",
        "spam.la",
        "amilegit.com",
        "amniesia.com",
        "boun.cr",
        "deadaddress.com",
        "despam.it",
        "dodgeit.com",
        "dodgit.com",
        "e4ward.com",
        "emkei.cz",
        "fakedemail.com",
        "fakeemail.de",
        "freemail.ms",
        "hmamail.com",
        "incognitomail.com",
        "instant-mail.de",
        "jetable.com",
        "jetable.net",
        "jetable.org",
        "kasmail.com",
        "klassmaster.com",
    }
)


ROLE_PREFIXES: frozenset[str] = frozenset(
    {
        "info",
        "admin",
        "support",
        "hello",
        "contact",
        "sales",
        "marketing",
        "webmaster",
        "postmaster",
        "noreply",
        "no-reply",
        "no_reply",
        "donotreply",
        "do-not-reply",
        "abuse",
        "security",
        "billing",
        "finance",
        "hr",
        "help",
        "team",
        "office",
        "press",
        "media",
        "legal",
        "accounts",
        "feedback",
        "careers",
        "jobs",
        "invest",
        "news",
        "newsletter",
        "unsubscribe",
        "privacy",
        "compliance",
        "tech",
        "service",
        "services",
        "dev",
        "test",
        "demo",
        "api",
        "bot",
        "mail",
        "hostmaster",
        "sysadmin",
        "ops",
        "root",
        "nobody",
        "www",
        "ftp",
        "proxy",
        "spam",
        "mailer",
        "mailer-daemon",
        "bounce",
        "bounces",
        "errors",
        "notifications",
        "alerts",
    }
)


TYPO_MAP: dict[str, str] = {
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gnail.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmail.con": "gmail.com",
    "gmail.co": "gmail.com",
    "gmail.cmo": "gmail.com",
    "gogglemail.com": "googlemail.com",
    "googlemail.con": "googlemail.com",
    "hotmal.com": "hotmail.com",
    "hotmial.com": "hotmail.com",
    "hotmil.com": "hotmail.com",
    "htomail.com": "hotmail.com",
    "hotmail.con": "hotmail.com",
    "hotmail.co": "hotmail.com",
    "hotmail.cmo": "hotmail.com",
    "outlok.com": "outlook.com",
    "outloook.com": "outlook.com",
    "outlook.con": "outlook.com",
    "outllok.com": "outlook.com",
    "yaho.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "yahoo.con": "yahoo.com",
    "yhaoo.com": "yahoo.com",
    "iclod.com": "icloud.com",
    "icloud.con": "icloud.com",
    "protonmial.com": "protonmail.com",
    "protonmal.com": "protonmail.com",
    "protonmail.con": "protonmail.com",
}


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------


@dataclass
class VerificationResult:
    """Output of a single email verification run.

    Mirrors the Rust ``VerificationOutcome`` plus individual pipeline-stage
    booleans so callers can drill down without parsing the ``flags`` list.
    """

    email: str
    # Top-level status: "valid" | "invalid" | "catchall" | "unknown"
    #                  | "disposable" | "invalid_format"
    result: str
    verified: bool
    # High-level run status: "success" or "error_<reason>"
    status: str = "success"
    reason: str | None = None
    suggested_correction: str | None = None
    # Per-stage booleans
    syntax: bool = False
    typo: bool = False
    disposable: bool = False
    role_address: bool = False
    mx: bool = False
    catch_all: bool = False
    smtp_reachable: bool = False
    # Extras
    mx_hosts: list[str] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    execution_time_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Syntax
# ---------------------------------------------------------------------------

_LOCAL_ALLOWED = set("!#$%&'*+/=?^_`{|}~-.")
_LABEL_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$")


def is_valid_format(email: str) -> bool:
    """Practical subset of RFC 5321/5322 -- no regex on the local part."""
    if not email or len(email) > 254:
        return False
    at_pos = email.rfind("@")
    if at_pos < 0:
        return False

    local = email[:at_pos]
    domain = email[at_pos + 1 :]

    if not local or len(local) > 64:
        return False
    if local.startswith(".") or local.endswith(".") or ".." in local:
        return False
    for ch in local:
        if not (ch.isascii() and (ch.isalnum() or ch in _LOCAL_ALLOWED)):
            return False

    if not domain or "." not in domain:
        return False
    for label in domain.split("."):
        if not label or len(label) > 63:
            return False
        if not _LABEL_RE.match(label):
            return False

    return True


def check_typo(email: str) -> str | None:
    """Return a corrected address if the domain is a known typo, else None."""
    at = email.rfind("@")
    if at < 0:
        return None
    domain = email[at + 1 :].lower()
    correction = TYPO_MAP.get(domain)
    if correction is None:
        return None
    return f"{email[:at]}@{correction}"


def extract_domain(email: str) -> str | None:
    at = email.rfind("@")
    return email[at + 1 :] if at >= 0 else None


def extract_local(email: str) -> str | None:
    at = email.rfind("@")
    return email[:at] if at >= 0 else None


def is_disposable(domain: str) -> bool:
    return domain.lower() in DISPOSABLE_DOMAINS


def is_role_address(local: str) -> bool:
    return local.lower() in ROLE_PREFIXES


# ---------------------------------------------------------------------------
# DNS
# ---------------------------------------------------------------------------


async def get_mx_hosts(domain: str, timeout: float) -> list[str]:
    """Return MX hostnames sorted by priority (lowest preference first).

    Returns an empty list when the domain has no MX records or the lookup
    fails (NXDOMAIN, NoAnswer, timeout).
    """
    resolver = dns.asyncresolver.Resolver()
    resolver.lifetime = timeout
    resolver.timeout = timeout
    try:
        answer = await resolver.resolve(domain, dns.rdatatype.MX)
    except (
        dns.resolver.NoAnswer,
        dns.resolver.NXDOMAIN,
        dns.resolver.NoNameservers,
        dns.exception.Timeout,
    ):
        return []
    except dns.exception.DNSException as exc:
        log.debug("MX lookup failed for %s: %s", domain, exc)
        return []

    records: list[tuple[int, str]] = []
    for rdata in answer:
        host = str(rdata.exchange).rstrip(".")
        records.append((int(rdata.preference), host))
    records.sort(key=lambda x: x[0])
    return [host for _, host in records]


# ---------------------------------------------------------------------------
# SMTP
# ---------------------------------------------------------------------------


SMTP_PORT = 25


async def smtp_probe(email: str, mx_host: str, timeout: float) -> str:
    """Probe a mailbox on ``mx_host`` via raw SMTP on port 25.

    Returns:
        "valid"   -- RCPT TO returned 250 (mailbox accepted)
        "invalid" -- RCPT TO returned 5xx (mailbox does not exist)
        "unknown" -- timeout, connection refused, unexpected code, port blocked
    """
    host = mx_host.rstrip(".")
    client = aiosmtplib.SMTP(
        hostname=host,
        port=SMTP_PORT,
        timeout=timeout,
        use_tls=False,
        start_tls=False,
    )

    try:
        # connect() reads the 220 banner; raises on non-2xx
        await client.connect()
    except (aiosmtplib.SMTPException, OSError, asyncio.TimeoutError) as exc:
        log.debug("SMTP connect to %s failed: %s", host, exc)
        return "unknown"

    try:
        # EHLO -> HELO fallback
        try:
            await client.ehlo("verify.local")
        except aiosmtplib.SMTPException:
            try:
                await client.helo("verify.local")
            except aiosmtplib.SMTPException as exc:
                log.debug("HELO/EHLO failed on %s: %s", host, exc)
                return "unknown"

        # MAIL FROM:<>  (empty reverse-path, RFC 5321 s4.5.5 -- standard for probing)
        try:
            code, _msg = await client.mail("")
        except aiosmtplib.SMTPException as exc:
            log.debug("MAIL FROM failed on %s: %s", host, exc)
            return "unknown"
        if code != 250:
            return "unknown"

        # RCPT TO -- the key check
        try:
            code, _msg = await client.rcpt(email)
        except aiosmtplib.SMTPResponseException as exc:
            code = exc.code
        except aiosmtplib.SMTPException as exc:
            log.debug("RCPT TO failed on %s: %s", host, exc)
            return "unknown"
        except (OSError, asyncio.TimeoutError) as exc:
            log.debug("RCPT TO io error on %s: %s", host, exc)
            return "unknown"

        if code == 250:
            return "valid"
        if 550 <= code <= 559:
            return "invalid"
        return "unknown"
    finally:
        try:
            await client.quit()
        except Exception:  # noqa: BLE001 -- best-effort close
            try:
                client.close()
            except Exception:  # noqa: BLE001
                pass


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


async def verify_email(email: str, timeout: float = 10.0) -> VerificationResult:
    """Run the full syntax -> DNS -> SMTP verification pipeline.

    ``timeout`` applies per DNS lookup and per SMTP connection/step (in seconds).
    Never raises -- any unexpected error is captured in ``status``/``reason``.
    """
    start = time.perf_counter()
    original = email
    email = (email or "").strip().lower()

    def _elapsed_ms() -> int:
        return int((time.perf_counter() - start) * 1000)

    # 1. Format check
    if not is_valid_format(email):
        return VerificationResult(
            email=original,
            result="invalid_format",
            verified=False,
            syntax=False,
            reason="invalid_format",
            execution_time_ms=_elapsed_ms(),
        )

    # 2. Typo correction
    correction = check_typo(email)
    if correction is not None:
        return VerificationResult(
            email=original,
            result="invalid",
            verified=False,
            syntax=True,
            typo=True,
            suggested_correction=correction,
            reason="typo",
            flags=["typo"],
            execution_time_ms=_elapsed_ms(),
        )

    domain = extract_domain(email)
    if not domain:
        return VerificationResult(
            email=original,
            result="unknown",
            verified=True,
            syntax=False,
            status="error_no_domain",
            reason="no_domain",
            execution_time_ms=_elapsed_ms(),
        )

    # 3. Disposable
    if is_disposable(domain):
        return VerificationResult(
            email=original,
            result="disposable",
            verified=False,
            syntax=True,
            disposable=True,
            reason="disposable",
            flags=["disposable"],
            execution_time_ms=_elapsed_ms(),
        )

    # 4. Role address (flag only -- keep verifying)
    flags: list[str] = []
    role_flag = False
    local = extract_local(email)
    if local and is_role_address(local):
        role_flag = True
        flags.append("role_address")

    # 5. DNS MX
    try:
        mx_hosts = await get_mx_hosts(domain, timeout)
    except Exception as exc:  # noqa: BLE001 -- defensive; get_mx_hosts swallows its own
        log.debug("MX lookup raised unexpectedly for %s: %s", domain, exc)
        mx_hosts = []

    if not mx_hosts:
        return VerificationResult(
            email=original,
            result="invalid",
            verified=False,
            syntax=True,
            role_address=role_flag,
            mx=False,
            reason="no_mx",
            flags=flags,
            execution_time_ms=_elapsed_ms(),
        )

    flags.append("has_dns")
    mx_host = mx_hosts[0]

    # 6. Catch-all probe -- a provably nonexistent address
    canary = f"xkzqpqxzqpq9zzz@{domain}"
    canary_result = await smtp_probe(canary, mx_host, timeout)
    if canary_result == "valid":
        flags.append("catch_all")
        return VerificationResult(
            email=original,
            result="catchall",
            verified=True,
            syntax=True,
            role_address=role_flag,
            mx=True,
            catch_all=True,
            mx_hosts=mx_hosts,
            reason="catch_all",
            flags=flags,
            execution_time_ms=_elapsed_ms(),
        )

    # 7. Real SMTP probe
    probe = await smtp_probe(email, mx_host, timeout)

    if probe == "valid":
        flags.append("smtp_connectable")
        return VerificationResult(
            email=original,
            result="valid",
            verified=True,
            syntax=True,
            role_address=role_flag,
            mx=True,
            smtp_reachable=True,
            mx_hosts=mx_hosts,
            flags=flags,
            execution_time_ms=_elapsed_ms(),
        )
    if probe == "invalid":
        return VerificationResult(
            email=original,
            result="invalid",
            verified=False,
            syntax=True,
            role_address=role_flag,
            mx=True,
            smtp_reachable=False,
            mx_hosts=mx_hosts,
            reason="mailbox_not_found",
            flags=flags,
            execution_time_ms=_elapsed_ms(),
        )
    return VerificationResult(
        email=original,
        result="unknown",
        verified=True,
        syntax=True,
        role_address=role_flag,
        mx=True,
        smtp_reachable=False,
        mx_hosts=mx_hosts,
        reason="smtp_unknown",
        flags=flags,
        execution_time_ms=_elapsed_ms(),
    )


async def verify_batch(
    emails: list[str],
    timeout: float = 10.0,
    concurrency: int = 8,
) -> list[VerificationResult]:
    """Verify ``emails`` concurrently, preserving input order.

    ``concurrency`` caps simultaneous in-flight verifications to avoid
    overwhelming shared DNS resolvers and SMTP servers.
    """
    sem = asyncio.Semaphore(max(1, concurrency))

    async def _run(addr: str) -> VerificationResult:
        async with sem:
            return await verify_email(addr, timeout=timeout)

    return await asyncio.gather(*(_run(e) for e in emails))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="email_verifier",
        description="Local email verification via DNS + SMTP.",
    )
    parser.add_argument(
        "email",
        nargs="?",
        help="Single email to verify (omit with --batch to read stdin).",
    )
    parser.add_argument(
        "--batch",
        action="store_true",
        help="Read newline-delimited emails from stdin and emit one JSON line per address.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=10.0,
        help="Per-step DNS/SMTP timeout, seconds (default: 10).",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=8,
        help="Max in-flight verifications when --batch (default: 8).",
    )
    return parser


async def _cli_main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    if args.batch:
        raw = sys.stdin.read().splitlines()
        emails = [line.strip() for line in raw if line.strip() and not line.strip().startswith("#")]
        results = await verify_batch(emails, timeout=args.timeout, concurrency=args.concurrency)
        for res in results:
            sys.stdout.write(json.dumps(res.to_dict(), ensure_ascii=False) + "\n")
            sys.stdout.flush()
        return 0

    if not args.email:
        _build_parser().print_help(sys.stderr)
        return 2

    result = await verify_email(args.email, timeout=args.timeout)
    sys.stdout.write(json.dumps(result.to_dict(), ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    sys.exit(asyncio.run(_cli_main()))
