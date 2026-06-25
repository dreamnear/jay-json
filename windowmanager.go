package main

import (
	"strconv"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type WindowManager struct {
	mu            sync.Mutex
	app           *application.App
	mainWindow    *application.WebviewWindow
	alwaysOnTop   bool
	windows       map[string]*application.WebviewWindow
	windowCounter int
}

// setMainWindow stores the main window reference
func (w *WindowManager) setMainWindow(window *application.WebviewWindow) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.windows == nil {
		w.windows = make(map[string]*application.WebviewWindow)
	}
	w.mainWindow = window
	w.windows["main"] = window
}

// getWindowSize returns the current window size, or default if not available
func (w *WindowManager) getWindowSize() (width, height int) {
	w.mu.Lock()
	mainWindow := w.mainWindow
	w.mu.Unlock()

	if mainWindow == nil {
		return 1200, 800
	}

	width = mainWindow.Width()
	height = mainWindow.Height()

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
	w.mu.Lock()
	app := w.app
	if app == nil {
		w.mu.Unlock()
		return
	}
	w.windowCounter++
	windowId := "window-" + strconv.Itoa(w.windowCounter)
	w.mu.Unlock()

	width, height := w.getWindowSize()

	newWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "🛠️ Jay JSON",
		Width:  width,
		Height: height,
		Mac: application.MacWindow{
			Backdrop: application.MacBackdropLiquidGlass,
			TitleBar: application.MacTitleBarHidden,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	w.mu.Lock()
	w.windows[windowId] = newWindow
	w.mu.Unlock()
}

// RemoveWindow removes a closed window from the tracking map
func (w *WindowManager) RemoveWindow(windowId string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	delete(w.windows, windowId)
}

// ToggleAlwaysOnTop toggles the always-on-top state of all windows
func (w *WindowManager) ToggleAlwaysOnTop() bool {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.alwaysOnTop = !w.alwaysOnTop

	for _, window := range w.windows {
		window.SetAlwaysOnTop(w.alwaysOnTop)
	}

	return w.alwaysOnTop
}

// IsAlwaysOnTop returns the current always-on-top state
func (w *WindowManager) IsAlwaysOnTop() bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.alwaysOnTop
}
