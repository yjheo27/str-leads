package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/joho/godotenv"
	"str-leads/backend/db"
	"str-leads/backend/handlers"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, relying on environment variables")
	}

	if err := db.Connect(); err != nil {
		log.Fatalf("database: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/leads/scrape", handlers.Scrape)
	mux.HandleFunc("GET /api/leads", handlers.List)
	mux.HandleFunc("PUT /api/leads/{id}", handlers.UpdateStatus)
	mux.HandleFunc("PATCH /api/leads/{id}", handlers.UpdateNotes)
	mux.HandleFunc("DELETE /api/leads/{id}", handlers.DeleteLead)

	fmt.Println("Backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", handlers.CORS(mux)))
}
