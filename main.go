package main

import (
	"embed"
	_ "embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var app *application.App
var windowManager *WindowManager

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func main() {
	// Create window manager instance
	windowManager = &WindowManager{
		windows: make(map[string]*application.WebviewWindow),
	}

	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.
	app = application.New(application.Options{
		Name:        "jay_json",
		Description: "A JSON tools application",
		Icon:        appIcon,
		Services: []application.Service{
			application.NewService(&JSONService{}),
			application.NewService(windowManager),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false, // Changed to false to allow multiple windows
		},
	})

	// Initialize window manager with app reference
	windowManager.app = app

	// Create the main window
	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "🛠️ Jay JSON",
		Mac: application.MacWindow{
			TitleBar: application.MacTitleBarHidden,
			// Backdrop removed - causes window jump on theme change
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	// Store main window reference in window manager
	windowManager.setMainWindow(mainWindow)

	// Run the application. This blocks until the application has been exited.
	err := app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}
