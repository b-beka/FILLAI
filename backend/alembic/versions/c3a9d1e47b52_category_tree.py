"""Category tree: parent_id, icon, unique siblings and seeded spheres

Revision ID: c3a9d1e47b52
Revises: 1a589374e12a
Create Date: 2026-11-04 12:00:00.000000

"""
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3a9d1e47b52'
down_revision = '1a589374e12a'
branch_labels = None
depends_on = None

# Сферы по умолчанию и их иконки (имена из app.topic_icons.ICON_NAMES)
SPHERES = [
    ("Языки", "languages"),
    ("ЕНТ", "graduation-cap"),
    ("Программирование", "code"),
    ("Дизайн", "palette"),
    ("Наука", "atom"),
    ("Профессия", "briefcase"),
    ("Общее", "book"),
]


def upgrade() -> None:
    op.add_column('categories', sa.Column('parent_id', sa.Uuid(), nullable=True))
    op.add_column('categories', sa.Column('icon', sa.String(length=50), nullable=True))
    op.create_foreign_key(
        'fk_categories_parent_id', 'categories', 'categories', ['parent_id'], ['id'], ondelete='CASCADE'
    )
    op.create_index('ix_categories_parent_id', 'categories', ['parent_id'])

    bind = op.get_bind()
    # Дубли, различающиеся только регистром, мешают уникальному индексу: сливаем в самую раннюю запись
    rows = bind.execute(sa.text("SELECT id, label FROM categories ORDER BY created_at, id")).fetchall()
    keep: dict[str, object] = {}
    for row in rows:
        key = " ".join((row.label or "").split()).lower()
        if key in keep:
            bind.execute(
                sa.text("UPDATE courses SET category_id = :keep WHERE category_id = :dup"),
                {"keep": keep[key], "dup": row.id},
            )
            bind.execute(sa.text("DELETE FROM categories WHERE id = :dup"), {"dup": row.id})
        else:
            keep[key] = row.id

    op.execute(
        "CREATE UNIQUE INDEX uq_category_sibling ON categories "
        "(lower(label), coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))"
    )

    # Сферы: существующие записи с такими именами обновляем, а не дублируем
    for label, icon in SPHERES:
        updated = bind.execute(
            sa.text(
                "UPDATE categories SET icon = :icon WHERE parent_id IS NULL AND lower(label) = lower(:label)"
            ),
            {"icon": icon, "label": label},
        )
        if updated.rowcount == 0:
            bind.execute(
                sa.text("INSERT INTO categories (id, label, icon) VALUES (:id, :label, :icon)"),
                {"id": uuid.uuid4(), "label": label, "icon": icon},
            )


def downgrade() -> None:
    bind = op.get_bind()
    # Подтемы исчезают вместе с деревом; курсы остаются без категории. Сферы остаются обычными категориями
    bind.execute(
        sa.text("UPDATE courses SET category_id = NULL WHERE category_id IN (SELECT id FROM categories WHERE parent_id IS NOT NULL)")
    )
    bind.execute(sa.text("DELETE FROM categories WHERE parent_id IS NOT NULL"))
    op.drop_index('uq_category_sibling', table_name='categories')
    op.drop_index('ix_categories_parent_id', table_name='categories')
    op.drop_constraint('fk_categories_parent_id', 'categories', type_='foreignkey')
    op.drop_column('categories', 'icon')
    op.drop_column('categories', 'parent_id')
