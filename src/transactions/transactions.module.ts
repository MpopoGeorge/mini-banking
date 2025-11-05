import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../database/entities/transaction.entity';
import { LedgerEntry } from '../database/entities/ledger-entry.entity';
import { Wallet } from '../database/entities/wallet.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, LedgerEntry, Wallet])],
  providers: [TransactionsService],
  controllers: [TransactionsController],
})
export class TransactionsModule {}


