import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './database/entities/user.entity';
import { Wallet } from './database/entities/wallet.entity';
import { Transaction } from './database/entities/transaction.entity';
import { LedgerEntry } from './database/entities/ledger-entry.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mini_banking',
        entities: [User, Wallet, Transaction, LedgerEntry],
        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    AccountsModule,
    TransactionsModule,
  ],
})
export class AppModule {}


