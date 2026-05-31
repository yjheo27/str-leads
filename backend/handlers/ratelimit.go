package handlers

import (
	"net"
	"net/http"
	"sync"
	"time"
)

const (
	rateLimitRequests = 10
	rateLimitWindow   = time.Minute
)

type ipRateLimiter struct {
	mu      sync.Mutex
	buckets map[string][]time.Time
}

var scrapeRateLimiter = &ipRateLimiter{buckets: make(map[string][]time.Time)}

// allow returns true if the IP is within the rate limit.
// Uses a sliding window: max rateLimitRequests per rateLimitWindow.
func (l *ipRateLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rateLimitWindow)

	prev := l.buckets[ip]
	valid := prev[:0]
	for _, t := range prev {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rateLimitRequests {
		l.buckets[ip] = valid
		return false
	}
	l.buckets[ip] = append(valid, now)
	return true
}

func clientIP(r *http.Request) string {
	// Respect X-Real-IP / X-Forwarded-For when behind a reverse proxy.
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return ip
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
