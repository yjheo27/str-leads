package models

import "time"

type Lead struct {
	ID        string    `json:"id"`
	Name      *string   `json:"name"`
	Phone     *string   `json:"phone"`
	Email     *string   `json:"email"`
	Address   *string   `json:"address"`
	Strategy  string    `json:"strategy"`
	Status    string    `json:"status"`
	Notes     *string   `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
}
