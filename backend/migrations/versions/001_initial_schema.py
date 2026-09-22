"""Initial schema: users, companies, agent_runs, evidence, activities

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. companies table
    op.create_table(
        'companies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=True),
        sa.Column('website_url', sa.String(length=1024), nullable=False),
        sa.Column('industry', sa.String(length=255), nullable=True),
        sa.Column('sub_industry', sa.String(length=255), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('employee_range', sa.String(length=100), nullable=True),
        sa.Column('revenue_range', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('linkedin_url', sa.String(length=1024), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='NEW'),
        sa.Column('opportunity_level', sa.String(length=50), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_companies_name'), 'companies', ['name'], unique=False)
    op.create_index(op.f('ix_companies_domain'), 'companies', ['domain'], unique=False)
    op.create_index(op.f('ix_companies_industry'), 'companies', ['industry'], unique=False)
    op.create_index(op.f('ix_companies_city'), 'companies', ['city'], unique=False)
    op.create_index(op.f('ix_companies_status'), 'companies', ['status'], unique=False)
    op.create_index(op.f('ix_companies_is_archived'), 'companies', ['is_archived'], unique=False)

    # 3. activities table
    op.create_table(
        'activities',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('activity_type', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activities_company_id'), 'activities', ['company_id'], unique=False)
    op.create_index(op.f('ix_activities_activity_type'), 'activities', ['activity_type'], unique=False)
    op.create_index(op.f('ix_activities_created_at'), 'activities', ['created_at'], unique=False)

    # 4. agent_runs table
    op.create_table(
        'agent_runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('agent_name', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('prompt_version', sa.String(length=50), nullable=True),
        sa.Column('input_json', sa.Text(), nullable=True),
        sa.Column('output_json', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_runs_agent_name'), 'agent_runs', ['agent_name'], unique=False)
    op.create_index(op.f('ix_agent_runs_entity_id'), 'agent_runs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_agent_runs_status'), 'agent_runs', ['status'], unique=False)

    # 5. evidence table
    op.create_table(
        'evidence',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('statement', sa.Text(), nullable=False),
        sa.Column('source_name', sa.String(length=255), nullable=False),
        sa.Column('source_url', sa.String(length=1024), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_evidence_company_id'), 'evidence', ['company_id'], unique=False)


def downgrade() -> None:
    op.drop_table('evidence')
    op.drop_table('agent_runs')
    op.drop_table('activities')
    op.drop_table('companies')
    op.drop_table('users')
