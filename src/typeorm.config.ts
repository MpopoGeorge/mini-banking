import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './database/entities/user.entity';
import { Wallet } from './database/entities/wallet.entity';
import { Transaction } from './database/entities/transaction.entity';
import { LedgerEntry } from './database/entities/ledger-entry.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mini_banking',
  entities: [User, Wallet, Transaction, LedgerEntry],
  migrations: ['src/migrations/*.ts'],
});

export default AppDataSource;


