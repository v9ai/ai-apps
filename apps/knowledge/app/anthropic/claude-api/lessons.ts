export type Lesson = {
  slug: string;
  title: string;
  estimatedMinutes: number;
  objectives: string[];
  videoMinutes: number;
  videoIntro: string;
  keyTakeaways: string[];
  body: string;
  reflection: string[];
  whatsNext: string;
};

export const COURSE_TITLE = "Building with the Claude API";

export const COURSE_DESCRIPTION =
  "A comprehensive tour of the Claude API — from your first request and multi-turn conversations to tool use, RAG, MCP, prompt caching, and agent workflows.";

export const LESSONS: Lesson[] = [
  {
    slug: "claude-models-and-the-api",
    title: "Claude models and the API",
    estimatedMinutes: 20,
    objectives: [
      "Compare the Opus, Sonnet, and Haiku model families and pick the right one for a task",
      "Describe the 5-step flow from a user's text to a Claude response",
      "Make a first API request with the Anthropic SDK using model, max_tokens, and messages",
    ],
    videoMinutes: 6,
    videoIntro:
      "This lesson introduces the Claude model families and the shape of a Claude API request. You'll see what happens between pressing Enter and getting a response — tokenization, embeddings, contextualization, generation — and write your first request using the Anthropic SDK with model, max_tokens, and a messages list.",
    keyTakeaways: [
      "Opus = highest intelligence (cost/latency trade-off); Sonnet = balanced default with strong coding; Haiku = fastest and cheapest for real-time, high-volume work",
      "Never call the Anthropic API directly from a client — keep your API key on a server that proxies requests",
      "A request needs four things: API key, model name, messages list, and max_tokens",
      "Under the hood: tokenize → embed → contextualize → generate, repeated until max_tokens or an end-of-sequence token",
      "max_tokens is a safety cap on generation length, not a target length",
    ],
    body: `Claude ships as three model families, each optimized for a different priority. Picking the right one is usually the first decision you make when wiring Claude into an app.

## The Three Model Families

- **Opus** — highest intelligence for complex, multi-step tasks that need deep reasoning and planning. You pay for it in cost and latency.
- **Sonnet** — balanced intelligence, speed, and cost. Strong at coding and precise edits. The right default for most use cases.
- **Haiku** — fastest and cheapest. Great for real-time interactions and high-volume processing where you don't need Opus/Sonnet-level reasoning.

A common pattern is to mix models in the same app — use Haiku for classification and routing, Sonnet for the main response, Opus for hard edge cases. All three share the same core capabilities (text, code, image analysis); they differ in how far they lean toward intelligence vs. speed.

## How a Request Flows

The path from user input to response has five steps:

1. The client sends the user's text to your server. Never hit Anthropic directly from a client — keep the API key on the server.
2. Your server calls the Anthropic API using the SDK (Python, TypeScript, Go, Ruby) or plain HTTP, passing an API key, model name, messages list, and \`max_tokens\`.
3. Claude generates text in four sub-stages:
   - **Tokenization** — break input into tokens (words, word parts, symbols, spaces).
   - **Embedding** — turn tokens into lists of numbers representing possible meanings.
   - **Contextualization** — adjust embeddings based on neighbors so each token reflects the specific meaning in context.
   - **Generation** — produce probabilities for the next token, sample one, append, repeat.
4. Claude stops when it reaches \`max_tokens\` or emits a special end-of-sequence token.
5. Anthropic returns the generated text plus token usage and a \`stop_reason\`; your server relays it to the client.

## A First Request

In a notebook, install \`anthropic\` and \`python-dotenv\`, put your key in a \`.env\` file as \`ANTHROPIC_API_KEY=...\`, and initialize a client:

\`\`\`python
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic()
model = "claude-sonnet-4-5"

response = client.messages.create(
    model=model,
    max_tokens=1000,
    messages=[
        {"role": "user", "content": "What is quantum computing?"}
    ],
)

print(response.content[0].text)
\`\`\`

A few vocabulary notes you'll use constantly:

- **Token** — a chunk of text (word, word piece, symbol).
- **Embedding** — numerical representation of a token's meaning.
- **max_tokens** — cap on how much the model can generate, not a target length.
- **stop_reason** — why the model stopped (hit the cap, emitted end-of-sequence, etc.).`,
    reflection: [
      "For an app you're building, which model would you default to, and where would you swap in a cheaper or more capable one?",
      "Why is it unsafe to put your Anthropic API key in a client-side app? What does the server proxy pattern protect?",
    ],
    whatsNext:
      "Next you'll make Claude remember a conversation across turns, steer its style with system prompts, control randomness with temperature, and stream responses chunk-by-chunk.",
  },
  {
    slug: "conversations-system-prompts-and-streaming",
    title: "Conversations, system prompts, and streaming",
    estimatedMinutes: 25,
    objectives: [
      "Maintain multi-turn conversations by passing full message history on every request",
      "Use system prompts to shape Claude's role, tone, and response style",
      "Tune temperature for deterministic vs. creative output",
      "Stream responses chunk-by-chunk for better UX and still capture the full message",
    ],
    videoMinutes: 7,
    videoIntro:
      "The Anthropic API is stateless — it remembers nothing between requests. This lesson covers the three knobs you'll reach for constantly: maintaining message history yourself for multi-turn chat, system prompts for shaping how Claude responds, temperature for controlling randomness, and streaming so users see output as it's generated.",
    keyTakeaways: [
      "The API stores nothing — to get continuity, you append each user and assistant message to a list and send the full list on every follow-up",
      "The system prompt shapes HOW Claude responds (role, tone, constraints), not WHAT it responds — passed via the system keyword argument",
      "Temperature (0–1) controls token-selection randomness: near 0 for extraction and consistency, near 1 for creative/open-ended work",
      "Streaming with client.messages.stream() exposes a text_stream of chunks; call get_final_message() at the end to persist the complete message",
    ],
    body: `Claude's API is stateless. Every request is independent — the server remembers nothing about previous exchanges. That one fact drives how you build conversations.

## Multi-Turn Conversations

To keep context, you maintain the message list yourself and send the whole history on every follow-up:

\`\`\`python
messages = []

def add_user_message(messages, text):
    messages.append({"role": "user", "content": text})

def add_assistant_message(messages, text):
    messages.append({"role": "assistant", "content": text})

def chat(messages):
    response = client.messages.create(
        model=model, max_tokens=1000, messages=messages
    )
    return response.content[0].text

add_user_message(messages, "What's the capital of France?")
reply = chat(messages)
add_assistant_message(messages, reply)

add_user_message(messages, "And of Germany?")
reply = chat(messages)  # now has full context
\`\`\`

Skip the history and Claude has no idea what "And of Germany?" refers to. Include it and the follow-up lands cleanly.

## System Prompts

System prompts customize Claude's role and response style. They control HOW Claude responds, not WHAT. Pass one via the \`system\` keyword argument:

\`\`\`python
client.messages.create(
    model=model,
    max_tokens=1000,
    system="You are a patient math tutor. Give hints, not full answers. Encourage the student to think through each step.",
    messages=messages,
)
\`\`\`

The first line usually assigns a role; the rest specifies behavior. The same user question gets very different treatment depending on the assigned role.

A practical pattern is to build a params dictionary and only attach the \`system\` key when you have one:

\`\`\`python
params = {"model": model, "max_tokens": 1000, "messages": messages}
if system_prompt:
    params["system"] = system_prompt
response = client.messages.create(**params)
\`\`\`

## Temperature

Temperature (0–1) controls randomness in token selection. Text generation assigns probabilities to each possible next token; temperature reshapes that distribution.

- **Temperature 0** — deterministic. Claude always picks the highest-probability token.
- **Higher temperature** — flatter distribution. Lower-probability tokens get picked more often, yielding more varied or surprising output.

Rule of thumb:

- **Near 0** — data extraction, classification, anything where consistency matters.
- **Near 1** — brainstorming, creative writing, jokes, marketing copy.

Higher temperature doesn't *guarantee* different outputs; it just makes variation more likely.

## Streaming

Responses can take 10–30 seconds. Users hate watching spinners. Streaming sends the response to the client chunk-by-chunk as it's generated.

Use \`client.messages.stream()\` — the simpler wrapper:

\`\`\`python
with client.messages.stream(
    model=model,
    max_tokens=1000,
    messages=messages,
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    final = stream.get_final_message()
\`\`\`

\`text_stream\` yields just the text deltas. \`get_final_message()\` assembles the full message for storage — so you still get one complete assistant message to append to your history.

Under the hood, streaming is a series of events: \`message_start\`, \`content_block_start\`, a sequence of \`content_block_delta\` events containing the actual text chunks, then \`content_block_stop\` and \`message_stop\`. The \`stream()\` helper hides most of that.`,
    reflection: [
      "When would temperature 0 be a bug rather than a feature — what kind of task needs variety across identical inputs?",
      "Streaming is great UX but adds complexity. For which of your use cases is the wait time long enough that streaming is worth it?",
    ],
    whatsNext:
      "Next you'll learn two surgical ways to steer Claude without rewriting the prompt: pre-filling assistant messages to shape direction, and stop sequences to halt generation exactly where you want.",
  },
  {
    slug: "controlling-model-output",
    title: "Controlling model output",
    estimatedMinutes: 20,
    objectives: [
      "Pre-fill assistant messages to steer response direction and format",
      "Use stop sequences to halt generation at a specific string",
      "Combine pre-fill + stop sequences to extract structured data without extra commentary",
    ],
    videoMinutes: 6,
    videoIntro:
      "Two techniques beyond prompt rewording give you precise control over Claude's output: pre-filling the start of the assistant's message to set its direction, and stop sequences to cut generation off at a known marker. Together they're how you get clean JSON, Python, or any structured output without Claude's usual 'Here's your code:' preamble.",
    keyTakeaways: [
      "Pre-filling: manually appending an assistant message at the end of the conversation makes Claude continue from exactly where that text ends",
      "Claude continues from the exact endpoint of a pre-fill, not from the start of a complete sentence — you stitch pre-fill + generation yourself",
      "Stop sequences force generation to halt when a string appears; the triggering string is NOT included in the output",
      "The combo pattern for structured data: pre-fill with an opening delimiter like ```json and set a stop sequence at the closing ```",
    ],
    body: `Two techniques let you control output without changing the core prompt.

## Pre-Filling Assistant Messages

Normally your messages list ends with a user message and Claude writes a new assistant message from scratch. Pre-filling means you manually append an assistant message at the end — Claude sees it as text it already wrote and *continues* from exactly that point.

\`\`\`python
messages = [
    {"role": "user", "content": "Is coffee or tea better?"},
    {"role": "assistant", "content": "Coffee is better because"},
]
\`\`\`

Claude now picks up with the justification. Important detail: Claude continues from the exact endpoint of the pre-fill, not from the start of a new sentence. The final response you show the user is \`pre-fill + generated text\` — stitch them yourself.

Use pre-fill to:

- Force a response format (start with \`{\` for JSON, \`<answer>\` for XML-ish output).
- Bias direction (start with "Yes, because" to commit to an answer).
- Skip preamble ("Here's how..." etc.).

## Stop Sequences

A stop sequence is a string that, when generated, causes Claude to halt immediately. The stop string itself is **not** included in the output.

\`\`\`python
response = client.messages.create(
    model=model,
    max_tokens=1000,
    messages=[{"role": "user", "content": "Count from 1 to 10."}],
    stop_sequences=["five"],
)
\`\`\`

Claude stops somewhere around \`"one, two, three, four, "\`. Adjust the stop sequence to control exactly where it cuts off — \`", five"\` gives you a clean \`"one, two, three, four"\`.

## Structured Data: Pre-fill + Stop Sequence

The killer combo. Say you want raw JSON with no commentary:

\`\`\`python
response = client.messages.create(
    model=model,
    max_tokens=1000,
    messages=[
        {"role": "user", "content": "Give me 3 cities as JSON with name and country."},
        {"role": "assistant", "content": "\`\`\`json"},
    ],
    stop_sequences=["\`\`\`"],
)
json_text = response.content[0].text  # raw JSON, no backticks
\`\`\`

What happens:

1. Pre-fill opens a \`\`\`json\` fence. Claude assumes it's mid-response and jumps straight to the JSON.
2. As soon as Claude tries to close the fence with \`\`\`\`\`, the stop sequence fires and generation halts.
3. You get only the JSON body, ready to parse.

This pattern works for any structured output — JSON, Python, regex, CSV. Use it whenever you need parseable output without explanatory text.`,
    reflection: [
      "Think of a place in your app where you had to post-process Claude's output to strip headers or commentary. Could pre-fill + stop sequence replace that post-processing?",
      "Pre-filling commits Claude to a direction. When is that helpful, and when might it bias the model in a way you don't want?",
    ],
    whatsNext:
      "Controlling output by hand is useful, but for serious prompt work you want to measure quality objectively. Next: building a prompt evaluation pipeline — dataset, runner, and grader — so you can iterate on prompts with real numbers.",
  },
  {
    slug: "prompt-evaluation",
    title: "Prompt evaluation",
    estimatedMinutes: 30,
    objectives: [
      "Describe the 6-step evaluation workflow that replaces ad-hoc prompt testing",
      "Generate a test dataset — by hand or automatically with Claude",
      "Run a prompt across a dataset and collect outputs",
      "Grade outputs using code-based validators and model-based graders",
    ],
    videoMinutes: 10,
    videoIntro:
      "Most engineers under-test prompts — they try two inputs, ship it, and find the regressions in production. This lesson builds a proper evaluation pipeline: test dataset, prompt runner, grader. You'll see both code-based grading (JSON/Python/regex syntax checks) and model-based grading (a second Claude call that scores quality) and learn how to combine them.",
    keyTakeaways: [
      "The workflow: draft prompt → build dataset → generate variations → run prompt → grade → iterate",
      "Datasets can start at 3 examples and grow. Use a cheaper model like Haiku to generate them programmatically",
      "Code graders check syntax objectively (valid JSON? parseable Python? compiling regex?) and return 10/0",
      "Model graders are flexible for quality/instruction-following but can be inconsistent — always ask for reasoning, not just a score, to avoid default middling numbers",
      "A final score combining model grade and syntax grade gives you both correctness AND technical validity",
    ],
    body: `After you write a prompt, most engineers take one of three paths. The first two are traps.

1. Test once or twice, ship it.
2. Tweak based on corner cases as they come up.
3. Run it through an evaluation pipeline and get objective scores. (This one.)

## The Eval Workflow

Six steps, iterated:

1. **Draft an initial prompt** — your baseline to optimize against.
2. **Build a dataset** — test inputs you'll run through the prompt. Three examples is fine to start.
3. **Generate variations** — interpolate each dataset input into the prompt template.
4. **Get Claude's responses** — run every variation through the model and collect outputs.
5. **Grade responses** — score each output (1–10 is typical) and average them.
6. **Iterate** — tweak the prompt, re-run, compare.

## Generating a Test Dataset

You can write test cases by hand or ask Claude to generate them. For generation, use a fast/cheap model like Haiku:

\`\`\`python
def generate_dataset():
    messages = [
        {"role": "user", "content": "Generate 10 test tasks for an AWS coding assistant. Each should be a realistic user request. Return a JSON array of objects with a 'task' field."},
        {"role": "assistant", "content": "\`\`\`json"},
    ]
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=2000,
        messages=messages,
        stop_sequences=["\`\`\`"],
    )
    with open("dataset.json", "w") as f:
        f.write(response.content[0].text)
\`\`\`

Each test case is a JSON object — \`{"task": "..."}\` — that you'll interpolate into your prompt.

## Running the Eval

Three functions form the core:

- \`run_prompt(test_case)\` — merges the case into your prompt and calls Claude.
- \`run_test_case(test_case)\` — calls \`run_prompt\`, grades the result, returns a summary.
- \`run_eval(dataset)\` — loops over the dataset and aggregates results.

A minimal v1:

\`\`\`python
def run_prompt(test_case):
    prompt = f"Please solve the following task: {test_case['task']}"
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text

def run_test_case(test_case):
    output = run_prompt(test_case)
    score = grade(output, test_case)  # fill in next
    return {"test_case": test_case, "output": output, "score": score}
\`\`\`

## Code-Based Grading

Programmatic checks. Cheap, deterministic, great for structured output:

\`\`\`python
import json, ast, re

def validate_json(s):
    try: json.loads(s); return 10
    except: return 0

def validate_python(s):
    try: ast.parse(s); return 10
    except: return 0

def validate_regex(s):
    try: re.compile(s); return 10
    except: return 0
\`\`\`

Tag each test case with an expected \`format\` key so the runner picks the right validator.

## Model-Based Grading

A second Claude call that scores the first model's output. Way more flexible — you can grade for quality, tone, instruction-following — but flaky if you just ask for a number. Always ask for reasoning first:

\`\`\`python
grader_prompt = f"""
Evaluate the following output for the given task.

<task>{test_case['task']}</task>
<output>{output}</output>

Respond with JSON: strengths, weaknesses, reasoning, score (1-10, where 10 is excellent).
"""
\`\`\`

Use the pre-fill + stop sequence pattern from the previous lesson to get clean JSON back, parse it, and extract the score.

## Combined Scoring

Code graders catch syntax. Model graders catch semantics. Average them:

\`\`\`python
final_score = (model_score + syntax_score) / 2
\`\`\`

Now you have a single number per test case, an average across the dataset, and a way to compare prompt v1 vs v2 with real evidence.`,
    reflection: [
      "How many test cases would you need before you trusted an eval score to compare two prompts?",
      "Model grading is flexible but inconsistent. Where in your workflow would you trust a model grader, and where would you insist on code-based validation?",
    ],
    whatsNext:
      "Now that you can measure prompt quality, you'll apply proven engineering techniques to systematically improve scores — clear directives, specificity, XML structure, and examples.",
  },
  {
    slug: "prompt-engineering-techniques",
    title: "Prompt engineering techniques",
    estimatedMinutes: 25,
    objectives: [
      "Open prompts with clear, direct language and an action verb",
      "Add specificity through both attribute guidelines and reasoning steps",
      "Structure multi-section prompts with descriptive XML tags",
      "Use one-shot and multi-shot examples to demonstrate desired output",
    ],
    videoMinutes: 8,
    videoIntro:
      "This lesson walks through four prompt engineering techniques and shows their impact on eval scores. You'll watch a meal-plan prompt climb from a 2.32 baseline to near-perfect scores as you apply clear directives, specificity, XML structure, and examples — and learn when each technique is worth reaching for.",
    keyTakeaways: [
      "The first line matters most — open with an action verb and a direct task statement",
      "Two kinds of specificity: attributes (what the output looks like) and steps (how to reason about it). Combine both for complex prompts",
      "XML tags like <athlete_info> and <docs> make the structure of interpolated content obvious to Claude — use descriptive names",
      "Examples (one-shot/multi-shot) dramatically improve corner-case handling, format-sensitive output, and ambiguous tasks",
      "Include reasoning WITH examples — tell Claude WHY the example is ideal, not just what it looks like",
    ],
    body: `Prompt engineering is the set of moves you use to help Claude understand what you want and deliver it reliably. The techniques below are ordered from highest-leverage to more situational.

## Be Clear and Direct

The first line sets the foundation. Open with an action verb and a direct task statement:

- "Write three paragraphs about how solar panels work."
- "Identify three countries that use geothermal energy and include generation stats for each."
- "Generate a one-day meal plan for an athlete that meets their dietary restrictions."

Action verb + clear task + output specifics. In the meal-plan example, this alone lifted scores from 2.32 to 3.92.

## Be Specific

Two flavors of specificity, usually combined:

**Type A — Attributes.** List qualities the output should have. Length, structure, format, tone. Use this on almost every prompt.

**Type B — Steps.** Provide a reasoning sequence for Claude to follow. Use this for complex problems where you want Claude to consider angles it might not reach on its own.

For the meal plan: attributes = "breakfast/lunch/dinner/snack, macros per meal, total daily calories." Steps = "1) compute caloric target from height/weight/goal; 2) compute macro split; 3) pick foods; 4) verify totals." Adding both jumped the score from 3.92 to 7.86.

## Structure with XML Tags

When you interpolate large or mixed content into a prompt, wrap the sections in descriptive XML tags. Claude uses them to distinguish roles of text:

\`\`\`text
Debug this code using the attached docs.

<my_code>
def calculate_tax(amount): return amount * .08
</my_code>

<docs>
Tax rate is region-specific. California: 7.25%. ...
</docs>
\`\`\`

Rules of thumb:

- Use specific tag names. \`<sales_records>\` beats \`<data>\`.
- Wrap even small interpolated content when it's coming from outside the prompt — \`<athlete_information>\` makes clear it's input to consider.
- Tag names serve you too — they make long prompts easier to read and edit.

## Provide Examples

One-shot = one example. Multi-shot = several. Examples are the highest-leverage technique when output format or style is tricky.

\`\`\`text
Analyze the sentiment of the review.

<example>
<review>"The product broke after a day. Love it." </review>
<output>{"sentiment": "negative", "reason": "sarcasm — 'Love it' contradicts the complaint"}</output>
</example>

<review>"Shipping was fast but the box was crushed." </review>
\`\`\`

Best practices:

- Use XML to separate examples from the real request.
- Add context when needed: "Be especially careful with sarcasm."
- Include reasoning that explains WHY the example is ideal.
- Pull your highest-scoring eval outputs back in as examples — reinforce what worked.

Apply the techniques in order and re-run your evals after each. The gains compound, and your baseline score tells you whether a given technique was worth the added prompt length.`,
    reflection: [
      "Pick one prompt from a project you've worked on. Which technique (direct, specific, XML, examples) would give the biggest lift, and why?",
      "Examples are powerful but lengthen the prompt. At what point does the cost of a longer prompt outweigh the quality gain?",
    ],
    whatsNext:
      "Next: tool use. You'll let Claude reach beyond its training data by exposing Python functions it can call — the foundation for everything from weather lookups to agentic workflows.",
  },
  {
    slug: "tool-use-fundamentals",
    title: "Tool use fundamentals",
    estimatedMinutes: 30,
    objectives: [
      "Explain why tools are needed and the 5-step tool-use flow",
      "Define tool functions with descriptive names, input validation, and clear errors",
      "Write JSON schemas that describe tools to Claude",
      "Handle multi-block assistant messages and send tool_result blocks back correctly",
    ],
    videoMinutes: 10,
    videoIntro:
      "Out of the box, Claude only knows what was in its training data. Tool use is how you bridge that gap — giving Claude a menu of functions it can request to run. This lesson covers the full round trip: writing the tool, describing it with a JSON schema, handling Claude's tool_use blocks, and returning tool_result blocks in the follow-up request.",
    keyTakeaways: [
      "Tool-use flow: send request + tool schemas → Claude requests a tool → your server runs it → send a follow-up with the result → Claude produces the final answer",
      "Tool functions are plain Python — use descriptive names, validate inputs, and raise ValueError with messages that help Claude retry",
      "JSON schemas tell Claude what tools exist and what arguments they take. Include a 3–4 sentence description of WHEN to use the tool",
      "Assistant messages with tools can contain multiple blocks: a text block AND one or more tool_use blocks. Append the WHOLE content array to history, not just the text",
      "Every tool_use block has an id. The matching tool_result block must reference that exact tool_use_id",
    ],
    body: `Out of the box, Claude can only work with information from its training data. Tools let you extend that — you expose Python functions that Claude can ask to run when it needs something it doesn't know.

## The Flow

Tool use is a two-round-trip dance:

1. Your server sends the user's request along with a list of tool schemas.
2. Claude decides a tool is needed and returns a \`tool_use\` block with a \`name\`, \`id\`, and \`input\` (arguments).
3. Your server runs the function with those arguments.
4. Your server sends a follow-up request containing the original messages plus a new user message with a \`tool_result\` block referencing the \`tool_use\` id.
5. Claude produces a final text response informed by the tool result.

## Tool Functions

Tool functions are plain Python. Three habits make them robust:

1. Descriptive names for the function and arguments.
2. Validate inputs and raise errors immediately on bad input.
3. Error messages that Claude can read and retry from.

\`\`\`python
from datetime import datetime

def get_current_datetime(date_format="%Y-%m-%d %H:%M:%S"):
    if not date_format:
        raise ValueError("date_format cannot be empty")
    return datetime.now().strftime(date_format)
\`\`\`

## Tool Schemas

Claude doesn't see your Python source — it sees a JSON schema you write describing the tool:

\`\`\`python
from anthropic.types import ToolParam

get_current_datetime_schema = ToolParam({
    "name": "get_current_datetime",
    "description": "Get the current date and time. Use this whenever the user asks about the current time, today's date, or needs a timestamp.",
    "input_schema": {
        "type": "object",
        "properties": {
            "date_format": {
                "type": "string",
                "description": "A Python strftime format string. Defaults to '%Y-%m-%d %H:%M:%S'."
            }
        },
        "required": [],
    },
})
\`\`\`

The \`description\` field is critical — write 3–4 sentences covering what the tool does, when Claude should use it, and what data it returns. Wrap the dict with \`ToolParam\` to prevent type errors.

Quick trick for generating schemas: paste your function into Claude.ai with "write a JSON schema for tool calling for this function following the Anthropic API documentation" and the tool-use docs page attached.

## Handling Multi-Block Messages

When you enable tools, the assistant message can contain multiple content blocks: a \`text\` block AND one or more \`tool_use\` blocks. Your history-helper functions need to handle that — append the full \`response.content\` array, not just the text:

\`\`\`python
def add_assistant_message(messages, response):
    messages.append({"role": "assistant", "content": response.content})
\`\`\`

## Sending Tool Results

For the follow-up request, add a user message containing a \`tool_result\` block:

\`\`\`python
messages.append({
    "role": "user",
    "content": [
        {
            "type": "tool_result",
            "tool_use_id": tool_use_block.id,
            "content": str(result),           # stringify the tool output
            "is_error": False,
        }
    ],
})
response = client.messages.create(
    model=model,
    max_tokens=1000,
    tools=[get_current_datetime_schema],     # include schemas again
    messages=messages,
)
\`\`\`

Three details matter:

- \`tool_use_id\` must match the \`id\` of the \`tool_use\` block you're responding to — Claude uses this to pair results with requests when it calls multiple tools at once.
- \`content\` is a string. JSON-encode complex outputs.
- \`is_error: True\` tells Claude the function threw — it can retry with different arguments.

You must include the tool schemas again on the follow-up request. They don't persist.`,
    reflection: [
      "What's a task your app can't handle today because Claude lacks fresh data? Sketch the tool schema you'd add.",
      "Tool functions can raise errors that Claude sees. How would that change how you write validation logic compared to a normal internal API?",
    ],
    whatsNext:
      "A real agent calls multiple tools across multiple turns. Next you'll build the loop that keeps calling Claude until it stops requesting tools, run multiple tools at once, and use the batch tool to parallelize calls.",
  },
  {
    slug: "multi-turn-tool-conversations",
    title: "Multi-turn tool conversations",
    estimatedMinutes: 30,
    objectives: [
      "Build a loop that keeps calling Claude until no more tools are requested",
      "Dispatch multiple tool_use blocks in parallel and return all results",
      "Use the batch tool to trick Claude into parallelizing independent calls",
      "Extract structured data via tools using tool_choice to force a tool call",
    ],
    videoMinutes: 10,
    videoIntro:
      "One tool call is rarely enough. Users ask questions that need Claude to chain tools — compute a date, then set a reminder with the result. This lesson builds the conversation loop that handles arbitrary tool chains, introduces the batch tool pattern for parallelism, and shows how tool_choice forces reliable structured-data extraction.",
    keyTakeaways: [
      "Loop on stop_reason: while it equals 'tool_use', run tools and append results; break on any other stop_reason",
      "A single assistant message can carry multiple tool_use blocks — iterate through all of them and return all tool_result blocks in one follow-up user message",
      "Claude rarely parallelizes tool calls on its own. The batch tool schema — an 'invocations' list — forces a one-shot parallel pattern",
      "For reliable structured output, define a tool whose input_schema is the desired shape and set tool_choice to force it — more reliable than pre-fill + stop sequences",
      "Fine-grained tool calling disables JSON validation mid-stream for faster input_json_delta events, at the cost of potentially invalid JSON",
    ],
    body: `A single round trip handles simple questions. Real tasks need chains — "what day is 103 days from today?" needs \`get_current_datetime\` AND \`add_duration_to_datetime\`. You build a loop.

## The Conversation Loop

The key signal is \`response.stop_reason\`. When it equals \`"tool_use"\`, Claude wants to call a tool. Anything else means it's done.

\`\`\`python
def run_conversation(messages, tools):
    while True:
        response = client.messages.create(
            model=model, max_tokens=1000, tools=tools, messages=messages,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return response

        tool_results = run_tools(response.content)
        messages.append({"role": "user", "content": tool_results})
\`\`\`

## Running Multiple Tools at Once

Assistant messages can contain many \`tool_use\` blocks. Process them all:

\`\`\`python
def run_tools(content_blocks):
    results = []
    for block in content_blocks:
        if block.type != "tool_use":
            continue
        try:
            output = run_tool(block.name, block.input)
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(output),
                "is_error": False,
            })
        except Exception as e:
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": str(e),
                "is_error": True,
            })
    return results

def run_tool(name, args):
    if name == "get_current_datetime":
        return get_current_datetime(**args)
    if name == "add_duration_to_datetime":
        return add_duration_to_datetime(**args)
    if name == "set_reminder":
        return set_reminder(**args)
    raise ValueError(f"unknown tool: {name}")
\`\`\`

Adding a new tool becomes a three-step pattern: schema → routing case → function.

## The Batch Tool

Claude *can* emit multiple \`tool_use\` blocks in one message but usually doesn't. To force parallelism, expose a meta-tool whose input is a list of invocations:

\`\`\`python
batch_schema = {
    "name": "batch",
    "description": "Run several tools in parallel. Prefer this over sequential tool calls when the tools don't depend on each other.",
    "input_schema": {
        "type": "object",
        "properties": {
            "invocations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "tool_name": {"type": "string"},
                        "arguments": {"type": "string"},
                    },
                },
            }
        },
    },
}

def run_batch(invocations):
    outputs = []
    for inv in invocations:
        args = json.loads(inv["arguments"])
        outputs.append(run_tool(inv["tool_name"], args))
    return outputs
\`\`\`

Claude now calls \`batch\` once with three invocations instead of three sequential rounds.

## Tools for Structured Data

Instead of pre-fill + stop sequences, define a tool whose \`input_schema\` *is* the data shape you want. Force Claude to call it via \`tool_choice\`:

\`\`\`python
extract_schema = {
    "name": "extract_person",
    "description": "Extract a person's name, age, and occupation from text.",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age": {"type": "integer"},
            "occupation": {"type": "string"},
        },
        "required": ["name"],
    },
}

response = client.messages.create(
    model=model,
    max_tokens=1000,
    tools=[extract_schema],
    tool_choice={"type": "tool", "name": "extract_person"},
    messages=[{"role": "user", "content": "Extract: Ada Lovelace, 36, mathematician."}],
)
data = response.content[0].input  # dict matching your schema
\`\`\`

No tool_result round trip needed — you just read the structured arguments off the \`tool_use\` block. More reliable than prompt tricks, more setup.

## Fine-Grained Tool Calling

In streaming, Claude emits \`input_json_delta\` events as it builds tool arguments. By default the API buffers chunks until a complete top-level key-value pair validates against the schema — this batches chunks but also delays them.

Set fine-grained mode (\`fine_grained: true\`) to disable validation and stream chunks as generated. Faster streaming, but you have to handle potentially invalid JSON client-side (e.g. an "undefined" instead of null). Use it when you want immediate UI updates; skip it when delay is fine.`,
    reflection: [
      "In your app, when would the batch tool matter — i.e., when do you have genuinely independent tool calls Claude could run in parallel?",
      "Tools for structured data are more reliable than pre-fill + stop sequences but heavier. Where's the tipping point for you?",
    ],
    whatsNext:
      "Anthropic ships built-in tools you don't have to schema yourself — a text editor for file manipulation, web search for fresh info, code execution in a sandbox, and a Files API for uploading data. That's next.",
  },
  {
    slug: "built-in-tools-and-code-execution",
    title: "Built-in tools: text editor, web search, code execution, Files API",
    estimatedMinutes: 25,
    objectives: [
      "Use the text editor tool to give Claude file-level read/write/create/replace capabilities",
      "Configure the web search tool with max_uses and allowed_domains for controlled retrieval",
      "Run code execution in a sandboxed container and handle citations/web results blocks",
      "Upload files via the Files API and reference them by ID in container uploads",
    ],
    videoMinutes: 8,
    videoIntro:
      "Anthropic provides several built-in tools that skip the schema-writing step. This lesson covers the text editor tool (for file operations), the web search tool (with domain restrictions for quality control), code execution inside a Docker sandbox, and the Files API for staging uploads. Together they turn Claude into a lightweight code editor and data analyst.",
    keyTakeaways: [
      "The text editor tool ships a minimal stub (name + versioned type) that Claude expands internally — you still write the file-system implementation yourself",
      "Web search auto-runs searches, returns web_search_result and citation blocks, and supports max_uses and allowed_domains for quality control",
      "Code execution runs Python in an isolated Docker container with no network access — connect it to data via the Files API",
      "Files API uploads return a file_id you include in a container_upload block so Claude's sandbox can read uploaded files",
      "Claude can also emit files (plots, reports) inside the container; you download them using the returned file IDs",
    ],
    body: `Some tools are useful enough that Anthropic ships them built-in. You still need a server to handle certain pieces (the text editor's file I/O), but you don't write the schemas.

## The Text Editor Tool

File operations — view, create, replace, insert, undo. Schemas for this tool are built into Claude; you send a short stub with a name and versioned type and Claude expands it internally:

\`\`\`python
tools = [{"type": "text_editor_20250429", "name": "str_replace_based_edit_tool"}]
\`\`\`

The version string varies by model — check the docs for the one that matches your Claude version.

What Claude *doesn't* provide: the actual file-system code. You implement a handler for its tool_use requests — \`view\`, \`str_replace\`, \`create\`, etc. That's your I/O layer. Use cases: mimicking an AI code editor, automating refactors, multi-file project manipulation.

## The Web Search Tool

For up-to-date info. No custom code — Claude runs the searches itself.

\`\`\`python
tools = [{
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5,
    "allowed_domains": ["nih.gov", "pubmed.ncbi.nlm.nih.gov"],  # optional
}]
\`\`\`

Key options:

- \`max_uses\` caps total searches for this request (default 5).
- \`allowed_domains\` scopes results — great for medical/legal/financial contexts where you want sourcing quality.

Responses contain multiple block types:

- \`text\` — Claude's explanation.
- \`server_tool_use\` — search queries Claude ran.
- \`web_search_tool_result\` — pages found (title, URL).
- Citations — attached to specific spans of text so you can highlight "this sentence came from this source."

## Code Execution

Claude runs Python in a sandboxed Docker container. Add the tool and ask — no implementation required.

\`\`\`python
tools = [{"type": "code_execution_20250522", "name": "code_execution"}]
\`\`\`

Constraints to remember:

- The container has **no network access**.
- Data flows in and out via the Files API.
- Claude can run code multiple times, interpret results, then write a final answer.

## The Files API

Upload files ahead of time, reference by ID later:

\`\`\`python
file_obj = client.beta.files.upload(file=("data.csv", open("data.csv", "rb")))
file_id = file_obj.id

messages = [{
    "role": "user",
    "content": [
        {"type": "container_upload", "file_id": file_id},
        {"type": "text", "text": "Summarize the CSV and plot revenue by month."},
    ],
}]
\`\`\`

Claude's code execution tool sees the upload in the container and can read it with standard Python. When Claude writes new files (plots, reports), the response includes file IDs you download from the Files API.

Combined workflow: upload → reference by ID → ask → Claude writes and runs code → returns analysis and new file IDs → download. Good for one-off data analysis without standing up your own data pipeline.`,
    reflection: [
      "For your use case, which built-in tool replaces the most custom code you'd otherwise write?",
      "Web search with allowed_domains is a quality lever. Where would you use it, and what's the downside of over-constraining?",
    ],
    whatsNext:
      "Giving Claude tools is one way to augment its knowledge. A different approach — better for large documents — is retrieval augmented generation. Next: chunking, embeddings, and the full RAG flow.",
  },
  {
    slug: "retrieval-augmented-generation",
    title: "Retrieval augmented generation",
    estimatedMinutes: 35,
    objectives: [
      "Compare stuffing-everything-in-the-prompt vs. RAG and explain the trade-offs",
      "Choose among size-based, structure-based, and semantic chunking strategies",
      "Build the full RAG flow: chunk → embed → index → query → retrieve → answer",
      "Improve a RAG pipeline with BM25, reciprocal rank fusion, reranking, and contextual retrieval",
    ],
    videoMinutes: 12,
    videoIntro:
      "RAG is how you answer questions over large documents without blowing through context limits. This lesson walks through chunking strategies, text embeddings, a vector-search-based retrieval flow, and the improvements that move a naive pipeline from 'eh' to 'production' — BM25 lexical search, reciprocal rank fusion, LLM reranking, and contextual retrieval.",
    keyTakeaways: [
      "RAG = split the document into chunks, retrieve the relevant ones at query time, stuff only those into the prompt",
      "Chunking strategies: size-based (use overlap), structure-based (headers/sections, needs reliable formatting), semantic (group by meaning, most complex)",
      "Embeddings encode meaning as vectors; cosine similarity finds relevant chunks. Anthropic recommends Voyage AI for embeddings",
      "Semantic search misses exact term matches — hybrid search combines it with BM25 lexical search using reciprocal rank fusion",
      "Reranking uses an LLM to re-order retrieved results. Contextual retrieval prepends a short generated summary to each chunk before embedding, fixing the lost-document-context problem",
    ],
    body: `Large documents don't fit in prompts. Token limits, slower responses, higher costs, and degraded accuracy on long inputs all bite. RAG is the answer.

## The Core Idea

Instead of stuffing the whole document, split it into chunks, retrieve only the relevant ones for a given query, and include just those in the prompt. The trade-offs:

- Smaller prompts, lower cost, faster responses, better accuracy on long docs.
- More complexity: preprocessing, chunking, search.
- No guarantee that retrieved chunks contain the full context needed.

## Chunking Strategies

**Size-based** — split by character count. Easiest to implement, most common in production. Downside: cuts off mid-sentence and loses context. Fix: chunk with overlap so neighboring chunks share boundary text.

**Structure-based** — split on headers, paragraphs, sections. Best for markdown, HTML, and other documents with reliable structure. Fails when formatting isn't guaranteed.

**Semantic** — use NLP to group related sentences. Most advanced, most complex. Reach for this only when the simpler strategies underperform on your corpus.

No universal best. Match the strategy to the document type you're actually processing.

## Text Embeddings

An embedding model turns text into a list of floating-point numbers (each in roughly -1 to +1). Each number implicitly scores some learned quality of the text. You can't introspect what each number means — but vectors for semantically similar text end up near each other in space.

That nearness is what powers retrieval. Given a query's embedding, find the chunk embeddings closest to it by **cosine similarity** (or equivalently, smallest cosine distance = 1 - similarity). Anthropic recommends Voyage AI for embeddings.

## The Full RAG Flow

Pre-processing (once):

1. Chunk the document.
2. Generate an embedding per chunk.
3. Store (embedding, chunk text) pairs in a vector database.

Runtime (per query):

4. Embed the user's query with the same model.
5. Retrieve the top-K most similar chunks by cosine similarity.
6. Assemble a prompt with the query plus retrieved chunks.
7. Ask Claude.

\`\`\`python
chunks = chunk_by_section(open("report.md").read())
embeddings = generate_embedding(chunks)      # batch call
store = VectorIndex()
for chunk, emb in zip(chunks, embeddings):
    store.add_vector(emb, {"content": chunk})

q_emb = generate_embedding(["What did the SE team ship last year?"])[0]
top_k = store.search(q_emb, 2)
\`\`\`

## Going Hybrid with BM25

Semantic search misses exact-term matches. Ask about a specific incident ID and vector search may hand back semantically-adjacent fluff instead of the paragraph that names the ID. BM25 (Best Match 25) is a lexical algorithm that scores documents by how often query terms appear, weighted by their rarity across the corpus.

Hybrid search runs both and merges the result lists. A common merging technique is **reciprocal rank fusion**:

\`\`\`text
score(doc) = Σ over methods (1 / (rank_in_method + 1))
\`\`\`

Docs ranked high in multiple methods float to the top. Wrap the two indexes behind a Retriever class with a common \`search()\` / \`add_document()\` API and you can swap or add search paradigms freely.

## Reranking

A final pass: take the top merged results, hand them to an LLM, and ask it to re-order them by relevance to the query. Usually you pass document IDs (not full text) to save tokens, with a pre-fill + stop-sequence pattern for clean JSON output. Adds latency but catches the cases where hybrid search ordered things subtly wrong.

## Contextual Retrieval

Chunking strips each chunk of the surrounding document. Contextual retrieval fixes this: before embedding, generate a short context summary explaining where the chunk lives in the larger doc and prepend it:

\`\`\`python
def add_context(chunk, source_text):
    context = claude_summarize(
        f"Briefly situate this chunk in the larger document: <chunk>{chunk}</chunk> <doc>{source_text}</doc>"
    )
    return f"{context}\\n\\n{chunk}"
\`\`\`

For big documents, don't pass the whole thing — use a selective strategy: the first few chunks for the abstract/intro, plus the chunks immediately before the target for local context. Embed the *contextualized* chunk. Retrieval accuracy jumps meaningfully.`,
    reflection: [
      "Pick a document type you care about. Which chunking strategy fits best, and why?",
      "Reranking and contextual retrieval both add latency and cost. Which would you adopt first, and what signal would you use to decide it's worth it?",
    ],
    whatsNext:
      "Next: everything else in the Claude API you'll reach for — extended thinking for hard problems, vision and PDFs for multimodal input, citations, and prompt caching to cut latency and cost on repeated content.",
  },
  {
    slug: "vision-pdfs-citations-thinking-caching",
    title: "Vision, PDFs, citations, extended thinking, and prompt caching",
    estimatedMinutes: 30,
    objectives: [
      "Enable extended thinking and manage thinking_budget vs. max_tokens",
      "Include images in user messages for analysis, counting, and comparison tasks",
      "Process PDFs (text, images, charts, tables) with a document block",
      "Turn on citations to show exact source spans behind Claude's claims",
      "Apply prompt caching to tools and system prompts, and track cache_read vs. cache_creation tokens",
    ],
    videoMinutes: 10,
    videoIntro:
      "This lesson rounds out the API's power features. You'll enable extended thinking for complex reasoning, feed Claude images and PDFs, surface citations back to users, and cut latency and cost on repeated requests with prompt caching. These are the features you reach for after prompt engineering has plateaued.",
    keyTakeaways: [
      "Extended thinking: set a thinking_budget (min 1024) and ensure max_tokens > budget. Thinking blocks are signed to prevent tampering",
      "Redacted thinking blocks show up when safety systems flag reasoning — preserve them for continuity; they can be forced with a test string for debugging",
      "Image and PDF inputs use the same shape: a content block with type 'image' or 'document' and either base64 data or a URL reference",
      "Images consume tokens based on pixel area. Strong prompts (step-by-step, examples, verification) matter as much as image quality",
      "Prompt caching: add cache_control: {type: 'ephemeral'} breakpoints to cache tools, system prompts, or prefix messages. Cache lives ~1 hour; any change before a breakpoint invalidates everything",
    ],
    body: `A grab bag of high-leverage features for when prompt engineering has hit its ceiling.

## Extended Thinking

Let Claude reason before responding. Accuracy goes up on complex tasks, but you pay for the thinking tokens and wait longer:

\`\`\`python
response = client.messages.create(
    model=model,
    max_tokens=2000,                         # must exceed thinking_budget
    thinking={"type": "enabled", "budget_tokens": 1500},
    messages=messages,
)
\`\`\`

Response contains a \`thinking\` block (with a cryptographic signature so it can't be tampered) followed by a \`text\` block. If safety systems flag the reasoning, you'll see \`redacted_thinking\` blocks — encrypted but preserved so the conversation can continue. For testing, a special string (\`entropic magic string triggered redacted thinking ...\`) can force a redacted block.

Budget minimum is 1024 tokens. Don't enable thinking by default — reach for it after prompt evals show you've hit a ceiling.

## Images

Add an image block inside a user message:

\`\`\`python
import base64
img_b64 = base64.standard_b64encode(open("photo.jpg", "rb").read()).decode()

messages = [{
    "role": "user",
    "content": [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64},
        },
        {"type": "text", "text": "Count the vehicles visible and describe parking availability."},
    ],
}]
\`\`\`

Limits: up to 100 images per request, size/resolution constraints, tokens billed from pixel area. Accuracy comes from the prompt: step-by-step instructions, one-shot examples alternating images and expected outputs, and verification steps. Vague prompts on crisp images still fail.

## PDFs

Same shape, different type:

\`\`\`python
pdf_b64 = base64.standard_b64encode(open("report.pdf", "rb").read()).decode()

content = [
    {
        "type": "document",
        "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64},
    },
    {"type": "text", "text": "Summarize the key findings and extract any tables."},
]
\`\`\`

Claude reads text, images, charts, and tables from the PDF. One-stop analysis.

## Citations

Surface where Claude's statements come from. Enable on the document:

\`\`\`python
{
    "type": "document",
    "source": {...},
    "title": "Annual Report 2024",
    "citations": {"enabled": True},
}
\`\`\`

Response text blocks now carry a \`citations\` array. Two citation types:

- \`citation_page_location\` — for PDFs. Gives page range, title, and cited text.
- \`citation_char_location\` — for plain text. Gives character span.

You can render hover popups, footnotes, or inline badges showing the exact source span. Gives users a way to verify Claude's claims against the source.

## Prompt Caching

Reuse Claude's processing work across requests. Normal flow: Claude processes input, generates output, throws processing away. With caching, you mark a prefix of the request as cacheable; the next identical request retrieves that work instead of redoing it.

Rules:

- Cache lives ~1 hour.
- Text blocks must use the longhand form to carry \`cache_control\`.
- A cache breakpoint caches everything before AND including it.
- Any change before a breakpoint invalidates the cache.
- Content is processed in order: tools → system prompt → messages.
- Up to 4 breakpoints per request — you can cache tools and system prompt separately, for instance.
- Minimum cacheable size: 1024 tokens.

Adding cache control:

\`\`\`python
tools = [{
    **get_current_datetime_schema,
    "cache_control": {"type": "ephemeral"},
}]

system = [
    {"type": "text", "text": big_system_prompt, "cache_control": {"type": "ephemeral"}}
]

client.messages.create(model=model, max_tokens=1000, tools=tools, system=system, messages=messages)
\`\`\`

Check \`usage.cache_creation_input_tokens\` (written to cache on first use) and \`usage.cache_read_input_tokens\` (retrieved from cache). Partial cache reads happen when only a later breakpoint's content matches.

Best candidates: large system prompts, long tool schemas, static message prefixes (like a big retrieved knowledge-base section you're reusing across a session).`,
    reflection: [
      "Where in your app do you repeat the same long prefix across requests? That's a caching win waiting to happen.",
      "Extended thinking is expensive. What's the eval signal that tells you the accuracy gain justifies the cost?",
    ],
    whatsNext:
      "Next: the Model Context Protocol. MCP is a standard for exposing tools, resources, and prompts from a server — so you stop writing the 47th schema for a GitHub or Slack integration yourself.",
  },
  {
    slug: "model-context-protocol",
    title: "Model Context Protocol (MCP)",
    estimatedMinutes: 30,
    objectives: [
      "Explain why MCP exists — shifting integration burden from app developer to server maintainer",
      "Describe the MCP client ↔ MCP server message flow",
      "Define MCP tools, resources, and prompts using the Python SDK decorators",
      "Implement an MCP client that lists/calls tools, reads resources, and gets prompts",
    ],
    videoMinutes: 12,
    videoIntro:
      "MCP (Model Context Protocol) is how Claude-powered apps avoid re-implementing integration code for every service. This lesson covers the architecture — client ↔ server message flow — then walks through defining tools, resources, and prompts on an MCP server and consuming them from an MCP client. You'll use the MCP Inspector to debug servers in the browser.",
    keyTakeaways: [
      "MCP servers wrap external services into ready-to-use tools. Your app becomes an MCP client that discovers and calls them without authoring schemas",
      "The Python SDK's @mcp.tool decorator auto-generates JSON schemas from function signatures and Field() descriptions",
      "Resources expose data to clients (direct URIs like docs://documents or templated URIs like docs://documents/{doc_id}) — clients fetch them proactively",
      "Prompts are pre-tested templates servers expose to clients. They return a list of messages clients can send directly to Claude",
      "The MCP Inspector (mcp dev server.py) gives you a browser UI to test tools, resources, and prompts without wiring up a full client",
    ],
    body: `Tool use gets painful fast. A GitHub chatbot needs tools for repos, PRs, issues, projects, comments, labels, actions... authoring every schema and function is a slog. MCP shifts that work.

## What MCP Is

**Model Context Protocol** is a communication standard between an **MCP client** (your app) and an **MCP server** (an integration layer someone else wrote). The server exposes **tools**, **resources**, and **prompts**; your app consumes them without writing schemas.

Who writes MCP servers? Anyone. Often the service providers themselves (AWS, GitHub, etc.). MCP and tool use aren't competitors — MCP decides who *owns* the tool code (server maintainer, not you).

## Communication Flow

Client and server can talk over stdio, HTTP, or WebSockets. The message protocol defines:

- \`list_tools\` request / \`list_tools\` result.
- \`call_tool\` request / \`call_tool\` result.
- Similar pairs for resources and prompts.

A typical query path:

1. User asks your app something.
2. App → MCP client → \`list_tools\` request → MCP server → result.
3. App sends query plus tools to Claude.
4. Claude returns a tool_use block.
5. App → MCP client → \`call_tool\` → MCP server runs the actual code (e.g., calls GitHub's API).
6. Result flows back through the chain, into Claude, then to the user.

## Defining Tools with the Python SDK

\`\`\`python
from mcp.server.fastmcp import FastMCP
from pydantic import Field

mcp = FastMCP("docs-server")

docs = {"intro.md": "Hello world", "design.md": "..."}

@mcp.tool(name="read_doc_contents", description="Read a document by id.")
def read_doc_contents(
    doc_id: str = Field(description="The document filename"),
) -> str:
    if doc_id not in docs:
        raise ValueError(f"doc not found: {doc_id}")
    return docs[doc_id]

@mcp.tool(name="edit_document", description="Find-and-replace a string in a doc.")
def edit_document(doc_id: str, old_string: str, new_string: str) -> str:
    if doc_id not in docs:
        raise ValueError(f"doc not found: {doc_id}")
    docs[doc_id] = docs[doc_id].replace(old_string, new_string)
    return "ok"
\`\`\`

The decorator auto-generates the JSON schema from type hints and \`Field()\` descriptions.

## The MCP Inspector

Debug servers in a browser. Run:

\`\`\`bash
mcp dev server.py
\`\`\`

Opens a local URL with a sidebar for connecting, a top menu for resources/prompts/tools, and a panel for invoking each tool with arguments. Use it to catch problems before wiring the server into an app.

## Resources

Resources expose *data* (vs. tools, which do actions). Two types:

\`\`\`python
@mcp.resource("docs://documents", mime_type="application/json")
def list_documents():
    return {"docs": list(docs.keys())}

@mcp.resource("docs://documents/{doc_id}", mime_type="text/plain")
def get_document(doc_id: str):
    return docs[doc_id]
\`\`\`

A client sends a \`read_resource\` request with a URI; the server routes by URI and returns the data with a MIME type so the client knows how to parse.

## Prompts

Prompts are pre-tested templates servers expose:

\`\`\`python
from mcp.server.fastmcp.prompts import base

@mcp.prompt(name="format-doc", description="Reformat a doc to clean markdown.")
def format_doc(doc_id: str):
    return [base.UserMessage(
        f"Read doc {doc_id}, reformat to clean markdown, then save it."
    )]
\`\`\`

Clients surface these as slash commands or similar and send the returned messages directly to Claude.

## Implementing a Client

Wrap the SDK's \`ClientSession\` for resource cleanup and API convenience:

\`\`\`python
from pydantic import AnyUrl
import json

class MCPClient:
    def __init__(self, session):
        self.session = session

    async def list_tools(self):
        result = await self.session.list_tools()
        return result.tools

    async def call_tool(self, name, args):
        return await self.session.call_tool(name, args)

    async def read_resource(self, uri):
        result = await self.session.read_resource(AnyUrl(uri))
        resource = result.contents[0]
        if resource.mime_type == "application/json":
            return json.loads(resource.text)
        return resource.text

    async def list_prompts(self):
        result = await self.session.list_prompts()
        return result.prompts

    async def get_prompt(self, name, args):
        result = await self.session.get_prompt(name, args)
        return result.messages
\`\`\`

The rest of your app calls these methods to get tool lists for Claude, run tools when Claude requests them, pull resources to inject as context, and expose prompts as slash commands.`,
    reflection: [
      "For your domain, is there already a public MCP server you could adopt? If not, which service would you expose first?",
      "Resources are fetched proactively (like @-mentions), tools are invoked reactively by Claude. How does that distinction change what you'd expose from an MCP server you build?",
    ],
    whatsNext:
      "To close the course: Anthropic's own apps — Claude Code and Computer Use — plus the design patterns for building multi-step systems on top of Claude: workflows and agents.",
  },
  {
    slug: "claude-code-computer-use-workflows-agents",
    title: "Claude Code, Computer Use, workflows, and agents",
    estimatedMinutes: 35,
    objectives: [
      "Use Claude Code effectively as a collaborative engineer — with init, CLAUDE.md, and structured prompting",
      "Parallelize work with Git worktrees and extend Claude Code via MCP servers",
      "Understand Computer Use as the same tool-use flow + a container that simulates inputs",
      "Choose workflows vs. agents based on whether the steps are known, and apply patterns like parallelization, chaining, routing, and evaluator-optimizer",
    ],
    videoMinutes: 12,
    videoIntro:
      "The course closes with Anthropic's own apps and the design patterns for composing Claude into larger systems. You'll see how Claude Code works as a CLI engineer, how Computer Use reuses the tool-use flow with a Docker container, and when to reach for a workflow (known steps) vs. an agent (unknown steps) — with parallelization, chaining, and routing patterns to borrow.",
    keyTakeaways: [
      "Claude Code runs /init to scan a repo and generate CLAUDE.md, which is auto-included in every future request. Three memory types: Project, Local, User",
      "Git worktrees create isolated copies so multiple Claude instances can work in parallel without stepping on each other. Custom commands in .claude/commands automate the scaffolding",
      "Computer Use = tool use + a Docker container that turns screenshots and action requests (mouse move, click, keystrokes) into real OS events",
      "Workflows (known steps) are easier to test and more reliable; agents (unknown steps) are flexible but harder to evaluate. Default to workflows, reach for agents only when needed",
      "Named workflow patterns: parallelization (split decisions into simultaneous subtasks), chaining (sequential steps), routing (classify then specialize), evaluator-optimizer (loop until the evaluator accepts)",
    ],
    body: `To close: the apps Anthropic ships on top of the Claude API, and the higher-level patterns you'll use to compose Claude into larger systems.

## Claude Code

A terminal-based coding assistant. After \`npm install\` and \`claude\` to log in, you work with Claude Code as a collaborative engineer.

- \`/init\` scans your repo's architecture and conventions, writing a \`CLAUDE.md\` that's auto-included in every future request.
- Memory types: **Project** (shared via CLAUDE.md), **Local** (machine-only), and **User** (cross-project personal memory).
- Add ad-hoc notes with the \`#\` prefix.

Two prompting patterns that consistently outperform one-shot asks:

**Three-step workflow** — (1) identify relevant files and ask Claude to analyze them; (2) describe the feature and ask Claude to plan the change (no code yet); (3) ask Claude to implement the plan.

**Test-driven** — (1) provide context; (2) ask Claude to suggest tests; (3) pick and write the tests; (4) ask Claude to write the code until tests pass.

Core principle: Claude Code is an effort multiplier. More detail = much better results.

## Parallelizing with Worktrees

Multiple Claude instances editing the same files is a disaster. **Git worktrees** give each instance an isolated copy of the repo on its own branch. A custom command in \`.claude/commands/feature.md\` with \`$ARGUMENTS\` can automate the setup, hand the task off, commit, and merge back.

Productivity scales with your ability to *manage* parallel work — you're the tech lead of a team of Claudes.

## Extending with MCP

\`claude mcp add <name> <startup-command>\` connects Claude Code to any MCP server. Add a PDF-reading server, a Sentry integration, a Slack tool — Claude Code picks them up dynamically.

## Automated Debugging

Wire Claude Code into a GitHub Action. On a schedule it pulls production logs (e.g., CloudWatch), deduplicates errors, analyzes them, generates fixes, and opens a PR. Particularly good at catching config differences that only fire in prod.

## Computer Use

Computer Use = the tool-use flow plus a Docker container that simulates mouse, keyboard, and screenshots. The same pattern you already know:

1. Send message + special computer-use tool schema.
2. Claude returns an action (\`screenshot\`, \`left_click\`, \`type\`, etc.).
3. Your container executes the action.
4. Send the result (usually a new screenshot) back to Claude.
5. Claude decides the next action.

Anthropic provides a reference Docker container so you skip the mouse/keyboard plumbing. Best for QA automation and repetitive UI workflows.

## Workflows vs. Agents

Two strategies for tasks Claude can't complete in one call.

**Workflow** — you know the exact steps. Pre-defined sequence of Claude calls. Easier to test, higher completion rates, predictable input shape.

**Agent** — you don't know the steps. Claude plans using a toolbox. More flexible, harder to test, lower completion rates. Provide abstract tools (bash, web_fetch, file_write) rather than hyper-specialized ones so the agent can combine them in unexpected ways.

Default to workflows. Reach for agents when flexibility truly matters. Users want reliability over cleverness.

## Named Workflow Patterns

**Parallelization** — split a complex decision into independent subtasks, run simultaneously, aggregate. Example: material selection — one Claude call per candidate material, each evaluating only that material, then an aggregator compares. Better focus, better modularity.

**Chaining** — break a big task into sequential steps. Each step is a narrow prompt. Use when Claude keeps violating constraints in a long prompt — split into "write it" and "fix violations" passes.

**Routing** — classify the user's input first, then dispatch to a specialized pipeline. Example: a video-script generator that classifies the topic (educational vs. entertainment) and picks a tailored prompt template.

**Evaluator-Optimizer** — producer generates output, evaluator scores it, loop until the evaluator accepts. Example: image-to-3D-model generator that renders the result and asks Claude to compare it against the original.

## Environment Inspection

Agents need feedback after every action. Code editor? Read the file after writing. UI? Screenshot after clicking. Social-media video agent? Whisper captions to verify dialogue placement, FFmpeg frames to verify visuals. Without inspection, agents operate blindly and fail silently.

## When to Pick Each

| Factor | Workflow | Agent |
|---|---|---|
| Steps known? | Yes | No |
| Testability | High | Low |
| Completion rate | High | Lower |
| User experience | Predictable inputs | Can create own inputs, request more |

Solve the problem reliably first. Innovation second.`,
    reflection: [
      "Pick a multi-step task from your work. Is it a workflow or an agent? What's the signal that would flip your answer?",
      "Claude Code + worktrees lets one developer run several Claudes in parallel. Where's the bottleneck for you — model output, your review capacity, or integration friction?",
    ],
    whatsNext:
      "You've completed the course. Head back to the Claude Partner Network learning path to continue with Introduction to Model Context Protocol, Introduction to Agent Skills, or Claude Code in Action.",
  },
];
