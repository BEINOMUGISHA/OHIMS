-- =========================================================================
-- TITLE: Online Health Insurance Management System (OHIMS)
-- SCHEMA SPECIFICATION FOR POSTGRESQL / RELATIONAL DATABASES
-- COPYRIGHT: SPDX-License-Identifier: Apache-2.0
-- =========================================================================

-- Enable UUID extension for robust distributed keys if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define custom enum types
CREATE TYPE user_role_enum AS ENUM ('admin', 'staff', 'provider', 'policyholder');
CREATE TYPE policy_status_enum AS ENUM ('active', 'suspended', 'terminated', 'expired');
CREATE TYPE premium_frequency_enum AS ENUM ('monthly', 'quarterly', 'annually');
CREATE TYPE premium_status_enum AS ENUM ('paid', 'pending', 'overdue');
CREATE TYPE claim_status_enum AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'paid');
CREATE TYPE provider_type_enum AS ENUM ('hospital', 'clinic', 'lab', 'pharmacy');
CREATE TYPE accreditation_status_enum AS ENUM ('accredited', 'suspended', 'pending');
CREATE TYPE notification_type_enum AS ENUM ('info', 'alert', 'success');

-- 1. USERS TABLE
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'policyholder',
    phone VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ENROLLED MEMBERS / POLICYHOLDERS TABLE
CREATE TABLE members (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    national_id VARCHAR(50) UNIQUE NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    photo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INSURANCE PLANS TABLE
CREATE TABLE insurance_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    premium_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    coverage_limit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    benefits TEXT[] NOT NULL,
    exclusions TEXT[] NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- 4. POLICIES TABLE
CREATE TABLE policies (
    id VARCHAR(50) PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES insurance_plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status policy_status_enum NOT NULL DEFAULT 'active',
    premium_frequency premium_frequency_enum NOT NULL DEFAULT 'monthly',
    CONSTRAINT chk_dates CHECK (start_date < end_date)
);

-- 5. BENEFICIARIES TABLE
CREATE TABLE beneficiaries (
    id VARCHAR(50) PRIMARY KEY,
    policy_id VARCHAR(50) NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    dob DATE NOT NULL
);

-- 6. PREMIUM PAYMENT TRACKING TABLE
CREATE TABLE premiums (
    id VARCHAR(50) PRIMARY KEY,
    policy_id VARCHAR(50) NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    paid_date DATE,
    status premium_status_enum NOT NULL DEFAULT 'pending',
    receipt_number VARCHAR(100) UNIQUE,
    CONSTRAINT chk_payment_receipt CHECK (
        (status = 'paid' AND receipt_number IS NOT NULL AND paid_date IS NOT NULL) OR
        (status != 'paid')
    )
);

-- 7. HEALTHCARE PROVIDERS TABLE
CREATE TABLE providers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type provider_type_enum NOT NULL DEFAULT 'hospital',
    location TEXT NOT NULL,
    accreditation_status accreditation_status_enum NOT NULL DEFAULT 'pending',
    contact VARCHAR(50) NOT NULL,
    approved_plans VARCHAR(50)[] -- Holds linked InsurancePlan table keys
);

-- 8. CLAIMS TABLE
CREATE TABLE claims (
    id VARCHAR(50) PRIMARY KEY,
    policy_id VARCHAR(50) NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL, -- Either 'member' directly or FK references providers(id)
    diagnosis TEXT NOT NULL,
    treatment TEXT NOT NULL,
    amount_claimed DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    amount_approved DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status claim_status_enum NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT
);

-- 9. CLAIM DOCUMENTS TABLE
CREATE TABLE claim_documents (
    id VARCHAR(50) PRIMARY KEY,
    claim_id VARCHAR(50) NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. SYSTEM NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type notification_type_enum NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TRANSPARENCY AUDIT LOGS
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- OPTIMIZING INDEXES FOR HIGH-TRAFFIC CLINICAL READS
-- =========================================================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_members_national_id ON members(national_id);
CREATE INDEX idx_policies_member ON policies(member_id);
CREATE INDEX idx_premiums_policy ON premiums(policy_id);
CREATE INDEX idx_premiums_status ON premiums(status);
CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
