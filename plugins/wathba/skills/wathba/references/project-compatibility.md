# Repository detection and integration modes

Run:

```sh
wathba integrate inspect --project-dir . --json --no-input
```

The detector is local and read-only. It does not upload repository content,
install dependencies, modify files, or require Wathba authentication.

| Detected stack | MCP guide mode |
|---|---|
| TypeScript | Pinned Wathba SDK plus HTTP contract |
| JavaScript | Pinned Wathba SDK plus HTTP contract |
| Python | Direct HTTP |
| Java | Direct HTTP |
| Go | Direct HTTP |
| PHP | Direct HTTP |
| .NET | Direct HTTP |
| cURL-oriented | Direct HTTP |
| Other/unknown | Portable direct HTTP |

Detection uses familiar repository markers such as `package.json`,
`pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`, `go.mod`,
`composer.json`, and `*.csproj`. It does not require a specific framework or
package manager.

Always request the pinned integration guide from the hosted MCP after
detection. Do not reuse an old SDK version, service mapping, or operation list
from a local file.
