# Jay JSON

A desktop application for working with JSON data, built with [Wails](https://wails.io/).

## Features

- **Editor Panel**
  - Line numbers for easy reference
  - Syntax highlighting when formatted
  - Real-time validation

- **Tree View**
  - Interactive collapsible nodes
  - Type badges for each value
  - Visual structure representation

- **Operations**
  - Format JSON with 2-space indentation
  - Minify JSON to remove whitespace
  - Validate JSON and display errors
  - Copy formatted or minified JSON to clipboard

- **Checkpoint System**
  - Undo/Redo support for formatting operations
  - Up to 50 checkpoints saved in history

## Screenshots
<img width="1080" height="auto" alt="jay-json-screenshot" src="https://github.com/user-attachments/assets/5fe44def-9950-42d9-9911-779eab9e36e5" />


## Installation

### Prerequisites

- Go 1.21 or later
- Node.js 18 or later
- Wails CLI

### Build from Source

```bash
# Clone the repository
git clone https://github.com/JessonChan/jay-json.git
cd jay-json

# Install dependencies
cd frontend && npm install && cd ..

# Run in development mode
wails3 dev

# Build for production
wails3 build
```

The built executable will be in the `build` directory.

## Usage

1. **Paste or type JSON** into the editor panel
2. **Click Format** (or press `⌘Enter` / `Ctrl+Enter`) to format the JSON
3. **View the tree structure** in the right panel
4. **Click nodes** in the tree to expand or collapse them
5. **Copy** the formatted or minified JSON using the buttons

### Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Format | `⌘Enter` | `Ctrl+Enter` |
| Undo | `⌘Z` | `Ctrl+Z` |
| Redo | `⌘⇧Z` | `Ctrl+Y` |
| Clear | `⌘⇧K` | `Ctrl+Shift+K` |
| Copy | `⌘C` (in editor) | `Ctrl+C` |
| New Window | `⌘N` | `Ctrl+N` |
| Toggle Pin | `⌘P` | `Ctrl+P` |

## Development

This project is built with:

- **Backend**: [Go](https://go.dev/) with [Wails v3](https://v3.wails.io/)
- **Frontend**: Vanilla JavaScript with HTML5 and CSS3
- **Fonts**: [Inter](https://rsms.me/inter/) and [IBM Plex Mono](https://www.ibm.com/plex/)
- **Icons**: [Heroicons](https://heroicons.com/)

### Project Structure

```
jay-json/
├── frontend/
│   ├── public/          # Static assets (CSS, images)
│   ├── src/             # JavaScript source code
│   ├── dist/            # Built frontend files
│   └── package.json     # Frontend dependencies
├── build/               # Built application executables
├── jsonservice.go       # JSON processing service
├── windowmanager.go     # Window management
├── main.go              # Application entry point
└── go.mod               # Go dependencies
```

## Acknowledgments

This project would not be possible without the following open-source projects:

- [Wails](https://wails.io/) - Framework for building desktop applications with Go
- [Inter Font](https://rsms.me/inter/) - Variable font family by Rasmus Andersson
- [IBM Plex Mono](https://www.ibm.com/plex/) - Monospaced font by IBM
- [Heroicons](https://heroicons.com/) - Icon set by the Tailwind CSS team

Special thanks to the Wails community for documentation and examples that made this project possible.

## Contributing

Contributions are welcome. Please feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is released under the MIT License.

## Support

If you encounter any issues:

- Check existing [GitHub Issues](https://github.com/JessonChan/jay-json/issues)
- Open a new issue with details about the problem
---

Made with Wails v3
