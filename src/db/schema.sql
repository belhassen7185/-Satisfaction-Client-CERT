-- =====================================================================
-- DATABASE SCHEMA SCRIPT: Satisfaction Client CERT
-- Target Database: PostgreSQL 14+ / Cloud SQL
-- Purpose: Customer satisfaction surveys, response details,
-- complaints management, AI analysis, and audit logging.
-- =====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    default_language VARCHAR(5) DEFAULT 'fr',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'manager', -- admin, manager, agent, viewer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Surveys
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    language VARCHAR(5) DEFAULT 'fr', -- 'fr', 'ar', 'tn'
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    category VARCHAR(100) DEFAULT 'general',
    complaint_question_enabled BOOLEAN DEFAULT TRUE,
    complaint_question_title TEXT,
    target_responses INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_surveys_org ON surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);

-- 4. Questions
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL, -- 'single_choice', 'multiple_choice', 'dropdown', 'stars', 'nps', 'text', 'voice'
    required BOOLEAN DEFAULT TRUE,
    options JSONB DEFAULT '[]'::jsonb, -- Array of { id, label, value }
    order_index INTEGER NOT NULL DEFAULT 0,
    min_label VARCHAR(100),
    max_label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);

-- 5. Submissions (Survey responses envelope)
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'fr',
    channel VARCHAR(30) DEFAULT 'web', -- 'web', 'qr', 'whatsapp', 'email'
    sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
    csat_positive BOOLEAN,
    nps_type VARCHAR(20), -- 'promoter', 'passive', 'detractor'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submissions_survey ON submissions(survey_id);
CREATE INDEX IF NOT EXISTS idx_submissions_channel ON submissions(channel);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(submitted_at);

-- 6. Submission Answers
CREATE TABLE IF NOT EXISTS submission_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_value JSONB NOT NULL,
    audio_url TEXT,
    transcription TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_answers_submission ON submission_answers(submission_id);

-- 7. Complaints (Linked to submission if user entered an issue)
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    problem_description TEXT NOT NULL,
    audio_recording_url TEXT,
    audio_transcription TEXT,
    dossier_number VARCHAR(100),
    deposit_date VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(30) DEFAULT 'new', -- 'new', 'in_progress', 'pending', 'resolved', 'closed'
    priority VARCHAR(20) DEFAULT 'medium', -- 'urgent', 'high', 'medium', 'low'
    category VARCHAR(100) DEFAULT 'Service Client',
    assigned_to VARCHAR(255),
    ai_summary TEXT,
    ai_suggested_category VARCHAR(100),
    ai_suggested_priority VARCHAR(20),
    ai_suggested_actions JSONB DEFAULT '[]'::jsonb,
    ai_confidence NUMERIC(4, 2) DEFAULT 0.85,
    manager_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_survey ON complaints(survey_id);

-- 8. Complaint Notes & Audit Trail
CREATE TABLE IF NOT EXISTS complaint_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_complaint ON complaint_notes(complaint_id);

-- 9. AI Strategic Reports
CREATE TABLE IF NOT EXISTS ai_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL,
    strengths JSONB NOT NULL,
    priority_problems JSONB NOT NULL,
    action_plans JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
