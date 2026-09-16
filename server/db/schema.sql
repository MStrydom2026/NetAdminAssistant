-- NetAdmin Assistant Database Schema
-- SQLite3 schema for ticket history, analysis results, and caching

-- Tickets table: stores metadata of analyzed tickets
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  source TEXT DEFAULT 'netadmin',
  metadata TEXT
);

-- Analysis results: stores AI analysis for each ticket
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL,
  evidence TEXT,
  model_used TEXT,
  tokens_used INTEGER,
  analysis_time_ms INTEGER,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
  UNIQUE(ticket_id, analysis_type)
);

-- Attachments: stores file attachments from tickets
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  content_hash TEXT,
  extracted_text TEXT,
  analysis TEXT,
  uploaded_at TIMESTAMP NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
  UNIQUE(ticket_id, file_name)
);

-- Search results cache: stores KB search results for reuse
CREATE TABLE IF NOT EXISTS search_cache (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  source TEXT NOT NULL,
  results TEXT NOT NULL,
  result_count INTEGER,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  UNIQUE(query, source)
);

-- Solution history: tracks which solutions were effective
CREATE TABLE IF NOT EXISTS solutions (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  analysis_id TEXT NOT NULL,
  suggested_solution TEXT NOT NULL,
  actual_solution TEXT,
  was_effective BOOLEAN,
  effectiveness_notes TEXT,
  resolved_at TIMESTAMP,
  feedback_at TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
  FOREIGN KEY (analysis_id) REFERENCES analyses(id)
);

-- API usage tracking: for cost optimization and quota management
CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  ticket_id TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  provider TEXT,
  request_time_ms INTEGER,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_analyses_ticket_id ON analyses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage(model);
