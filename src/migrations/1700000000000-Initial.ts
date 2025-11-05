import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class Initial1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'passwordHash', type: 'varchar' },
        ],
      }),
      true,
    );

    // Ensure uuid extension
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";");

    await queryRunner.createTable(
      new Table({
        name: 'wallet',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'currency', type: 'varchar' },
          { name: 'balanceCents', type: 'integer', default: 0 },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'wallet',
      new TableForeignKey({ columnNames: ['userId'], referencedTableName: 'user', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
    );

    await queryRunner.createIndex('wallet', new TableIndex({ name: 'IDX_wallet_user', columnNames: ['userId'] }));

    await queryRunner.createTable(
      new Table({
        name: 'transaction',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'type', type: 'varchar' },
          { name: 'amountCents', type: 'integer' },
          { name: 'currency', type: 'varchar' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'ledger_entry',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'walletId', type: 'uuid' },
          { name: 'transactionId', type: 'uuid' },
          { name: 'amountCents', type: 'integer' },
          { name: 'direction', type: 'varchar' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('ledger_entry', [
      new TableForeignKey({ columnNames: ['walletId'], referencedTableName: 'wallet', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
      new TableForeignKey({ columnNames: ['transactionId'], referencedTableName: 'transaction', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
    ]);

    await queryRunner.createIndex('ledger_entry', new TableIndex({ name: 'IDX_ledger_wallet', columnNames: ['walletId'] }));
    await queryRunner.createIndex('ledger_entry', new TableIndex({ name: 'IDX_ledger_tx', columnNames: ['transactionId'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('ledger_entry', 'IDX_ledger_wallet');
    await queryRunner.dropIndex('ledger_entry', 'IDX_ledger_tx');
    const les = await queryRunner.getTable('ledger_entry');
    if (les && les.foreignKeys.length) await queryRunner.dropForeignKeys('ledger_entry', les.foreignKeys);
    await queryRunner.dropTable('ledger_entry');

    await queryRunner.dropTable('transaction');

    const wallet = await queryRunner.getTable('wallet');
    if (wallet && wallet.foreignKeys.length) await queryRunner.dropForeignKeys('wallet', wallet.foreignKeys);
    await queryRunner.dropIndex('wallet', 'IDX_wallet_user');
    await queryRunner.dropTable('wallet');

    await queryRunner.dropTable('user');
  }
}


