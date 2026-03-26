from typing import TypedDict


class JobReporterState(TypedDict):
    job_id: int
    job_data: dict
    pass1_result: dict | None
    pass2_result: dict | None
    final_result: dict
    stats: dict
