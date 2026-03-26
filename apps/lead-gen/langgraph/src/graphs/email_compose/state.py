from typing import TypedDict


class EmailComposeState(TypedDict):
    # Input
    recipient_name: str
    company_name: str
    instructions: str
    recipient_context: str
    linkedin_post_content: str
    # Output
    subject: str
    body: str
