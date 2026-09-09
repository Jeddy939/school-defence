package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

const defaultPort = "43110"

func main() {
	executable, err := os.Executable()
	if err != nil {
		fatal("Could not locate the launcher: %v", err)
	}

	gameDirectory := filepath.Join(filepath.Dir(executable), "game")
	if info, err := os.Stat(filepath.Join(gameDirectory, "index.html")); err != nil || info.IsDir() {
		fatal("The game folder is missing. Keep this launcher beside the game folder.")
	}

	listener, port, err := listen()
	if err != nil {
		fatal("Could not start the local game server: %v", err)
	}

	url := "http://127.0.0.1:" + port
	handler := http.FileServer(http.Dir(gameDirectory))
	server := &http.Server{
		Handler: http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
			writer.Header().Set("Cache-Control", "no-store")
			writer.Header().Set("X-Content-Type-Options", "nosniff")
			handler.ServeHTTP(writer, request)
		}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Printf("Schoolyard Defence is running at %s\n", url)
	fmt.Println("Your browser will open shortly. Keep this window open while playing.")
	if err := openBrowser(url); err != nil {
		fmt.Printf("Could not open a browser automatically. Open %s instead.\n", url)
	}

	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		fatal("The local game server stopped: %v", err)
	}
}

func listen() (net.Listener, string, error) {
	for port := 43110; port < 43120; port++ {
		address := fmt.Sprintf("127.0.0.1:%d", port)
		listener, err := net.Listen("tcp", address)
		if err == nil {
			return listener, fmt.Sprint(port), nil
		}
	}
	return nil, defaultPort, fmt.Errorf("ports 43110 through 43119 are unavailable")
}

func openBrowser(url string) error {
	return exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url).Start()
}

func fatal(message string, values ...any) {
	fmt.Fprintf(os.Stderr, message+"\n", values...)
	fmt.Println("Press Enter to close this window.")
	fmt.Scanln()
	os.Exit(1)
}
