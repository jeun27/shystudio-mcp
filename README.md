# Shystudio Video Editor (MCP)

Connect Claude, ChatGPT, Codex or any MCP client to Shystudio: `https://shystudio.ai/app/mcp`

Your agent can cut the "um"s, long pauses and retakes from your video, remove background noise, add captions timed to your words, and export it. Free during the beta.

## Connect

**Claude Code**
```
claude mcp add --transport http shystudio https://shystudio.ai/app/mcp
```

**Claude (web and desktop):** Settings > Connectors > Add custom connector, then paste `https://shystudio.ai/app/mcp`.

**ChatGPT:** Settings > Apps & Connectors > Developer mode > Create, then paste `https://shystudio.ai/app/mcp`.

**Codex**
```
codex mcp add shystudio --url https://shystudio.ai/app/mcp
codex mcp login shystudio
```

**Other MCP clients:** add a remote (Streamable HTTP) server with the URL `https://shystudio.ai/app/mcp`.

The first time, a Shystudio sign-in page opens. Sign in with an email code or Google. If you're new, that also creates your free account. Then press Allow.

## Tools

| Tool | What it does |
|---|---|
| `add_video` | Adds a video to your Shystudio account. Upload the file, or give a public link that points straight to a video file (.mp4, .mov, …). YouTube, TikTok, Instagram and X page links don't work. |
| `speech_cleanup` | Cuts "um"s, "uh"s, long pauses and retakes. You can undo it in Version history. |
| `voice_isolation` | Removes background noise and room echo. Right now it works through your own ElevenLabs account, connected in Shystudio Settings. |
| `auto_captions` | Adds captions timed to each spoken word. |
| `job_status` | Checks a running edit. Edits run one at a time. |
| `get_result` | Gives you a link to watch and edit the project on shystudio.ai. |
| `export_video` | Exports an MP4 video, or just the audio as M4A. |

Try: "Clean up the speech in my video, add captions, and export it."

## Limits during the beta

- Videos up to 15 minutes and 2 GB.
- One edit at a time per account.
- Video links: up to 20 an hour.

Watch every video before you post it. AI can get things wrong.

## More

- Docs: https://shystudio.ai/docs/agents?ref=agent
- Privacy: https://shystudio.ai/privacy
- Support: support@shystudio.ai

This repo holds only listing files. Shystudio runs as a hosted service, and its code is not in this repo.
