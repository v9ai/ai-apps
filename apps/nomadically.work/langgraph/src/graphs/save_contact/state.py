"""State definitions for the save_contact pipeline."""

from typing import TypedDict


class SaveContactState(TypedDict):
    # Input
    recipient_name: str
    recipient_role: str
    recipient_email: str
    post_url: str

    # Output
    contact_id: int | None
