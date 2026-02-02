package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
)

type WindowManager struct {
	app         *application.App
	mainWindow  *application.WebviewWindow
	alwaysOnTop bool
	windows     map[string]*application.WebviewWindow
}

// setMainWindow stores the main window reference
func (w *WindowManager) setMainWindow(window *application.WebviewWindow) {
	w.mainWindow = window
	if w.windows == nil {
		w.windows = make(map[string]*application.WebviewWindow)
	}
	w.windows["main"] = window
}

// getWindowSize returns the current window size, or default if not available
func (w *WindowManager) getWindowSize() (width, height int) {
	if w.mainWindow == nil {
		return 1200, 800 // Default fallback size
	}

	// Try to get the window's current size
	width = w.mainWindow.Width()
	height = w.mainWindow.Height()

	// If size is 0 or invalid, use defaults
	if width <= 0 {
		width = 1200
	}
	if height <= 0 {
		height = 800
	}

	return width, height
}

// OpenNewWindow creates a new window instance with the same size as current window
func (w *WindowManager) OpenNewWindow() {
	width, height := w.getWindowSize()

	newWindow := w.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:    "🛠️ Jay JSON",
		Width:    width,
		Height:   height,
		Mac: application.MacWindow{
			Backdrop:  application.MacBackdropLiquidGlass,
			TitleBar: application.MacTitleBarHidden,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	// Track the new window
	windowId := "window-" + string(rune(len(w.windows)))
	w.windows[windowId] = newWindow
}

// ToggleAlwaysOnTop toggles the always-on-top state of all windows
func (w *WindowManager) ToggleAlwaysOnTop() bool {
	w.alwaysOnTop = !w.alwaysOnTop

	// Toggle always-on-top for all tracked windows
	for _, window := range w.windows {
		window.SetAlwaysOnTop(w.alwaysOnTop)
	}

	return w.alwaysOnTop
}

// IsAlwaysOnTop returns the current always-on-top state
func (w *WindowManager) IsAlwaysOnTop() bool {
	return w.alwaysOnTop
}
