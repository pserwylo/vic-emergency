import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('import_job')
        .addColumn('created_at', 'datetime', (col) => col.notNull())
        .addColumn('hash', 'text', (col) => col.notNull().unique())
        .execute()

    await db.schema
        .createTable('feature')
        .addColumn('id', 'text', (col) => col.notNull().primaryKey())
        .addColumn('location', 'text')
        .addColumn('created_at', 'datetime', (col) => col.notNull())
        .addColumn('updated_at', 'datetime', (col) => col.notNull())
        .addColumn('removed_at', 'datetime')
        .execute()

    await db.schema
        .createTable('geometry')
        .addColumn('feature_id', 'text', (col) => col.notNull())
        .addColumn('hash', 'text', (col) => col.notNull())
        .addColumn('geometry', 'text', (col) => col.notNull())
        .addColumn('created_at', 'datetime', (col) => col.notNull())
        .addColumn('removed_at', 'datetime')
        .addForeignKeyConstraint('feature_fk', ['feature_id'], 'feature', ['id'])
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('geometry').execute()
    await db.schema.dropTable('feature').execute()
}