from typing import TypedDict


class EmailReplyState(TypedDict):
    # Input
    original_email: str
    sender: str
    instructions: str
    tone: str
    reply_type: str
    include_calendly: bool
    additional_details: str
    # Output
    subject: str
    body: str
