"""FastAPI server exposing /generate-story (port 8001)."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from story_graph import run_story_graph

app = FastAPI()


class StoryRequest(BaseModel):
    goal_id: int | None = None
    issue_id: int | None = None
    feedback_id: int | None = None
    user_email: str
    language: str = "English"
    minutes: int = 10


@app.post("/generate-story")
async def generate_story(req: StoryRequest):
    try:
        result = run_story_graph(req.model_dump())
        return result  # {"story_id": int, "text": str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Run with: uv run uvicorn server:app --port 8001
