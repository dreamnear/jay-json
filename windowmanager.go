package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
)

type WindowManager struct {
	app         *application.App
	mainWindow  *application.WebviewWindow
	alwaysOnTop bool
}

// setMainWindow stores the main window reference
func (w *WindowManager) setMainWindow(window *application.WebviewWindow) {
	w.mainWindow = window
}

// OpenNewWindow creates a new window instance
func (w *WindowManager) OpenNewWindow() {
	w.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:    "🛠️ JSON Tools",
		Width:    1200,
		Height:   800,
		Mac: application.MacWindow{
			Backdrop:  application.MacBackdropLiquidGlass,
			TitleBar: application.MacTitleBarHidden,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})
}

// ToggleAlwaysOnTop toggles the always-on-top state of the main window
func (w *WindowManager) ToggleAlwaysOnTop() bool {
	if w.mainWindow == nil {
		return false
	}

	w.alwaysOnTop = !w.alwaysOnTop
	w.mainWindow.SetAlwaysOnTop(w.alwaysOnTop)
	return w.alwaysOnTop
}

// IsAlwaysOnTop returns the current always-on-top state
func (w *WindowManager) IsAlwaysOnTop() bool {
	return w.alwaysOnTop
}
