# Voice Module

Centralized voice and text-to-speech functionality for the AI Therapist application.

## Overview

This module provides:

- **Mastra ElevenLabs Integration**: For agent-based TTS in conversational AI
- **Direct ElevenLabs API**: For custom audio generation and fine-grained control
- **Voice Presets**: Curated therapeutic voices optimized for mental health content

## Components

### `createElevenLabsVoice(speaker, options?)`

Creates an ElevenLabsVoice instance for use with Mastra agents.

```typescript
import { createElevenLabsVoice } from "@/voice";

const voice = createElevenLabsVoice("george", {
  modelName: "eleven_multilingual_v2"
});

// Use with Mastra Agent
const agent = new Agent({
  id: "my-agent",
  voice: createElevenLabsVoice("rachel"),
  // ... other config
});
```

**Parameters:**

- `speaker`: One of `"george"`, `"rachel"`, `"bella"`, `"adam"`, `"aria"`
- `options.modelName`: ElevenLabs model (default: `"eleven_multilingual_v2"`)

### Therapeutic Voice Presets

```typescript
import { THERAPEUTIC_VOICES } from "@/voice";

// Available voices:
// - george: Professional, calm, reassuring
// - rachel: Warm, clear, empathetic  
// - bella: Soft, soothing, gentle
// - adam: Deep, calming, authoritative
// - aria: Default Mastra voice, balanced and clear
```

## Direct ElevenLabs API

For more control over audio generation:

### `createAudioFileFromText(text, voiceId?, options?)`

Converts text to speech and saves as an MP3 file.

```typescript
import { createAudioFileFromText, THERAPEUTIC_VOICES } from "@/voice";

const filename = await createAudioFileFromText(
  "Welcome to your therapeutic session",
  THERAPEUTIC_VOICES.george.id,
  {
    stability: 0.5,
    similarityBoost: 0.75,
    speed: 0.9, // Slower for therapeutic content
  }
);
// Returns: "uuid.mp3"
```

### `createAudioStreamFromText(text, voiceId?, options?)`

Converts text to speech and returns a Buffer for streaming.

```typescript
import { createAudioStreamFromText } from "@/voice";

const audioBuffer = await createAudioStreamFromText(
  "Your guided meditation begins now",
  THERAPEUTIC_VOICES.bella.id
);
```

### `getSpeakers()`

Fetches all available ElevenLabs voices.

```typescript
import { getSpeakers } from "@/voice";

const speakers = await getSpeakers();
// Returns: [{ voiceId, name, category, description }, ...]
```

## Configuration

Requires `ELEVENLABS_API_KEY` environment variable:

```bash
ELEVENLABS_API_KEY=your_api_key_here
```

## Usage in Agents

```typescript
import { Agent } from "@mastra/core/agent";
import { createElevenLabsVoice } from "@/voice";

export const therapeuticAgent = new Agent({
  id: "therapeutic-agent",
  name: "Therapeutic Audio Agent",
  instructions: "...",
  model: deepseek("deepseek-chat"),
  voice: createElevenLabsVoice("george"),
});
```

## Mastra Voice API

The `createElevenLabsVoice` function wraps Mastra's `@mastra/voice-elevenlabs` package:

### Methods Available on Voice Instance

- **`speak(input, options?)`**: Convert text to speech stream
- **`listen(input, options?)`**: Convert audio to text (STT)
- **`getSpeakers()`**: Get available voice options

### Voice Options

```typescript
{
  speechModel: {
    name: "eleven_multilingual_v2" | "eleven_turbo_v2",
    apiKey: string
  },
  speaker: string // Voice ID
}
```

## Best Practices

1. **Use presets for consistency**: Stick to `THERAPEUTIC_VOICES` presets
2. **Optimize for therapeutic content**: Use slower speeds (0.8-0.9)
3. **Test voice quality**: Use `getSpeakers()` to explore options
4. **Handle errors gracefully**: Wrap API calls in try-catch blocks

## Example: Complete Workflow

```typescript
import { 
  createElevenLabsVoice, 
  createAudioFileFromText,
  THERAPEUTIC_VOICES 
} from "@/voice";

// For Mastra agents
const agent = new Agent({
  voice: createElevenLabsVoice("rachel"),
  // ...
});

// For custom audio generation
const audioFile = await createAudioFileFromText(
  "Let's take a deep breath together",
  THERAPEUTIC_VOICES.rachel.id,
  { speed: 0.85, stability: 0.6 }
);
```

## References

- [Mastra ElevenLabs Voice Documentation](https://mastra.dev/reference/voice/elevenlabs)
- [ElevenLabs API Documentation](https://elevenlabs.io/docs)
