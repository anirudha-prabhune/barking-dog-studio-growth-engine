"""Add website intelligence schema: website_scans and website_pages

Revision ID: 002_website_intelligence
Revises: 001_initial_schema
Create Date: 2026-09-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '002_website_intelligence'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. website_scans table
    op.create_table(
        'website_scans',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('target_url', sa.String(length=1024), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('pages_discovered', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('pages_fetched', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.Column('final_url', sa.String(length=1024), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('robots_txt_status', sa.String(length=50), nullable=True),
        sa.Column('sitemap_found', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('agent_run_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_website_scans_company_id'), 'website_scans', ['company_id'], unique=False)
    op.create_index(op.f('ix_website_scans_status'), 'website_scans', ['status'], unique=False)
    op.create_index(op.f('ix_website_scans_created_at'), 'website_scans', ['created_at'], unique=False)
    op.create_index(op.f('ix_website_scans_agent_run_id'), 'website_scans', ['agent_run_id'], unique=False)

    # 2. website_pages table
    op.create_table(
        'website_pages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('scan_id', sa.String(length=36), nullable=False),
        sa.Column('url', sa.String(length=1024), nullable=False),
        sa.Column('final_url', sa.String(length=1024), nullable=True),
        sa.Column('canonical_url', sa.String(length=1024), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('content_type', sa.String(length=255), nullable=True),
        sa.Column('title', sa.String(length=1024), nullable=True),
        sa.Column('meta_description', sa.Text(), nullable=True),
        sa.Column('language', sa.String(length=50), nullable=True),
        sa.Column('h1', sa.Text(), nullable=True),
        sa.Column('h2_text', sa.Text(), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content_hash', sa.String(length=64), nullable=True),
        sa.Column('depth', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_internal', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_homepage', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_canonical', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('discovered_from', sa.String(length=1024), nullable=True),
        sa.Column('html_snapshot', sa.Text(), nullable=True),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('meta_json', sa.Text(), nullable=True),
        sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['website_scans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_website_pages_scan_id'), 'website_pages', ['scan_id'], unique=False)
    op.create_index(op.f('ix_website_pages_url'), 'website_pages', ['url'], unique=False)
    op.create_index(op.f('ix_website_pages_content_hash'), 'website_pages', ['content_hash'], unique=False)
    op.create_index(op.f('ix_website_pages_created_at'), 'website_pages', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('website_pages')
    op.drop_table('website_scans')
